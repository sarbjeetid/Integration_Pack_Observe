import { closeIncident } from '../../../src/services/incident/closeIncidentService';
import { Container } from 'typedi';
import winston from 'winston';
import { AxiosInstance } from 'axios';
import { CustomerConfig } from '../../../src/interfaces/scenario';

import {
  getSysIdForIncident,
  validateAuthHeader,
  buildEndpointUrl,
  buildResolveOrCloseIncidentBody,
  getTicketStatus,
  getFieldMappingForOperation,
  doesAssignmentGroupMatch,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { CloseIncidentError } from '../../../src/utils/errorHandling';

jest.mock('../../../src/services/incident/incidentUtils');
jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/external-apis/core-apis');
jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams');
jest.mock('../../../src/utils/retry-apis/retryExecutor', () => ({
  executeWithRetry: jest.fn((fn) => fn()),
}));

const mockLogger: Partial<winston.Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
  put: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  jest.spyOn(Container, 'get').mockImplementation((key: any) => {
    if (key === 'loggerInstance') return mockLogger as any;
    if (key === 'axiosInstance') return mockAxiosInstance as any;
    return null as any;
  });

  (getFieldMappingForOperation as jest.Mock).mockImplementation((method: string, config: any) => config?.fieldMapping || {});
  (doesAssignmentGroupMatch as jest.Mock).mockReturnValue(true);
});

const authHeader = 'Bearer';
const vaultPath = 'vault';

const baseIncidentData: any = {
  incidentId: 'INC300',
  scenario_id: 'SCN300',
  tenant_id: 'TENANT1',
  base_url: 'https://sn.instance',
};

const baseCustomerConfig = {
  name: 'TENANT1',
  apiType: 'servicenow',
  baseUrl: 'https://sn.instance',
  fieldMapping: {},
  endpoints: {
    PUT: { type: 'table', table: 'incident' },
  },
} as unknown as CustomerConfig;


describe('closeIncident', () => {

  it('closes incident successfully', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({ state: '7' });
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({
      data: { closed: true },
    });

    const result = await closeIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(getSysIdForIncident).toHaveBeenCalledWith(
      'INC300',
      authHeader,
      baseIncidentData,
      baseCustomerConfig,
      vaultPath
    );

    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      'ENDPOINT/SYS300',
      { state: '7' },
      expect.objectContaining({
        headers: { Authorization: authHeader },
      })
    );

    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Success' }),
      'Close ServiceNow Incident INC300'
    );

    expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
    expect(result).toEqual({ closed: true });
  });

  /*  TRANSIENT / OBSERVE GUARD  */
  it('returns null when observe_assignment_group mismatch', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS300',
      status: 'false',
      assignment_group: 'OTHER',
      assignment_group_name: 'Other Team',
    });

    const result = await closeIncident(
      { ...baseIncidentData, observe_assignment_group: 'OBSERVE' },
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toBeNull();
    expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    expect(auditLogApi).not.toHaveBeenCalled();
  });

  it('closes incident when observe group matches assignment name', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({ state: '7' });
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS300',
      status: 'true',
      assignment_group: 'OTHER',
      assignment_group_name: 'OBSERVE',
    });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: { closed: true } });

    const result = await closeIncident(
      { ...baseIncidentData, observe_assignment_group: 'OBSERVE' },
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(mockAxiosInstance.put).toHaveBeenCalled();
    expect(result).toEqual({ closed: true });
  });

  /* MIDDLEWARE AUTH  */
  it('uses getMiddlewareHeaders when apiType is middleware', async () => {
    const cfg = { ...baseCustomerConfig, apiType: 'middleware' } as CustomerConfig;

    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HEADER' });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

    await closeIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      cfg
    );

    expect(getMiddlewareHeaders).toHaveBeenCalledWith(vaultPath, authHeader);
    expect(validateAuthHeader).not.toHaveBeenCalled();
  });

  /*  PUT FAILURE */
  it('throws CloseIncidentError when PUT fails', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.put as jest.Mock).mockRejectedValue(
      new Error('PUT FAILED')
    );

    await expect(
      closeIncident(
        baseIncidentData,
        authHeader,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toBeInstanceOf(CloseIncidentError);

    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'INC300',
        failureType: 'close',
      })
    );
  });

  /* TEAMS FAILURE INSIDE CATCH  */
  it('handles Teams alert failure gracefully', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS300');
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.put as jest.Mock).mockRejectedValue(
      new Error('PUT FAILED')
    );

    (sendServicenowFailureAlertToTeams as jest.Mock).mockRejectedValue(
      new Error('TEAMS FAIL')
    );

    await expect(
      closeIncident(
        baseIncidentData,
        authHeader,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toThrow();

    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Failure' }),
      'Close ServiceNow Incident INC300'
    );
  });
});
