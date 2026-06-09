// src/services/zpa/serviceEdges/serviceEdgeGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPAServiceEdgeGroup, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List service edge groups
 */
export const listServiceEdgeGroups = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAServiceEdgeGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serviceEdgeGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAServiceEdgeGroup>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listServiceEdgeGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get service edge group by ID
 */
export const getServiceEdgeGroupById = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdgeGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdgeGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.get<ZPAServiceEdgeGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getServiceEdgeGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create service edge group
 */
export const createServiceEdgeGroup = async (
    groupData: ZPAServiceEdgeGroup,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdgeGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serviceEdgeGroup', customerId);
        return await ZPAClient.post<ZPAServiceEdgeGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createServiceEdgeGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update service edge group
 */
export const updateServiceEdgeGroup = async (
    groupId: string,
    groupData: Partial<ZPAServiceEdgeGroup>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdgeGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdgeGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.put<ZPAServiceEdgeGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateServiceEdgeGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete service edge group
 */
export const deleteServiceEdgeGroup = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdgeGroup/${groupId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteServiceEdgeGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
