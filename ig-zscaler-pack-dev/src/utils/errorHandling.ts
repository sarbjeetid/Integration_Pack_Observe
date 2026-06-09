// src/utils/errorHandling.ts

import { Response } from 'express';
import logger from '../loaders/logger';

export interface ErrorResponse {
    statusCode: number;
    message: string;
    error?: string;
    timestamp?: string;
}

/**
 * Handle errors in controllers
 */
export const handleControllerError = (error: any, res: Response, context: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`[${context}] Error: ${message}`, { error });

    // Check if it's an HTTP error with status code
    if (error.status) {
        return res.status(error.status).json({
            statusCode: error.status,
            message: message,
            timestamp: new Date().toISOString(),
        });
    }

    // Default to 500 Internal Server Error
    res.status(500).json({
        statusCode: 500,
        message: message || 'Internal server error',
        timestamp: new Date().toISOString(),
    });
};

/**
 * Format error response
 */
export const formatErrorResponse = (error: Error, statusCode: number = 500): ErrorResponse => {
    return {
        statusCode,
        message: error.message,
        error: error.stack,
        timestamp: new Date().toISOString(),
    };
};
