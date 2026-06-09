import { ZscalerConfigI } from '../interfaces/config';

// Normalize URLs by removing trailing slashes
const normalizeUrl = (url: string | undefined): string | undefined => {
    return url ? url.replace(/\/$/, '') : undefined;
};

const zscalerConfig: ZscalerConfigI = {
    apiKey: process.env.ZSCALER_API_KEY || '',
    clientId: process.env.ZSCALER_CLIENT_ID || '',
    clientSecret: process.env.ZSCALER_CLIENT_SECRET || '',
    baseUrl: normalizeUrl(process.env.ZSCALER_BASE_URL) || 'https://api.zscloud.net',
    // ZPA endpoint (e.g., https://zpa.zscloud.net or https://api.zscloud.net/zpa)
    zpaBaseUrl: normalizeUrl(process.env.ZSCALER_ZPA_BASE_URL),
    // ZIA endpoint (e.g., https://zia.zscloud.net or https://api.zscloud.net/zia)
    ziaBaseUrl: normalizeUrl(process.env.ZSCALER_ZIA_BASE_URL),
    authType: (process.env.ZSCALER_AUTH_TYPE as 'api-key' | 'oauth2') || 'api-key',
};

export default zscalerConfig;
