// src/services/zpa/userGroups/userGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPAUserGroup, ZPAListResponse } from '../../../interfaces/zpa';

export const listUserGroups = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPAUserGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/userGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAUserGroup>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listUserGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getUserGroupById = async (groupId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAUserGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/userGroup/${groupId}`, customerId);
        return await ZPAClient.get<ZPAUserGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getUserGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createUserGroup = async (groupData: ZPAUserGroup, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAUserGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/userGroup', customerId);
        return await ZPAClient.post<ZPAUserGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createUserGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateUserGroup = async (groupId: string, groupData: Partial<ZPAUserGroup>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAUserGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/userGroup/${groupId}`, customerId);
        return await ZPAClient.put<ZPAUserGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateUserGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteUserGroup = async (groupId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/userGroup/${groupId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteUserGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
