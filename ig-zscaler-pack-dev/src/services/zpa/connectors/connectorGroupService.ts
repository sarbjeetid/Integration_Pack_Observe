// src/services/zpa/connectors/connectorGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPAAppConnectorGroup, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List connector groups
 */
export const listConnectorGroups = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAAppConnectorGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/appConnectorGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAAppConnectorGroup>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listConnectorGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get connector group by ID
 */
export const getConnectorGroupById = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnectorGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnectorGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.get<ZPAAppConnectorGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getConnectorGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create connector group
 */
export const createConnectorGroup = async (
    groupData: ZPAAppConnectorGroup,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnectorGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/appConnectorGroup', customerId);
        return await ZPAClient.post<ZPAAppConnectorGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createConnectorGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update connector group
 */
export const updateConnectorGroup = async (
    groupId: string,
    groupData: Partial<ZPAAppConnectorGroup>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAAppConnectorGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnectorGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.put<ZPAAppConnectorGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateConnectorGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete connector group
 */
export const deleteConnectorGroup = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/appConnectorGroup/${groupId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteConnectorGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
