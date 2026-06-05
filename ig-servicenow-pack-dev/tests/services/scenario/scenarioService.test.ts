import winston from 'winston';
import { Container } from 'typedi';
import { scenarioService } from '../../../src/services/scenario/scenarioService';
import { publishToDIS } from '../../../src/utils/publishToDIS';
import config from '../../../src/config';

jest.mock('../../../src/utils/publishToDIS');
jest.mock('../../../src/config', () => ({
  scenarioCloseServicenowState: '6,7,8',
}));

describe('scenarioService', () => {
  let logger: winston.Logger;

  const stackId = 'stack-1';

  const baseIncident: any = {
    sys_id: '1234567890abcdef1234567890abcdef',
    number: 'INC001',
    short_description: 'CPU High',
    urgency: '1',
    priority: '2',
    cmdb_ci: 'CI-1',
    state: '1',
    is_new: false,
    comments_and_work_notes: [
      {
        login_name: 'user1',
        field_label: 'comments',
        value: 'Investigating',
        created_on: '2024-01-01',
      },
    ],
  };

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'loggerInstance') return logger;
      return undefined as any;
    });

    (publishToDIS as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should publish create scenario event with correct payload', async () => {
    const incident = {
      ...baseIncident,
      is_new: true,
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledTimes(1);
    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'create',
        severity: 'High',
        priority: 'P2',
        title: 'CPU High',
        scenario_id: expect.stringContaining('-'), // UUID
        source_ids: [`${stackId}::CI-1`],
        stack_id: stackId,
        itsm: { servicenow: 'INC001' },
        messages: expect.arrayContaining([
          expect.stringContaining('Scenario created from Servicenow'),
        ]),
      }),
      'scenario',
    );
  });

  it('should publish update scenario event with updateKeys and mapped fields', async () => {
    const incident = {
      ...baseIncident,
      changed_fields: ['urgency', 'priority', 'cmdb_ci'],
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledTimes(1);

    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'update',
        scenario_id: expect.any(String),
        stack_id: stackId,
        severity: 'High',
        priority: 'P2',
        source_ids: ['CI-1'],
        updateKeys: expect.arrayContaining([
          'severity',
          'priority',
          'source_ids',
          'messages',
        ]),
        messages: expect.any(Array),
      }),
      'scenario',
    );
  });

  it('should publish update scenario event with only messages when no changed fields', async () => {
    const incident = {
      ...baseIncident,
      changed_fields: [],
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledTimes(1);

    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'update',
        updateKeys: ['messages'],
        messages: expect.any(Array),
      }),
      'scenario',
    );
  });

  it('should publish resolve scenario event with closing message', async () => {
    const incident = {
      ...baseIncident,
      state: '6', // resolved
      is_new: false,
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledTimes(1);

    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'resolve',
        scenario_id: expect.any(String),
        messages: expect.arrayContaining([
          expect.stringContaining('Closing scenario as Incident is Resolved'),
        ]),
      }),
      'scenario',
    );
  });

  it('should not convert scenario_id when sys_id is not 32 chars', async () => {
    const incident = {
      ...baseIncident,
      sys_id: 'short-id',
      is_new: true,
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_id: 'short-id',
      }),
      'scenario',
    );
  });

  it('should fallback to default severity and priority when mapping not found', async () => {
    const incident = {
      ...baseIncident,
      urgency: '99',
      priority: '99',
      is_new: true,
    };

    await scenarioService(incident, stackId);

    expect(publishToDIS).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'Low',
        priority: 'P3',
      }),
      'scenario',
    );
  });

  it('should return error object when publishToDIS throws', async () => {
    const err = new Error('DIS down');
    (publishToDIS as jest.Mock).mockRejectedValueOnce(err);

    const result = await scenarioService(
      { ...baseIncident, is_new: true },
      stackId,
    );

    expect(result).toEqual({
      error: err,
      data: 'Error in scenario service',
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in scenario service'),
    );
  });
});
