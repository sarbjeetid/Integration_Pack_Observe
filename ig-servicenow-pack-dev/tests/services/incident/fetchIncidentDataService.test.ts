import { fetchIncidentData } from '../../../src/services/incident/fetchIncidentDataService';
import { Container } from 'typedi';
import winston from 'winston';
import { AxiosInstance } from 'axios';
import { CustomerConfig } from '../../../src/interfaces/scenario';


import {
  validateAuthHeader,
  buildEndpointUrl,
  getFieldMappingForOperation,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { FetchIncidentError } from '../../../src/utils/errorHandling';
import { executeWithRetry } from '../../../src/utils/retry-apis/retryExecutor';



jest.mock('../../../src/services/incident/incidentUtils');
jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/retry-apis/retryExecutor');



const mockLogger: Partial<winston.Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
  get: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  jest.spyOn(Container, 'get').mockImplementation((key: any) => {
    if (key === 'loggerInstance') return mockLogger as any;
    if (key === 'axiosInstance') return mockAxiosInstance as any;
    return null as any;
  });

  (executeWithRetry as jest.Mock).mockImplementation((fn) => fn());
  (getFieldMappingForOperation as jest.Mock).mockImplementation(() => baseCustomerConfig.fieldMapping);
});


const authHeader = 'Bearer token';
const vaultPath = 'vault/path';

const baseIncidentData = {
  tenant_id: 'TENANT1',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  base_url: 'https://sn.instance',
};

const baseCustomerConfig = {
  apiType: 'servicenow',
  baseUrl: 'https://sn.instance',
  fieldMapping: {
    scenario_id: ['u_scenario_id', 'correlation_id'],
  },
} as unknown as CustomerConfig;


describe('fetchIncidentData', () => {

  it('fetches incidents with assigned user', async () => {
    (buildEndpointUrl as jest.Mock).mockImplementation((type: string) =>
      type === 'GET' ? 'SN_ENDPOINT' : 'USER_ENDPOINT'
    );

    (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

    (mockAxiosInstance.get as jest.Mock)
      // ServiceNow incidents fetch
      .mockResolvedValueOnce({
        data: {
          result: [
            {
              number: 'INC1',
              assigned_to: { value: 'USER1' },
              u_scenario_id: 'SCN1',
            },
          ],
        },
      })
      // User lookup
      .mockResolvedValueOnce({
        data: {
          result: { name: 'John', email: 'john@test.com' },
        },
      });

    const result = await fetchIncidentData(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      incidents: [
        {
          ticket_number: 'INC1',
          assigned_to: {
            name: 'John',
            email: 'john@test.com',
          },
          scenario_id: 'SCN1',
        },
      ],
    });
  });

  /* SKIP WHEN NO SCENARIO ID  */

  it('skips incidents when scenario id fields are all null', async () => {
    (buildEndpointUrl as jest.Mock).mockReturnValue('SN_ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.get as jest.Mock).mockResolvedValue({
      data: {
        result: [
          {
            number: 'INC2',
            assigned_to: null,
            u_scenario_id: null,
            correlation_id: null,
          },
        ],
      },
    });

    const result = await fetchIncidentData(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result).toEqual({ incidents: [] });
  });

  /* UNASSIGNED INCIDENT  */

  it('handles incident with no assigned_to', async () => {
    (buildEndpointUrl as jest.Mock).mockReturnValue('SN_ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.get as jest.Mock).mockResolvedValue({
      data: {
        result: [
          {
            number: 'INC3',
            assigned_to: null,
            u_scenario_id: 'SCN3',
          },
        ],
      },
    });

    const result = await fetchIncidentData(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result.incidents[0].assigned_to.name).toBe('Unassigned');
  });

  /* USER API FAILURE  */

  it('returns empty user when user API fails', async () => {
    (buildEndpointUrl as jest.Mock).mockImplementation((t: string) =>
      t === 'GET' ? 'SN_ENDPOINT' : 'USER_ENDPOINT'
    );
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    (mockAxiosInstance.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          result: [
            {
              number: 'INC4',
              assigned_to: { value: 'USER_FAIL' },
              u_scenario_id: 'SCN4',
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('USER API FAIL'));

    const result = await fetchIncidentData(
      baseIncidentData,
      authHeader,
      vaultPath,
      baseCustomerConfig
    );

    expect(result.incidents[0].assigned_to).toEqual({
      name: 'Unassigned',
      email: '',
    });
  });

  /* MIDDLEWARE AUTH  */

  it('uses getMiddlewareHeaders when apiType is middleware', async () => {
    const cfg = { ...baseCustomerConfig, apiType: 'middleware' } as CustomerConfig;

    (buildEndpointUrl as jest.Mock).mockReturnValue('SN_ENDPOINT');
    (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HDR' });

    (mockAxiosInstance.get as jest.Mock).mockResolvedValue({
      data: { result: [] },
    });

    await fetchIncidentData(baseIncidentData, authHeader, vaultPath, cfg);

    expect(getMiddlewareHeaders).toHaveBeenCalledWith(vaultPath, authHeader);
    expect(validateAuthHeader).not.toHaveBeenCalled();
  });

  /* SERVICENOW FETCH FAILURE */

  it('throws FetchIncidentError when ServiceNow API fails', async () => {
    (buildEndpointUrl as jest.Mock).mockReturnValue('SN_ENDPOINT');
    (validateAuthHeader as jest.Mock).mockReturnValue({});

    // axios.get will be called inside executeWithRetry
    (mockAxiosInstance.get as jest.Mock).mockRejectedValue(
      new Error('SN FAIL')
    );

    await expect(
      fetchIncidentData(baseIncidentData, authHeader, vaultPath, baseCustomerConfig)
    ).rejects.toBeInstanceOf(FetchIncidentError);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching incidents'),
      expect.any(Object)
    );
  });
});
