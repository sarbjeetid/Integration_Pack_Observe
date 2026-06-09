// src/loaders/index.ts

import initializeDependencies from './dependency-injector';
import loadExpress from './express';
import logger from './logger';
import { Container } from 'typedi';

const loaders = async () => {
    try {
        // Initialize dependencies
        await initializeDependencies();
        logger.info('Dependencies initialized');

        // Load Express app
        const app = loadExpress();
        logger.info('Express app loaded');

        // Register Express app in container
        Container.set('expressApp', app);

        logger.info('All loaders completed successfully');
    } catch (error) {
        logger.error('Failed to load components', { error });
        throw error;
    }
};

export default loaders;
