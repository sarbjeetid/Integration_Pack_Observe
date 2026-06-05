import axios from 'axios';
import winston from 'winston';
import { Container } from 'typedi';

import {
  validateAuthHeader,
  buildEndpointUrl,
  fetchCustomerConfig,
  buildCreateIncidentBody,
  buildUpdateIncidentBody,
  buildResolveOrCloseIncidentBody,
  buildReassignIncidentBody,
  formatIncidentDescription,
  createScheduleInObserve,
  getFieldMappingForOperation,
} from '../../../src/services/incident/incidentUtils';

import config from '../../../src/config';
import sleep from '../../../src/utils/sleep';
import { ServiceNowAPIError } from '../../../src/utils/errorHandling';

jest.mock('axios');
jest.mock('../../../src/utils/sleep');

jest.mock('../../../src/services/authentication/authService', () => ({
  getMiddlewareHeaders: jest.fn(),
}));

jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams', () => ({
  sendServicenowFailureAlertToTeams: jest.fn(),
}));


describe('incidentUtils', () => {
  let logger: winston.Logger;
  let axiosInstance: any;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    axiosInstance = {
      post: jest.fn(),
    };

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
      if (key === 'loggerInstance') return logger;
      if (key === 'axiosInstance') return axiosInstance;
      return null;
    });

    (sleep as jest.Mock).mockResolvedValue(undefined);
    Object.defineProperty(config, 'apiKeySchedule', {
      value: 'api-key',
      writable: true,
    });
    Object.defineProperty(config, 'externalApiUrl', {
      value: 'http://example',
      writable: true,
    });
  });

  describe('getFieldMappingForOperation', () => {
    it('returns endpoint field mapping when available', () => {
      const mapping = getFieldMappingForOperation('POST', {
        fieldMapping: { short_description: 'short_desc' },
        endpoints: {
          POST: {
            type: 'table',
            table: 'incident',
            fieldMapping: { short_description: 'u_short_description' },
          },
        },
      } as any);

      expect(mapping).toEqual({ short_description: 'u_short_description' });
    });

    it('falls back to default mapping when endpoint lacks fieldMapping', () => {
      const mapping = getFieldMappingForOperation('PUT', {
        fieldMapping: { description: 'desc' },
        endpoints: {
          PUT: { type: 'table', table: 'incident' },
        },
      } as any);

      expect(mapping).toEqual({ description: 'desc' });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /* validateAuthHeader*/
  it('should return Authorization header', () => {
    const result = validateAuthHeader('Bearer token');
    expect(result).toEqual({ Authorization: 'Bearer token' });
  });

  /*  buildEndpointUrl */
  it('should build endpoint URL correctly', () => {
    const customerConfig = {
      endpoints: {
        GET: {
          apiPrefix: '/api',
          type: 'now',
          table: 'incident',
        },
      },
    };

    const url = buildEndpointUrl('GET', 'http://sn', customerConfig);
    expect(url).toBe('http://sn/api/now/incident');
  });

  it('should throw if endpoint mapping missing', () => {
    expect(() =>
      buildEndpointUrl('GET', 'http://sn', {}),
    ).toThrow('No endpoint mapping found');
  });

  /* fetchCustomerConfig*/
  it('should throw ServiceNowAPIError when tenantId is invalid', async () => {
    await expect(fetchCustomerConfig(undefined as any))
      .rejects.toBeInstanceOf(ServiceNowAPIError);
  });

  it('should return customer config on success', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        t1: { name: 'customer' },
      },
    });

    const result = await fetchCustomerConfig('t1');
    expect(result).toEqual({ name: 'customer', authType: config.authType });
  });

  it('should preserve authType when provided in config', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        t1: { name: 'customer', authType: 'oauth_2.0' },
      },
    });

    const result = await fetchCustomerConfig('t1');
    expect(result).toEqual({ name: 'customer', authType: 'oauth_2.0' });
  });

  it('should retry on retryable error and then succeed', async () => {
    (axios.get as jest.Mock)
      .mockRejectedValueOnce({ code: 'ECONNABORTED' })
      .mockResolvedValueOnce({
        data: { t1: { name: 'customer' } },
      });

    const result = await fetchCustomerConfig('t1');
    expect(result.name).toBe('customer');
    expect(sleep).toHaveBeenCalled();
  });

  it('should throw ServiceNowAPIError when tenant config not found', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: {} });

    await expect(fetchCustomerConfig('t1'))
      .rejects.toBeInstanceOf(ServiceNowAPIError);
  });

  it('should throw ServiceNowAPIError on non-retryable error', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('bad'));

    await expect(fetchCustomerConfig('t1'))
      .rejects.toBeInstanceOf(ServiceNowAPIError);
  });

  /* buildCreateIncidentBody */
  it('should build create incident body with all branches covered', () => {
    const incidentData = {
      impact: '1 - High',
      urgency: '2 - Medium',
      sys_ci_id: 'CI1',
      sys_domain: 'domain1',
      reassignment_action_id: 'ra',
      observe_assignment_group: 'AG1',
      extra_field: 'extra',
    };

    const fieldMap = {
      impact: 'impact',
      urgency: ['urg1', 'urg2'],
      configuration_item: 'ci',
      assignment_group: 'assignment_group',
    };

    const result = buildCreateIncidentBody(
      incidentData,
      fieldMap,
      { impact: '3' },
      ['impact'],
    );

    expect(result).toEqual(
      expect.objectContaining({
        impact: '3',
        urg1: '2',
        urg2: '2',
        ci: 'CI1',
        sys_domain: 'domain1',
        assignment_group: 'AG1',
        extra_field: 'extra',
      }),
    );
  });

  /* buildUpdateIncidentBody */
  it('should build update incident body with mapped and extra fields', () => {
    const updateData = {
      description: 'desc',
      impact: '3 - Low',
      scenario_id: 'SCN100',
      extra: 'x',
    };

    const fieldMap = {
      description: ['desc1', 'desc2'],
      impact: 'impact',
      scenario_id: 'vendor_ticket_number',
    };

    const result = buildUpdateIncidentBody(updateData, fieldMap);

    expect(result).toEqual(
      expect.objectContaining({
        desc1: 'desc',
        desc2: 'desc',
        impact: '3',
        vendor_ticket_number: 'SCN100',
        extra: 'x',
      }),
    );
  });

  /* buildResolveOrCloseIncidentBody */
  it('should build resolve body correctly', () => {
    const result = buildResolveOrCloseIncidentBody(
      { close_notes: 'done', extra: 'x' },
      { close_notes: ['u_notes'], state: 'state' },
      'resolve',
    );

    expect(result).toEqual(
      expect.objectContaining({
        state: '6',
        u_notes: 'done',
        extra: 'x',
      }),
    );
  });

  it('should build close body with defaults', () => {
    const result = buildResolveOrCloseIncidentBody(
      {},
      { state: 'state', close_notes: 'close_notes', close_code: 'close_code' },
      'close',
    );

    expect(result).toEqual(
      expect.objectContaining({
        state: '7',
        close_notes: 'Closed/Resolved By Caller',
        close_code: 'Closed/Resolved By Caller',
      }),
    );
  });

  /* buildReassignIncidentBody*/
  it('should include mapped assignment and assigned_to', () => {
    const result = buildReassignIncidentBody(
      { updated_assignment_group: 'AG1' },
      { defaultValueForReassignment: { assigned_to: 'user1' } } as any,
      { assignment_group: ['u_assignment_group'], assigned_to: 'u_assigned_to' }
    );

    expect(result).toEqual({
      u_assignment_group: 'AG1',
      u_assigned_to: 'user1',
    });
  });

  it('should fallback to defaults when field map missing', () => {
    const result = buildReassignIncidentBody({
      updated_assignment_group: 'AG1',
    });

    expect(result).toEqual({ assignment_group: 'AG1' });
  });

  /* formatIncidentDescription */
  it('should append configuration items', async () => {
    const result = await formatIncidentDescription(
      'Alert',
      'CI1, CI2',
    );

    expect(result).toContain('- CI1 (1)');
    expect(result).toContain('- CI2 (1)');
  });

  it('should increment existing CI counts', async () => {
    const desc = `
Alert

Configuration items:
- CI1 (1)
`.trim();

    const result = await formatIncidentDescription(desc, 'CI1');
    expect(result).toContain('- CI1 (2)');
  });

  it('should log error on formatting failure', async () => {
    const result = await formatIncidentDescription(null as any, 'CI1');
    expect(logger.error).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  /* createScheduleInObserve */
  it('should return early if required parameters are missing', async () => {
    await createScheduleInObserve({});
    expect(axiosInstance.post).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();

  });

  it('should create schedule successfully', async () => {
    axiosInstance.post.mockResolvedValue({});

    await createScheduleInObserve({
      interval_value: 5,
      edge_id: 'edge',
      reassignment_action_id: 'a1',
      ticket_no: 'INC1',
      vault_path: 'vault',
      base_url: 'url',
      observe_assignment_group: 'AG1',
      updated_assignment_group: 'AG2',
      scenario_id: 'S1',
      tenant_id: 'T1',
    });

    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  });

  it('should throw ScheduleCreationError when axios post fails after retries', async () => {
    axiosInstance.post.mockRejectedValue(new Error('fail'));

    await expect(
      createScheduleInObserve({
        interval_value: 5,
        edge_id: 'edge',
        reassignment_action_id: 'a1',
        ticket_no: 'INC1',
        vault_path: 'vault',
        base_url: 'url',
        observe_assignment_group: 'AG1',
        updated_assignment_group: 'AG2',
        scenario_id: 'S1',
        tenant_id: 'T1',
      })
    ).rejects.toThrow();

    expect(logger.error).toHaveBeenCalled();
  });


  it('should throw ScheduleCreationError on outer failure', async () => {
    jest.spyOn(Container, 'get').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(createScheduleInObserve({}))
      .rejects.toBeInstanceOf(Error);

  });
});
