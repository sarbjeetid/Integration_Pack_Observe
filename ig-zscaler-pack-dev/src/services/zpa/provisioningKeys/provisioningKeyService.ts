// src/services/zpa/provisioningKeys/provisioningKeyService.ts

import ZPAClient from '../zpaClient';
import { ZPAProvisioningKey, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List provisioning keys for connectors
 */
export const listConnectorProvisioningKeys = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAProvisioningKey>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            '/associationType/CONNECTOR_GRP/provisioningKey',
            customerId
        );
        return await ZPAClient.get<ZPAListResponse<ZPAProvisioningKey>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listConnectorProvisioningKeys] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * List provisioning keys for service edges
 */
export const listServiceEdgeProvisioningKeys = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAProvisioningKey>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            '/associationType/SERVICE_EDGE_GRP/provisioningKey',
            customerId
        );
        return await ZPAClient.get<ZPAListResponse<ZPAProvisioningKey>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listServiceEdgeProvisioningKeys] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get provisioning key by ID
 */
export const getProvisioningKeyById = async (
    keyId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAProvisioningKey> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/provisioningKey/${keyId}`,
            customerId
        );
        return await ZPAClient.get<ZPAProvisioningKey>(client, endpoint);
    } catch (error) {
        throw new Error(`[getProvisioningKeyById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create provisioning key
 */
export const createProvisioningKey = async (
    keyData: ZPAProvisioningKey,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAProvisioningKey> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/provisioningKey', customerId);
        return await ZPAClient.post<ZPAProvisioningKey>(client, endpoint, keyData);
    } catch (error) {
        throw new Error(`[createProvisioningKey] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update provisioning key
 */
export const updateProvisioningKey = async (
    keyId: string,
    keyData: Partial<ZPAProvisioningKey>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAProvisioningKey> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/provisioningKey/${keyId}`,
            customerId
        );
        return await ZPAClient.put<ZPAProvisioningKey>(client, endpoint, keyData);
    } catch (error) {
        throw new Error(`[updateProvisioningKey] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete provisioning key
 */
export const deleteProvisioningKey = async (
    keyId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/provisioningKey/${keyId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteProvisioningKey] ${error instanceof Error ? error.message : String(error)}`);
    }
};
