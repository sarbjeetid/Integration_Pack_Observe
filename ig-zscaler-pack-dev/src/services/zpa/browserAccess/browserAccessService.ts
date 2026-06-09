// src/services/zpa/browserAccess/browserAccessService.ts

import ZPAClient from '../zpaClient';
import { ZPABrowserAccessApp, ZPAListResponse } from '../../../interfaces/zpa';

export const listBrowserAccessApps = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPABrowserAccessApp>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/browserAccess', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPABrowserAccessApp>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listBrowserAccessApps] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getBrowserAccessAppById = async (appId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPABrowserAccessApp> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/browserAccess/${appId}`, customerId);
        return await ZPAClient.get<ZPABrowserAccessApp>(client, endpoint);
    } catch (error) {
        throw new Error(`[getBrowserAccessAppById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createBrowserAccessApp = async (appData: ZPABrowserAccessApp, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPABrowserAccessApp> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/browserAccess', customerId);
        return await ZPAClient.post<ZPABrowserAccessApp>(client, endpoint, appData);
    } catch (error) {
        throw new Error(`[createBrowserAccessApp] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateBrowserAccessApp = async (appId: string, appData: Partial<ZPABrowserAccessApp>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPABrowserAccessApp> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/browserAccess/${appId}`, customerId);
        return await ZPAClient.put<ZPABrowserAccessApp>(client, endpoint, appData);
    } catch (error) {
        throw new Error(`[updateBrowserAccessApp] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteBrowserAccessApp = async (appId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/browserAccess/${appId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteBrowserAccessApp] ${error instanceof Error ? error.message : String(error)}`);
    }
};
