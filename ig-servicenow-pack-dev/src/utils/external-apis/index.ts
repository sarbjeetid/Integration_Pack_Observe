import Container from 'typedi';
import { Logger as LoggerType } from 'winston';
import config from '../../config';
import {
    fetchStackDocument as coreFetchStackDocument,
    deleteNode as coreDeleteNode,
} from './core-apis';

enum packLocation {
    core = 'core',
    edge = 'edge'
}

const fetchStackDocument = async (id: string, zone_id: string) => {
    const Logger: LoggerType = Container.get('loggerInstance');

    if (config.packLocation === packLocation.core) {
        return coreFetchStackDocument(id, zone_id);
    }

    Logger.error(
        `Pack not present at core or configuration not updated correctly`
    );
};

const deleteNode = async (source_ids: string[]) => {
    const Logger: LoggerType = Container.get('loggerInstance');

    if (config.packLocation === packLocation.core) {
        return coreDeleteNode(
            source_ids
        );
    }

    Logger.error(
        `Pack not present at core or configuration not updated correctly`
    );
};

export { fetchStackDocument, deleteNode };
