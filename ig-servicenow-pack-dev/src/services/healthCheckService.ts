import { Container } from 'typedi';
import winston from 'winston';
import { fetchDiscoveryCredentials } from './secretsManager';
import axios from 'axios';
import config from '../config';
import { getRedisClient } from '../loaders/redisConnect';

/* -------------------- ServiceNow Health -------------------- */

const serviceNowCheck = async (vaultPath: string, healthCheckEndpoint: string
): Promise<boolean | null> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const secrets = await fetchDiscoveryCredentials(vaultPath);
        if (!secrets) return null;

        const credentials = `${secrets.username}:${secrets.password}`;
        const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

        try {
            const response = await axios.get(healthCheckEndpoint, {
                headers: { Authorization: authHeader },
                timeout: 5000,
            });

            return response.status === 200;
        } catch (error: any) {
            loggerInstance.error(
                `ServiceNow health check failed`,
                { message: error?.message }
            );
            return false;
        }
    } catch (err: any) {
        loggerInstance.error(
            `Error in serviceNowCheck`,
            { message: err?.message }
        );
        return null;
    }
};

/* -------------------- Dapr Health -------------------- */

export async function checkDaprHealth(): Promise<boolean> {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const response = await axios.get(
            `${config.daprHost}:${config.daprHttpPort}/v1.0/healthz`,
            { timeout: 3000 }
        );
        return response.status === 204;
    } catch (error: any) {
        loggerInstance.error(
            `Dapr health check failed`,
            { message: error?.message }
        );
        return false;
    }
}

/* -------------------- Redis Health -------------------- */

export async function checkRedisHealth(): Promise<boolean> {
    try {
        const redisClient = await getRedisClient();
        return (await redisClient.ping()) === 'PONG';
    } catch {
        return false;
    }
}

export { serviceNowCheck };
