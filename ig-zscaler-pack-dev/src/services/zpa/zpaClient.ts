// src/services/zpa/zpaClient.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../../config';

/**
 * ZPA API Client - Shared HTTP client for all ZPA services
 */
export class ZPAClient {
    private static instances: Map<string, AxiosInstance> = new Map();

    /**
     * Create or get axios instance for a base URL
     */
    static getClient(
        authHeader: any,
        baseUrl: string,
        customerId?: string
    ): AxiosInstance {
        const key = `${baseUrl}:${customerId || 'default'}`;

        if (!this.instances.has(key)) {
            const instance = axios.create({
                baseURL: baseUrl,
                headers: {
                    ...authHeader,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            // Add response interceptor for error handling
            instance.interceptors.response.use(
                (response) => response,
                (error) => {
                    throw this.handleError(error);
                }
            );

            this.instances.set(key, instance);
        }

        return this.instances.get(key)!;
    }

    /**
     * Build management config path with customer ID
     */
    static buildMgmtConfigPath(
        endpoint: string,
        customerId?: string
    ): string {
        if (!customerId) {
            return endpoint;
        }
        return `/mgmtconfig/v1/admin/customers/${customerId}${endpoint}`;
    }

    /**
     * Standard error handler
     */
    static handleError(error: AxiosError | any): Error {
        if (error.response?.status === 401) {
            return new Error(
                'Unauthorized - Invalid credentials or expired token'
            );
        } else if (error.response?.status === 403) {
            return new Error('Forbidden - Insufficient permissions');
        } else if (error.response?.status === 404) {
            return new Error('Not found - Resource does not exist');
        } else if (error.response?.status === 429) {
            return new Error('Rate limit exceeded - Please retry after some time');
        } else if (error.response?.data?.error) {
            return new Error(`API Error: ${error.response.data.error}`);
        } else if (error.message) {
            return new Error(`Request failed: ${error.message}`);
        }
        return new Error('Unknown error occurred');
    }

    /**
     * Execute GET request
     */
    static async get<T>(
        client: AxiosInstance,
        endpoint: string,
        params?: any
    ): Promise<T> {
        try {
            const response = await client.get<T>(endpoint, { params });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Execute POST request
     */
    static async post<T>(
        client: AxiosInstance,
        endpoint: string,
        data?: any
    ): Promise<T> {
        try {
            const response = await client.post<T>(endpoint, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Execute PUT request
     */
    static async put<T>(
        client: AxiosInstance,
        endpoint: string,
        data?: any
    ): Promise<T> {
        try {
            const response = await client.put<T>(endpoint, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Execute DELETE request
     */
    static async delete(
        client: AxiosInstance,
        endpoint: string
    ): Promise<void> {
        try {
            await client.delete(endpoint);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Clear cached instances
     */
    static clearCache(baseUrl?: string): void {
        if (baseUrl) {
            // Clear instances for a specific base URL
            const keysToDelete: string[] = [];
            this.instances.forEach((_, key) => {
                if (key.startsWith(baseUrl)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach((key) => this.instances.delete(key));
        } else {
            this.instances.clear();
        }
    }
}

export default ZPAClient;
