import { Response } from 'express';
import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';

export class ResolveIncidentError extends Error {
    constructor(public readonly originalError: any, public readonly incidentId: string) {
        super(formatServiceNowError(originalError, incidentId, 'resolve'));
        this.name = 'ResolveIncidentError';
    }
}

export class GetIncidentDataError extends Error {
    constructor(public readonly originalError: any, public readonly incidentId: string) {
        super(formatServiceNowError(originalError, incidentId, 'get'));
        this.name = 'GetIncidentDataError';
    }
}

export class CloseIncidentError extends Error {
    constructor(public readonly originalError: any, public readonly incidentId: string) {
        super(formatServiceNowError(originalError, incidentId, 'resolve'));
        this.name = 'CloseIncidentError';
    }
}

export class CreateIncidentError extends Error {
    constructor(public readonly originalError: any, public readonly incidentId: string) {
        super(formatServiceNowError(originalError, incidentId, 'create'));
        this.name = 'CreateIncidentError';
    }
}

export class UpdateIncidentError extends Error {
    constructor(public readonly originalError: any, public readonly incidentId: string) {
        super(formatServiceNowError(originalError, incidentId, 'update'));
        this.name = 'UpdateIncidentError';
    }
}

export class ReassignIncidentError extends Error {
  constructor(public readonly originalError: any, public readonly incidentId: string) {
    super(formatServiceNowError(originalError, incidentId, 'reassign'));
    this.name = 'ReassignIncidentError';
  }
}

export class FetchIncidentError extends Error {
  constructor(public readonly originalError: any, public readonly tenantId: string) {
    super(`Failed to fetch incidents for tenant: ${tenantId} - ${originalError?.message || 'Unknown error'}`);
    this.name = 'FetchIncidentError';
  }
}

export class ConfigNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Customer config not found for tenantId: ${tenantId}`);
    this.name = 'ConfigNotFoundError';
  }
}

export class ServiceNowAPIError extends Error {
  constructor(message: string, public readonly serviceName: string) {
    super(`[${serviceName}] ServiceNow API failed: ${message}`);
    this.name = 'ServiceNowAPIError';
  }
}

export class ScheduleCreationError extends Error {
  constructor(message: string) {
    super(`Failed to create schedule in Observe: ${message}`);
    this.name = 'ScheduleCreationError';
  }
}

export class CILinkingError extends Error {
  constructor(message: string) {
    super(`Failed to associate CI with incident: ${message}`);
    this.name = 'CILinkingError';
  }
}

// 🧠 Helper to format all messages
function formatServiceNowError(error: any, incidentId: string, action: string): string {
    const parts: string[] = [];

    const statusCode = error?.response?.status;
    if (statusCode) {
        parts.push(`Status Code: ${statusCode}`);
    }

    const responseData = error?.response?.data;

    if (responseData?.error?.message) {
        parts.push(`Error Message: ${responseData.error.message}`);
    }

    if (responseData?.error?.detail) {
        parts.push(`Error Detail: ${responseData.error.detail}`);
    }

    const serviceNowMessage =
        responseData?.message ||
        responseData?.result?.message ||
        responseData?.result?.error;

    if (serviceNowMessage) {
        parts.push(`ServiceNow Message: ${serviceNowMessage}`);
    }

    if (error?.message) {
        parts.push(`Generic Error: ${error.message}`);
    }

    const full = parts.join(' | ') || 'Unknown error';
    return `Error during ${action} incident [${incidentId}]: ${full}`;
}

// 🧩 Universal controller error handler
export const handleControllerError = (
    error: any,
    res: Response,
    actionLabel: string,
    fallbackMessage = 'An unexpected error occurred'
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const relativePath = path.relative(process.cwd(), __filename);

    const statusCode = error.originalError?.response?.status
        || error.response?.status
        || 500;

    if (error?.message && error?.name?.endsWith('IncidentError')) {
        loggerInstance.error(`${actionLabel} failed: ${error.message}`, { path: relativePath });
        res.status(statusCode).json({ error: error.message });
    } else {
        loggerInstance.error(`${actionLabel} failed`, {
            path: relativePath,
            message: error?.message || 'Unknown error',
            stack: error?.stack,
        });
        res.status(statusCode).json({ error: `${actionLabel} failed: ${fallbackMessage}` });
    }
};
