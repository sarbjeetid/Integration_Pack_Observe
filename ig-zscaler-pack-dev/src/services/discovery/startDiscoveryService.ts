import winston from 'winston';
import { Container } from 'typedi';
import config from "../../config";
import { ZscalerDiscoveryBodyI } from '../../interfaces/config';
import { DaprClient } from 'dapr-client';
import sleep from '../../utils/sleep';

const sleepMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const startDiscoveryService = async (body: ZscalerDiscoveryBodyI, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    try {
        const classNames = [
            'zpa_application',
            'zpa_connector',
            'zpa_connector_group',
            'zpa_service_edge',
            'zpa_service_edge_group',
            'zia_url_category',
            'zia_url_policy'
        ];

        for (const className of classNames) {
            const message = {
                body,
                className,
                contextId
            };
            const pubSubName = config.discoveryPubSubName || 'discovery-pub-sub';
            const topic = config.listResourcesTopicName || 'zscaler-listresources';
            try {
                await sleepMs(config.waitTimeInMs || 5000);
                await daprClient.pubsub.publish(
                    pubSubName,
                    topic,
                    message
                );
                Logger.info(`Published ${className} to list resources topic successfully.`);
            } catch (err) {
                Logger.error(`Cannot publish ${className} to list resources topic: ${err}`);
            }
        }
    } catch (err: any) {
        Logger.error(`Error in start discovery service: ${err}`);
        throw err;
    }
};
