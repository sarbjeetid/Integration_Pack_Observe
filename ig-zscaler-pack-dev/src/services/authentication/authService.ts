// src/services/authentication/authService.ts

import axios from 'axios';
import { URLSearchParams } from 'url';
import config from '../../config';

/**
 * OAuth2 Token cache to avoid excessive API calls
 */
interface TokenCache {
    token: string;
    expiresAt: number;
    baseUrl: string;
}

const tokenCache: Map<string, TokenCache> = new Map();
const CACHE_EXPIRY_BUFFER = 300000; // 5 minutes buffer before actual expiry

/**
 * Zscaler cloud zone endpoints
 */
export const ZSCALER_ZONES = {
    us: 'https://config.zscloud.net',
    'private-us': 'https://config.private.zscaler.com',
    'private-uszl': 'https://config.private.uszl.zscaler.com',
    europe: 'https://config.eu.zscaler.com',
    'private-eu': 'https://config.private.eu.zscaler.com',
    apac: 'https://config.apac.zscaler.com',
    'private-apac': 'https://config.private.apac.zscaler.com',
};

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
 * Get OAuth2 token from Zscaler API with caching
 * Supports form-urlencoded body as per Zscaler API requirements
 */
export const getOAuth2Token = async (
    baseUrl: string = config.baseUrl
): Promise<string> => {
    try {
        // Check token cache first
        const cachedToken = tokenCache.get(baseUrl);
        if (cachedToken && Date.now() < cachedToken.expiresAt) {
            return cachedToken.token;
        }

        if (!config.clientId || !config.clientSecret) {
            throw new Error('clientId and clientSecret are required for OAuth2 authentication');
        }

        /**
         * MATCHING PYTHON IMPLEMENTATION:
         * POST https://config.private.zscaler.com/signin
         * application/x-www-form-urlencoded
         */
        const tokenUrl = `${baseUrl}/signin`;

        const params = new URLSearchParams();
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
        });

        if (!response.data?.access_token) {
            throw new Error('Zscaler API response missing access_token');
        }

        // Cache token (keep your logic)
        const expiresAt = Date.now() + 55 * 60 * 1000;

        tokenCache.set(baseUrl, {
            token: response.data.access_token,
            expiresAt,
            baseUrl,
        });
        console.log(`[getOAuth2Token] Obtained new token for base URL: ${baseUrl}, expires at: ${new Date(expiresAt).toISOString()}, token: ${response.data.access_token}`);
        return response.data.access_token;
    } catch (error: any) {
        const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error_description ||
            error.message ||
            'Unknown error';

        throw new Error(`[getOAuth2Token] Failed to obtain OAuth2 token: ${errorMsg}`);
    }
};

/**
 * Get OAuth2 token from a specific cloud zone
 */
export const getOAuth2TokenFromZone = async (zone: keyof typeof ZSCALER_ZONES): Promise<string> => {
    const zoneUrl = ZSCALER_ZONES[zone];
    if (!zoneUrl) {
        throw new Error(`Invalid Zscaler zone: ${zone}`);
    }
    return getOAuth2Token(zoneUrl);
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

/**
 * Validate OAuth2 connectivity
 */
export const validateOAuth2Connectivity = async (baseUrl?: string): Promise<boolean> => {
    try {
        const authHeader = await getAuthHeader('oauth2', undefined, baseUrl);
        const response = await axios.get(`${baseUrl || config.baseUrl}/health`, {
            headers: authHeader,
            timeout: 5000,
        });
        return response.status === 200;
    } catch (error) {
        console.error('[validateOAuth2Connectivity] Failed to validate OAuth2 connectivity:', error);
        return false;
    }
};

/**
 * Clear token cache (useful for testing or forced refresh)
 */
export const clearTokenCache = (baseUrl?: string): void => {
    if (baseUrl) {
        tokenCache.delete(baseUrl);
    } else {
        tokenCache.clear();
    }
};
