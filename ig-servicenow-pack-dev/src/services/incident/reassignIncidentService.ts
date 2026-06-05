import { AxiosInstance } from 'axios';
import { Container } from 'typedi';
import path from 'path';
import winston from 'winston';
import config from '../../config';
import { auditLogApi } from '../../utils/external-apis/core-apis';
import { CustomerConfig } from '../../interfaces/scenario/index';
import {
  validateAuthHeader,
  getTicketStatus,
  buildEndpointUrl,
  buildReassignIncidentBody,
  getFieldMappingForOperation,
  shouldAppendSysIdInEndpoint,
  doesAssignmentGroupMatch,
} from './incidentUtils';
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { ReassignIncidentError } from '../../utils/errorHandling';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';

export const reassignIncident = async (updatedIncidentData: any, authHeader: string, vaultPath: any, customerConfig?: CustomerConfig | undefined) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const axiosInstance: AxiosInstance = Container.get('axiosInstance');

  const incidentId = updatedIncidentData.incidentId;
  const observeAssignmentGroup = updatedIncidentData.observe_assignment_group;
  const operationName = `reassignIncident:${incidentId}`;

  try {

    loggerInstance.info(`[${operationName}] Incoming reassignment request`);

    const { sys_id, status, state, assignment_group, assignment_group_name } = await getTicketStatus(
      incidentId,
      authHeader,
      updatedIncidentData,
      vaultPath
    );

    const assignmentMatches = doesAssignmentGroupMatch(
      assignment_group,
      assignment_group_name,
      observeAssignmentGroup
    );

    const terminalStates = ['6', '7', '8'];
    const isTerminalState = terminalStates.includes(state?.toString());

    if (status !== 'true' || isTerminalState || !assignmentMatches) {
      loggerInstance.info(`[${operationName}] Incident ${incidentId} not eligible for reassignment`);
      return null;
    }

    if (!sys_id) {
      throw new Error(`Incident with ID ${incidentId} not found.`);
    }

    const fieldMap = getFieldMappingForOperation('PUT_REASSIGN', customerConfig) || getFieldMappingForOperation('PUT', customerConfig);
    const updateIncidentBody = buildReassignIncidentBody(updatedIncidentData, customerConfig, fieldMap);

    loggerInstance.info(`[${operationName}] ReassignIncident body: ${JSON.stringify(updateIncidentBody)}`);

    const baseUrl = customerConfig?.baseUrl || updatedIncidentData.base_url;
    const endpoint = buildEndpointUrl('PUT_REASSIGN', baseUrl, customerConfig, 'PUT');
    const appendSysIdInEndpoint = shouldAppendSysIdInEndpoint(customerConfig, 'PUT_REASSIGN', 'PUT');
    const endpointUrl = appendSysIdInEndpoint === false ? endpoint : `${endpoint}/${sys_id}`;

    loggerInstance.info(`[${operationName}] Reassign Incident Endpoint: ${endpointUrl}`, {
      appendSysIdInEndpoint,
    });

    // Setup headers for middleware (for client_id/client_secret auth)
    let headers: any;

    if (customerConfig?.apiType === 'middleware') {
      headers = await getMiddlewareHeaders(vaultPath, authHeader);
    } else {
      headers = validateAuthHeader(authHeader);
    }

    let response;
    try {
      response = await executeWithRetry(
        () =>
          axiosInstance.put(endpointUrl, updateIncidentBody, {
            headers,
            timeout: 45000,
          }),
        { operationName }
      );
    } catch (error: any) {
      loggerInstance.error(`[${operationName}] Error while reassigning incident: ${error.message}`);
      throw new ReassignIncidentError(error, incidentId);
    }

    loggerInstance.info(`[${operationName}] Incident reassigned successfully`);

    // Update reassignment indicator in Redis
    const ext_api_url = config.externalApiUrl;
    const apiKeyToken = config.apiKey;
    const observeURLRedis = apiKeyToken
      ? `${ext_api_url}/api/scenario/updateReassignmentToRedis?apikey=${apiKeyToken}`
      : `${ext_api_url}/api/scenario/updateReassignmentToRedis`;

    const ticketInfoBody = {
      scenarioId: updatedIncidentData.scenario_id,
    };

    await executeWithRetry(
        () => axiosInstance.post(observeURLRedis, ticketInfoBody),
        { operationName: `${operationName}:observeRedis` }
      );

    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Success',
      details: {
        URL: endpointUrl,
        method: 'PUT',
        updated_fields: updateIncidentBody,
        message: 'Incident reassigned successfully',
      },
    };

    auditLogApi(auditLogData, `Reassign ServiceNow Incident ${incidentId}`);

    return response.data;

  } catch (error: any) {
    const apiPrefix = customerConfig?.apiPrefix ?? '/api/now';
    const endpointType = customerConfig?.endpoints?.['PUT']?.type ?? 'table';
    const endpointTable = customerConfig?.endpoints?.['PUT']?.table ?? 'incident';
    const errorMessage = error?.message || 'Error creating incident';
    loggerInstance.error(`[${operationName}] Error reassigning incident: ${errorMessage}`, {path: path.relative(process.cwd(), __filename)});

    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Failure',
      action: 'incidentReassignment',
      details: {
        URL: `${customerConfig?.baseUrl}${apiPrefix}/${endpointType}/${endpointTable}`,
        method: 'PUT',
        message: errorMessage,
      },
    };

    auditLogApi(auditLogData, `Reassign ServiceNow Incident ${updatedIncidentData.incidentId}`);

    await sendServicenowFailureAlertToTeams({
      incidentId: updatedIncidentData.incidentId,
      tenantId: customerConfig?.name || updatedIncidentData.tenant_id,
      errorMessage,
      failureType: 'reassign',
      extraDetails: {
        scenarioId: updatedIncidentData.scenario_id,
      },
    });
    if (error instanceof ReassignIncidentError) {
      throw error;
    }
    throw new ReassignIncidentError(error, incidentId);
  }
};
