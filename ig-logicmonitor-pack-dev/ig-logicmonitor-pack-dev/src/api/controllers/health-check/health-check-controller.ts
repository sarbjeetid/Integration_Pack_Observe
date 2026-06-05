import { JsonController, Get, Res } from 'routing-controllers';
import { Response } from 'express';
import {Container, Service } from 'typedi';
import HealthCheckService from '../../services/health-check/HealthCheckService';
import winston from 'winston';

@JsonController('/api/health')
@Service()
export class HealthCheckController {
    constructor(private healthCheckService: HealthCheckService) {}

    @Get('/check')
    async getHealthCheck(@Res() response: Response) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        try {
            const daprHealth = await this.healthCheckService.checkDaprHealth();
            const redisHealth = await this.healthCheckService.checkRedisHealth();
    
            const healthStatus = {
                availability: 'ok',
                dependency_dapr: daprHealth ? 'ok' : 'error',
                dependency_redis: redisHealth ? 'ok' : 'error',
            };
    
            if (!daprHealth || !redisHealth) {
                healthStatus.availability = 'error';
            }
    
            return response.status(200).json(healthStatus);
        } catch (err){
            loggerInstance.error(`Error in fetching health stats`);
            return response.status(500).send({availability: 'error'});
        }

    }
}

export default HealthCheckController;
