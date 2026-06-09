// src/controllers/zpa/connectorsController.ts

import { Request, Response } from 'express';
import * as connectorService from '../../services/zpa/connectors/connectorService';
import * as connectorGroupService from '../../services/zpa/connectors/connectorGroupService';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

const authType = config.authType;

const getBaseUrlFromRequest = (req: Request): string | undefined => {
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') return req.query.baseUrl;
    if (req.headers['x-zscaler-base-url'] && typeof req.headers['x-zscaler-base-url'] === 'string') return req.headers['x-zscaler-base-url'];
    if (req.body?.baseUrl) return req.body.baseUrl;
    return undefined;
};

const getCustomerIdFromRequest = (req: Request): string | undefined => {
    if (req.query.customerId && typeof req.query.customerId === 'string') return req.query.customerId;
    if (req.headers['x-zscaler-customer-id'] && typeof req.headers['x-zscaler-customer-id'] === 'string') return req.headers['x-zscaler-customer-id'];
    if (req.body?.customerId) return req.body.customerId;
    return undefined;
};

// Connectors
export const listConnectorsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorService.listConnectors(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Connectors');
    }
};

export const getConnectorController = async (req: Request, res: Response) => {
    try {
        const { connectorId } = req.params;
        if (!connectorId) throw new Error('Missing connectorId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorService.getConnectorById(connectorId, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Connector');
    }
};

export const createConnectorController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorService.createConnector(req.body, authHeader, baseUrl, customerId);
        res.status(201).json(data);
    } catch (error) {
        handleControllerError(error, res, 'Create Connector');
    }
};

export const updateConnectorController = async (req: Request, res: Response) => {
    try {
        const { connectorId } = req.params;
        if (!connectorId) throw new Error('Missing connectorId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorService.updateConnector(connectorId, req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Connector');
    }
};

export const deleteConnectorController = async (req: Request, res: Response) => {
    try {
        const { connectorId } = req.params;
        if (!connectorId) throw new Error('Missing connectorId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await connectorService.deleteConnector(connectorId, authHeader, baseUrl, customerId);
        res.json({ message: 'Connector deleted successfully' });
    } catch (error) {
        handleControllerError(error, res, 'Delete Connector');
    }
};

// Connector Groups
export const listConnectorGroupsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorGroupService.listConnectorGroups(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Connector Groups');
    }
};

export const getConnectorGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorGroupService.getConnectorGroupById(groupId, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Connector Group');
    }
};

export const createConnectorGroupController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorGroupService.createConnectorGroup(req.body, authHeader, baseUrl, customerId);
        res.status(201).json(data);
    } catch (error) {
        handleControllerError(error, res, 'Create Connector Group');
    }
};

export const updateConnectorGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await connectorGroupService.updateConnectorGroup(groupId, req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Connector Group');
    }
};

export const deleteConnectorGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await connectorGroupService.deleteConnectorGroup(groupId, authHeader, baseUrl, customerId);
        res.json({ message: 'Connector Group deleted successfully' });
    } catch (error) {
        handleControllerError(error, res, 'Delete Connector Group');
    }
};
