import { Container } from "typedi";
import winston from "winston";
import { DaprClient } from 'dapr-client';
import { LogicMonitorDiscoveryRequestFullI } from "../../../interfaces/discovery";
import config from "../../../config";
import sleep from '../../../utils/sleep';
import path from "path";
import { interfaceToInterfaceRelationshipDiscoveryService } from "../cdpNeighbour/relationshipDiscoveryService";

const listResourcesService = async (body: LogicMonitorDiscoveryRequestFullI, contextId: string, devices: any, discoveryType?: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');

    const pubSubName = config.discoveryPubSubName;
    try {
        if (devices) {
            for (let device of devices) {
                const message = {
                    body,
                    contextId,
                    device: device,
                }
                if (discoveryType === 'relationship') {
                     await interfaceToInterfaceRelationshipDiscoveryService(body, contextId, device);

                } else {
                    // trigger describe resources api
                    try {
                        const topic = config.describeResourcesTopicName;
                        await sleep(config.waitTimeinMs);
                        await daprClient.pubsub.publish(
                            pubSubName,
                            topic,
                            message
                        );
                    } catch (err) {
                        loggerInstance.error(`Error in publishing to describeResources topic ${err}`, { path: path.relative(process.cwd(), __filename) });
                        return {
                            error: 'Error in publishing to describeResources topic',
                            data: err
                        };
                    }

                }


            }
        }
    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::listResources.ts::listResourcesService] Cannot fetch list of resources: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in publishing to listResources topic',
            data: error
        };
    }
};
export { listResourcesService };
