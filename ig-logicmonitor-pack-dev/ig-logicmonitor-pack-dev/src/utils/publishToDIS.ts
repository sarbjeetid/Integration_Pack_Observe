import axios from 'axios';
import winston from 'winston';
import { Container } from 'typedi';
import config from '../config';

export const publishToDIS = async (
  document: any,
  eventType: 'ci' | 'relationship' | 'metric' | 'alert',
) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  let docSourceName = document.source_name;

  try {
    const api_key = config.apiKey;
    const url = `${config.dis_api_url}/${eventType}?apikey=${api_key}`;

    const response = await axios.post(url, document, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (response.status !== 201) {
      loggerInstance.error(`CANNOT Publish document to data ingestion service: eventType - ${eventType} Document SourceName - ${docSourceName} status - ${response.status}}`);

    }
  } catch (err) {
      loggerInstance.error(`[src::utils::publishToDIS.ts] Error in publishing document to data ingestion service: eventType - ${eventType} Document SourceName - ${docSourceName}  Error- ${err}`);
  }
};
