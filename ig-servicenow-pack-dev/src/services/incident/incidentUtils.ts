import { AxiosInstance, AxiosResponse } from 'axios';
import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import axios from 'axios';
import { CustomerConfig } from '../../interfaces/scenario/index';
import config from "../../config";
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { CILinkingError, ConfigNotFoundError, ScheduleCreationError, ServiceNowAPIError } from '../../utils/errorHandling';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import sleep from '../../utils/sleep';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';

const sanitizeStringValue = (value: string) => value.trim();

const isPlainObject = (value: unknown): value is Record<string, any> =>
    Object.prototype.toString.call(value) === '[object Object]';

export const sanitizePayloadStrings = <T>(payload: T): T => {
    const sanitize = (input: any): any => {
        if (typeof input === 'string') {
            return sanitizeStringValue(input);
        }

        if (Array.isArray(input)) {
            return input.map(item => sanitize(item));
        }

        if (isPlainObject(input)) {
            return Object.keys(input).reduce((acc: Record<string, any>, key) => {
                acc[key] = sanitize(input[key]);
                return acc;
            }, {});
        }

        return input;
    };

    return sanitize(payload) as T;
};

export const validateAuthHeader = (authHeader: string): Record<string, string> => ({
    Authorization: `${authHeader}`,
});

type EndpointMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'GET-USER'
    | 'PUT_UPDATE'
    | 'PUT_RESOLVE'
    | 'PUT_CLOSE'
    | 'PUT_REASSIGN';

export const getFieldMappingForOperation = (
    method: EndpointMethod,
    customerConfig?: CustomerConfig
): Record<string, string | string[]> => {
    if (!customerConfig) return {} as Record<string, string | string[]>;
    const endpointFieldMap = (customerConfig.endpoints as Record<string, any>)?.[method]?.fieldMapping;

    return (endpointFieldMap && Object.keys(endpointFieldMap).length > 0)
        ? endpointFieldMap
        : customerConfig.fieldMapping;
};

export const buildEndpointUrl = (
    method: EndpointMethod,
    baseUrl: string,
    customerConfig: any,
    ...fallbackMethods: EndpointMethod[]
): string => {
    const methodsToTry = [method, ...fallbackMethods];
    for (const currentMethod of methodsToTry) {
        const endpoint = customerConfig?.endpoints?.[currentMethod];
        if (endpoint) {
            const apiPrefix = endpoint.apiPrefix ?? customerConfig?.apiPrefix ?? '';
            return `${baseUrl}${apiPrefix}/${endpoint.type}/${endpoint.table}`;
        }
    }

    throw new Error(`No endpoint mapping found for methods: ${methodsToTry.join(', ')}`);
};

export const shouldAppendSysIdInEndpoint = (
    customerConfig?: CustomerConfig,
    ...methods: EndpointMethod[]
): boolean => {
    if (customerConfig) {
        const methodsToCheck = methods.filter(Boolean);
        for (const method of methodsToCheck) {
            const endpointConfig = customerConfig.endpoints?.[method];
            if (endpointConfig?.snowApiType) {
                return endpointConfig.snowApiType !== 'custom';
            }
        }
    }

    return true;
};

const normalizeAssignmentGroupValue = (value?: string | null) => value ? value.toString().trim().toLowerCase() : undefined;

export const doesAssignmentGroupMatch = (
    assignmentGroupId?: string | null,
    assignmentGroupName?: string | null,
    expectedAssignmentGroup?: string | null,
): boolean => {
    const normalizedExpected = normalizeAssignmentGroupValue(expectedAssignmentGroup);
    if (!normalizedExpected) {
        return true;
    }

    return (
        normalizeAssignmentGroupValue(assignmentGroupId) === normalizedExpected ||
        normalizeAssignmentGroupValue(assignmentGroupName) === normalizedExpected
    );
};

