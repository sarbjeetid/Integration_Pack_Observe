import { AxiosInstance } from 'axios';
import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import { auditLogApi } from '../../utils/external-apis/core-apis';
import { CustomerConfig } from '../../interfaces/scenario/index';
import {
  getSysIdForIncident,
  validateAuthHeader,
  buildEndpointUrl,
  buildResolveOrCloseIncidentBody,
  getTicketStatus,
  getFieldMappingForOperation,
  shouldAppendSysIdInEndpoint,
  doesAssignmentGroupMatch,
} from './incidentUtils';
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { CloseIncidentError } from '../../utils/errorHandling';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';

export const closeIncident = async (incidentData: any, authHeader: string, vaultPath?: any, customerConfig?: CustomerConfig | undefined) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const axiosInstance: AxiosInstance = Container.get('axiosInstance');

  try {
    const incidentId = incidentData.incidentId;
    const close_notes = incidentData.close_notes;

    const sysId = await getSysIdForIncident(incidentId, authHeader, incidentData, customerConfig, vaultPath);

    // Conditional skip if transient (observe assignment group)
    if (incidentData?.observe_assignment_group) {
      const ticketStatus = await getTicketStatus(incidentId, authHeader, incidentData, vaultPath);
      const status = ticketStatus?.status;
      const assignmentMatches = doesAssignmentGroupMatch(
        ticketStatus?.assignment_group,
        ticketStatus?.assignment_group_name,
        incidentData.observe_assignment_group
      );

      if (status !== "true" || !assignmentMatches) {
        loggerInstance.info(`Close Incident Call skipped for ${incidentId} — transient assignment condition not met`);
        return null;
      }
    }

    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const endpoint = buildEndpointUrl('PUT_CLOSE', baseUrl, customerConfig, 'PUT');
    const appendSysIdInEndpoint = shouldAppendSysIdInEndpoint(customerConfig, 'PUT_CLOSE', 'PUT');
    const endpointUrl = appendSysIdInEndpoint === false ? endpoint : `${endpoint}/${sysId}`;

    loggerInstance.info(`Close Incident Endpoint: ${endpointUrl}`);

    const fieldMap = getFieldMappingForOperation('PUT_CLOSE', customerConfig) || getFieldMappingForOperation('PUT', customerConfig);
    const defaultValues = customerConfig?.defaultValues as Record<string, string> | undefined;
    const prioritizeDefaults = customerConfig?.prioritizeDefaults as string[] | undefined;
    const closeDefaultKeys = ['state', 'close_code', 'close_notes'];
    const effectivePrioritizeDefaults = Array.from(new Set([...(prioritizeDefaults || []), ...closeDefaultKeys]));
    const finalCloseBody = buildResolveOrCloseIncidentBody(
      incidentData,
      fieldMap,
      'close',
      defaultValues,
      effectivePrioritizeDefaults
    );

    loggerInstance.info(`Incident close payload is: ${JSON.stringify(finalCloseBody)}`);

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
          axiosInstance.put(endpointUrl, finalCloseBody, {
            headers,
            timeout: 45000,
          }),
        {
          operationName: 'ServiceNow Close Incident'
        }
      );
    } catch (error: any) {
      loggerInstance.error(`Error while closing incident: ${error.message}`);
      throw new CloseIncidentError(error, incidentId);
    }

    loggerInstance.info(`Incident: ${incidentId} closed successfully`);

    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Success',
      details: {
        URL: endpointUrl,
        method: 'PUT',
        incident_id: incidentId,
        message: 'Successfully closed the incident'
      }
    };
    auditLogApi(auditLogData, `Close ServiceNow Incident ${incidentId}`);
    return response.data;

  } catch (error: any) {
    const apiPrefix = customerConfig?.apiPrefix ?? '/api/now';
    const endpointType = customerConfig?.endpoints?.['PUT']?.type ?? 'table';
    const endpointTable = customerConfig?.endpoints?.['PUT']?.table ?? 'incident';

    const errorMessage = error?.message || 'Error closing incident';
    loggerInstance.error(`Error closing incident: ${errorMessage}`, {
      path: path.relative(process.cwd(), __filename),
    });

    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Failure',
      details: {
        URL: `${customerConfig?.baseUrl}${apiPrefix}/${endpointType}/${endpointTable}`,
        method: 'PUT',
        message: errorMessage
      }
    };
    auditLogApi(auditLogData, `Close ServiceNow Incident ${incidentData.incidentId}`);
    // 🔔 Send MS Teams notification on failure
    try {
      await sendServicenowFailureAlertToTeams({
        incidentId: incidentData.incidentId,
        tenantId: customerConfig?.name || incidentData.tenant_id,
        errorMessage,
        failureType: 'close',
        extraDetails: {
          scenarioId: incidentData.scenario_id,
        },
      });
    } catch (teamsError: any) {
      loggerInstance.warn(`Failed to send Teams notification for close failure: ${teamsError.message}`);
    }
    throw error;
  }
};
