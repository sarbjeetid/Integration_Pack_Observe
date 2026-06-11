import winston from 'winston';
import { Container } from 'typedi';
import { ZscalerDiscoveryBodyI } from '../../interfaces/config';

export const describeAllRelationshipsService = async (
    body: ZscalerDiscoveryBodyI,
    className: string,
    nodeIds: string[],
    contextId: string
) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    Logger.info(`describeAllRelationshipsService called for class ${className}. Relationships are resolved inline during node description. Skipping bulk query.`);
    return { success: true };
};
