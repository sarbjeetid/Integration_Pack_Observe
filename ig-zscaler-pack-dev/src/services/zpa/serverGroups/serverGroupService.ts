// src/services/zpa/serverGroups/serverGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPAServerGroup, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List server groups
 */
export const listServerGroups = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAServerGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serverGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAServerGroup>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listServerGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get server group by ID
 */
export const getServerGroupById = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServerGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serverGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.get<ZPAServerGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getServerGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create server group
 */
export const createServerGroup = async (
    groupData: ZPAServerGroup,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServerGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serverGroup', customerId);
        return await ZPAClient.post<ZPAServerGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createServerGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update server group
 */
export const updateServerGroup = async (
    groupId: string,
    groupData: Partial<ZPAServerGroup>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServerGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serverGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.put<ZPAServerGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateServerGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete server group
 */
export const deleteServerGroup = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serverGroup/${groupId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteServerGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
