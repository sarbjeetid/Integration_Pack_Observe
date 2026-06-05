// redisClient.ts
import { createClient, RedisClientType } from 'redis';
import config from '../config';
import winston from 'winston';
import { Container } from 'typedi';

let redisClient: RedisClientType | null = null;

/**
 * Returns a singleton Redis client.
 * Creates and connects only once.
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    redisClient = createClient({
        url: `redis://${config.redisUser}:${config.redisPassword}@${config.redisHost}:${config.redisPort}`,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    loggerInstance.error('❌ Redis reconnect retries exhausted');
                    return new Error('Redis reconnect failed');
                }
                const delay = Math.min(retries * 200, 2000);
                loggerInstance.warn(`🔄 Redis reconnect attempt ${retries}, retrying in ${delay}ms`);
                return delay;
            },
        },
    });

    redisClient.on('connect', () => {
        loggerInstance.info('✅ Redis connection established');
    });

    redisClient.on('ready', () => {
        loggerInstance.info('🚀 Redis client ready');
    });

    redisClient.on('reconnecting', () => {
        loggerInstance.warn('🔄 Redis reconnecting...');
    });

    redisClient.on('end', () => {
        loggerInstance.warn('⚠️ Redis connection closed');
    });

    redisClient.on('error', (err: Error) => {
        loggerInstance.error(`❌ Redis error: ${err.message}`, { stack: err.stack });
    });

    await redisClient.connect();
    return redisClient;
};

/**
 * Gracefully shuts down Redis.
 * Must ONLY be called during app shutdown.
 */
export const closeRedisClient = async (): Promise<void> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    if (redisClient && redisClient.isOpen) {
        loggerInstance.info('🛑 Closing Redis connection...');
        await redisClient.quit();
        redisClient = null;
    }
};

/**
 * Handle graceful shutdown signals
 */
process.on('SIGTERM', async () => {
    await closeRedisClient();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await closeRedisClient();
    process.exit(0);
});
