import Container from 'typedi';
import winston from 'winston';
import {
    fetchStackDocument as coreFetchStackDocument,
    deleteNode as coreDeleteNode,
    getSourceIdBySourceName as coreGetSourceIdBySourceName,
    markDiscoverySuccess,
    markInterfaceDiscoverySuccess,
} from './core-apis';
import path from 'path';
import sleep from '../sleep';
import config from '../../config';
import { getCachedSourceId, setCachedSourceId } from '../cache/sourceIdCache';

const CORE_API_MAX_RETRIES = config.coreApiRetry?.attempts ?? 5;
const CORE_API_RETRY_INITIAL_DELAY_MS = config.coreApiRetry?.initialDelayMs ?? 1000;
const CORE_API_RETRY_MAX_DELAY_MS = config.coreApiRetry?.maxDelayMs ?? 10000;
const fetchStackDocument = async (id: string, zone_id: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        return await coreFetchStackDocument(id, zone_id);
        
    } catch (error) {
        loggerInstance.error(
            `Error fetching stack document: ${error}`, { path: path.relative(process.cwd(), __filename) }
        );
    }
};
const deleteNode = async (source_ids: string[]) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        return await coreDeleteNode(source_ids);

    } catch (error) {
        loggerInstance.error(
            `Pack not present at core or configuration not updated correctly`, { path: path.relative(process.cwd(), __filename) }
        );
    }
};

const getSourceIdBySourceName = async (stackId: string, sourceName: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const cachedSourceId = await getCachedSourceId(sourceName);
        if (cachedSourceId) {
            loggerInstance.info(
                `[getSourceIdBySourceName] Cache hit for stackId=${stackId}, sourceName=${sourceName}`,
                { path: path.relative(process.cwd(), __filename) }
            );
            return cachedSourceId;
        }
    } catch (cacheError) {
        loggerInstance.warn(
            `[getSourceIdBySourceName] Cache lookup error: ${cacheError}`,
            { path: path.relative(process.cwd(), __filename) }
        );
    }
    const maxRetries = Number.isNaN(CORE_API_MAX_RETRIES) ? 5 : CORE_API_MAX_RETRIES;
    const maxDelay = Number.isNaN(CORE_API_RETRY_MAX_DELAY_MS) ? 10000 : CORE_API_RETRY_MAX_DELAY_MS;
    let delay = Number.isNaN(CORE_API_RETRY_INITIAL_DELAY_MS) ? 1000 : CORE_API_RETRY_INITIAL_DELAY_MS;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const sourceId = await coreGetSourceIdBySourceName(stackId, sourceName);
            if (sourceId) {
                loggerInstance.info(
                    `[getSourceIdBySourceName] Successfully retrieved source ID for stackId=${stackId}, sourceName=${sourceName} on attempt ${attempt}`,)
                try {
                    await setCachedSourceId(sourceName, sourceId);
                } catch (cacheSetError) {
                    loggerInstance.warn(
                        `[getSourceIdBySourceName] Cache set error: ${cacheSetError}`,
                        { path: path.relative(process.cwd(), __filename) }
                    );
                }
                return sourceId;
            }
            throw new Error('Source ID response was empty');
        } catch (error: any) {
            loggerInstance.warn(
                `[getSourceIdBySourceName] Attempt ${attempt} failed: ${error?.message || error}`,
                { path: path.relative(process.cwd(), __filename) }
            );

            if (attempt === maxRetries) {
                loggerInstance.error(
                    `Max retries reached for getSourceIdBySourceName: ${error?.message || error}`,
                    { path: path.relative(process.cwd(), __filename) }
                );
                break;
            }

            await sleep(delay);
            delay = Math.min(delay * 2, maxDelay);
        }
    }
};
const markDiscoverySuccessCore = async (stackId: string, when?:  Date | string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        return await markDiscoverySuccess(stackId, when);
        
    } catch (error) {
        loggerInstance.error(
            `Error marking discovery success: ${error}`, { path: path.relative(process.cwd(), __filename) }
        );
    }
};
const markInterfaceDiscoverySuccessCore = async (stackId: string, when?:  Date | string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        return await markInterfaceDiscoverySuccess(stackId, when);
        
    } catch (error) {
        loggerInstance.error(
            `Error marking interface discovery success: ${error}`, { path: path.relative(process.cwd(), __filename) }
        );
    }
};
export { fetchStackDocument, deleteNode, getSourceIdBySourceName, markDiscoverySuccessCore, markInterfaceDiscoverySuccessCore};
