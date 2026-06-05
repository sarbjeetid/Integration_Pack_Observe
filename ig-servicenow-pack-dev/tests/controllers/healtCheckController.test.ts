import { Request, Response } from 'express';
import winston from 'winston';
import { Container } from 'typedi';
import {
  healthCheck,
  healthConnectivity,
} from '../../src/controllers/healthCheckController';
import {
  serviceNowCheck,
  checkDaprHealth,
  checkRedisHealth,
} from '../../src/services/healthCheckService';

jest.mock('../../src/services/healthCheckService');

describe('HealthCheckController', () => {
  let logger: winston.Logger;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'loggerInstance') return logger;
      return undefined as any;
    });

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return ok when dapr and redis are healthy', async () => {
    (checkDaprHealth as jest.Mock).mockResolvedValue(true);
    (checkRedisHealth as jest.Mock).mockResolvedValue(true);

    await healthCheck(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      availability: 'ok',
      dependency_dapr: 'ok',
      dependency_redis: 'ok',
    });
  });

  it('should return error when dapr is unhealthy', async () => {
    (checkDaprHealth as jest.Mock).mockResolvedValue(false);
    (checkRedisHealth as jest.Mock).mockResolvedValue(true);

    await healthCheck(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      availability: 'error',
      dependency_dapr: 'error',
      dependency_redis: 'ok',
    });
  });

  it('should return error when redis is unhealthy', async () => {
    (checkDaprHealth as jest.Mock).mockResolvedValue(true);
    (checkRedisHealth as jest.Mock).mockResolvedValue(false);

    await healthCheck(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      availability: 'error',
      dependency_dapr: 'ok',
      dependency_redis: 'error',
    });
  });

  it('should return error when both dapr and redis are unhealthy', async () => {
    (checkDaprHealth as jest.Mock).mockResolvedValue(false);
    (checkRedisHealth as jest.Mock).mockResolvedValue(false);

    await healthCheck(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      availability: 'error',
      dependency_dapr: 'error',
      dependency_redis: 'error',
    });
  });

  it('should return 500 when healthCheck throws error', async () => {
    (checkDaprHealth as jest.Mock).mockRejectedValueOnce(
      new Error('Dapr error'),
    );

    await healthCheck(req as Request, res as Response);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in health check'),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ availability: 'error' });
  });

  it('should return ok when serviceNowCheck returns true', async () => {
    req = {
      body: {
        vault_path: 'vault/path',
        health_check_endpoint: '/health',
      },
    };

    (serviceNowCheck as jest.Mock).mockResolvedValue(true);

    await healthConnectivity(req as Request, res as Response);

    expect(serviceNowCheck).toHaveBeenCalledWith(
      'vault/path',
      '/health',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      availability: 'ok',
      dependency_smartcenter: 'ok',
    });
  });

  it('should return error when serviceNowCheck returns false', async () => {
    req = {
      body: {
        vault_path: 'vault/path',
        health_check_endpoint: '/health',
      },
    };

    (serviceNowCheck as jest.Mock).mockResolvedValue(false);

    await healthConnectivity(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      availability: 'error',
      dependency_smartcenter: 'error',
    });
  });

  it('should return error when serviceNowCheck returns null', async () => {
    req = {
      body: {
        vault_path: 'vault/path',
        health_check_endpoint: '/health',
      },
    };

    (serviceNowCheck as jest.Mock).mockResolvedValue(null);

    await healthConnectivity(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      availability: 'error',
    });
  });

  it('should return 500 when healthConnectivity throws error', async () => {
    req = {
      body: {
        vault_path: 'vault/path',
        health_check_endpoint: '/health',
      },
    };

    (serviceNowCheck as jest.Mock).mockRejectedValueOnce(
      new Error('SN down'),
    );

    await healthConnectivity(req as Request, res as Response);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in health connectivity'),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ availability: 'error' });
  });
});
