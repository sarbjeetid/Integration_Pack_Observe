// src/loaders/express.ts

import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from '../config';
import logger from './logger';

// Import routes
import zpaRouter from '../routes/zpaRouter';
import ziaRouter from '../routes/ziaRouter';
import healthCheckRouter from '../routes/healthCheckRouter';

export const loadExpress = (): Express => {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Logging middleware
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            query: req.query,
        });
        next();
    });

    // Routes
    const apiPrefix = config.api.prefix;

    // Health check endpoints
    app.use('/health', healthCheckRouter);
    app.use(`${apiPrefix}/health`, healthCheckRouter);

    // ZPA endpoints
    app.use(`${apiPrefix}/zpa`, zpaRouter);

    // ZIA endpoints
    app.use(`${apiPrefix}/zia`, ziaRouter);

    // Default route
    app.get('/', (req, res) => {
        res.json({
            message: 'Zscaler Integration Pack (ig-zscaler-pack)',
            version: config.pack.version,
            endpoints: {
                health: '/health',
                zpa: `${apiPrefix}/zpa`,
                zia: `${apiPrefix}/zia`,
            },
        });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            statusCode: 404,
            message: 'Not Found',
            path: req.path,
        });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('Unhandled error', { error: err });
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    });

    return app;
};

export default loadExpress;
