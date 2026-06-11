import winston from 'winston';
import { Container } from 'typedi';
import { ZscalerDiscoveryBodyI } from '../../interfaces/config';
import { listResourcesService } from './listResourcesService';

export const describeAllNodesService = async (body: ZscalerDiscoveryBodyI, className: string, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    Logger.info(`describeAllNodesService called for class: ${className}. Delegating to listResourcesService.`);
    return listResourcesService(body, className, contextId);
};
