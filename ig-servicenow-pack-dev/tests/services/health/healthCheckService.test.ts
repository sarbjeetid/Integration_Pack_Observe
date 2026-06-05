import winston from 'winston';
import { Container } from 'typedi';
import axios from 'axios';
import config from '../../../src/config';
import {
  serviceNowCheck,
  checkDaprHealth,
  checkRedisHealth,
} from '../../../src/services/healthCheckService';
import { fetchDiscoveryCredentials } from '../../../src/services/secretsManager';
import { getRedisClient } from '../../../src/loaders/redisConnect';

jest.mock('axios');
jest.mock('../../../src/services/secretsManager');
jest.mock('../../../src/loaders/redisConnect');

jest.mock('../../../src/config', () => ({
  daprHost: 'http://localhost',
  daprHttpPort: '3500',
}));

describe('healthCheckService', () => {
  let logger: winston.Logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'loggerInstance') return logger;
      return undefined as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------- serviceNowCheck -------------------- */

  it('should return true when ServiceNow health endpoint returns 200', async () => {
    (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
      username: 'user',
      password: 'pass',
    });

    (axios.get as jest.Mock).mockResolvedValue({
      status: 200,
    });

    const result = await serviceNowCheck(
      'vault/path',
      'https://sn/health',
    );

    expect(fetchDiscoveryCredentials).toHaveBeenCalledWith('vault/path');
    expect(axios.get).toHaveBeenCalledWith(
      'https://sn/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic'),
        }),
        timeout: 5000,
      }),
    );
    expect(result).toBe(true);
  });

  it('should return false when ServiceNow health endpoint returns non-200', async () => {
    (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
      username: 'user',
      password: 'pass',
    });

    (axios.get as jest.Mock).mockResolvedValue({
      status: 500,
    });

    const result = await serviceNowCheck(
      'vault/path',
      'https://sn/health',
    );

    expect(result).toBe(false);
  });

  it('should return false when axios throws while calling ServiceNow', async () => {
    (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
      username: 'user',
      password: 'pass',
    });

    (axios.get as jest.Mock).mockRejectedValue(
      new Error('network error'),
    );

    const result = await serviceNowCheck(
      'vault/path',
      'https://sn/health',
    );

    expect(logger.error).toHaveBeenCalledWith(
      'ServiceNow health check failed',
      expect.any(Object),
    );
    expect(result).toBe(false);
  });

  it('should return null when secrets are not found', async () => {
    (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue(null);

    const result = await serviceNowCheck(
      'vault/path',
      'https://sn/health',
    );

    expect(result).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should return null when fetchDiscoveryCredentials throws', async () => {
    (fetchDiscoveryCredentials as jest.Mock).mockRejectedValue(
      new Error('vault error'),
    );

    const result = await serviceNowCheck(
      'vault/path',
      'https://sn/health',
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Error in serviceNowCheck',
      expect.any(Object),
    );
    expect(result).toBeNull();
  });

  /* -------------------- checkDaprHealth -------------------- */

  it('should return true when dapr returns 204', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      status: 204,
    });

    const result = await checkDaprHealth();

    expect(axios.get).toHaveBeenCalledWith(
      `${config.daprHost}:${config.daprHttpPort}/v1.0/healthz`,
      { timeout: 3000 },
    );
    expect(result).toBe(true);
  });

  it('should return false when dapr returns non-204', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      status: 500,
    });

    const result = await checkDaprHealth();

    expect(result).toBe(false);
  });

  it('should return false when dapr health check throws', async () => {
    (axios.get as jest.Mock).mockRejectedValue(
      new Error('dapr down'),
    );

    const result = await checkDaprHealth();

    expect(logger.error).toHaveBeenCalledWith(
      'Dapr health check failed',
      expect.any(Object),
    );
    expect(result).toBe(false);
  });

  /* -------------------- checkRedisHealth -------------------- */

  it('should return true when redis ping returns PONG', async () => {
    const redisClientMock = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    (getRedisClient as jest.Mock).mockResolvedValue(redisClientMock);

    const result = await checkRedisHealth();

    expect(getRedisClient).toHaveBeenCalled();
    expect(redisClientMock.ping).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false when redis ping does not return PONG', async () => {
    const redisClientMock = {
      ping: jest.fn().mockResolvedValue('ERR'),
    };

    (getRedisClient as jest.Mock).mockResolvedValue(redisClientMock);

    const result = await checkRedisHealth();

    expect(result).toBe(false);
  });

  it('should return false when redis client throws error', async () => {
    (getRedisClient as jest.Mock).mockRejectedValue(
      new Error('redis down'),
    );

    const result = await checkRedisHealth();

    expect(result).toBe(false);
  });
});
