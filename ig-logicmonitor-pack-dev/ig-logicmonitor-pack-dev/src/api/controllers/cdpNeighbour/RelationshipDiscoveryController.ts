import { JsonController, Post, Body } from 'routing-controllers';
import winston from 'winston';
import { Container, Service } from 'typedi';
import path from "path";
import { LogicMonitorDiscoveryRequestFullI } from '../../../interfaces/discovery';
import SecretsManager from '../../../utils/secrets-manager';
import config from '../../../config';
import { fetchStackDocument } from '../../../utils/external-apis';
import { DaprClient } from 'dapr-client';
import { v4 as uuidv4 } from 'uuid';

@JsonController('/api/discoverRelationships')
@Service()
export class RelationshipDiscoveryController {
    constructor(private readonly secretsManager: SecretsManager) { }
    @Post('/start')
    async startrelationshipDiscovery(@Body() stack: LogicMonitorDiscoveryRequestFullI) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        const daprClient: DaprClient = Container.get('daprClient');
        try {
            let secrets = null;
            try {
                secrets = await this.secretsManager.fetchDiscoveryCredentials(
                    stack.zone_id,
                    stack.stack_id,
                    config.platforms.LOGICMONITOR as 'logicmonitor',
                    stack?.vault_path
                );
            } catch (err) {
                loggerInstance.error(`Error in fetching secrets ${err}`, { path: path.relative(process.cwd(), __filename) });
                return {
                    error: 'Cannot fetch secrets',
                    data: err
                };
            }


            if (secrets && secrets.accessId && secrets.accessKey && secrets.accountName) {
                // Use actual credentials
                stack.access_id = secrets.accessId;
                stack.access_key = secrets.accessKey;
                stack.account_name = secrets.accountName;

                const stackDoc = await fetchStackDocument(stack.stack_id, stack.zone_id);
                if (!stackDoc) {
                    return {
                        error: 'Error in startDiscoveryService',
                        data: 'Stack not present or incomplete'
                    }
                }
            }
            let contextId = uuidv4();

            const pubSubName = config.discoveryPubSubName;
            const topic = config.startDiscoveryTopicName;

            // start discovery topic
            try {
                await daprClient.pubsub.publish(
                    pubSubName,
                    topic,
                    {
                        body: stack,
                        contextId,
                        discoveryType: 'relationship'
                    }
                );

            } catch (err) {
                loggerInstance.error(`Error in publishing to startDiscovery topic ${err}`, { path: path.relative(process.cwd(), __filename) });
                return {
                    error: 'Error in publishing to startDiscovery topic',
                    data: err
                };
            }
            return {
                error: null,
                data: {
                    message: 'Relationship Discovery started',
                    discoveryContextID: contextId
                }
            };

        } catch (err) {
            loggerInstance.error(`Error in startDiscoveryService ${err}`, { path: path.relative(process.cwd(), __filename) });
            return {
                error: 'Error in startDiscoveryService',
                data: err
            };
        }
    }
}