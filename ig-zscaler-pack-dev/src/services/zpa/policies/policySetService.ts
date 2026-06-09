// src/services/zpa/policies/policySetService.ts

import ZPAClient from '../zpaClient';
import { ZPAPolicySet, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List policy sets
 */
export const listPolicySets = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAPolicySet>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/policySet', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPAPolicySet>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listPolicySets] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get policy set by ID
 */
export const getPolicySetById = async (
    policySetId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicySet> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}`,
            customerId
        );
        return await ZPAClient.get<ZPAPolicySet>(client, endpoint);
    } catch (error) {
        throw new Error(`[getPolicySetById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create policy set
 */
export const createPolicySet = async (
    policyData: ZPAPolicySet,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicySet> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/policySet', customerId);
        return await ZPAClient.post<ZPAPolicySet>(client, endpoint, policyData);
    } catch (error) {
        throw new Error(`[createPolicySet] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update policy set
 */
export const updatePolicySet = async (
    policySetId: string,
    policyData: Partial<ZPAPolicySet>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicySet> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}`,
            customerId
        );
        return await ZPAClient.put<ZPAPolicySet>(client, endpoint, policyData);
    } catch (error) {
        throw new Error(`[updatePolicySet] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete policy set
 */
export const deletePolicySet = async (
    policySetId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deletePolicySet] ${error instanceof Error ? error.message : String(error)}`);
    }
};
