import { AxiosInstance } from 'axios';
import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import { auditLogApi } from '../../utils/external-apis/core-apis';
import { CustomerConfig, EnsureResolvePrerequisiteStateParams } from '../../interfaces/scenario/index';
import {
    getSysIdForIncident,
    validateAuthHeader,
    buildEndpointUrl,
    buildResolveOrCloseIncidentBody,
    getTicketStatus,
    getIncidentData,
    getFieldMappingForOperation,
    shouldAppendSysIdInEndpoint,
    doesAssignmentGroupMatch,
} from './incidentUtils';
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { ResolveIncidentError } from '../../utils/errorHandling';
import config from '../../config';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';

type EndpointMethod = Parameters<typeof buildEndpointUrl>[0];

export const resolveIncident = async (incidentData: any, authHeader: string, apiKeyToken?: string, vaultPath?: any, customerConfig?: CustomerConfig | undefined) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    const incidentId = incidentData.incidentId;
    const operationName = `resolveIncident:${incidentId}`;

    try {

        loggerInstance.info(`[${operationName}] Incoming resolve request`, { incidentId });

        const close_notes = incidentData.close_notes;

        const sysId = await getSysIdForIncident(incidentId, authHeader, incidentData, customerConfig, vaultPath);

        // check if ticket is acitve and assigned to observe assigment id
        // observe assignment group signifies request is coming from transient time.
        // dont close if ticket is assigned to observe, that is transient time has not yet reached.
        const allowPostTransientResolution = Boolean(incidentData?.allow_post_transient_resolution);
        if (incidentData?.observe_assignment_group && !allowPostTransientResolution) {
            const ticketStatus = await getTicketStatus(incidentId, authHeader, incidentData, vaultPath);
            const status = ticketStatus?.status;
            const state = ticketStatus?.state?.toString();
            const terminalStates = ['6', '7', '8'];
            const isTerminalState = terminalStates.includes(state);
            const assignmentsMatch = doesAssignmentGroupMatch(
                ticketStatus?.assignment_group,
                ticketStatus?.assignment_group_name,
                incidentData.observe_assignment_group
            );

            if (status !== "true" || isTerminalState || !assignmentsMatch) {
                loggerInstance.info(`[${operationName}] Resolve skipped due to transient assignment`);
                return null;
            }
        }
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('PUT_RESOLVE', baseUrl, customerConfig, 'PUT');
        const appendSysIdInEndpoint = shouldAppendSysIdInEndpoint(customerConfig, 'PUT_RESOLVE', 'PUT');
        const endpointUrl = appendSysIdInEndpoint === false ? endpoint : `${endpoint}/${sysId}`;

        // Get incident data to check current state
        const currentIncidentData = await getIncidentData(incidentId, authHeader, incidentData, customerConfig, vaultPath);
        const terminalStates = ['6', '7', '8'];

        if (terminalStates.includes(currentIncidentData?.state)) {
            loggerInstance.info(`[${operationName}] Incident ${incidentId} is already in a terminal state (${currentIncidentData.state}). Skipping resolve API call.`);
            const auditLogData = {
                timestamp: new Date().toISOString(),
                status: 'Success',
                details: {
                    URL: endpointUrl,
                    method: 'GET',
                    incident_id: incidentId,
                    message: `Incident is already in terminal state (${currentIncidentData.state}) in ServiceNow. Skipping update from Observe.`
                }
            };

            auditLogApi(auditLogData, `Incident ${incidentId} already in terminal state (${currentIncidentData.state}). Skipping update from Observe.`);
            return { message: `Incident ${incidentId} is already in terminal state` };
        }
        loggerInstance.info(`[${operationName}] Resolve Incident Endpoint: ${endpointUrl}`);

        if (customerConfig?.resolvePrerequisiteState?.stateValue) {
            loggerInstance.info(`[${operationName}] Initiating prerequisite state update before resolve`);
        }

        await ensureResolvePrerequisiteState({
            incidentId,
            sysId,
            currentState: currentIncidentData?.state,
            incidentData,
            authHeader,
            vaultPath,
            customerConfig,
            operationName,
        });

        const fieldMap = getFieldMappingForOperation('PUT_RESOLVE', customerConfig) || getFieldMappingForOperation('PUT', customerConfig);
        const defaultValues = customerConfig?.defaultValues as Record<string, string> | undefined;
        const prioritizeDefaults = customerConfig?.prioritizeDefaults as string[] | undefined;
        const resolveDefaultKeys = ['state', 'close_code', 'close_notes'];
        const effectivePrioritizeDefaults = Array.from(new Set([...(prioritizeDefaults || []), ...resolveDefaultKeys]));
        const finalResolveBody = buildResolveOrCloseIncidentBody(
            incidentData,
            fieldMap,
            'resolve',
            defaultValues,
            effectivePrioritizeDefaults
        );

        loggerInstance.info(`[${operationName}] Incident resolve payload is: ${JSON.stringify(finalResolveBody)}`);

        // Setup headers for middleware (for client_id/client_secret auth)
        let headers: any;

        if (customerConfig?.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        let response: any;

        try {
            response = await executeWithRetry(
                () =>
                    axiosInstance.put(endpointUrl, finalResolveBody, {
                        headers,
                        timeout: 45000,
                    }),
                { operationName }
            );

        } catch (error: any) {
            loggerInstance.debug(`[${operationName}] The error is: ${error}`);
            throw new ResolveIncidentError(error, incidentId);
        }

        loggerInstance.info(`[${operationName}] Incident: ${incidentId} resolved successfully`);

        const auditLogData = {
            timestamp: new Date().toISOString(),
            status: 'Success',
            details: {
                URL: endpointUrl,
                method: 'PUT',
                incident_id: incidentId,
                message: 'Successfully resolved the incident'
            }
        };
        auditLogApi(auditLogData, `Resolve ServiceNow Incident ${incidentId}`);
        return response.data;

    } catch (error: any) {
        const apiPrefix = customerConfig?.apiPrefix ?? '/api/now';
        const endpointType = customerConfig?.endpoints?.['PUT']?.type ?? 'table';
        const endpointTable = customerConfig?.endpoints?.['PUT']?.table ?? 'incident';

        const statusCode = error?.response?.status;
        const serviceNowBody = error?.response?.data;
        const serviceNowMessage =
            serviceNowBody?.message ||
            serviceNowBody?.result?.message ||
            serviceNowBody?.result?.error ||
            serviceNowBody?.error?.message ||
            undefined;
        const baseErrorMessage = error?.message || 'Error resolving incident';
        const errorMessage = serviceNowMessage
            ? `${baseErrorMessage} | ServiceNow: ${serviceNowMessage}`
            : baseErrorMessage;

        loggerInstance.error(`[${operationName}] Error resolving incident: ${errorMessage}`, {
            path: path.relative(process.cwd(), __filename),
            statusCode,
            serviceNowResponse: serviceNowBody
        });
        try {
            await sendServicenowFailureAlertToTeams({
                incidentId: incidentData.incidentId,
                tenantId: customerConfig?.name || incidentData.tenant_id,
                errorMessage,
                failureType: 'resolve',
                extraDetails: {
                    scenarioId: incidentData.scenario_id,
                },
            });

        } catch (teamsError: any) {
            loggerInstance.warn(`[${operationName}] Failed to send Teams notification for close failure: ${teamsError.message}`);
        }
        // 🔔 Notify Observe only if resolution fails
        try {
            const ext_api_url = config.externalApiUrl;
            let observeMessageUrl = apiKeyToken
                ? `${ext_api_url}/api/scenario/message?apikey=${apiKeyToken}`
                : `${ext_api_url}/api/scenario/message`;

            const scenarioMessageBody = {
                scenarioId: incidentData.scenario_id,
                message: 'Incident can be resolved as all the triggered alerts have been resolved based on monitoring reset alerts.'
            };

            await axiosInstance.post(observeMessageUrl, scenarioMessageBody);
        } catch (observeMsgError: any) {
            const status = observeMsgError?.response?.status;
            const responseData = observeMsgError?.response?.data;
            const errorMessage = observeMsgError?.message || 'Failed to post scenario message to Observe';

            const observeMessageErrorMessage = `${errorMessage}${status ? ` | Status: ${status}` : ''}${responseData?.message ? ` | Message: ${responseData.message}` : ''}`;

            loggerInstance.error(`❌ [${operationName}] Observe API scenario/message failed: ${observeMessageErrorMessage}`, {
                path: path.relative(process.cwd(), __filename),
                statusCode: status,
                responseMessage: responseData?.message || JSON.stringify(responseData) || 'No response data',
                scenarioMessagePayload: {
                    scenarioId: incidentData?.scenario_id,
                    message: 'Incident can be resolved as all the triggered alerts have been resolved based on monitoring reset alerts.',
                }
            });
            try {
                await sendServicenowFailureAlertToTeams({
                    incidentId: incidentData?.incidentId || 'Unknown',
                    tenantId: customerConfig?.name || incidentData?.tenant_id || 'Unknown',
                    errorMessage: `Observe message update to chatops API for scenarioId: ${incidentData?.scenario_id} failed: ${observeMessageErrorMessage}`,
                    failureType: 'observeNotify',
                    extraDetails: {
                        scenarioId: incidentData.scenario_id,
                    },
                });
            } catch (teamsAlertError: any) {
                loggerInstance.warn(`[${operationName}] Failed to send Teams alert for Observe notify failure: ${teamsAlertError.message}`, {
                    path: path.relative(process.cwd(), __filename)
                });
            }
        }
        const auditLogData = {
            timestamp: new Date().toISOString(),
            status: 'Failure',
            details: {
                URL: `${customerConfig?.baseUrl}${apiPrefix}/${endpointType}/${endpointTable}`,
                method: 'PUT',
                message: error?.message || 'Error resolving incident'
            }
        };
        auditLogApi(auditLogData, `Resolve ServiceNow Incident ${incidentData.incidentId}`);
        throw error;
    }
};

