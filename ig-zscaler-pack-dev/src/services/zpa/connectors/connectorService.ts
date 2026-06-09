// src/services/zpa/connectors/connectorService.ts

import ZPAClient from '../zpaClient';
import { ZPAAppConnector, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List connectors
 */
export const listConnectors = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAAppConnector>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/appConnector', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAAppConnector>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listConnectors] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get connector by ID
 */
export const getConnectorById = async (
    connectorId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnector> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnector/${connectorId}`,
            customerId
        );
        return await ZPAClient.get<ZPAAppConnector>(client, endpoint);
    } catch (error) {
        throw new Error(`[getConnectorById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create connector
 */
export const createConnector = async (
    connectorData: ZPAAppConnector,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnector> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/appConnector', customerId);
        return await ZPAClient.post<ZPAAppConnector>(client, endpoint, connectorData);
    } catch (error) {
        throw new Error(`[createConnector] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update connector
 */
export const updateConnector = async (
    connectorId: string,
    connectorData: Partial<ZPAAppConnector>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnector> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnector/${connectorId}`,
            customerId
        );
        return await ZPAClient.put<ZPAAppConnector>(client, endpoint, connectorData);
    } catch (error) {
        throw new Error(`[updateConnector] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete connector
 */
export const deleteConnector = async (
    connectorId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnector/${connectorId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteConnector] ${error instanceof Error ? error.message : String(error)}`);
    }
};
