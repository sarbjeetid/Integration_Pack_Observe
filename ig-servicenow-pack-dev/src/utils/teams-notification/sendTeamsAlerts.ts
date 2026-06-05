import axios from 'axios';
import { Container } from 'typedi';
import winston from 'winston';

export const sendTeamsAlert = async (webhookUrl: string, title: string, message: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
      
        const payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": title,
            "themeColor": "FF0000",
            "title": title,
            "text": message
        };

        await axios.post(webhookUrl, payload);
    } catch (err: any) {
        loggerInstance.error('Failed to send alert to Microsoft Teams:', err.message);
    }
};
