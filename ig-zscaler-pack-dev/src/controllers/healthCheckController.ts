// src/controllers/healthCheckController.ts

import { Request, Response } from 'express';
import { validateApiKeyConnectivity } from '../services/authentication/authService';
import config from '../config';

/**
 * Health check endpoint
 */
export const healthCheckController = async (req: Request, res: Response) => {
    try {
        const isConnected = await validateApiKeyConnectivity(config.baseUrl);
        
        const health = {
            status: isConnected ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'ig-zscaler-pack',
            version: config.pack.version,
            connectivity: {
                zscaler: isConnected ? 'connected' : 'disconnected',
            },
        };

        if (isConnected) {
            res.status(200).json(health);
        } else {
            res.status(503).json(health);
        }
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'ig-zscaler-pack',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
