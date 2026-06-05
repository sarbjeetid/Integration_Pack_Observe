import Container from 'typedi';
import { Logger as LoggerType } from 'winston';
import config from '../config';
import axios from 'axios';
export const publishToDIS = async (
    document: any,
    eventType: 'ci' | 'relationship' | 'metric' | 'alert' | 'scenario',
) => {
    const Logger: LoggerType = Container.get('loggerInstance');
    try {
        const api_key = config.apiKey;
        const url = `${config.dis_api_url}/${eventType}?apikey=${api_key}`;

        const response = await axios.post(url,document,{
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.status !== 201) {
            Logger.error(`CANNOT Publish document to data ingestion service: eventType - ${eventType} Document - ${JSON.stringify(document)} status - ${response.status}}`);
        }
       
        
    } catch (err) {
        Logger.error(`[src::utils::publishToCore.ts] Error in publishing document to core: eventType - ${eventType} Document - ${JSON.stringify(document)} Error- ${err}`);
    }
};