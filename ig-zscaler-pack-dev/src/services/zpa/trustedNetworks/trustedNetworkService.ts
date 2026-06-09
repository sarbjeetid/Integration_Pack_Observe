// src/services/zpa/trustedNetworks/trustedNetworkService.ts

import ZPAClient from '../zpaClient';
import { ZPATrustedNetwork, ZPAListResponse } from '../../../interfaces/zpa';

export const listTrustedNetworks = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPATrustedNetwork>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/trustedNetwork', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPATrustedNetwork>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listTrustedNetworks] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getTrustedNetworkById = async (networkId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPATrustedNetwork> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/trustedNetwork/${networkId}`, customerId);
        return await ZPAClient.get<ZPATrustedNetwork>(client, endpoint);
    } catch (error) {
        throw new Error(`[getTrustedNetworkById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createTrustedNetwork = async (networkData: ZPATrustedNetwork, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPATrustedNetwork> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/trustedNetwork', customerId);
        return await ZPAClient.post<ZPATrustedNetwork>(client, endpoint, networkData);
    } catch (error) {
        throw new Error(`[createTrustedNetwork] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateTrustedNetwork = async (networkId: string, networkData: Partial<ZPATrustedNetwork>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPATrustedNetwork> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/trustedNetwork/${networkId}`, customerId);
        return await ZPAClient.put<ZPATrustedNetwork>(client, endpoint, networkData);
    } catch (error) {
        throw new Error(`[updateTrustedNetwork] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteTrustedNetwork = async (networkId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/trustedNetwork/${networkId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteTrustedNetwork] ${error instanceof Error ? error.message : String(error)}`);
    }
};