export const fetchCustomerConfig = async (tenantId: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    
    if (!tenantId) {
        throw new ServiceNowAPIError("Invalid tenantId: undefined", "fetchCustomerConfig");
    }
    const customer_config_url = config.customerConfigUrl;
    const customer_config_token = config.customerConfigToken;

    const maxRetries = 5;
    const backoff = [500, 1000, 2000, 3000, 5000];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { data: fullConfig } = await axios.get(customer_config_url, {
                headers: {
                    'PRIVATE-TOKEN': customer_config_token
                },
                timeout: 5000,
            });

            const customerConfig = fullConfig[tenantId];
            if (!customerConfig) {
                throw new ConfigNotFoundError(tenantId);
            }
            if (!customerConfig.authType) {
                customerConfig.authType = config.authType;
            }
            return customerConfig;
        } catch (error: any) {
            const isRetryable =
                error?.code === 'ECONNABORTED' || // timeout
                error?.code === 'ENOTFOUND' ||    // DNS failure
                error?.code === 'ECONNREFUSED' || // connection refused
                error?.response?.status >= 500;   // server errors

            const errMessage = error instanceof Error ? error.message : String(error);

            if (attempt < maxRetries && isRetryable) {
                loggerInstance.warn(`[fetchCustomerConfig] Attempt ${attempt} failed: ${errMessage}. Retrying...`);
                await sleep(backoff[attempt - 1]);
                continue;
            }
            throw new ServiceNowAPIError(errMessage, 'fetchCustomerConfig');
        }
    }
    throw new ServiceNowAPIError(
        'Failed to fetch customer config after retries',
        'fetchCustomerConfig'
    );
};

export const buildCreateIncidentBody = (
    incidentData: any,
    fieldMap: Record<string, string | string[]>,
    defaultValues?: Record<string, string>,
    prioritizeDefaults: string[] = [],
) => {
    const sanitizedIncidentData = sanitizePayloadStrings(incidentData || {} as any);
    const sanitizedDefaults = defaultValues
        ? sanitizePayloadStrings({ ...defaultValues })
        : undefined;
    const body: Record<string, any> = {};

    for (const [standardKey, customKey] of Object.entries(fieldMap)) {
        const shouldPrioritizeDefault = prioritizeDefaults.includes(standardKey);
        const hasIncidentValue = Object.prototype.hasOwnProperty.call(sanitizedIncidentData, standardKey);

        if (!hasIncidentValue && !shouldPrioritizeDefault) continue;

        let value = ['impact', 'urgency'].includes(standardKey)
            ? sanitizedIncidentData[standardKey]?.replace(/\D/g, '')
            : sanitizedIncidentData[standardKey];

        if (shouldPrioritizeDefault && sanitizedDefaults?.[standardKey]) {
            value = sanitizedDefaults[standardKey];
        }

        if (Array.isArray(customKey)) {
            customKey.forEach(key => (body[key] = value));
        } else {
            body[customKey] = value;
        }
    }

    if (sanitizedDefaults) {
        for (const [key, val] of Object.entries(sanitizedDefaults)) {
            const mappedKey = fieldMap[key];
            if (mappedKey) {
                if (Array.isArray(mappedKey)) {
                    mappedKey.forEach(k => {
                        if (!body[k]) body[k] = val;
                    });
                } else {
                    if (!body[mappedKey]) body[mappedKey] = val;
                }
            }
        }
    }

    if (sanitizedIncidentData.sys_ci_id && fieldMap.configuration_item) {
        const configItemField = fieldMap.configuration_item;
        if (Array.isArray(configItemField)) {
            configItemField.forEach(key => (body[key] = sanitizedIncidentData.sys_ci_id));
        } else {
            body[configItemField] = sanitizedIncidentData.sys_ci_id;
        }
    }

    if (sanitizedIncidentData.sys_domain) {
        body.sys_domain = sanitizedIncidentData.sys_domain;
    }

    if (sanitizedIncidentData?.reassignment_action_id && sanitizedIncidentData?.observe_assignment_group) {
        const mappedAssignmentKey = fieldMap.assignment_group;
        if (mappedAssignmentKey) {
            if (Array.isArray(mappedAssignmentKey)) {
                mappedAssignmentKey.forEach(key => {
                    body[key] = sanitizedIncidentData.observe_assignment_group;
                });
            } else {
                body[mappedAssignmentKey] = sanitizedIncidentData.observe_assignment_group;
            }
        }
    }
    // Include extra unmapped fields
    for (const [key, value] of Object.entries(sanitizedIncidentData)) {
        const isMapped = Object.keys(fieldMap).includes(key);
        const isAlreadyIncluded = Object.values(fieldMap)
            .flat()
            .includes(key);
        if (!isMapped && !isAlreadyIncluded && body[key] === undefined) {
            body[key] = value;
        }
    }

    return sanitizePayloadStrings(body);
};

