import { Request, Response } from 'express';
import * as connectorService from '../services/zpa/connectorService';
import { getAuthHeader, ZSCALER_ZONES } from '../services/authentication/authService';
import config from '../config';
import { handleControllerError } from '../utils/errorHandling';
import { resolveZPABaseUrl } from '../utils/endpointResolver';

const authType = config.authType;

/**
 * Extract base URL from request (query param, header, or body)
 */
const getBaseUrlFromRequest = (req: Request): string | undefined => {
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') {
        return req.query.baseUrl;
    }

    if (
        req.headers['x-zscaler-base-url'] &&
        typeof req.headers['x-zscaler-base-url'] === 'string'
    ) {
        return req.headers['x-zscaler-base-url'];
    }

    if (req.body?.baseUrl) {
        return req.body.baseUrl;
    }

    return undefined;
};

/**
 * Extract customer ID from request
 */
const getCustomerIdFromRequest = (req: Request): string | undefined => {
    if (req.query.customerId && typeof req.query.customerId === 'string') {
        return req.query.customerId;
    }

    if (
        req.headers['x-zscaler-customer-id'] &&
        typeof req.headers['x-zscaler-customer-id'] === 'string'
    ) {
        return req.headers['x-zscaler-customer-id'];
    }

    if (req.body?.customerId) {
        return req.body.customerId;
    }

    return undefined;
};

/**
 * List connectors (paginated)
 */
export const listConnectorsController = async (req: Request, res: Response) => {
    try {
        console.log('[listConnectorsController] Received request to list connectors');

        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        console.log(`[listConnectorsController] Using base URL: ${baseUrl}`);
        const customerId = getCustomerIdFromRequest(req);
        console.log(`[listConnectorsController] Using customer ID: ${customerId}`);

        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        console.log(`[listConnectorsController] Using page: ${page}`);
        const pageSize = req.query.pageSize
            ? parseInt(req.query.pageSize as string, 10)
            : 100;

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        console.log(`[listConnectorsController] Obtained auth header for auth type: ${authType}`);

        const connectors = await connectorService.listConnectors(
            authHeader,
            baseUrl,
            page,
            pageSize,
            customerId
        );
        console.log(`[listConnectorsController] Fetched connectors: ${JSON.stringify(connectors)}`);

        res.json(connectors);
    } catch (error) {
        handleControllerError(error, res, 'List Connectors');
    }
};

/**
 * Fetch all connectors (no pagination)
 */
export const fetchAllConnectorsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);

        const connectors = await connectorService.fetchAllConnectors(
            authHeader,
            baseUrl,
            customerId
        );

        res.json({
            totalCount: connectors.length,
            list: connectors,
        });
    } catch (error) {
        handleControllerError(error, res, 'Fetch All Connectors');
    }
};

/**
 * Get connector by ID
 */
export const getConnectorController = async (req: Request, res: Response) => {
    try {
        const { connectorId } = req.params;

        if (!connectorId) {
            throw new Error('[getConnectorController] Missing connectorId');
        }

        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);

        const connector = await connectorService.getConnectorById(
            connectorId,
            authHeader,
            baseUrl,
            customerId
        );

        res.json(connector);
    } catch (error) {
        handleControllerError(error, res, 'Get Connector');
    }
};

/**
 * Get connectors by group ID
 */
export const getConnectorsByGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;

        if (!groupId) {
            throw new Error('[getConnectorsByGroupController] Missing groupId');
        }

        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);

        const connectors = await connectorService.getConnectorsByGroupId(
            groupId,
            authHeader,
            baseUrl,
            customerId
        );

        res.json({
            totalCount: connectors.length,
            list: connectors,
        });
    } catch (error) {
        handleControllerError(error, res, 'Get Connectors by Group');
    }
};

/**
 * Get connector status/health
 */
export const getConnectorStatusController = async (req: Request, res: Response) => {
    try {
        const { connectorId } = req.params;

        if (!connectorId) {
            throw new Error('[getConnectorStatusController] Missing connectorId');
        }

        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);

        const status = await connectorService.getConnectorStatus(
            connectorId,
            authHeader,
            baseUrl,
            customerId
        );

        res.json(status);
    } catch (error) {
        handleControllerError(error, res, 'Get Connector Status');
    }
};

/**
 * Get bulk connector status
 */
export const getBulkConnectorStatusController = async (req: Request, res: Response) => {
    try {
        const { connectorIds } = req.body;

        if (!Array.isArray(connectorIds) || connectorIds.length === 0) {
            throw new Error('[getBulkConnectorStatusController] Invalid connectorIds');
        }

        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);

        const authHeader = await getAuthHeader(authType, undefined, baseUrl);

        const statuses = await connectorService.getBulkConnectorStatus(
            connectorIds,
            authHeader,
            baseUrl,
            customerId
        );

        res.json({
            totalCount: statuses.length,
            list: statuses,
        });
    } catch (error) {
        handleControllerError(error, res, 'Get Bulk Connector Status');
    }
};

/**
 * Get available Zscaler cloud zones
 */
export const getAvailableZonesController = async (_req: Request, res: Response) => {
    try {
        const zones = Object.entries(ZSCALER_ZONES).map(([zone, url]) => ({
            zone,
            url,
        }));

        res.json({
            totalCount: zones.length,
            list: zones,
        });
    } catch (error) {
        handleControllerError(error, res, 'Get Available Zones');
    }
};