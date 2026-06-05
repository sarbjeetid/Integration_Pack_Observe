// redisClient.ts
import { createClient, RedisClientType } from 'redis';
import config from '../config'; // Adjust import based on your project structure
import winston from 'winston';
import { Container } from 'typedi';
const createRedisClient = (): RedisClientType => {
    return createClient({
        url: `redis://${config.redisUser}:${config.redisPassword}@${config.redisHost}:${config.redisPort}`
    });
};

const redisConnect = async (): Promise<RedisClientType | null> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const client = createRedisClient();

    return new Promise<RedisClientType | null>((resolve) => {
        client.on('error', (err: any) => {
            resolve(null); // Handle error by returning null
        });

        client.connect().then(() => {
            loggerInstance.info('Connected to redis!');
            resolve(client);
        }).catch((err) => {
            loggerInstance.error(`Error in connecting to redis: ${err}`);
            resolve(null); // Handle connection error by returning null
        });
    });
};

export default redisConnect;

