import { AxiosInstance } from 'axios';
import { Container } from 'typedi';
import path from "path";
import winston from 'winston';
import config from "../../config";
import { auditLogApi } from '../../utils/external-apis/core-apis';
import { CustomerConfig } from '../../interfaces/scenario/index';
import { getMiddlewareHeaders } from '../../services/authentication/authService';

import {
    validateAuthHeader,
    buildCreateIncidentBody,
    associateCIWithIncident,
    buildEndpointUrl,
    createScheduleInObserve,
    getFieldMappingForOperation,
} from './incidentUtils';
import { CreateIncidentError } from '../../utils/errorHandling';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';
import { 
    acquireIncidentLock,
    releaseIncidentLock
} from '../../utils/incidentLock';
import { 
    clearIncidentPending,
    getRegisteredIncident,
    isIncidentPending,
    markIncidentPending,
    registerIncident
} from '../../utils/incidentRegistry';
import { registerReassignmentSchedule } from '../../utils/reassignmentScheduleRegistry';

export const createIncident = async (incidentData: any, authHeader: string, apiKeyToken?: string, vaultPath?: any, customerConfig?: CustomerConfig | undefined) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    let observeUpdateSuccess = true;
    let scheduleCreationSuccess = true;

    let observeUpdateErrorMessage = '';
    let scheduleCreationErrorMessage = '';

    // 🔐 ADD: OBSERVE idempotency check
    const existingIncident = await getRegisteredIncident(incidentData.scenario_id);
    if (existingIncident) {
        loggerInstance.warn(
            `♻️ Incident already exists for scenario ${incidentData.scenario_id}: ${existingIncident.incidentNumber}`
        );
        return existingIncident;
    }

    // 🔐 ADD: Pending ambiguity guard
    if (await isIncidentPending(incidentData.scenario_id)) {
        throw new Error(
            `Incident creation in uncertain state for scenario ${incidentData.scenario_id}`
        );
    }

    // 🔐 ADD: Distributed lock
    const lockAcquired = await acquireIncidentLock(incidentData.scenario_id);
    if (!lockAcquired) {
        throw new Error(`Incident creation already in progress for ${incidentData.scenario_id}`);
    }

    try {
        await markIncidentPending(incidentData.scenario_id);

        const fieldMap = getFieldMappingForOperation('POST', customerConfig);
        const defaultValues = customerConfig?.defaultValues as Record<string, string> | undefined;
        const prioritizeDefaults = customerConfig?.prioritizeDefaults as string[] | undefined;

        const createIncidentBody = buildCreateIncidentBody(
            incidentData,
            fieldMap,
            defaultValues,
            prioritizeDefaults
        );

        loggerInstance.info(`Incident create payload is: ${JSON.stringify(createIncidentBody)}`);

        // Construct endpoint based on customerConfig
        const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
        const endpoint = buildEndpointUrl('POST', baseUrl, customerConfig);

        loggerInstance.info(`Create Incident Endpoint: ${endpoint}`);
        // Setup headers for middleware (for client_id/client_secret auth)
        let headers: any;

        if (customerConfig?.apiType === 'middleware') {
            headers = await getMiddlewareHeaders(vaultPath, authHeader);
        } else {
            headers = validateAuthHeader(authHeader);
        }

        let responseIncidentCreated: any;

        try {
            // 🔁 ADD: Retry-safe creation
            responseIncidentCreated = await executeWithRetry(
                () =>
                    axiosInstance.post(endpoint, createIncidentBody, {
                        headers,
                        timeout: 45000,
                    }),
                {
                    operationName: 'ServiceNow Create Incident',
                    retries: 2,
                }
            );
        } catch (error: any) {
            loggerInstance.error(`Error while creating incident: ${error.message}`);
            await clearIncidentPending(incidentData.scenario_id).catch(() => {});
            throw new CreateIncidentError(error, incidentData.incidentId);
        }

        const transformResult = responseIncidentCreated.data?.result?.[0] || responseIncidentCreated.data?.result;

        loggerInstance.debug(`transformResult: ${JSON.stringify(transformResult)}`);
        
        if (!transformResult || !transformResult.sys_id) {
            await clearIncidentPending(incidentData.scenario_id).catch(() => {});
            throw new CreateIncidentError(new Error("Transform result did not return a valid sys_id."), incidentData.incidentId);
        }

        const incidentSysId = transformResult.sys_id;

        // 🔐 ADD: Register incident in OBSERVE
        await registerIncident(
            incidentData.scenario_id,
            transformResult.number,
            incidentSysId
        );

        // Link a CI to an incident ticket if customerConfig.linkCI is true
        let response;

        if (incidentData.sys_ci_id && customerConfig?.linkCI) {
            response = await associateCIWithIncident(
                incidentSysId,
                incidentData.sys_ci_id,
                authHeader,
                incidentData,
                customerConfig,
                vaultPath
            );
        } else {
            response = responseIncidentCreated.data;
        }

        // Update ticket number in Kibana
        const ext_api_url = config.externalApiUrl;
        let observeURL = apiKeyToken
            ? `${ext_api_url}/api/scenario/updateTicketInfo?apikey=${apiKeyToken}`
            : `${ext_api_url}/api/scenario/updateTicketInfo`;

        let ticketInfoBody: any = {
            scenarioId: incidentData.scenario_id,
            integration: 'servicenow',
            ticketNumber: transformResult.number,
        };

        if (incidentData?.reassignment_action_id && incidentData?.observe_assignment_group) {
            ticketInfoBody.updated_assignment_group = incidentData.assignment_group;
        }

        try {
            await executeWithRetry(
                () =>
                    axiosInstance.post(observeURL, ticketInfoBody, {
                        timeout: 20000,
                    }),
                { operationName: 'Observe Ticket Update' }
            );
            loggerInstance.info(`✅ Observe API updateTicketInfo succeeded for incident ${transformResult.number}`);
            
        } catch (observeError: any) {
            observeUpdateSuccess = false;

            const status = observeError?.response?.status;
            const responseData = observeError?.response?.data;
            const errorMessage = observeError?.message || 'Failed to update ticket info in Observe';
            const responseMessage = typeof responseData === 'string'
                ? responseData
                : responseData?.message || JSON.stringify(responseData) || 'No response data';

            observeUpdateErrorMessage = `${errorMessage}${status ? ` | Status: ${status}` : ''}${responseMessage ? ` | Message: ${responseMessage}` : ''}`;

            loggerInstance.error(`❌ Observe API updateTicketInfo failed: ${observeUpdateErrorMessage}`, {
                path: path.relative(process.cwd(), __filename),
                statusCode: status,
                responseMessage,
                ticketPayload: ticketInfoBody,
            });
        }

        // Create reassignment schedule
        if (incidentData?.reassignment_action_id) {
            loggerInstance.info('Incident will be assigned to Engineer queue.');

            if(incidentData.first_execution === 'immediate'){
                incidentData.transient_time = 1; // 0 is not accecpted for the schdeule api, since the first_execution is immediate, giving interval will not make any difference
            }
            const scheduleBody = {
                interval_value: incidentData?.transient_time,
                edge_id: incidentData?.edge_id,
                reassignment_action_id: incidentData.reassignment_action_id,
                ticket_no: transformResult.number,
                vault_path: incidentData.vault_path,
                base_url: customerConfig?.baseUrl || incidentData.base_url,
                observe_assignment_group: incidentData?.observe_assignment_group,
                updated_assignment_group: incidentData?.assignment_group,
                scenario_id: incidentData.scenario_id,
                tenant_id: incidentData.tenant_id,
                first_execution: incidentData.first_execution,
            };
            try {
                const scheduleResponse = await createScheduleInObserve(scheduleBody);
                await registerReassignmentSchedule(
                    incidentData.scenario_id,
                    scheduleResponse?._id
                );
                loggerInstance.info(`✅ Schedule creation succeeded for incident ${transformResult.number}`);
            } catch (scheduleError: any) {
                scheduleCreationSuccess = false;
                scheduleCreationErrorMessage = scheduleError?.message || 'Failed to create reassignment schedule in Observe';
                loggerInstance.error(`❌ Schedule creation failed in create incident: ${scheduleCreationErrorMessage}`, { path: path.relative(process.cwd(), __filename) });
            }
        };
        await clearIncidentPending(incidentData.scenario_id).catch(() => {});
        
        const auditLogData = {
            timestamp: new Date().toISOString(),
            status: 'Success',
            details: {
                URL: endpoint,
                method: 'POST',
                payload: `${JSON.stringify(createIncidentBody)}`,
                message: 'Successfully created incident'
            }
        };
        auditLogApi(auditLogData, `Create ServiceNow Incident ${transformResult.number}`);

        // ALERTING
        if (!observeUpdateSuccess && !scheduleCreationSuccess) {
            const msg = `Incident: ${transformResult.number} created successfully but **both** Observe ticket update and schedule creation failed.`;
            loggerInstance.warn(msg);
            await sendServicenowFailureAlertToTeams({
                incidentId: transformResult.number,
                tenantId: customerConfig?.name || incidentData.tenant_id,
                errorMessage: `${observeUpdateErrorMessage}\n\n${scheduleCreationErrorMessage}`,
                failureType: 'postCreateAction',
                customActionMessage: msg,
                extraDetails: {
                    scenarioId: incidentData.scenario_id,
                    endpoint,
                    payload: createIncidentBody,
                },
            });
        } else if (!observeUpdateSuccess) {
            const msg = `Incident: ${transformResult.number} created successfully but failed to update ticket info in Observe(Kibana).`;
            loggerInstance.warn(msg);
            await sendServicenowFailureAlertToTeams({
                incidentId: transformResult.number,
                tenantId: customerConfig?.name || incidentData.tenant_id,
                errorMessage: observeUpdateErrorMessage,
                failureType: 'postCreateAction',
                customActionMessage: msg,
                extraDetails: {
                    scenarioId: incidentData.scenario_id,
                    endpoint,
                    payload: createIncidentBody,
                },
                
            });
        } else if (!scheduleCreationSuccess) {
            const msg = `Incident: ${transformResult.number} created successfully but failed to create reassignment schedule in Observe.`;
            loggerInstance.warn(msg);
            await sendServicenowFailureAlertToTeams({
                incidentId: transformResult.number,
                tenantId: customerConfig?.name || incidentData.tenant_id,
                errorMessage: scheduleCreationErrorMessage,
                failureType: 'postCreateAction',
                customActionMessage: msg,
                extraDetails: {
                    scenarioId: incidentData.scenario_id,
                    endpoint,
                    payload: createIncidentBody,
                },
            });
        } else {
            loggerInstance.info(`Incident: ${transformResult.number} created and fully updated in Observe successfully`);
        }
        return response;
    } catch (error: any) {
        const apiPrefix = customerConfig?.apiPrefix ?? '/api/now';
        const endpointType = customerConfig?.endpoints?.['POST']?.type ?? 'table';
        const endpointTable = customerConfig?.endpoints?.['POST']?.table ?? 'incident';
        
        const errorMessage = error?.message || 'Error creating incident';
        loggerInstance.error(`Error creating incident: ${errorMessage}`, { path: path.relative(process.cwd(), __filename), });
        await sendServicenowFailureAlertToTeams({
            incidentId:  incidentData?.incidentId || 'N/A',
            tenantId: customerConfig?.name || incidentData.tenant_id,
            errorMessage: errorMessage,
            failureType: 'create',
            extraDetails: {
                scenarioId: incidentData.scenario_id,
            },
        });

        const auditLogData = {
            timestamp: new Date().toISOString(),
            status: 'Failure',
            details: {
                URL: `${customerConfig?.baseUrl}${apiPrefix}/${endpointType}/${endpointTable}`,
                method: 'POST',
                message: errorMessage
            }
        };
        auditLogApi(auditLogData, `Create ServiceNow Incident ${incidentData.incidentId}`);
        await clearIncidentPending(incidentData.scenario_id).catch(() => {});
        throw error;
    } finally {
    await releaseIncidentLock(incidentData.scenario_id);
  }
};
