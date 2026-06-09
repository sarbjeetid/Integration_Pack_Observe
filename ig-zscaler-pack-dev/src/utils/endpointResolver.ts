// src/utils/endpointResolver.ts

import config from '../config';

export interface EndpointConfig {
    baseUrl: string;
    authHeader?: any;
}

/**
 * Resolve ZPA endpoint base URL
 * Priority: 
 * 1. Explicit baseUrl parameter
 * 2. Environment variable ZSCALER_ZPA_BASE_URL
 * 3. Environment variable ZSCALER_BASE_URL
 * 4. Default Zscaler API base URL
 */
export const resolveZPABaseUrl = (explicitBaseUrl?: string): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    
    if (config.zpaBaseUrl) {
        return config.zpaBaseUrl;
    }
    
    // Default to removing trailing slash
    return config.baseUrl.replace(/\/$/, '');
};

/**
 * Resolve ZIA endpoint base URL
 * Priority:
 * 1. Explicit baseUrl parameter
 * 2. Environment variable ZSCALER_ZIA_BASE_URL
 * 3. Environment variable ZSCALER_BASE_URL
 * 4. Default Zscaler API base URL
 */
export const resolveZIABaseUrl = (explicitBaseUrl?: string): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    
    if (config.ziaBaseUrl) {
        return config.ziaBaseUrl;
    }
    
    // Default to removing trailing slash
    return config.baseUrl.replace(/\/$/, '');
};

/**
 * Resolve any endpoint base URL with a fallback chain
 */
export const resolveBaseUrl = (
    serviceType: 'zpa' | 'zia' | 'general',
    explicitBaseUrl?: string
): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }

    switch (serviceType) {
        case 'zpa':
            return resolveZPABaseUrl();
        case 'zia':
            return resolveZIABaseUrl();
        case 'general':
        default:
            return config.baseUrl.replace(/\/$/, '');
    }
};

/**
 * Build a complete endpoint URL
 */
export const buildEndpointUrl = (
    serviceType: 'zpa' | 'zia' | 'general',
    path: string,
    baseUrl?: string
): string => {
    const resolvedBaseUrl = resolveBaseUrl(serviceType, baseUrl);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${resolvedBaseUrl}${normalizedPath}`;
};

/**
 * Get endpoint configuration with resolved base URL
 */
export const getEndpointConfig = (
    serviceType: 'zpa' | 'zia' | 'general',
    explicitBaseUrl?: string
): EndpointConfig => {
    return {
        baseUrl: resolveBaseUrl(serviceType, explicitBaseUrl),
    };
};

/**
 * Log endpoint information for debugging
 */
export const logEndpointInfo = (serviceType: string, baseUrl: string): void => {
    console.log(`[${serviceType.toUpperCase()}] Using endpoint: ${baseUrl}`);
};
