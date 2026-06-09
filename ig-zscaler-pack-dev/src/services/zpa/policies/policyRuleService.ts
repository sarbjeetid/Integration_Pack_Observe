// src/services/zpa/policies/policyRuleService.ts

import ZPAClient from '../zpaClient';
import { ZPAPolicyRule, ZPAListResponse } from '../../../interfaces/zpa';

/**
 * List policy rules for a policy set
 */
export const listPolicyRules = async (
    policySetId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string,
    params?: any
): Promise<ZPAListResponse<ZPAPolicyRule>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}/rule`,
            customerId
        );
        return await ZPAClient.get<ZPAListResponse<ZPAPolicyRule>>(
            client,
            endpoint,
            params
        );
    } catch (error) {
        throw new Error(`[listPolicyRules] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Get policy rule by ID
 */
export const getPolicyRuleById = async (
    policySetId: string,
    ruleId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicyRule> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}/rule/${ruleId}`,
            customerId
        );
        return await ZPAClient.get<ZPAPolicyRule>(client, endpoint);
    } catch (error) {
        throw new Error(`[getPolicyRuleById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Create policy rule
 */
export const createPolicyRule = async (
    policySetId: string,
    ruleData: ZPAPolicyRule,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicyRule> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}/rule`,
            customerId
        );
        return await ZPAClient.post<ZPAPolicyRule>(client, endpoint, ruleData);
    } catch (error) {
        throw new Error(`[createPolicyRule] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update policy rule
 */
export const updatePolicyRule = async (
    policySetId: string,
    ruleId: string,
    ruleData: Partial<ZPAPolicyRule>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPAPolicyRule> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}/rule/${ruleId}`,
            customerId
        );
        return await ZPAClient.put<ZPAPolicyRule>(client, endpoint, ruleData);
    } catch (error) {
        throw new Error(`[updatePolicyRule] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Delete policy rule
 */
export const deletePolicyRule = async (
    policySetId: string,
    ruleId: string,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(
            `/policySet/${policySetId}/rule/${ruleId}`,
            customerId
        );
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deletePolicyRule] ${error instanceof Error ? error.message : String(error)}`);
    }
};
