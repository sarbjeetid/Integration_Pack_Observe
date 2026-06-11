import axios from 'axios';
import Container from 'typedi';
import { Logger as LoggerType } from 'winston';
import config from '../config';

const getAxiosInstance = () => {
    const API_KEY = config.apiKey;
    return axios.create({
        baseURL: config.externalApiUrl,
        headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        }
    });
};

export const fetchStackDocument = async (id: string, zone_id: string): Promise<any> => {
    const Logger: LoggerType = Container.get('loggerInstance');
    
    if (config.packLocation !== 'core') {
        Logger.error(`Pack not present at core or configuration not updated correctly`);
        return null;
    }

    try {
        const client = getAxiosInstance();
        const res = await client.post('/api/packs/fetchStackDocument', {
            id,
            zone_id
        });

        if (!res.data.success) {
            throw new Error(res.data.message);
        } else {
            return res.data.message;
        }
    } catch (err: any) {
        Logger.error(`Error in fetchStackDocument: ${err.message || err}`);
        throw err;
    }
};
