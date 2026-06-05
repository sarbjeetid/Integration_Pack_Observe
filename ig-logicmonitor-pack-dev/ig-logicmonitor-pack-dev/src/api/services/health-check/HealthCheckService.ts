import { Service, Container } from 'typedi';
import axios from 'axios';
import winston from 'winston';
import config from '../../../config';
import redisConnect from '../../../loaders/redisConnect';

@Service()
class HealthCheckService {

    async checkDaprHealth(): Promise<boolean> {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        try {
            const response = await axios.get(`${config.daprHost}:${config.daprHttpPort}/v1.0/healthz`);
            return response.status === 204;
        } catch (error) {
            loggerInstance.error('Dapr health check failed:', error);
            return false;
        }
    }

    async checkRedisHealth(): Promise<boolean> {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        let redisClient;
        try {
            redisClient = await redisConnect();
            if (!redisClient) {
                return false;
            }
            const result = await redisClient.ping();
            return result === 'PONG';
        } catch (error) {
            loggerInstance.error('Redis health check failed:', error);
            return false;
        }  finally {
            if (redisClient && redisClient.isOpen) {
                await redisClient.quit();
            }
        }
    }
}

export default HealthCheckService;