export const buildUpdateIncidentBody = (
    updateData: any,
    fieldMap: Record<string, string | string[]>
): Record<string, any> => {
    sanitizePayloadStrings(updateData);
    const body: Record<string, any> = {};

    const fieldsToCheck = ['description', 'work_notes', 'assignment_group', 'impact', 'urgency', 'scenario_id'];

    for (const field of fieldsToCheck) {
        if (!updateData[field]) continue;

        const mappedKey = fieldMap[field];
        if (!mappedKey) continue;

        const value = ['impact', 'urgency'].includes(field)
            ? updateData[field]?.replace(/\D/g, '')
            : updateData[field];

        if (Array.isArray(mappedKey)) {
            mappedKey.forEach(key => (body[key] = value));
        } else {
            body[mappedKey] = value;
        }
    }
    // Add extra fields not defined in fieldMap
    for (const [key, value] of Object.entries(updateData)) {
        const mappedKeys = fieldMap[key];
        const alreadyMapped = Array.isArray(mappedKeys)
            ? mappedKeys.some(k => body.hasOwnProperty(k))
            : body.hasOwnProperty(mappedKeys);
        if (!fieldsToCheck.includes(key) && !alreadyMapped && !body.hasOwnProperty(key)) {
            body[key] = value;
        }
    }

    return sanitizePayloadStrings(body);
};

export const buildResolveOrCloseIncidentBody = (
    data: any,
    fieldMap: Record<string, string | string[]>,
    action: 'resolve' | 'close',
    defaultValues?: Record<string, string>,
    prioritizeDefaults: string[] = []
): Record<string, any> => {
    sanitizePayloadStrings(data);
    const sanitizedDefaults = defaultValues
        ? sanitizePayloadStrings({ ...defaultValues })
        : undefined;
    const body: Record<string, any> = {};

    const state = action === 'resolve' ? '6' : '7';
    const defaultCloseCode = 'Closed/Resolved By Caller';

    const resolveField = (key: string, fallback: string) => {
        const mapped = fieldMap[key];
        if (Array.isArray(mapped)) return mapped[0]; // pick the first one if multiple
        return mapped || fallback;
    };

    const mappedCloseNotes = resolveField('close_notes', 'close_notes');
    const mappedCloseCode = resolveField('close_code', 'close_code');
    const mappedState = resolveField('state', 'state');

    const resolvePrioritizedValue = (key: string, primaryValue: any, fallbackValue: string) => {
        if (prioritizeDefaults?.includes(key) && sanitizedDefaults?.[key] !== undefined) {
            return sanitizedDefaults[key];
        }
        if (primaryValue !== undefined && primaryValue !== null && primaryValue !== '') {
            return primaryValue;
        }
        if (sanitizedDefaults?.[key] !== undefined) {
            return sanitizedDefaults[key];
        }
        return fallbackValue;
    };

    body[mappedState] = resolvePrioritizedValue('state', state, state);
    body[mappedCloseCode] = resolvePrioritizedValue('close_code', data.close_code, defaultCloseCode);
    body[mappedCloseNotes] = resolvePrioritizedValue('close_notes', data.close_notes, defaultCloseCode);

    const additionalMappedFields = ['scenario_id', 'work_notes'];
    for (const field of additionalMappedFields) {
        if (data[field] === undefined || data[field] === null) continue;
        const mappedKey = fieldMap[field];
        if (!mappedKey) continue;
        const value = data[field];
        if (Array.isArray(mappedKey)) {
            mappedKey.forEach(key => (body[key] = value));
        } else {
            body[mappedKey] = value;
        }
    }

    // Add extra unmapped fields
    for (const [key, value] of Object.entries(data)) {
        const mappedKeys = fieldMap[key];
        const isMapped = mappedKeys
            ? Array.isArray(mappedKeys)
                ? mappedKeys.some(k => body.hasOwnProperty(k))
                : body.hasOwnProperty(mappedKeys)
            : false;

        const alreadyIncluded = body.hasOwnProperty(key);
        if (!['close_notes', 'close_code', 'state'].includes(key) && !isMapped && !alreadyIncluded) {
            body[key] = value;
        }
    }

    return sanitizePayloadStrings(body);
};

