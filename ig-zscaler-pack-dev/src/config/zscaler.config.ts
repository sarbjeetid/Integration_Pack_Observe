import { ZscalerConfigI } from '../interfaces/config';

// Normalize URLs by removing trailing slashes
const normalizeUrl = (url: string | undefined): string | undefined => {
    return url ? url.replace(/\/$/, '') : undefined;
};

/**
 * Zscaler cloud zones reference
 */
const ZSCALER_ZONES_MAP: { [key: string]: string } = {
    'us': 'https://config.zscloud.net',
    'private-us': 'https://config.private.zscaler.com',
    'private-uszl': 'https://config.private.uszl.zscaler.com',
    'europe': 'https://config.eu.zscaler.com',
    'private-eu': 'https://config.private.eu.zscaler.com',
    'apac': 'https://config.apac.zscaler.com',
    'private-apac': 'https://config.private.apac.zscaler.com',
};

const zscalerConfig: ZscalerConfigI = {
    apiKey: process.env.ZSCALER_API_KEY || '',
    clientId: process.env.ZSCALER_CLIENT_ID || '',
    clientSecret: process.env.ZSCALER_CLIENT_SECRET || '',
    baseUrl: normalizeUrl(process.env.ZSCALER_BASE_URL) || ZSCALER_ZONES_MAP['us'],
    // ZPA endpoint (e.g., https://zpa.zscloud.net or https://api.zscloud.net/zpa)
    zpaBaseUrl: normalizeUrl(process.env.ZSCALER_ZPA_BASE_URL),
    // ZIA endpoint (e.g., https://zia.zscloud.net or https://api.zscloud.net/zia)
    ziaBaseUrl: normalizeUrl(process.env.ZSCALER_ZIA_BASE_URL),
    authType: (process.env.ZSCALER_AUTH_TYPE as 'api-key' | 'oauth2') || 'api-key',
    // Cloud zone - defaults to 'us' if not specified
    cloudZone: 'us',
};

export { ZSCALER_ZONES_MAP };
export default zscalerConfig;
