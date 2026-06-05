import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { sendTeamsAlert } from '../../../src/utils/teams-notification/sendTeamsAlerts';
import { Container } from 'typedi';
import winston from 'winston';
import config from '../../../src/config';

jest.mock('../../../src/utils/teams-notification/sendTeamsAlerts', () => ({
  sendTeamsAlert: jest.fn(),
}));

jest.mock('../../../src/config', () => ({
  teamsWebhookUrl: 'https://teams.webhook.test',
}));

describe('sendServicenowFailureAlertToTeams', () => {
  let logger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
      if (key === 'loggerInstance') return logger;
      return undefined;
    });

    jest.clearAllMocks();
  });

  it('should send Teams alert with correct title and message', async () => {
    (sendTeamsAlert as jest.Mock).mockResolvedValue(undefined);

    await sendServicenowFailureAlertToTeams({
      incidentId: 'INC001',
      tenantId: 'tenant1',
      errorMessage: 'Something failed',
      failureType: 'create',
    });

    expect(sendTeamsAlert).toHaveBeenCalledTimes(1);
    expect(sendTeamsAlert).toHaveBeenCalledWith(
      'https://teams.webhook.test',
      expect.stringContaining('Incident Creation Failed'),
      expect.stringContaining('INC001'),
    );

    expect(sendTeamsAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.stringContaining('Something failed'),
    );
  });

  it('should use customActionMessage when provided', async () => {
    (sendTeamsAlert as jest.Mock).mockResolvedValue(undefined);

    await sendServicenowFailureAlertToTeams({
      incidentId: 'INC002',
      tenantId: 'tenant2',
      errorMessage: 'Update error',
      failureType: 'update',
      customActionMessage: 'Custom update message',
    });

    expect(sendTeamsAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.stringContaining('Custom update message'),
    );
  });

  it('should include extraDetails in message', async () => {
    (sendTeamsAlert as jest.Mock).mockResolvedValue(undefined);

    await sendServicenowFailureAlertToTeams({
      incidentId: 'INC003',
      tenantId: 'tenant3',
      errorMessage: 'Fetch failed',
      failureType: 'fetchIncidentData',
      extraDetails: {
        scenarioId: 'SCN1',
        endpoint: 'https://sn/api',
        payload: { a: 1 },
      },
    });

    const message = (sendTeamsAlert as jest.Mock).mock.calls[0][2];

    expect(message).toContain('SCN1');
    expect(message).toContain('https://sn/api');
    expect(message).toContain('"a": 1');
  });

  it('should warn when failureType is unrecognized and use fallback title', async () => {
    (sendTeamsAlert as jest.Mock).mockResolvedValue(undefined);

    await sendServicenowFailureAlertToTeams({
      incidentId: 'INC004',
      tenantId: 'tenant4',
      errorMessage: 'Unknown failure',
      // force invalid type
      failureType: 'unknownType' as any,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized failureType'),
    );

    expect(sendTeamsAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('ServiceNow Incident Failure'),
      expect.any(String),
    );
  });

  it('should log error if sendTeamsAlert throws and not rethrow', async () => {
    (sendTeamsAlert as jest.Mock).mockRejectedValue(new Error('Teams down'));

    await sendServicenowFailureAlertToTeams({
      incidentId: 'INC005',
      tenantId: 'tenant5',
      errorMessage: 'Critical failure',
      failureType: 'resolve',
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send Teams failure alert'),
      expect.objectContaining({
        path: expect.any(String),
        stack: expect.any(String),
      }),
    );
  });
});
