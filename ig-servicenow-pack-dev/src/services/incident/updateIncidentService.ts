import { Container } from 'typedi';
import path from 'path';
import winston from 'winston';
import { AxiosInstance } from 'axios';
import {
  getSysIdAndPriorityForIncident,
  validateAuthHeader,
  formatIncidentDescription,
  buildEndpointUrl,
  buildUpdateIncidentBody,
  createScheduleInObserve,
  getFieldMappingForOperation,
  shouldAppendSysIdInEndpoint,
} from './incidentUtils';
import { auditLogApi } from '../../utils/external-apis/core-apis';
import { CustomerConfig } from '../../interfaces/scenario/index';
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { UpdateIncidentError } from '../../utils/errorHandling';
import { sendServicenowFailureAlertToTeams } from '../../utils/teams-notification/sendServicenowFailureAlertToTeams';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';
import {
  getReassignmentScheduleId,
  registerReassignmentSchedule,
} from '../../utils/reassignmentScheduleRegistry';

export const updateIncident = async (updatedIncidentData: any, authHeader: string, vaultPath?: any, customerConfig?: CustomerConfig | undefined) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const axiosInstance: AxiosInstance = Container.get('axiosInstance');
  loggerInstance.info(`UpdateIncident updatedIncidentData: ${JSON.stringify(updatedIncidentData)}`);

  const incidentId = updatedIncidentData.incidentId;
  const operationName = `updateIncident:${incidentId}`;
  let scheduleCreationErrorMessage = '';

  loggerInstance.info(`[${operationName}] Incoming payload`, { incidentId });
  try {

    const sysData = await getSysIdAndPriorityForIncident(incidentId, authHeader, updatedIncidentData, customerConfig, vaultPath);
    if (!sysData?.sys_id) {
      throw new Error(`Incident with ID ${incidentId} not found.`);
    }

    const { sys_id, priority, description: existingDescription, short_description} = sysData;

    let updateIncidentBody: any = { incidentId };

    if (updatedIncidentData.scenario_id) {
      updateIncidentBody = {
        ...updateIncidentBody,
        scenario_id: updatedIncidentData.scenario_id,
      };
    }

    if (updatedIncidentData.interface) {
      const appendedShortDescription =
        `${short_description || ''} | ${updatedIncidentData.interface}`;

      updateIncidentBody = {
        ...updateIncidentBody,
        short_description: appendedShortDescription,
      };
    }

    // Conditionally build update fields
    if (updatedIncidentData.affected_ci_names) {
      const updatedDescription = await formatIncidentDescription(existingDescription, updatedIncidentData.affected_ci_names);
      if (existingDescription !== updatedDescription) {
        updateIncidentBody = {
          ...updateIncidentBody,
          description: updatedDescription,
        }
      }
    }
    if (updatedIncidentData.work_notes) {
      updateIncidentBody = {
        ...updateIncidentBody,
        work_notes: updatedIncidentData.work_notes,
      }
    }
    const { impact, urgency, priority: newPriority } = updatedIncidentData || {};
    if (impact !== undefined && urgency !== undefined && newPriority !== undefined && newPriority < priority) {
      updateIncidentBody = {
        ...updateIncidentBody,
        impact: impact,
        urgency: urgency,
      }
    }
    loggerInstance.info(`[${operationName}] UpdateIncident body: ${JSON.stringify(updateIncidentBody)}`);

    const fieldMap = getFieldMappingForOperation('PUT_UPDATE', customerConfig) || getFieldMappingForOperation('PUT', customerConfig);
    const finalUpdateIncidentBody = buildUpdateIncidentBody(updateIncidentBody, fieldMap);
    loggerInstance.info(`UpdateIncident Final body: ${JSON.stringify(finalUpdateIncidentBody)}`);

    const baseUrl = customerConfig?.baseUrl || updatedIncidentData.base_url;
    const endpoint = buildEndpointUrl('PUT_UPDATE', baseUrl, customerConfig, 'PUT');
    const appendSysIdInEndpoint = shouldAppendSysIdInEndpoint(customerConfig, 'PUT_UPDATE', 'PUT');
    const endpointUrl = appendSysIdInEndpoint === false ? endpoint : `${endpoint}/${sys_id}`;

    loggerInstance.info(`[${operationName}] Update Incident Endpoint: ${endpointUrl}`, {
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
          axiosInstance.put(endpointUrl, finalUpdateIncidentBody, {
            headers,
            timeout: 45000,
          }),
        { operationName }
      );
    } catch (error: any) {
      loggerInstance.error(`[${operationName}] Error while updating incident: ${error.message}`);
      throw new UpdateIncidentError(error, incidentId);
    }

    loggerInstance.info(`[${operationName}] Incident: ${incidentId} updated successfully`);

    // Create reassignment schedule
    if (updatedIncidentData?.reassignment_action_id) {
      if (updatedIncidentData.first_execution === 'immediate') {
        updatedIncidentData.transient_time = 1; // 0 is not accecpted for the schdeule api, since the first_execution is immediate, giving interval will not make any difference
      }
      const scheduleId = await getReassignmentScheduleId(updatedIncidentData.scenario_id);
      const scheduleBody = {
        ...(scheduleId ? { schedule_id: scheduleId } : {}),
        interval_value: updatedIncidentData?.transient_time,
        edge_id: updatedIncidentData?.edge_id,
        reassignment_action_id: updatedIncidentData.reassignment_action_id,
        ticket_no: incidentId,
        vault_path: updatedIncidentData.vault_path,
        base_url: baseUrl,
        observe_assignment_group: updatedIncidentData?.observe_assignment_group,
        updated_assignment_group: updatedIncidentData?.assignment_group,
        scenario_id: updatedIncidentData.scenario_id,
        tenant_id: updatedIncidentData.tenant_id,
        first_execution: updatedIncidentData.first_execution,
      };
      try {
        const scheduleResponse = await createScheduleInObserve(scheduleBody);
        await registerReassignmentSchedule(
          updatedIncidentData.scenario_id,
          scheduleResponse?._id || scheduleId || undefined
        );
      } catch (scheduleError: any) {
        scheduleCreationErrorMessage = scheduleError?.message || 'Failed to create reassignment schedule in Observe';
        loggerInstance.error(`❌ [${operationName}] Schedule creation failed in update incident: ${scheduleCreationErrorMessage}`, { path: path.relative(process.cwd(), __filename) });
      }
    };

    // Prepare audit log
    const auditFields = { ...finalUpdateIncidentBody };
    if (auditFields.vault_path) {
      delete auditFields.vault_path;
    }
    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Success',
      details: {
        URL: endpointUrl,
        method: 'PUT',
        updated_fields: auditFields,
        message: 'Incident is updated successfully'
      }
    };
    auditLogApi(auditLogData, `Update ServiceNow Incident ${incidentId}`);
    return response.data;

  } catch (error: any) {
    const apiPrefix = customerConfig?.apiPrefix ?? '/api/now';
    const endpointType = customerConfig?.endpoints?.['PUT']?.type ?? 'table';
    const endpointTable = customerConfig?.endpoints?.['PUT']?.table ?? 'incident';

    const errorMessage = error?.message || 'Error updating incident';
    loggerInstance.error(`[${operationName}] Error updating incident: ${errorMessage}`, { path: path.relative(process.cwd(), __filename) });
    const auditLogData = {
      timestamp: new Date().toISOString(),
      status: 'Failure',
      details: {
        URL: `${customerConfig?.baseUrl}${apiPrefix}/${endpointType}/${endpointTable}`,
        method: 'PUT',
        message: errorMessage
      }
    };

    auditLogApi(auditLogData, `Update ServiceNow Incident ${updatedIncidentData.incidentId}`);

    await sendServicenowFailureAlertToTeams({
      incidentId: updatedIncidentData.incidentId,
      tenantId: customerConfig?.name || updatedIncidentData.tenant_id,
      errorMessage,
      failureType: 'update',
      extraDetails: {
        scenarioId: updatedIncidentData.scenario_id,
        payload: updatedIncidentData
      },
    });

    if (error instanceof UpdateIncidentError) {
      throw error;
    }
    throw new UpdateIncidentError(error, incidentId);
  }
};
