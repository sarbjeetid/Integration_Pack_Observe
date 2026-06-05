import { Request, Response } from 'express';
import winston from 'winston';
import { Container } from 'typedi';
import { scenarioService } from '../services/scenario/scenarioService';


const createScenarioController = async(req: Request, res: Response) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try{
        let stack_id = req.headers.stack_id as string;
        await scenarioService(req.body, stack_id);
        return res.status(200).send({error: null, data: 'Incident event processed successfully'});
    } catch(err){
        loggerInstance.error(`Cannot create scenario in Observe: ${err}`);
        return res.status(500).send({error: 'Cannot create scenario in observe', data: err});
    }
}

export {
    createScenarioController
}