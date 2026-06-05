import { resolveIncident } from '../../../src/services/incident/resolveIncidentService';
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
    getIncidentData,
    getFieldMappingForOperation,
    doesAssignmentGroupMatch,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { ResolveIncidentError } from '../../../src/utils/errorHandling';

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
  debug: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
  put: jest.fn(),
  post: jest.fn(),
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
  incidentId: 'INC200',
  scenario_id: 'SCN200',
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

describe('resolveIncident', () => {

  /* Success */
  it('resolves incident successfully', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '2' });
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({ state: '6' });
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({
      data: { resolved: true },
    });

    const result = await resolveIncident(
      baseIncidentData,
      authHeader,
      undefined,
      vaultPath,
      baseCustomerConfig
    );

    expect(getSysIdForIncident).toHaveBeenCalledWith(
      'INC200',
      authHeader,
      baseIncidentData,
      baseCustomerConfig,
      vaultPath
    );

    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      'ENDPOINT/SYS200',
      { state: '6' },
      {
        headers: { Authorization: authHeader },
        timeout: 45000,
      }
    );


    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Success' }),
      'Resolve ServiceNow Incident INC200'
    );

    expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
    expect(result).toEqual({ resolved: true });
  });

  /*  OBSERVE ASSIGNMENT GUARD  */
  it('returns null when observe_assignment_group mismatch', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS200',
      status: 'false',
      assignment_group: 'OTHER',
      assignment_group_name: 'Other Team',
    });

    const result = await resolveIncident(
      { ...baseIncidentData, observe_assignment_group: 'OBSERVE' },
      authHeader,
      undefined,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toBeNull();
    expect(mockAxiosInstance.put).not.toHaveBeenCalled();
  });

  it('resolves incident when observe group matches assignment name', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '2' });
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({ state: '6' });
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS200',
      status: 'true',
      assignment_group: 'OTHER',
      assignment_group_name: 'OBSERVE',
    });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: { resolved: true } });

    const result = await resolveIncident(
      { ...baseIncidentData, observe_assignment_group: 'OBSERVE' },
      authHeader,
      undefined,
      vaultPath,
      baseCustomerConfig
    );

    expect(mockAxiosInstance.put).toHaveBeenCalled();
    expect(result).toEqual({ resolved: true });
  });

  /*  TERMINAL STATE  */
  it('skips resolve when incident already in terminal state', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '6' });
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');

    const result = await resolveIncident(
      baseIncidentData,
      authHeader,
      undefined,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toEqual({
      message: 'Incident INC200 is already in terminal state',
    });

    expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Success' }),
      expect.stringContaining('already in terminal state')
    );
  });

  /*  MIDDLEWARE AUTH  */
  it('uses getMiddlewareHeaders when apiType is middleware', async () => {
    const cfg = { ...baseCustomerConfig, apiType: 'middleware' } as CustomerConfig;

    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '2' });
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HEADER' });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

    await resolveIncident(
      baseIncidentData,
      authHeader,
      undefined,
      vaultPath,
      cfg
    );

    expect(getMiddlewareHeaders).toHaveBeenCalledWith(vaultPath, authHeader);
    expect(validateAuthHeader).not.toHaveBeenCalled();
  });

  /* RESOLVE API FAILURE */
  it('throws ResolveIncidentError when PUT fails', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '2' });
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.put as jest.Mock).mockRejectedValue(
      new Error('PUT FAILED')
    );

    await expect(
      resolveIncident(
        baseIncidentData,
        authHeader,
        undefined,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toBeInstanceOf(ResolveIncidentError);

    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'INC200',
        failureType: 'resolve',
      })
    );
  });

  /*  OBSERVE MESSAGE FAILURE  */
  it('handles Observe scenario/message failure and sends Teams alert', async () => {
    (getSysIdForIncident as jest.Mock).mockResolvedValue('SYS200');
    (getIncidentData as jest.Mock).mockResolvedValue({ state: '2' });
    (buildResolveOrCloseIncidentBody as jest.Mock).mockReturnValue({});
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.put as jest.Mock).mockRejectedValue(
      new Error('PUT FAIL')
    );

    (mockAxiosInstance.post as jest.Mock).mockRejectedValue(
      new Error('OBSERVE FAIL')
    );

    await expect(
      resolveIncident(
        baseIncidentData,
        authHeader,
        undefined,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toThrow();

    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalled();
    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Failure' }),
      'Resolve ServiceNow Incident INC200'
    );
  });
});