export const buildReassignIncidentBody = (
    updatedIncidentData: any,
    customerConfig?: CustomerConfig,
    fieldMap?: Record<string, string | string[]>
) => {
    sanitizePayloadStrings(updatedIncidentData);
    const body: any = {};

    const assignmentKey = fieldMap?.assignment_group || 'assignment_group';
    if (Array.isArray(assignmentKey)) {
        assignmentKey.forEach(key => body[key] = updatedIncidentData.updated_assignment_group);
    } else {
        body[assignmentKey] = updatedIncidentData.updated_assignment_group;
    }

    const defaultReassign = customerConfig?.defaultValueForReassignment;
    if (defaultReassign) {
        const assignedToKey = fieldMap?.assigned_to || 'assigned_to';
        if (Array.isArray(assignedToKey)) {
            assignedToKey.forEach(key => body[key] = defaultReassign.assigned_to);
        } else {
            body[assignedToKey] = defaultReassign.assigned_to;
        }
    }
    return sanitizePayloadStrings(body);
};

export const getSysIdAndPriorityForIncident = async (
    incidentId: string,
    authHeader: string,
    incidentData: any,
    customerConfig: CustomerConfig | undefined,
    vaultPath: any,
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    try {
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('GET', baseUrl, customerConfig);

        let headers: any;

        if (customerConfig?.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        const response = await executeWithRetry(
            () => axiosInstance.get(endpoint, {
                params: { sysparm_query: `number=${encodeURIComponent(incidentId.trim())}` },
                headers,
                timeout: 45000,
            }),
            { operationName: 'getSysIdAndPriorityForIncident' }
        );

        const incidents = response.data.result;

        if (incidents.length > 0) {
            loggerInstance.info(`Sys_id: ${incidents[0].sys_id}, Priority: ${incidents[0].priority}`);
            loggerInstance.info(`Short Description: ${incidents[0].short_description}`);
            return {
                sys_id: incidents[0].sys_id,
                priority: incidents[0].priority,
                description: incidents[0].description,
                short_description: incidents[0].short_description
            };
        }
        return null;
    } catch (error: any) {
        let errMsg = 'Unknown error';
        let statusCode = 'N/A';
        let responseBody = '';
        let errorDescription = '';

        if (error?.response) {
            statusCode = error.response.status;
            responseBody = JSON.stringify(error.response.data, null, 2);
            errorDescription = error.response.headers?.['www-authenticate'] || '';
            errMsg = `HTTP ${statusCode} - ${error.response.statusText}`;
        } else if (error instanceof Error) {
            errMsg = error.message;
        } else {
            errMsg = JSON.stringify(error);
        }

        const fullErrorDetails = [
            `🔐 Status Code: ${statusCode}`,
            errorDescription ? `🧾 Auth Error: ${errorDescription}` : '',
            `📦 Response Body:\n${responseBody}`,
        ].filter(Boolean).join('\n\n');

        loggerInstance.error(`Error in getSysIdAndPriorityForIncident: ${errMsg}\n\n${fullErrorDetails}`, {
            path: path.relative(process.cwd(), __filename),
            errorDetails: fullErrorDetails,
        });
        await sendServicenowFailureAlertToTeams({
            incidentId,
            tenantId: customerConfig?.name || incidentData.tenant_id,
            errorMessage: `${errMsg}\n\n${fullErrorDetails}`,
            failureType: 'fetchPriority',
            customActionMessage: `Failed to fetch sys_id and priority for incident.`,
        });
        return null;
    }
};

export const associateCIWithIncident = async (
    incidentSysId: string,
    ciSysId: string,
    authHeader: string,
    incidentData: any,
    customerConfig: CustomerConfig,
    vaultPath: string,
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    const operationName = `associateCIWithIncident:${incidentSysId}`;
    try {
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('PATCH', baseUrl, customerConfig);
        const appendSysIdInEndpoint = shouldAppendSysIdInEndpoint(customerConfig, 'PATCH');
        const endpointUrl = appendSysIdInEndpoint ? `${endpoint}/${incidentSysId}` : endpoint;

        let headers: any;

        if (customerConfig.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        const response = await executeWithRetry(
            () =>
                axiosInstance.patch(
                    endpointUrl,
                    { cmdb_ci: ciSysId },
                    { headers, timeout: 45000 }
                ),
            { operationName }
        );

        loggerInstance.info(`[${operationName}] Linked CI ${ciSysId} to incident ${incidentSysId}`);
        return response.data;
    } catch (error: any) {
        const errMsg = error.message || JSON.stringify(error) || 'CI association failed';
        const status = error.response?.status;
        const responseBody = error.response?.data;

        loggerInstance.error(`Error associating CI: ${errMsg}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`, {
            path: path.relative(process.cwd(), __filename),
        });
        await sendServicenowFailureAlertToTeams({
            incidentId: incidentData.incidentId || incidentSysId,
            tenantId: customerConfig?.name || incidentData.tenant_id,
            errorMessage: `Error: ${errMsg}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`,
            failureType: 'associateCIWithIncident',
            customActionMessage: `Failed to associate CI (${ciSysId}) with incident (${incidentSysId}).`,
        });
        throw new CILinkingError(errMsg);

    }
};

export const getSysIdForIncident = async (
    incidentId: string,
    authHeader: string,
    incidentData: any,
    customerConfig: CustomerConfig | undefined,
    vaultPath: string,
): Promise<string | null> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    try {
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('GET', baseUrl, customerConfig);

        let headers: any;

        if (customerConfig?.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        const response = await executeWithRetry(
            () => axiosInstance.get(endpoint, {
                params: { sysparm_query: `number=${encodeURIComponent(incidentId.trim())}` },
                headers,
                timeout: 45000,
            }),
            { operationName: 'getSysIdForIncident' }
        );

        const incidents = response.data.result;
        if (incidents.length > 0) {
            loggerInstance.info(`Sys_id of the CI is: ${incidents[0].sys_id}`);
            return incidents[0].sys_id;
        }
        return null;
    } catch (error: any) {
        const status = error.response?.status;
        const responseBody = error.response?.data;

        loggerInstance.error(`Error fetching sys_id for incident: ${error.message}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`, {
            path: path.relative(process.cwd(), __filename),
        });
        await sendServicenowFailureAlertToTeams({
            incidentId,
            tenantId: customerConfig?.name || incidentData.tenant_id,
            errorMessage: `Error: ${error.message}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`,
            failureType: 'fetchSysId',
            customActionMessage: `Failed to fetch sys_id for incident.`,
        });
        return null;
    }
};

export const getIncidentData = async (
    incidentId: string,
    authHeader: string,
    incidentData: any,
    customerConfig: CustomerConfig | undefined,
    vaultPath: string,
): Promise<any | null> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    try {
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('GET', baseUrl, customerConfig);

        let headers: any;

        if (customerConfig?.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        const response = await executeWithRetry(
            () => axiosInstance.get(endpoint, {
                params: { sysparm_query: `number=${encodeURIComponent(incidentId.trim())}` },
                headers,
                timeout: 45000,
            }),
            { operationName: 'getIncidentData' }
        );

        const incidents = response.data.result;

        if (incidents.length > 0) {
            loggerInstance.info(`Fetched incident data for incident: ${incidentId}`);
            return incidents[0];
        }

        loggerInstance.warn(`No incident found for incidentId: ${incidentId}`);
        return null;
    } catch (error: any) {
        const status = error.response?.status;
        const responseBody = error.response?.data;

        loggerInstance.error(`Error fetching incident data: Error: ${error.message}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`, {
            path: path.relative(process.cwd(), __filename),
        });
        await sendServicenowFailureAlertToTeams({
            incidentId,
            tenantId: customerConfig?.name || incidentData.tenant_id,
            errorMessage: `Error: ${error.message}\nStatus: ${status}\nResponse: ${JSON.stringify(responseBody, null, 2)}`,
            failureType: 'fetchIncidentData',
            customActionMessage: `Failed to fetch full incident details.`,
        });
        return null;
    }
};

export const formatIncidentDescription = async (existingDescription: string, affectedCINameString: any) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const affectedCINameList: string[] = affectedCINameString
            .split(',')
            .map((ci: string) => ci.trim())
            .filter((ci: string) => ci.length > 0);
        const lines = existingDescription.split('\n');
        let alertLine = "";
        let startIndex = lines.findIndex(line => line.trim() === 'Configuration items:');
        const existingCIs: { [key: string]: number } = {};
        if (startIndex !== -1) {
            alertLine = lines.slice(0, startIndex + 1).join('\n');

            for (let i = startIndex + 1; i < lines.length; i++) {
                const match = lines[i].match(/^- (.+) \((\d+)\)$/);
                if (match) {
                    const ci = match[1];
                    const count = parseInt(match[2], 10);
                    existingCIs[ci] = count;
                }
            }
        }
        else {
            alertLine = `${existingDescription}\n\nConfiguration items:`;
        }

        for (const ci of affectedCINameList) {
            if (existingCIs[ci]) {
                existingCIs[ci]++;
            } else {
                existingCIs[ci] = 1;
            }
        }

        let newDescription = `${alertLine}\n`;
        for (const [ci, count] of Object.entries(existingCIs)) {
            newDescription += `- ${ci} (${count})\n`;
        }
        return newDescription.trim();
    } catch (error) {
        loggerInstance.error(`Error formatting description: ${error instanceof Error ? error.stack : String(error)}`, {
            path: path.relative(process.cwd(), __filename),
        });
        return existingDescription;
    }
};