const ensureResolvePrerequisiteState = async ({
    incidentId,
    sysId,
    currentState,
    incidentData,
    authHeader,
    vaultPath,
    customerConfig,
    operationName,
}: EnsureResolvePrerequisiteStateParams) => {

    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    
    if (!customerConfig?.resolvePrerequisiteState || !sysId) return;

    const { stateValue, endpointKey } = customerConfig.resolvePrerequisiteState;
    if (!stateValue) return;

    loggerInstance.info(`[${operationName}] Preparing prerequisite state update, current state: ${currentState}, desired state: ${stateValue}`);

    if (currentState === stateValue) {
        loggerInstance.info(`[${operationName}] Prerequisite state already satisfied for incident ${incidentId} current state: ${currentState}, desired state: ${stateValue}`);
        return;
    }

    const method = (endpointKey || 'PATCH') as EndpointMethod;
    const fallbackMethods: EndpointMethod[] = method === 'PUT' ? [] : ['PUT'];
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;

    let endpoint: string;
    try {
        endpoint = buildEndpointUrl(method, baseUrl, customerConfig, ...fallbackMethods);
    } catch (error: any) {
        loggerInstance.warn(`[${operationName}] Skipping prerequisite state update: ${error?.message || 'unable to build endpoint URL'}`);
        return;
    }

    const appendSysId = shouldAppendSysIdInEndpoint(customerConfig, method, ...fallbackMethods);
    const endpointUrl = appendSysId ? `${endpoint}/${sysId}` : endpoint;

    const fieldMap = getFieldMappingForOperation(method, customerConfig) || customerConfig?.fieldMapping || {};
    const stateMapping = fieldMap?.state || 'state';

    const payload: Record<string, any> = {};
    const assignValue = (mapping: string | string[], value: any) => {
        if (Array.isArray(mapping)) {
            mapping.forEach(key => {
                if (key) payload[key] = value;
            });
        } else if (mapping) {
            payload[mapping] = value;
        }
    };

    assignValue(stateMapping, stateValue);

    const stateFields = ['state', 'incident_state'];
    stateFields.forEach(field => {
        if (payload[field] === undefined) {
            payload[field] = stateValue;
        }
    });

    let headers: any;
    if (customerConfig?.apiType === 'middleware') {
        headers = await getMiddlewareHeaders(vaultPath, authHeader);
    } else {
        headers = validateAuthHeader(authHeader);
    }

    const requestOperation = `${operationName}:prerequisiteState`;
    const requestFn = method === 'PATCH'
        ? () => axiosInstance.patch(endpointUrl, payload, { headers, timeout: 45000 })
        : () => axiosInstance.put(endpointUrl, payload, { headers, timeout: 45000 });

    try {
        await executeWithRetry(requestFn, { operationName: requestOperation });
        loggerInstance.info(`[${operationName}] Incident ${incidentId} moved to prerequisite state before resolve, current state: ${currentState}, updated state: ${stateValue}`);
    } catch (error: any) {
        loggerInstance.error(`[${operationName}] Failed to set prerequisite state: ${error?.message || error}`, {
            path: path.relative(process.cwd(), __filename),
        });
        throw error;
    }
};
