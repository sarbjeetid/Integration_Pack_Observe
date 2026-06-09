// src/utils/endpointResolver.ts

import config from '../config';
import { ZSCALER_ZONES_MAP } from '../config/zscaler.config';

export interface EndpointConfig {
    baseUrl: string;
    authHeader?: any;
}

/**
 * Resolve Zscaler cloud zone endpoint
 */
export const resolveCloudZoneEndpoint = (zone?: string): string => {
    const selectedZone = zone || config.cloudZone || 'us';
    const zoneEndpoint = ZSCALER_ZONES_MAP[selectedZone];
    
    if (!zoneEndpoint) {
        console.warn(`[endpointResolver] Unknown cloud zone: ${selectedZone}, defaulting to US`);
        return ZSCALER_ZONES_MAP['us'];
    }
    
    return zoneEndpoint;
};

/**
 * Resolve ZPA endpoint base URL
 * Priority: 
 * 1. Explicit baseUrl parameter
 * 2. Environment variable ZSCALER_ZPA_BASE_URL
 * 3. Cloud zone endpoint (with /zpa suffix if needed)
 * 4. Environment variable ZSCALER_BASE_URL
 * 5. Default Zscaler API base URL
 */
export const resolveZPABaseUrl = (explicitBaseUrl?: string, zone?: string): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    
    if (config.zpaBaseUrl) {
        return config.zpaBaseUrl;
    }
    
    // Try to resolve from cloud zone
    const zoneEndpoint = resolveCloudZoneEndpoint(zone);
    
    // Return zone endpoint (caller should append /zpa if needed)
    return zoneEndpoint.replace(/\/$/, '');
};

/**
 * Resolve ZIA endpoint base URL
 * Priority:
 * 1. Explicit baseUrl parameter
 * 2. Environment variable ZSCALER_ZIA_BASE_URL
 * 3. Cloud zone endpoint (with /zia suffix if needed)
 * 4. Environment variable ZSCALER_BASE_URL
 * 5. Default Zscaler API base URL
 */
export const resolveZIABaseUrl = (explicitBaseUrl?: string, zone?: string): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    
    if (config.ziaBaseUrl) {
        return config.ziaBaseUrl;
    }
    
    // Try to resolve from cloud zone
    const zoneEndpoint = resolveCloudZoneEndpoint(zone);
    
    // Return zone endpoint (caller should append /zia if needed)
    return zoneEndpoint.replace(/\/$/, '');
};

/**
 * Resolve any endpoint base URL with a fallback chain
 */
export const resolveBaseUrl = (
    serviceType: 'zpa' | 'zia' | 'general' | 'connector',
    explicitBaseUrl?: string,
    zone?: string
): string => {
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }

    switch (serviceType) {
        case 'zpa':
            return resolveZPABaseUrl(undefined, zone);
        case 'zia':
            return resolveZIABaseUrl(undefined, zone);
        case 'connector':
            return resolveZPABaseUrl(undefined, zone);
        case 'general':
        default:
            return config.baseUrl.replace(/\/$/, '');
    }
};

/**
 * Build a complete endpoint URL
 */
export const buildEndpointUrl = (
    serviceType: 'zpa' | 'zia' | 'general' | 'connector',
    path: string,
    baseUrl?: string,
    zone?: string
): string => {
    const resolvedBaseUrl = resolveBaseUrl(serviceType, baseUrl, zone);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${resolvedBaseUrl}${normalizedPath}`;
};

/**
 * Get endpoint configuration with resolved base URL
 */
export const getEndpointConfig = (
    serviceType: 'zpa' | 'zia' | 'general' | 'connector',
    explicitBaseUrl?: string,
    zone?: string
): EndpointConfig => {
    return {
        baseUrl: resolveBaseUrl(serviceType, explicitBaseUrl, zone),
    };
};

/**
 * Get all available Zscaler cloud zones
 */
export const getAvailableZones = (): { zone: string; endpoint: string }[] => {
    return Object.entries(ZSCALER_ZONES_MAP).map(([zone, endpoint]) => ({
        zone,
        endpoint,
    }));
};

/**
 * Log endpoint information for debugging
 */
export const logEndpointInfo = (serviceType: string, baseUrl: string, zone?: string): void => {
    const zoneInfo = zone ? ` (zone: ${zone})` : '';
    console.log(`[${serviceType.toUpperCase()}] Using endpoint: ${baseUrl}${zoneInfo}`);
};
