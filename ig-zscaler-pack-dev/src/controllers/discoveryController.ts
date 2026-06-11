import { Request, Response } from 'express';
import winston from 'winston';
import { Container } from 'typedi';
import { fetchDiscoveryCredentials } from '../services/secretsManager';
import { v4 as uuidv4 } from 'uuid';
import { ZscalerDiscoveryBodyI } from '../interfaces/config';
import { fetchStackDocument } from '../utils/externalApis';
import { startDiscoveryService } from '../services/discovery/startDiscoveryService';
import { listResourcesService } from '../services/discovery/listResourcesService';
import { describeResourceService } from '../services/discovery/describeResourceService';
import { describeAllNodesService } from '../services/discovery/describeAllNodesService';
import { describeAllRelationshipsService } from '../services/discovery/describeAllRelationshipsService';

export const startDiscoveryController = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const secrets = req.body.vault_path ? await fetchDiscoveryCredentials(req.body.vault_path) : {};
        const stackId = req.body.stack_id;
        const zoneId = req.body.zone_id;

        const contextId = uuidv4();
        let zpaBaseUrl = req.body.zpaBaseUrl;
        let ziaBaseUrl = req.body.ziaBaseUrl;
        
        try {
            const stackDoc = await fetchStackDocument(stackId, zoneId);
            if (stackDoc?.metadata) {
                if (stackDoc.metadata.zpaBaseUrl) zpaBaseUrl = stackDoc.metadata.zpaBaseUrl;
                if (stackDoc.metadata.ziaBaseUrl) ziaBaseUrl = stackDoc.metadata.ziaBaseUrl;
            }
        } catch (stackErr) {
            Logger.warn(`Failed to fetch stack document: ${stackErr}`);
        }

        const body: ZscalerDiscoveryBodyI = {
            zone_id: zoneId,
            stack_id: stackId,
            vault_path: req.body.vault_path || '',
            apiKey: secrets?.apiKey || req.body.apiKey,
            clientId: secrets?.client_id || req.body.clientId,
            clientSecret: secrets?.client_secret || req.body.clientSecret,
            customerId: secrets?.customerId || req.body.customerId,
            zpaBaseUrl,
            ziaBaseUrl,
        };

        // Run background service asynchronously
        startDiscoveryService(body, contextId);

        return res.status(200).send({
            error: null,
            data: {
                message: 'Discovery started',
                discoveryContextID: contextId
            }
        });
    } catch (err: any) {
        Logger.error(`Error in start discovery controller: ${err}`);
        return res.status(500).send({ error: 'Cannot start discovery', data: err.message || err });
    }
};

export const listResourcesController = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const { body, className, contextId } = req.body;
        await listResourcesService(body, className, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch (err: any) {
        Logger.error(`Error in list resources controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }
};

export const describeResourceController = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const { body, className, resourceId, contextId } = req.body;
        await describeResourceService(body, className, resourceId, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch (err: any) {
        Logger.error(`Error in describe resource controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }
};

export const describeAllResourcesController = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const { body, className, contextId } = req.body;
        await describeAllNodesService(body, className, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch (err: any) {
        Logger.error(`Error in describe all resources controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }
};

export const describeAllRelationshipsController = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const { body, className, nodeIds, contextId } = req.body;
        await describeAllRelationshipsService(body, className, nodeIds, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch (err: any) {
        Logger.error(`Error in describe all relationships controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }
};

export const verifyCreateStack = async (req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        return res.status(200).send({ error: null, message: 'verified' });
    } catch (err: any) {
        Logger.error(`Error in verifyCreateStack controller: ${err}`);
        return res.status(500).send({ error: 'VerificationFailed', message: 'Error in verification step' });
    }
};
