// src/controllers/zpa/controllerFactory.ts

import { Request, Response } from 'express';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

export const getBaseUrlFromRequest = (req: Request): string | undefined => {
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') return req.query.baseUrl;
    if (req.headers['x-zscaler-base-url'] && typeof req.headers['x-zscaler-base-url'] === 'string') return req.headers['x-zscaler-base-url'];
    if (req.body?.baseUrl) return req.body.baseUrl;
    return undefined;
};

export const getCustomerIdFromRequest = (req: Request): string | undefined => {
    if (req.query.customerId && typeof req.query.customerId === 'string') return req.query.customerId;
    if (req.headers['x-zscaler-customer-id'] && typeof req.headers['x-zscaler-customer-id'] === 'string') return req.headers['x-zscaler-customer-id'];
    if (req.body?.customerId) return req.body.customerId;
    return undefined;
};

export const createListController = (
    serviceFn: (authHeader: any, baseUrl: string, customerId?: string, params?: any) => Promise<any>,
    actionName: string
) => {
    return async (req: Request, res: Response) => {
        try {
            const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
            const customerId = getCustomerIdFromRequest(req);
            const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
            const data = await serviceFn(authHeader, baseUrl, customerId, req.query);
            res.json(data);
        } catch (error) {
            handleControllerError(error, res, actionName);
        }
    };
};

export const createGetController = (
    serviceFn: (id: string, authHeader: any, baseUrl: string, customerId?: string) => Promise<any>,
    actionName: string,
    paramName: string = 'id'
) => {
    return async (req: Request, res: Response) => {
        try {
            const id = req.params[paramName];
            if (!id) throw new Error(`Missing ${paramName}`);
            const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
            const customerId = getCustomerIdFromRequest(req);
            const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
            const data = await serviceFn(id, authHeader, baseUrl, customerId);
            res.json(data);
        } catch (error) {
            handleControllerError(error, res, actionName);
        }
    };
};

export const createCreateController = (
    serviceFn: (data: any, authHeader: any, baseUrl: string, customerId?: string) => Promise<any>,
    actionName: string
) => {
    return async (req: Request, res: Response) => {
        try {
            const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
            const customerId = getCustomerIdFromRequest(req);
            const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
            const data = await serviceFn(req.body, authHeader, baseUrl, customerId);
            res.status(201).json(data);
        } catch (error) {
            handleControllerError(error, res, actionName);
        }
    };
};

export const createUpdateController = (
    serviceFn: (id: string, data: any, authHeader: any, baseUrl: string, customerId?: string) => Promise<any>,
    actionName: string,
    paramName: string = 'id'
) => {
    return async (req: Request, res: Response) => {
        try {
            const id = req.params[paramName];
            if (!id) throw new Error(`Missing ${paramName}`);
            const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
            const customerId = getCustomerIdFromRequest(req);
            const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
            const data = await serviceFn(id, req.body, authHeader, baseUrl, customerId);
            res.json(data);
        } catch (error) {
            handleControllerError(error, res, actionName);
        }
    };
};

export const createDeleteController = (
    serviceFn: (id: string, authHeader: any, baseUrl: string, customerId?: string) => Promise<void>,
    actionName: string,
    paramName: string = 'id'
) => {
    return async (req: Request, res: Response) => {
        try {
            const id = req.params[paramName];
            if (!id) throw new Error(`Missing ${paramName}`);
            const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
            const customerId = getCustomerIdFromRequest(req);
            const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
            await serviceFn(id, authHeader, baseUrl, customerId);
            res.json({ message: `${actionName} deleted successfully` });
        } catch (error) {
            handleControllerError(error, res, `Delete ${actionName}`);
        }
    };
};
