import { Request, Response } from 'express';
import winston from 'winston';
import { Container } from 'typedi';
import { fetchDiscoveryCredentials } from '../services/secretsManager';
import { v4 as uuidv4 } from 'uuid';
import { ServicenowDiscoveryBodyI } from '../interfaces/config';
import { fetchStackDocument } from '../utils/external-apis';
import { startDiscoveryService} from '../services/discovery/startDiscoveryService';
import { listResourcesService } from '../services/discovery/listResourcesService';
import { describeResourceService } from '../services/discovery/describeResourceService';
import { describeAllNodesService } from '../services/discovery/describeAllNodesService';
import { describeAllRelationshipsService } from '../services/discovery/describeAllRelationshipsService';
const startDiscoveryController = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const secrets = await fetchDiscoveryCredentials(req.body.vault_path);
        const stackId = req.body.stack_id;
        const zoneId = req.body.zone_id;
        if (secrets && secrets.username && secrets.password){
            let contextId = uuidv4();
            const {username, password} = secrets;
            const stackDoc = await fetchStackDocument(stackId, zoneId);
            let url;
            let query;
            if(stackDoc.metadata && stackDoc.metadata.query){
                query = stackDoc.metadata.query;
            }
            if(stackDoc.metadata && stackDoc.metadata.url){
                url = stackDoc.metadata.url;
            }
            let body: ServicenowDiscoveryBodyI = {
                url,
                username,
                password,
                zone_id: zoneId,
                stack_id: stackId,
            }
            if(query){
                body = {
                    ...body,
                    query
                }
            }
            startDiscoveryService(body, contextId);
            return res.status(200).send({
                error: null,
                data: {
                    message: 'Discovery started',
                    discoveryContextID: contextId
                }})
        }
    } catch(err:any){
        Logger.error(`Error in start discovery controller: ${err}`);
        return res.status(500).send({error: 'Cannot fetch nodes from serviceNow instance', data: err});
    }
}

const listResourcesController = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const {body, className, contextId}: {body: ServicenowDiscoveryBodyI, className: string, contextId: string} = req.body;
         await listResourcesService(body, className, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch(err:any){
        Logger.error(`Error in list resources controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }

}

const describeResourceController = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const {body, className, resourceId, contextId}: {body: ServicenowDiscoveryBodyI, className: string, resourceId: string, contextId: string} = req.body;
        await describeResourceService(body, className, resourceId, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch(err:any){
        Logger.error(`Error in describe resource controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }

}

const describeAllResourcesController = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const {body, className, contextId}: {body: ServicenowDiscoveryBodyI, className: string, contextId: string} = req.body;
        await describeAllNodesService(body, className, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch(err:any){
        Logger.error(`Error in describe resource controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }

}

const describeAllRelationshipsController = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const {body, className, nodeIds, contextId}: {body: ServicenowDiscoveryBodyI, className: string, nodeIds: string[], contextId: string} = req.body;
        await describeAllRelationshipsService(body, className, nodeIds, contextId);
        return res.status(200).send({ error: null, message: 'ok' });
    } catch(err:any){
        Logger.error(`Error in describe resource controller: ${err}`);
        return res.status(200).send({ error: null, message: 'ok' });
    }

}

const verifyCreateStack = async(req: Request, res: Response) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        const {url, vault_path} : {url: string, vault_path: string} = req.body;
        // call service here to check; returning true for now
        return res.status(200).send({error: null, message: 'verified'});
    } catch(err:any){
        Logger.error(`Error in describe resource controller: ${err}`);
        return res.status(500).send({ error: 'VerificationFailed', message: 'Error in verification step'});
    }
}
export {
    startDiscoveryController,
    listResourcesController,
    describeResourceController,
    describeAllResourcesController,
    describeAllRelationshipsController,
    verifyCreateStack
}