// src/services/zpa/applications/applicationService.ts

import ZPAClient from '../zpaClient';
import { ZPAApplication, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List applications
 */
export const listApplications = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAApplication>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/application', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAApplication>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listApplications] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get application by ID
 */
export const getApplicationById = async (
    applicationId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAApplication> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/application/${applicationId}`,
            customerId
        );
        return await ZPAClient.get<ZPAApplication>(client, endpoint);
    } catch (error) {
        throw new Error(`[getApplicationById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create application
 */
export const createApplication = async (
    applicationData: ZPAApplication,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAApplication> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/application', customerId);
        return await ZPAClient.post<ZPAApplication>(client, endpoint, applicationData);
    } catch (error) {
        throw new Error(`[createApplication] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update application
 */
export const updateApplication = async (
    applicationId: string,
    applicationData: Partial<ZPAApplication>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAApplication> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/application/${applicationId}`,
            customerId
        );
        return await ZPAClient.put<ZPAApplication>(client, endpoint, applicationData);
    } catch (error) {
        throw new Error(`[updateApplication] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete application
 */
export const deleteApplication = async (
    applicationId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/application/${applicationId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteApplication] ${error instanceof Error ? error.message : String(error)}`);
    }
};
