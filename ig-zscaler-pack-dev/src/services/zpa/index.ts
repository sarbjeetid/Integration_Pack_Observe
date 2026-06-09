// src/services/zpa/index.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../../config';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';
import { ZPAApplication, ZPAUser, ZPAAccessPolicy, ZPAUserProvisioning, ZPAListResponse } from '../../interfaces/zpa';

let axiosInstance: AxiosInstance;

/**
 * Initialize ZPA API client with endpoint resolution
 */
export const initializeZPAClient = (authHeader: any, baseUrl?: string): AxiosInstance => {
    // Resolve the base URL with fallback chain
    const resolvedBaseUrl = baseUrl || resolveZPABaseUrl();
    
    axiosInstance = axios.create({
        baseURL: resolvedBaseUrl,
        headers: authHeader,
        timeout: 30000,
    });

    return axiosInstance;
};

/**
 * List all ZPA applications
 */
export const listApplications = async (authHeader: any, baseUrl?: string): Promise<ZPAListResponse<ZPAApplication>> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get('/applications');
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'listApplications');
    }
};

/**
 * Get a specific ZPA application by ID
 */
export const getApplicationById = async (applicationId: string, authHeader: any, baseUrl?: string): Promise<ZPAApplication> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get(`/applications/${applicationId}`);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'getApplicationById');
    }
};

/**
 * List all ZPA users
 */
export const listUsers = async (authHeader: any, baseUrl?: string): Promise<ZPAListResponse<ZPAUser>> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get('/users');
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'listUsers');
    }
};

/**
 * Get a specific ZPA user by ID
 */
export const getUserById = async (userId: string, authHeader: any, baseUrl?: string): Promise<ZPAUser> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get(`/users/${userId}`);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'getUserById');
    }
};

/**
 * Create a new ZPA user
 */
export const createUser = async (userData: ZPAUserProvisioning, authHeader: any, baseUrl?: string): Promise<ZPAUser> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.post('/users', userData);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'createUser');
    }
};

/**
 * Update an existing ZPA user
 */
export const updateUser = async (userId: string, userData: Partial<ZPAUserProvisioning>, authHeader: any, baseUrl?: string): Promise<ZPAUser> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.put(`/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'updateUser');
    }
};

/**
 * List all ZPA access policies
 */
export const listAccessPolicies = async (authHeader: any, baseUrl?: string): Promise<ZPAListResponse<ZPAAccessPolicy>> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get('/policies');
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'listAccessPolicies');
    }
};

/**
 * Get a specific ZPA access policy by ID
 */
export const getPolicyById = async (policyId: string, authHeader: any, baseUrl?: string): Promise<ZPAAccessPolicy> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.get(`/policies/${policyId}`);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'getPolicyById');
    }
};

/**
 * Create a new ZPA access policy
 */
export const createPolicy = async (policyData: ZPAAccessPolicy, authHeader: any, baseUrl?: string): Promise<ZPAAccessPolicy> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.post('/policies', policyData);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'createPolicy');
    }
};

/**
 * Update an existing ZPA access policy
 */
export const updatePolicy = async (policyId: string, policyData: Partial<ZPAAccessPolicy>, authHeader: any, baseUrl?: string): Promise<ZPAAccessPolicy> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        const response = await client.put(`/policies/${policyId}`, policyData);
        return response.data;
    } catch (error) {
        throw handleZPAError(error, 'updatePolicy');
    }
};

/**
 * Delete a ZPA access policy
 */
export const deletePolicy = async (policyId: string, authHeader: any, baseUrl?: string): Promise<void> => {
    try {
        const client = initializeZPAClient(authHeader, baseUrl);
        await client.delete(`/policies/${policyId}`);
    } catch (error) {
        throw handleZPAError(error, 'deletePolicy');
    }
};

/**
 * Handle ZPA API errors
 */
const handleZPAError = (error: any, context: string): Error => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        return new Error(`[ZPA ${context}] Status: ${status}, Data: ${JSON.stringify(data)}`);
    }
    return new Error(`[ZPA ${context}] ${error.message}`);
};
