// src/services/zpa/serviceEdges/serviceEdgeService.ts

import ZPAClient from '../zpaClient';
import { ZPAServiceEdge, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List service edges
 */
export const listServiceEdges = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAServiceEdge>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serviceEdge', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAServiceEdge>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listServiceEdges] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get service edge by ID
 */
export const getServiceEdgeById = async (
    edgeId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdge> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdge/${edgeId}`,
            customerId
        );
        return await ZPAClient.get<ZPAServiceEdge>(client, endpoint);
    } catch (error) {
        throw new Error(`[getServiceEdgeById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create service edge
 */
export const createServiceEdge = async (
    edgeData: ZPAServiceEdge,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdge> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/serviceEdge', customerId);
        return await ZPAClient.post<ZPAServiceEdge>(client, endpoint, edgeData);
    } catch (error) {
        throw new Error(`[createServiceEdge] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update service edge
 */
export const updateServiceEdge = async (
    edgeId: string,
    edgeData: Partial<ZPAServiceEdge>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAServiceEdge> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdge/${edgeId}`,
            customerId
        );
        return await ZPAClient.put<ZPAServiceEdge>(client, endpoint, edgeData);
    } catch (error) {
        throw new Error(`[updateServiceEdge] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete service edge
 */
export const deleteServiceEdge = async (
    edgeId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/serviceEdge/${edgeId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteServiceEdge] ${error instanceof Error ? error.message : String(error)}`);
    }
};
