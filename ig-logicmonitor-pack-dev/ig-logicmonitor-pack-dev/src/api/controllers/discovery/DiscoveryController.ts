import { JsonController, Post, Body, UseBefore, Req, Res } from 'routing-controllers';
import express, { Request, Response } from 'express';
import { startDiscoveryService } from '../../services/discovery/startDiscovery';
import { listResourcesService } from '../../services/discovery/listResources';
import { describeResourcesService } from '../../services/discovery/describeResources';
import { metricsDiscoveryService } from '../../services/discovery/metricsDiscovery';
import { interfaceDiscoveryService } from '../../services/discovery/interfaceDiscovery';
import { interfaceToInterfaceRelationshipDiscoveryService } from '../../services/cdpNeighbour/relationshipDiscoveryService';
import { LogicMonitorDiscoveryRequestI, LogicMonitorDiscoveryRequestFullI } from '../../../interfaces/discovery';
import { Service, Container } from 'typedi';
import SecretsManager from '../../../utils/secrets-manager';
import config from '../../../config';
import { fetchStackDocument } from '../../../utils/external-apis';
import winston from 'winston';
import { DaprClient } from 'dapr-client';
import { v4 as uuidv4 } from 'uuid';
import path from "path";
import { PubSubMiddleware } from '../../../middlewares/pub-sub-middleware';

// Express middleware for handling 'application/cloudevents+json'
const jsonParser = express.json({ type: 'application/cloudevents+json' });
@JsonController('/api/discovery')
@Service()
export class DiscoveryController {

    constructor(private readonly secretsManager: SecretsManager) { }
    @Post('/start')
    async startDiscovery(@Body() stack: LogicMonitorDiscoveryRequestI) {
        const daprClient: DaprClient = Container.get('daprClient');
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
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
                loggerInstance.error(`Error in fetching secrets ${err}`, {path: path.relative(process.cwd(), __filename)});
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
                    { body: stack, contextId }
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
                    message: 'Discovery started',
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
    @Post('/startDiscovery')
    @UseBefore(jsonParser)
    @UseBefore(PubSubMiddleware)
    async discoveryStart(
        @Body() stack: { body: LogicMonitorDiscoveryRequestFullI, contextId: string, discoveryType?: string }, @Req() request: Request, @Res() response: Response
    ) {
        let { body, contextId, discoveryType } = stack;
        discoveryType = discoveryType ?? 'node';
        
        startDiscoveryService(body, contextId, discoveryType);
        return response.status(200).json({ error: null, message: 'Discovery Started Successfully' });
    }
    @Post('/listResources')
    @UseBefore(jsonParser)
    @UseBefore(PubSubMiddleware)
    async listResources(
        @Body() stack: { body: LogicMonitorDiscoveryRequestFullI, contextId: string, devices: any, discoveryType?: string }, @Req() request: Request, @Res() response: Response
    ) {
        let { body, contextId, devices, discoveryType } = stack;
        discoveryType = discoveryType ?? 'node';

        listResourcesService(body, contextId, devices, discoveryType);
        return response.status(200).json({ error: null, message: 'Devices Listed Successfully' });
    }
    @Post('/describeResources')
    @UseBefore(jsonParser)
    @UseBefore(PubSubMiddleware)
    async describeResources(
        @Body() stack: { body: LogicMonitorDiscoveryRequestFullI, contextId: string, device: any }, @Req() request: Request, @Res() response: Response
    ) {
        let { body, contextId, device } = stack;
        describeResourcesService(body, contextId, device);
        return response.status(200).json({ error: null, message: 'Devices Discovered Successfully' });
    }

    @Post('/metricDiscovery')
    @UseBefore(jsonParser)
    @UseBefore(PubSubMiddleware)
    async metricDiscovery(@Body() stack: { body: LogicMonitorDiscoveryRequestFullI, contextId: string, deviceId: string, deviceType: string }, @Req() request: Request, @Res() response: Response) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        try {
            let { body, contextId, deviceId, deviceType } = stack;
            metricsDiscoveryService(body, contextId, deviceId, deviceType);
            return response.status(200).json({ error: null, message: 'Metrics Discovered Successfully' });

        } catch (err) {
            loggerInstance.error(`[src::api::controllers::discovery::DiscoveryController.ts::metricDiscovery] Error from metricDiscoveryService: ${err}`);
        }
        return response.status(200).json({ error: null, message: 'ok' });
    }

    @Post('/interfaceDiscovery')
    @UseBefore(jsonParser)
    @UseBefore(PubSubMiddleware)
    async interfaceDiscovery(@Body() stack: { body: LogicMonitorDiscoveryRequestFullI, contextId: string, deviceId: string }, @Req() request: Request, @Res() response: Response) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        try {
            let { body, contextId, deviceId } = stack;
            interfaceDiscoveryService(body, contextId, deviceId);
            return response.status(200).json({ error: null, message: 'Interface Discovered Successfully' });

        } catch (err) {
            loggerInstance.error(`[src::api::controllers::discovery::DiscoveryController.ts::interfaceDiscovery] Error from interfaceDiscoveryService: ${err}`);
        }
        return response.status(200).json({ error: null, message: 'ok' });
    }
}
