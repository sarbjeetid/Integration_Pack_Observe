import {
  getSysIdAndPriorityForIncident,
  associateCIWithIncident,
  getSysIdForIncident,
  getIncidentData,
  getTicketStatus,
} from '../../../src/services/incident/incidentUtils';

import { Container } from 'typedi';
import { CILinkingError } from '../../../src/utils/errorHandling';
import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { fetchCustomerConfig } from '../../../src/services/incident/incidentUtils';
import { executeWithRetry } from '../../../src/utils/retry-apis/retryExecutor';


jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams');
jest.mock('../../../src/utils/retry-apis/retryExecutor');


describe('incidentExternalApis', () => {
  let axiosInstance: any;
  let logger: any;

  const customerConfig = {
    name: 'tenant1',
    baseUrl: 'https://sn',
    apiType: 'servicenow',
    fieldMapping: {} as any,
    endpoints: {
      GET: { type: 'incident', table: 'incident' },
      PATCH: { type: 'incident', table: 'incident' },
    },
  } as any;

  const middlewareConfig = {
    ...customerConfig,
    apiType: 'middleware',
  } as any;

  beforeEach(() => {
    axiosInstance = {
      get: jest.fn(),
      patch: jest.fn(),
    };

    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
      if (key === 'axiosInstance') return axiosInstance;
      if (key === 'loggerInstance') return logger;
      return undefined;
    });

    jest.clearAllMocks();
    (executeWithRetry as jest.Mock).mockImplementation((fn) => fn());
  });

  /* getSysIdAndPriorityForIncident*/
  it('should fetch sys_id, priority, description and short_description', async () => {
    axiosInstance.get.mockResolvedValue({
      data: {
        result: [
          {
            sys_id: 'SYS1',
            priority: '1',
            description: 'desc',
            short_description: 'short',
          },
        ],
      },
    });

    const result = await getSysIdAndPriorityForIncident(
      'INC1',
      'auth',
      {},
      customerConfig,
      'vault',
    );

    expect(result).toEqual({
      sys_id: 'SYS1',
      priority: '1',
      description: 'desc',
      short_description: 'short',
    });

    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
  });

  it('should use middleware headers when apiType is middleware', async () => {
    (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ Authorization: 'MW' });

    axiosInstance.get.mockResolvedValue({
      data: { result: [] },
    });

    await getSysIdAndPriorityForIncident(
      'INC1',
      'auth',
      {},
      middlewareConfig,
      'vault',
    );

    expect(getMiddlewareHeaders).toHaveBeenCalledWith('vault', 'auth');
  });

  it('should return null and send alert on API error', async () => {
    axiosInstance.get.mockRejectedValue({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'auth' },
        headers: { 'www-authenticate': 'Basic realm' },
      },
    });

    const result = await getSysIdAndPriorityForIncident(
      'INC1',
      'auth',
      { tenant_id: 't1' },
      customerConfig,
      'vault',
    );

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'INC1',
        failureType: 'fetchPriority',
      }),
    );
  });

  /* associateCIWithIncident*/
  it('should associate CI successfully', async () => {
    axiosInstance.patch.mockResolvedValue({ data: { success: true } });

    const result = await associateCIWithIncident(
      'SYS1',
      'CI1',
      'auth',
      {},
      customerConfig,
      'vault',
    );

    expect(axiosInstance.patch).toHaveBeenCalledWith(
      expect.stringContaining('/incident/SYS1'),
      { cmdb_ci: 'CI1' },
      expect.objectContaining({
        headers: { Authorization: 'auth' },
        timeout: 45000,
      }),
    );

  });

  it('should throw CILinkingError and send alert on failure', async () => {
    axiosInstance.patch.mockRejectedValue({
      message: 'fail',
      response: { status: 500, data: {} },
    });

    await expect(
      associateCIWithIncident(
        'SYS1',
        'CI1',
        'auth',
        { tenant_id: 't1' },
        customerConfig,
        'vault',
      ),
    ).rejects.toBeInstanceOf(CILinkingError);

    expect(logger.error).toHaveBeenCalled();
    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalled();
  });

  /* getSysIdForIncident*/
  it('should return sys_id when incident exists', async () => {
    axiosInstance.get.mockResolvedValue({
      data: { result: [{ sys_id: 'SYS1' }] },
    });

    const result = await getSysIdForIncident(
      'INC1',
      'auth',
      {},
      customerConfig,
      'vault',
    );

    expect(result).toBe('SYS1');
  });

  it('should return null and send alert on error', async () => {
    axiosInstance.get.mockRejectedValue({
      response: { status: 500, data: {} },
      message: 'err',
    });

    const result = await getSysIdForIncident(
      'INC1',
      'auth',
      { tenant_id: 't1' },
      customerConfig,
      'vault',
    );

    expect(result).toBeNull();
    expect(sendServicenowFailureAlertToTeams).toHaveBeenCalled();
  });

  /* getIncidentData */
  it('should return incident data when found', async () => {
    axiosInstance.get.mockResolvedValue({
      data: { result: [{ number: 'INC1' }] },
    });

    const result = await getIncidentData(
      'INC1',
      'auth',
      {},
      customerConfig,
      'vault',
    );

    expect(result).toEqual({ number: 'INC1' });
  });

  it('should return null and warn when incident not found', async () => {
    axiosInstance.get.mockResolvedValue({ data: { result: [] } });

    const result = await getIncidentData(
      'INC1',
      'auth',
      {},
      customerConfig,
      'vault',
    );

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  /* getTicketStatus*/
  it('should return ticket status successfully by resolving assignment group link', async () => {
    jest.spyOn(require('../../../src/services/incident/incidentUtils'), 'fetchCustomerConfig')
      .mockResolvedValue(customerConfig);

    axiosInstance.get
      .mockResolvedValueOnce({
        data: {
          result: [
            {
              sys_id: 'SYS1',
              active: true,
              assignment_group: { value: 'AG1', link: 'https://example.com/sys_user_group/ag1' },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          result: { name: 'Observe AG' },
        },
      });

    const result = await getTicketStatus(
      'INC1',
      'auth',
      { tenant_id: 't1' },
      'vault',
    );

    expect(result).toEqual({
      sys_id: 'SYS1',
      status: true,
      assignment_group: 'AG1',
      assignment_group_name: 'Observe AG',
    });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      2,
      'https://example.com/sys_user_group/ag1',
      expect.objectContaining({
        headers: { Authorization: 'auth' },
        timeout: 20000,
      })
    );
  });

  it('should warn when assignment group link lookup fails', async () => {
    jest.spyOn(require('../../../src/services/incident/incidentUtils'), 'fetchCustomerConfig')
      .mockResolvedValue(customerConfig);

    axiosInstance.get
      .mockResolvedValueOnce({
        data: {
          result: [
            {
              sys_id: 'SYS2',
              active: true,
              assignment_group: { value: 'AG2', link: 'https://example.com/sys_user_group/ag2' },
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('link failure'));

    const result = await getTicketStatus(
      'INC2',
      'auth',
      { tenant_id: 't1' },
      'vault',
    );

    expect(result).toEqual({
      sys_id: 'SYS2',
      status: true,
      assignment_group: 'AG2',
      assignment_group_name: undefined,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch assignment group name from link: link failure'));
  });

  it('should return null and log error when fetchCustomerConfig fails', async () => {
    jest.spyOn(require('../../../src/services/incident/incidentUtils'), 'fetchCustomerConfig')
      .mockRejectedValue(new Error('fail'));

    const result = await getTicketStatus(
      'INC1',
      'auth',
      { tenant_id: 't1' },
      'vault',
    );

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});
