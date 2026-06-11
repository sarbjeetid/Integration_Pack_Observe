// src/loaders/dependency-injector.ts

import { Container } from 'typedi';
import logger from './logger';
import daprClient from './dapr';
import { edgeSecrets as edgeVaultClient } from './vault';

export const initializeDependencies = async () => {
    try {
        // Register logger instance
        Container.set('loggerInstance', logger);
        logger.info('Logger loaded and injected');

        Container.set('edgeVaultClient', new edgeVaultClient());
        logger.info('Edge Vault Client loaded and injected');

        Container.set('daprClient', daprClient);
        logger.info('Dapr Client loaded and injected');

        logger.info('Dependency injection initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize dependencies', { error });
        throw error;
    }
};

export default initializeDependencies;