export const createScheduleInObserve = async (createScheduleBody: any) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    try {
        const apiKeySchedule = config.apiKeySchedule;
        const intervalValue = createScheduleBody?.interval_value;
        const edgeId = createScheduleBody?.edge_id;
        const actionId = createScheduleBody?.reassignment_action_id;
        const ticketNo = createScheduleBody?.ticket_no;
        const vaultPath = createScheduleBody?.vault_path;
        const baseUrl = createScheduleBody?.base_url;
        const observeAssignmentGroup = createScheduleBody?.observe_assignment_group;
        const updatedAssignmentGroup = createScheduleBody?.updated_assignment_group;
        const scenarioId = createScheduleBody.scenario_id;
        const tenantId = createScheduleBody.tenant_id;
        const firstExecution = createScheduleBody.first_execution;
        const scheduleId = createScheduleBody?.schedule_id;

        const requiredParams = {
            apiKeySchedule,
            intervalValue,
            edgeId,
            actionId,
            ticketNo,
            vaultPath,
            observeAssignmentGroup,
            updatedAssignmentGroup,
        };

        const missingParams = Object.entries(requiredParams)
            .filter(([_, v]) => !v)
            .map(([k]) => k);

        if (missingParams.length) {
            loggerInstance.warn(
                `Schedule creation skipped. Missing params: ${missingParams.join(', ')}`
            );
            return;
        }
        const interval = {
            value: intervalValue,
            unit: "minutes"
        };
        const terminalCondition = {
            type: "frequency",
            frequency: 1
        };
        const actionPayload = {
            action_id: actionId,
            params: [
                {
                    name: "incidentId",
                    value: ticketNo
                },
                {
                    name: "vault_path",
                    value: vaultPath
                },
                {
                    name: "base_url",
                    value: baseUrl
                },
                {
                    name: "observe_assignment_group",
                    value: observeAssignmentGroup
                },
                {
                    name: "updated_assignment_group",
                    value: updatedAssignmentGroup
                },
                {
                    name: "scenario_id",
                    value: scenarioId
                },
                {
                    name: "tenant_id",
                    value: tenantId
                }
            ],
            edge_id: edgeId
        };
        const ext_api_url = config.externalApiUrl;
        let observeURL = `${ext_api_url}/api/diagnostics/action/scheduleCreate?apikey=${apiKeySchedule}`;
        loggerInstance.info(`observe url ${ext_api_url}/api/diagnostics/action/scheduleCreate?apikey=<api-key>`);
        let scheduleBody = {
            ...(scheduleId ? { schedule_id: scheduleId } : {}),
            action_id: actionId,
            action_payload: actionPayload,
            interval,
            name: `Reassignment action for ${ticketNo}`,
            status: 'active',
            terminal_condition: terminalCondition,
            trigger_type: 'immediate',
            tags: {
                system_defined: ['reassignment-ticket'],
            },
            first_execution: firstExecution || 'delayed',
        };
        loggerInstance.info(`schedule body final - ${JSON.stringify(scheduleBody)}`);
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axiosInstance.post(observeURL, scheduleBody, { timeout: 15000 });
                loggerInstance.info(`Observe schedule created successfully for ticket ${ticketNo}`);
                return response.data;
            } catch (error: any) {
                const isRetryable = !error.response || error.response.status >= 500;
                const errMsg = error.message || JSON.stringify(error);

                if (!isRetryable || attempt === maxRetries) {
                    loggerInstance.error(`Attempt ${attempt} failed to create Observe schedule: ${errMsg}`);
                    throw new ScheduleCreationError(errMsg);
                } else {
                    // Log retries at debug to reduce noise
                    loggerInstance.debug(`Retry attempt ${attempt} for ticket ${ticketNo} failed: ${errMsg}`);
                    await sleep(1000 * attempt);
                }
            }
        }

    } catch (error: any) {
        // Log the error and handle it
        loggerInstance.error(`Error createScheduleInObserve: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
        throw new ScheduleCreationError(error.message);
    }
};

export const getTicketStatus = async (
    incidentId: string,
    authHeader: string,
    incidentData: any,
    vaultPath: string,
): Promise<any> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    try {
        const customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('GET', baseUrl, customerConfig);

        let headers: any;

        if (customerConfig.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        const response = await executeWithRetry(
            () => axiosInstance.get(endpoint, {
                params: { sysparm_query: `number=${encodeURIComponent(incidentId.trim())}` },
                headers,
                timeout : 45000,
            }),
            { operationName: 'getTicketStatus', retries: 3 }
        );

        const incidents = response.data.result;
        if (incidents.length > 0) {
            const assignmentGroup = incidents[0]?.assignment_group;
            const assignmentGroupId = assignmentGroup?.value;
            let assignmentGroupName: string | undefined;

            if (assignmentGroup?.link) {
                const resolvedLink = assignmentGroup.link as string;
                const normalizedLink = resolvedLink?.startsWith('http') ? resolvedLink : `${baseUrl}${resolvedLink.charAt(0) === '/' ? '' : '/'}${resolvedLink}`;
                try {
                    const assignmentGroupResponse = await executeWithRetry(
                        () => axiosInstance.get(normalizedLink, {
                            headers,
                            timeout: 20000,
                        }),
                        { operationName: 'getAssignmentGroupDetails', retries: 2 }
                    );

                    assignmentGroupName = assignmentGroupResponse?.data?.result?.name || assignmentGroupName;
                } catch (assignmentGroupError: any) {
                    const errMsg = assignmentGroupError instanceof Error ? assignmentGroupError.message : JSON.stringify(assignmentGroupError);
                    loggerInstance.warn(`Failed to fetch assignment group name from link: ${errMsg}`);
                }
            }

            loggerInstance.info(
                `Sys_id of the incident is: ${incidents[0]?.sys_id}, status is ${incidents[0]?.active}, state is ${incidents[0]?.state} and assignment_group is: ${assignmentGroupId}${assignmentGroupName ? ` (${assignmentGroupName})` : ''}`
            );

            return {
                sys_id: incidents[0]?.sys_id,
                status: incidents[0]?.active,
                state: incidents[0]?.state,
                assignment_group: assignmentGroupId,
                assignment_group_name: assignmentGroupName,
            };
        }

        return null;
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
        loggerInstance.error(`Error fetching sys_id for incident: ${errMsg}`, {
            path: path.relative(process.cwd(), __filename),
        });
        return null;
    }
};
