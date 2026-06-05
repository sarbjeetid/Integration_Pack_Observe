import { reassignIncident } from '../../../src/services/incident/reassignIncidentService';
import { Container } from 'typedi';
import winston from 'winston';
import { AxiosInstance } from 'axios';
import { CustomerConfig } from '../../../src/interfaces/scenario';

import {
  validateAuthHeader,
  getTicketStatus,
  buildEndpointUrl,
  buildReassignIncidentBody,
  getFieldMappingForOperation,
  doesAssignmentGroupMatch,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { ReassignIncidentError } from '../../../src/utils/errorHandling';
import { executeWithRetry } from '../../../src/utils/retry-apis/retryExecutor';


jest.mock('../../../src/services/incident/incidentUtils');
jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/external-apis/core-apis');
jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams');
jest.mock('../../../src/utils/retry-apis/retryExecutor');


const mockLogger: Partial<winston.Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
  put: jest.fn(),
  post: jest.fn(),
};

const normalizeAssignment = (value?: string | null) =>
  value ? value.toString().trim().toLowerCase() : undefined;

beforeEach(() => {
  jest.clearAllMocks();

  jest.spyOn(Container, 'get').mockImplementation((key: any) => {
    if (key === 'loggerInstance') return mockLogger as any;
    if (key === 'axiosInstance') return mockAxiosInstance as any;
    return null as any;
  });
  (executeWithRetry as jest.Mock).mockImplementation((fn) => fn());

  (getFieldMappingForOperation as jest.Mock).mockImplementation(() => ({}));
  (doesAssignmentGroupMatch as jest.Mock).mockImplementation(
    (
      assignmentGroupId?: string | null,
      assignmentGroupName?: string | null,
      expected?: string | null,
    ) => {
      const normalizedExpected = normalizeAssignment(expected);
      if (!normalizedExpected) {
        return true;
      }

      return (
        normalizeAssignment(assignmentGroupId) === normalizedExpected ||
        normalizeAssignment(assignmentGroupName) === normalizedExpected
      );
    }
  );
});

const authHeader = 'Bearer';
const vaultPath = 'vault';

const baseIncidentData: any = {
  incidentId: 'INC400',
  scenario_id: 'SCN400',
  tenant_id: 'TENANT1',
  base_url: 'https://sn.instance',
  observe_assignment_group: 'OBSERVE_AG',
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


describe('reassignIncident', () => {

  it('reassigns incident and updates redis', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'true',
      assignment_group: 'OBSERVE_AG',
      assignment_group_name: 'Observe Team',
    });

    (buildReassignIncidentBody as jest.Mock).mockReturnValue({
      assignment_group: 'NEW_AG',
    });

    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({
      data: { reassigned: true },
    });

    (mockAxiosInstance.post as jest.Mock).mockResolvedValue({});

    const result = await reassignIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(getTicketStatus).toHaveBeenCalledWith(
      'INC400',
      authHeader,
      baseIncidentData,
      vaultPath
    );

    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      'ENDPOINT/SYS400',
      { assignment_group: 'NEW_AG' },
      expect.objectContaining({
        headers: { Authorization: authHeader },
        timeout: 45000,
      })
    );


    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/scenario/updateReassignmentToRedis'),
      { scenarioId: 'SCN400' }
    );

    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Success' }),
      'Reassign ServiceNow Incident INC400'
    );

    expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
    expect(result).toEqual({ reassigned: true });
  });

  it('reassigns incident when observe group matches assignment name', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'true',
      assignment_group: 'OTHER_AG',
      assignment_group_name: 'Observe Team',
    });

    (buildReassignIncidentBody as jest.Mock).mockReturnValue({
      assignment_group: 'NEW_AG',
    });

    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({
      data: { reassigned: true },
    });

    (mockAxiosInstance.post as jest.Mock).mockResolvedValue({});

    const result = await reassignIncident(
      { ...baseIncidentData, observe_assignment_group: 'Observe Team' },
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(mockAxiosInstance.put).toHaveBeenCalled();
    expect(result).toEqual({ reassigned: true });
  });

  /* NOT ELIGIBLE  */

  it('returns null when status is not true', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'false',
      assignment_group: 'OBSERVE_AG',
      assignment_group_name: 'Observe Team',
    });

    const result = await reassignIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toBeNull();
    expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    expect(auditLogApi).not.toHaveBeenCalled();
  });

  it('returns null when assignment group mismatches observe group', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'true',
      assignment_group: 'OTHER_AG',
      assignment_group_name: 'Observe Team',
    });

    const result = await reassignIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toBeNull();
    expect(mockAxiosInstance.put).not.toHaveBeenCalled();
  });

  /* SYS_ID MISSING  */

  it('throws error when sys_id missing', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: null,
      status: 'true',
      assignment_group: 'OBSERVE_AG',
      assignment_group_name: 'Observe Team',
    });

    await expect(
      reassignIncident(
        baseIncidentData,
        authHeader,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toThrow('Incident with ID INC400 not found');

    expect(auditLogApi).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Failure' }),
      'Reassign ServiceNow Incident INC400'
    );
  });

  /*  MIDDLEWARE AUTH  */

  it('uses getMiddlewareHeaders when apiType is middleware', async () => {
    const cfg = { ...baseCustomerConfig, apiType: 'middleware' } as CustomerConfig;

    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'true',
      assignment_group: 'OBSERVE_AG',
    });

    (buildReassignIncidentBody as jest.Mock).mockReturnValue({});
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HDR' });

    (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });
    (mockAxiosInstance.post as jest.Mock).mockResolvedValue({});

    await reassignIncident(
      baseIncidentData,
      authHeader,
      vaultPath,
      cfg
    );

    expect(getMiddlewareHeaders).toHaveBeenCalledWith(vaultPath, authHeader);
    expect(validateAuthHeader).not.toHaveBeenCalled();
  });

  /* PUT FAILURE  */

  it('throws ReassignIncidentError when PUT fails', async () => {
    (getTicketStatus as jest.Mock).mockResolvedValue({
      sys_id: 'SYS400',
      status: 'true',
      assignment_group: 'OBSERVE_AG',
    });

    (buildReassignIncidentBody as jest.Mock).mockReturnValue({});
    (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.put as jest.Mock).mockRejectedValue(
      new Error('PUT FAIL')
    );

    await expect(
      reassignIncident(
        baseIncidentData,
        authHeader,
        vaultPath,
        baseCustomerConfig
      )
    ).rejects.toBeInstanceOf(ReassignIncidentError);

    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'INC400',
        failureType: 'reassign',
      })
    );
  });
});
