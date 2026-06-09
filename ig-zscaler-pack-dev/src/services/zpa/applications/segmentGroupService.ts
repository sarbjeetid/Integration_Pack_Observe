// src/services/zpa/applications/segmentGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPASegmentGroup, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List segment groups
 */
export const listSegmentGroups = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPASegmentGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/segmentGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPASegmentGroup>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listSegmentGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get segment group by ID
 */
export const getSegmentGroupById = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPASegmentGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/segmentGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.get<ZPASegmentGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getSegmentGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create segment group
 */
export const createSegmentGroup = async (
    groupData: ZPASegmentGroup,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPASegmentGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/segmentGroup', customerId);
        return await ZPAClient.post<ZPASegmentGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createSegmentGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update segment group
 */
export const updateSegmentGroup = async (
    groupId: string,
    groupData: Partial<ZPASegmentGroup>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPASegmentGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/segmentGroup/${groupId}`,
            customerId
        );
        return await ZPAClient.put<ZPASegmentGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateSegmentGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete segment group
 */
export const deleteSegmentGroup = async (
    groupId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/segmentGroup/${groupId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteSegmentGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
