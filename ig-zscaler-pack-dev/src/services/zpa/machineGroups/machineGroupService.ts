// src/services/zpa/machineGroups/machineGroupService.ts

import ZPAClient from '../zpaClient';
import { ZPAMachineGroup, ZPAListResponse } from '../../../interfaces/zpa';

export const listMachineGroups = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPAMachineGroup>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/machineGroup', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAMachineGroup>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listMachineGroups] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getMachineGroupById = async (groupId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAMachineGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/machineGroup/${groupId}`, customerId);
        return await ZPAClient.get<ZPAMachineGroup>(client, endpoint);
    } catch (error) {
        throw new Error(`[getMachineGroupById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createMachineGroup = async (groupData: ZPAMachineGroup, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAMachineGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/machineGroup', customerId);
        return await ZPAClient.post<ZPAMachineGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[createMachineGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateMachineGroup = async (groupId: string, groupData: Partial<ZPAMachineGroup>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAMachineGroup> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/machineGroup/${groupId}`, customerId);
        return await ZPAClient.put<ZPAMachineGroup>(client, endpoint, groupData);
    } catch (error) {
        throw new Error(`[updateMachineGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteMachineGroup = async (groupId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/machineGroup/${groupId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteMachineGroup] ${error instanceof Error ? error.message : String(error)}`);
    }
};
