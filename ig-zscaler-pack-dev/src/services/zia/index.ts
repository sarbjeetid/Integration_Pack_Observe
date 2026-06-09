// src/services/zia/index.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../../config';
import { resolveZIABaseUrl } from '../../utils/endpointResolver';
import {
    ZIAURLCategory,
    ZIAURLPolicy,
    ZIAThreatReport,
    ZIADLPIncident,
    ZIAAdminAuditLog,
    ZIASecurityReport,
    ZIAListResponse
} from '../../interfaces/zia';

let axiosInstance: AxiosInstance;

/**
 * Initialize ZIA API client with endpoint resolution
 */
export const initializeZIAClient = (authHeader: any, baseUrl?: string): AxiosInstance => {
    // Resolve the base URL with fallback chain
    const resolvedBaseUrl = baseUrl || resolveZIABaseUrl();
    
    axiosInstance = axios.create({
        baseURL: resolvedBaseUrl,
        headers: authHeader,
        timeout: 30000,
    });

    return axiosInstance;
};

/**
 * List all URL categories in ZIA
 */
export const listURLCategories = async (authHeader: any, baseUrl?: string): Promise<ZIAListResponse<ZIAURLCategory>> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.get('/url-categories');
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'listURLCategories');
    }
};

/**
 * Get a specific URL category by ID
 */
export const getURLCategoryById = async (categoryId: string, authHeader: any, baseUrl?: string): Promise<ZIAURLCategory> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.get(`/url-categories/${categoryId}`);
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getURLCategoryById');
    }
};

/**
 * List all URL filtering policies in ZIA
 */
export const listURLPolicies = async (authHeader: any, baseUrl?: string): Promise<ZIAListResponse<ZIAURLPolicy>> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.get('/url-policies');
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'listURLPolicies');
    }
};

/**
 * Get a specific URL policy by ID
 */
export const getURLPolicyById = async (policyId: string, authHeader: any, baseUrl?: string): Promise<ZIAURLPolicy> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.get(`/url-policies/${policyId}`);
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getURLPolicyById');
    }
};

/**
 * Create a new URL filtering policy in ZIA
 */
export const createURLPolicy = async (policyData: ZIAURLPolicy, authHeader: any, baseUrl?: string): Promise<ZIAURLPolicy> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.post('/url-policies', policyData);
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'createURLPolicy');
    }
};

/**
 * Update an existing URL policy in ZIA
 */
export const updateURLPolicy = async (policyId: string, policyData: Partial<ZIAURLPolicy>, authHeader: any, baseUrl?: string): Promise<ZIAURLPolicy> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const response = await client.put(`/url-policies/${policyId}`, policyData);
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'updateURLPolicy');
    }
};

/**
 * Delete a URL policy from ZIA
 */
export const deleteURLPolicy = async (policyId: string, authHeader: any, baseUrl?: string): Promise<void> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        await client.delete(`/url-policies/${policyId}`);
    } catch (error) {
        throw handleZIAError(error, 'deleteURLPolicy');
    }
};

/**
 * Get threat reports from ZIA
 */
export const getThreatReports = async (timeRange?: { start: number; end: number }, authHeader?: any, baseUrl?: string): Promise<ZIAListResponse<ZIAThreatReport>> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const params = timeRange ? { startTime: timeRange.start, endTime: timeRange.end } : {};
        const response = await client.get('/threat-reports', { params });
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getThreatReports');
    }
};

/**
 * Get DLP incidents from ZIA
 */
export const getDLPIncidents = async (timeRange?: { start: number; end: number }, authHeader?: any, baseUrl?: string): Promise<ZIAListResponse<ZIADLPIncident>> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const params = timeRange ? { startTime: timeRange.start, endTime: timeRange.end } : {};
        const response = await client.get('/dlp-incidents', { params });
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getDLPIncidents');
    }
};

/**
 * Get admin audit logs from ZIA
 */
export const getAdminAuditLogs = async (timeRange?: { start: number; end: number }, authHeader?: any, baseUrl?: string): Promise<ZIAListResponse<ZIAAdminAuditLog>> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const params = timeRange ? { startTime: timeRange.start, endTime: timeRange.end } : {};
        const response = await client.get('/admin-audit-logs', { params });
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getAdminAuditLogs');
    }
};

/**
 * Get security summary report from ZIA
 */
export const getSecurityReport = async (timeRange?: { start: number; end: number }, authHeader?: any, baseUrl?: string): Promise<ZIASecurityReport> => {
    try {
        const client = initializeZIAClient(authHeader, baseUrl);
        const params = timeRange ? { startTime: timeRange.start, endTime: timeRange.end } : {};
        const response = await client.get('/security-report', { params });
        return response.data;
    } catch (error) {
        throw handleZIAError(error, 'getSecurityReport');
    }
};

/**
 * Handle ZIA API errors
 */
const handleZIAError = (error: any, context: string): Error => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        return new Error(`[ZIA ${context}] Status: ${status}, Data: ${JSON.stringify(data)}`);
    }
    return new Error(`[ZIA ${context}] ${error.message}`);
};
