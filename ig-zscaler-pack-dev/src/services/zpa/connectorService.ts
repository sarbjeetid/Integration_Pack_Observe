// src/services/zpa/connectorService.ts

import axios, { AxiosInstance } from 'axios';
import config from '../../config';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

/**
 * Zscaler App Connector interface
 */
export interface AppConnector {
    id?: string;
    name: string;
    enabled?: boolean;
    status?: string;
    version?: string;
    createdTime?: number;
    modifiedTime?: number;
    lastModifiedBy?: string;
    appConnectorGroupId?: string;
    [key: string]: any;
}

/**
 * Paginated response for connector lists
 */
export interface PaginatedConnectorResponse {
    totalPages?: number;
    pageCount?: number;
    list?: AppConnector[];
    totalCount?: number;
    pageIndex?: number;
    [key: string]: any;
}

let connectorAxiosInstance: AxiosInstance;

/**
 * Initialize connector API client
 */
export const initializeConnectorClient = (authHeader: any, baseUrl?: string): AxiosInstance => {
    const resolvedBaseUrl = baseUrl || resolveZPABaseUrl();
    
    connectorAxiosInstance = axios.create({
        baseURL: resolvedBaseUrl,
        headers: authHeader,
        timeout: 30000,
    });

    return connectorAxiosInstance;
};

/**
 * Get total pages count for connectors
 * This is needed to paginate through all connectors
 */
export const getConnectorsPagesCount = async (
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<number> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        // Construct endpoint - support both direct connector endpoint and management config
        const endpoint = customerId 
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector?pageSize=1`
            : '/connector?pageSize=1';
        
        const response = await client.get<PaginatedConnectorResponse>(endpoint);
        
        return response.data.totalPages || response.data.pageCount || 1;
    } catch (error: any) {
        throw handleConnectorError(error, 'getConnectorsPagesCount');
    }
};

/**
 * Fetch all connectors with pagination
 */
export const fetchAllConnectors = async (
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<AppConnector[]> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        // Get total pages count first
        const totalPages = await getConnectorsPagesCount(authHeader, baseUrl, customerId);
        
        const allConnectors: AppConnector[] = [];
        
        // Fetch all pages
        for (let page = 1; page <= totalPages; page++) {
            const endpoint = customerId
                ? `/mgmtconfig/v1/admin/customers/${customerId}/connector?page=${page}`
                : `/connector?page=${page}`;
            
            const response = await client.get<PaginatedConnectorResponse>(endpoint);
            
            if (response.data.list && Array.isArray(response.data.list)) {
                allConnectors.push(...response.data.list);
            }
        }
        
        return allConnectors;
    } catch (error: any) {
        throw handleConnectorError(error, 'fetchAllConnectors');
    }
};

/**
 * List connectors with pagination support
 */
export const listConnectors = async (
    authHeader: any,
    baseUrl?: string,
    page: number = 1,
    pageSize: number = 100,
    customerId?: string
): Promise<PaginatedConnectorResponse> => {
    try {
        console.log(`[listConnectors] Using base URL: ${baseUrl}`);
        console.log(`[listConnectors] Using customer ID: ${customerId}`);
        console.log(`[listConnectors] Using page: ${page}`);
        console.log(`[listConnectors] Using page size: ${pageSize}`);
        const client = initializeConnectorClient(authHeader, baseUrl);
        console.log(`[listConnectors] Using base URL: ${baseUrl}`);
        console.log(`[listConnectors] Using customer ID: ${customerId}`);
        console.log(`[listConnectors] Using page: ${page}`);
        console.log(`[listConnectors] Using page size: ${pageSize}`);

        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector?page=${page}&pageSize=${pageSize}`
            : `/connector?page=${page}&pageSize=${pageSize}`;
        
        const response = await client.get<PaginatedConnectorResponse>(endpoint);
        return response.data;
    } catch (error: any) {
        throw handleConnectorError(error, 'listConnectors');
    }
};

/**
 * Get a specific connector by ID
 */
export const getConnectorById = async (
    connectorId: string,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<AppConnector> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector/${connectorId}`
            : `/connector/${connectorId}`;
        
        const response = await client.get<AppConnector>(endpoint);
        return response.data;
    } catch (error: any) {
        throw handleConnectorError(error, 'getConnectorById');
    }
};

/**
 * Get connectors by group ID
 */
export const getConnectorsByGroupId = async (
    groupId: string,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<AppConnector[]> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connectorGroup/${groupId}/connectors`
            : `/connectorGroup/${groupId}/connectors`;
        
        const response = await client.get<{ list?: AppConnector[] }>(endpoint);
        return response.data.list || [];
    } catch (error: any) {
        throw handleConnectorError(error, 'getConnectorsByGroupId');
    }
};

/**
 * Create a new connector
 */
export const createConnector = async (
    connectorData: AppConnector,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<AppConnector> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector`
            : '/connector';
        
        const response = await client.post<AppConnector>(endpoint, connectorData);
        return response.data;
    } catch (error: any) {
        throw handleConnectorError(error, 'createConnector');
    }
};

/**
 * Update an existing connector
 */
export const updateConnector = async (
    connectorId: string,
    connectorData: Partial<AppConnector>,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<AppConnector> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector/${connectorId}`
            : `/connector/${connectorId}`;
        
        const response = await client.put<AppConnector>(endpoint, connectorData);
        return response.data;
    } catch (error: any) {
        throw handleConnectorError(error, 'updateConnector');
    }
};

/**
 * Delete a connector
 */
export const deleteConnector = async (
    connectorId: string,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector/${connectorId}`
            : `/connector/${connectorId}`;
        
        await client.delete(endpoint);
    } catch (error: any) {
        throw handleConnectorError(error, 'deleteConnector');
    }
};

/**
 * Get connector status/health
 */
export const getConnectorStatus = async (
    connectorId: string,
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<any> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector/${connectorId}/status`
            : `/connector/${connectorId}/status`;
        
        const response = await client.get(endpoint);
        return response.data;
    } catch (error: any) {
        throw handleConnectorError(error, 'getConnectorStatus');
    }
};

/**
 * Bulk get connector status
 */
export const getBulkConnectorStatus = async (
    connectorIds: string[],
    authHeader: any,
    baseUrl?: string,
    customerId?: string
): Promise<any[]> => {
    try {
        const client = initializeConnectorClient(authHeader, baseUrl);
        
        const endpoint = customerId
            ? `/mgmtconfig/v1/admin/customers/${customerId}/connector/status/bulk`
            : '/connector/status/bulk';
        
        const response = await client.post(endpoint, { ids: connectorIds });
        return response.data.list || response.data || [];
    } catch (error: any) {
        throw handleConnectorError(error, 'getBulkConnectorStatus');
    }
};

/**
 * Handle connector API errors
 */
function handleConnectorError(error: any, functionName: string): Error {
    if (error.response?.status === 401) {
        return new Error(`[${functionName}] Unauthorized - Invalid credentials or expired token`);
    } else if (error.response?.status === 403) {
        return new Error(`[${functionName}] Forbidden - Insufficient permissions`);
    } else if (error.response?.status === 404) {
        return new Error(`[${functionName}] Not found - Connector or endpoint does not exist`);
    } else if (error.response?.status === 429) {
        return new Error(`[${functionName}] Rate limit exceeded - Please retry after some time`);
    } else if (error.response?.data?.error) {
        return new Error(`[${functionName}] API Error: ${error.response.data.error}`);
    } else if (error.message) {
        return new Error(`[${functionName}] Request failed: ${error.message}`);
    }
    return new Error(`[${functionName}] Unknown error occurred`);
}
