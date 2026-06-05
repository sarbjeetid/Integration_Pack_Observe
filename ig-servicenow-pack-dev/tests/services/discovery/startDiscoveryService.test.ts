import winston from 'winston';
import { Container } from 'typedi';
import { startDiscoveryService } from '../../../src/services/discovery/startDiscoveryService';
import sleep from '../../../src/utils/sleep';
import config from '../../../src/config';

jest.mock('../../../src/utils/sleep');

describe('startDiscoveryService', () => {
  let logger: winston.Logger;
  let mockPublish: jest.Mock;
  let daprClientMock: any;

  const body = {
    url: 'https://sn.instance',
    username: 'user',
    password: 'pass',
    zone_id: 'zone1',
    stack_id: 'stack1',
  };

  const contextId = 'ctx-123';

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    mockPublish = jest.fn();

    daprClientMock = {
      pubsub: {
        publish: mockPublish,
      },
    };

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'loggerInstance') return logger;
      if (key === 'daprClient') return daprClientMock;
      if (key === 'axiosInstance') return {};
      return undefined as any;
    });

    (sleep as jest.Mock).mockResolvedValue(undefined);
    mockPublish.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should publish discovery message successfully', async () => {
    await startDiscoveryService(body as any, contextId);

    expect(sleep).toHaveBeenCalledWith(config.waitTimeinMs);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      config.discoveryPubSubName,
      config.listResourcesTopicName,
      {
        body,
        className: 'cmdb_ci',
        contextId,
      },
    );

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log error and NOT throw when publish fails', async () => {
    mockPublish.mockRejectedValueOnce(new Error('publish failed'));

    await startDiscoveryService(body as any, contextId);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot publish to list resources topic'),
    );
  });

  it('should log error and NOT throw when sleep fails', async () => {
    (sleep as jest.Mock).mockRejectedValueOnce(new Error('sleep failed'));

    await startDiscoveryService(body as any, contextId);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot publish to list resources topic'),
    );
  });
});
