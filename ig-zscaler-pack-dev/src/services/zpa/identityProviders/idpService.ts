// src/services/zpa/identityProviders/idpService.ts

import ZPAClient from '../zpaClient';
import { ZPAIDP, ZPAListResponse } from '../../../interfaces/zpa';

export const listIDPs = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPAIDP>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/idp', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAIDP>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listIDPs] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getIDPById = async (idpId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAIDP> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/idp/${idpId}`, customerId);
        return await ZPAClient.get<ZPAIDP>(client, endpoint);
    } catch (error) {
        throw new Error(`[getIDPById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createIDP = async (idpData: ZPAIDP, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAIDP> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/idp', customerId);
        return await ZPAClient.post<ZPAIDP>(client, endpoint, idpData);
    } catch (error) {
        throw new Error(`[createIDP] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateIDP = async (idpId: string, idpData: Partial<ZPAIDP>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAIDP> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/idp/${idpId}`, customerId);
        return await ZPAClient.put<ZPAIDP>(client, endpoint, idpData);
    } catch (error) {
        throw new Error(`[updateIDP] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteIDP = async (idpId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/idp/${idpId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteIDP] ${error instanceof Error ? error.message : String(error)}`);
    }
};
