// src/services/zpa/posture/postureProfileService.ts

import ZPAClient from '../zpaClient';
import { ZPAPostureProfile, ZPAListResponse } from '../../../interfaces/zpa';

export const listPostureProfiles = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPAPostureProfile>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/postureProfile', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAPostureProfile>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listPostureProfiles] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getPostureProfileById = async (profileId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAPostureProfile> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/postureProfile/${profileId}`, customerId);
        return await ZPAClient.get<ZPAPostureProfile>(client, endpoint);
    } catch (error) {
        throw new Error(`[getPostureProfileById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createPostureProfile = async (profileData: ZPAPostureProfile, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAPostureProfile> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/postureProfile', customerId);
        return await ZPAClient.post<ZPAPostureProfile>(client, endpoint, profileData);
    } catch (error) {
        throw new Error(`[createPostureProfile] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updatePostureProfile = async (profileId: string, profileData: Partial<ZPAPostureProfile>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPAPostureProfile> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/postureProfile/${profileId}`, customerId);
        return await ZPAClient.put<ZPAPostureProfile>(client, endpoint, profileData);
    } catch (error) {
        throw new Error(`[updatePostureProfile] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deletePostureProfile = async (profileId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/postureProfile/${profileId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deletePostureProfile] ${error instanceof Error ? error.message : String(error)}`);
    }
};
