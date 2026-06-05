import { Request, Response } from 'express';
import {Container } from 'typedi';
import winston from 'winston';
import { serviceNowCheck, checkDaprHealth, checkRedisHealth } from '../services/healthCheckService';

export async function healthCheck(req: Request, res: Response) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const daprHealth = await checkDaprHealth();
        const redisHealth = await checkRedisHealth();
        const healthStatus = {
            availability: 'ok',
            dependency_dapr: daprHealth ? 'ok' : 'error',
            dependency_redis: redisHealth ? 'ok' : 'error',
        };

        if (!daprHealth || !redisHealth) {
            healthStatus.availability = 'error';
        }

        return res.status(200).json(healthStatus);

    } catch (error) {
      loggerInstance.error(`Error in health check: ${error}`);
      return res.status(500).send({availability: 'error'});
    }
  }

  export async function healthConnectivity(req: Request, res: Response) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const vaultPath = req.body.vault_path;
        const healthCheckEndpoint = req.body.health_check_endpoint
        const healthCenter = await serviceNowCheck(vaultPath, healthCheckEndpoint);

        const healthStatus: { availability: string; [key: string]: string } = {
            availability: 'error',
        };
        if (healthCenter === null) {
            healthStatus.availability = 'error';
        } else if (healthCenter === true) {
            healthStatus.availability = 'ok';
            healthStatus.dependency_smartcenter = 'ok';
        } else {
            healthStatus.availability = 'error';
            healthStatus.dependency_smartcenter = 'error';
        }

        return res.status(200).json(healthStatus);

    } catch (error) {
      loggerInstance.error(`Error in health connectivity: ${error}`);
      return res.status(500).send({availability: 'error'});
    }
  }
