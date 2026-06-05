import { RedisClientType } from 'redis';
import { Container } from 'typedi';
import winston from 'winston';
import config from '../../config';
import redisConnect from '../../loaders/redisConnect';

let redisClientPromise: Promise<RedisClientType | null> | null = null;

const getRedisClient = async (): Promise<RedisClientType | null> => {
    if (redisClientPromise) {
        const cachedClient = await redisClientPromise;
        if (cachedClient?.isOpen) {
            return cachedClient;
        }
    }

    redisClientPromise = redisConnect();
    return redisClientPromise;
};

const buildCacheKey = (sourceName: string): string => {
    return `${config.sourceIdCache.prefix}:${sourceName}`;
};

export const getCachedSourceId = async (sourceName: string): Promise<string | null> => {

    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    if (!config.sourceIdCache.enabled) {
        loggerInstance.warn('Source ID cache is disabled. Not fetching source ID from cache.');
        return null;
    }
    loggerInstance.info("Attempting to fetch source ID from cache for source name:", sourceName);
    try {
        const client = await getRedisClient();
        if (!client) {
            return null;
        }

        return await client.get(buildCacheKey(sourceName));
    } catch (error) {
        loggerInstance.warn(`Redis get failed for sourceId cache: ${error}`);
        return null;
    }
};

export const setCachedSourceId = async (sourceName: string, sourceId: string): Promise<void> => {
    
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    if (!config.sourceIdCache.enabled) {
        loggerInstance.warn('Source ID cache is disabled. Not caching source ID.');
        return;
    }
    loggerInstance.info("Attempting to cache source ID for source name:", sourceName);

    try {
        const client = await getRedisClient();
        if (!client) {
            return;
        }

        const key = buildCacheKey(sourceName);
        if (config.sourceIdCache.ttlSeconds > 0) {
            await client.setEx(key, config.sourceIdCache.ttlSeconds, sourceId);
        } else {
            await client.set(key, sourceId);
        }
    } catch (error) {
        loggerInstance.warn(`Redis set failed for sourceId cache: ${error}`);
    }
};
