// src/services/authentication/authService.ts

import axios from 'axios';
import config from '../../config';

/**
 * Get authentication header based on auth type
 */
export const getAuthHeader = async (
    authType: 'api-key' | 'oauth2',
    vaultPath?: string,
    baseUrl?: string,
    customerConfig?: any
): Promise<any> => {
    try {
        if (authType === 'api-key') {
            return {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            };
        } else if (authType === 'oauth2') {
            const token = await getOAuth2Token(baseUrl || config.baseUrl);
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
        }
    } catch (error) {
        throw new Error(`[authService] Failed to generate auth header: ${error}`);
    }
};

/**
 * Get OAuth2 token from Zscaler API
 */
export const getOAuth2Token = async (baseUrl: string): Promise<string> => {
    try {
        const response = await axios.post(`${baseUrl}/oauth2/token`, {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'client_credentials',
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return response.data.access_token;
    } catch (error) {
        throw new Error(`[getOAuth2Token] Failed to obtain OAuth2 token: ${error}`);
    }
};

/**
 * Validate API key connectivity
 */
export const validateApiKeyConnectivity = async (baseUrl?: string): Promise<boolean> => {
    try {
        const authHeader = await getAuthHeader('api-key', undefined, baseUrl);
        const response = await axios.get(`${baseUrl || config.baseUrl}/health`, {
            headers: authHeader,
            timeout: 5000,
        });
        return response.status === 200;
    } catch (error) {
        console.error('[validateApiKeyConnectivity] Failed to validate connectivity:', error);
        return false;
    }
};
