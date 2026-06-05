import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';
import {
  validateAuthHeader,
  buildEndpointUrl,
  getFieldMappingForOperation,
} from './incidentUtils';
import { getMiddlewareHeaders } from '../../services/authentication/authService';
import { CustomerConfig } from '../../interfaces/scenario';
import { FetchIncidentError } from '../../utils/errorHandling';
import { executeWithRetry } from '../../utils/retry-apis/retryExecutor';

const cache = new NodeCache();

export const fetchIncidentData = async (
  incidentData: any,
  authHeader: string,
  vaultPath: string,
  customerConfig?: CustomerConfig | undefined
) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');

  const operationName = `fetchIncidentData:${incidentData?.tenant_id ?? 'unknown'}`;

  try {

    const formattedDates = formatDates(incidentData.start_time, incidentData.end_time);
    const query = `sys_created_onBETWEEN${formattedDates.startDateTime}@${formattedDates.endDateTime}`;
    const encodedQuery = encodeURIComponent(query);

    const fieldMap = getFieldMappingForOperation('GET', customerConfig);
    
    let scenarioIdFields: string[];
    if (fieldMap?.scenario_id) {
      scenarioIdFields = Array.isArray(fieldMap.scenario_id)
        ? fieldMap.scenario_id
        : [fieldMap.scenario_id];
    } else {
      scenarioIdFields = ['u_scenario_id', 'u_reference_id', 'correlation_id', 'u_correlation_display'];
    }

    const fields = `number,description,short_description,incident_state,assigned_to,priority,sys_created_on,active,${scenarioIdFields}`;

    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const endpoint = buildEndpointUrl('GET', baseUrl, customerConfig);
    const serviceNowUrl = `${endpoint}?sysparm_fields=${encodeURIComponent(fields)}&sysparm_query=${encodedQuery}`;

    let headers;
    if (customerConfig?.apiType === 'middleware') {
      headers = await getMiddlewareHeaders(vaultPath, authHeader);
    } else {
      headers = validateAuthHeader(authHeader);
    }

    const response = await callServiceNowAPI(serviceNowUrl, headers, operationName);
    const incidents: any = { incidents: [] };
    for (const request of response.result) {
      
      // Extract the first non-null field from the list
      const observeIdRef = scenarioIdFields
        .map((field: string) => request?.[field])
        .find((value) => value !== undefined && value !== null);
      if (!observeIdRef) continue;
      const assignedTo = typeof request.assigned_to === 'object' && request.assigned_to?.value
        ? request.assigned_to.value
        : null;

      let userResponse = { name: 'Unassigned', email: '' };
           
      userResponse = assignedTo
        ? await getUserNameAndEmailFromServiceNow(baseUrl, assignedTo, headers, customerConfig, operationName)
        : {};

      const requestData: any = {
        ticket_number: request.number,
        assigned_to: {
          name: userResponse?.name || 'Unassigned',
          email: userResponse?.email || ''
        },
        scenario_id: observeIdRef || '',
      };
      // Push the request data to the incidents array
      incidents.incidents.push(requestData);
    }

    return incidents;
  } catch (error: any) {
    const errorMessage = error?.message || 'Error fetching incidents';
    loggerInstance.error(`Error fetching incidents: ${errorMessage}`, { path: path.relative(process.cwd(), __filename) });
    throw new FetchIncidentError(error, incidentData.tenant_id);
  }
};

async function callServiceNowAPI(
  serviceNowUrl: string,
  headers: Record<string, string>,
  parentOperation: string
): Promise<any> {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const axiosInstance: AxiosInstance = Container.get('axiosInstance');
  try {
    // const response = await axiosInstance.get(serviceNowUrl, { headers });
    const response = await executeWithRetry(
      () => axiosInstance.get(serviceNowUrl, { headers, timeout: 45000 }),
      { operationName: parentOperation }
    );
    return response.data;
  } catch (error: any) {
    loggerInstance.error(`Error fetching data from ServiceNow: ${error.message}`);
    throw error;
  }
}

function formatDates(startTime: string, endTime: string) {
  const format = (str: string) => str.slice(0, 19).replace('T', ' ');
  return {
    startDateTime: format(startTime),
    endDateTime: format(endTime),
  };
}

async function getUserNameAndEmailFromServiceNow(
  baseUrl: string,
  assignedTo: string,
  headers: Record<string, string>,
  customerConfig: CustomerConfig | undefined,
  parentOperation: string
) {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const axiosInstance: AxiosInstance = Container.get('axiosInstance');

  try {
    const cacheKey = `NameAndEmailFromServiceNow-${assignedTo}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const endpoint = buildEndpointUrl('GET-USER', baseUrl, customerConfig);
    const userUrl = `${endpoint}/${assignedTo}?sysparm_fields=name,email`;

    const userResponse = await executeWithRetry(
      () => axiosInstance.get(userUrl, { headers, timeout: 45000 }),
      { operationName: parentOperation }
    );
    // const userResponse = await axiosInstance.get(userUrl, { headers });
    const user = userResponse.data.result || {};
    cache.set(cacheKey, user);
    return user;
  } catch (error: any) {
    loggerInstance.error(`[${parentOperation}] Error fetching user details from ServiceNow: ${error.message}`);
    return {};
  }
}
