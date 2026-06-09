// src/loaders/dependency-injector.ts

import { Container } from 'typedi';
import logger from './logger';

export const initializeDependencies = async () => {
    try {
        // Register logger instance
        Container.set('loggerInstance', logger);

        logger.info('Dependency injection initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize dependencies', { error });
        throw error;
    }
};

export default initializeDependencies;
