import dotenv from 'dotenv';

dotenv.config();

import {
    VaultConfigI,
    LogicmonitorConfigI,
    DiscoveryConfigI,
    LogConfigI,
    EdgeVaultConfigI
} from '../interfaces/config';

import loggerConfig from './logger.config'
import vaultConfig from './vault.config';
import logicmonitorConfig from './logicmonitor.config';
import discoveryConfig from './discovery.config';
import edgeVaultConfig from './edge.vault.config';

// Set the NODE_ENV to 'development' by default
const DEVELOPMENT_ENV = 'development';
process.env.NODE_ENV = process.env.NODE_ENV || DEVELOPMENT_ENV;

interface FullConfig extends VaultConfigI,
    EdgeVaultConfigI,
    LogicmonitorConfigI,
    DiscoveryConfigI,
    LogConfigI {
    env: {
        current: string;
        PRODUCTION: string;
        DEVELOPMENT: string;
    };

    // Server Config
    port: number;
    daprHost: string;
    daprHttpPort: number;

    externalApiUrl: string
    externalApiSource: "core" | "edge",
    ssoUsername: string
    ssoPassword: string

    // Define Platforms

    platforms: {
        LOGICMONITOR: string;
    };

    // API configs
    api: {
        prefix: string;
    };
    redisHost: string;
    redisPort: number;
    redisPassword: string;
    redisUser: string;
    appInsightsConnectionString: string;
    cloudRoleName: string;
    enableAppInsightsTracing: string;
    apiKey: string;
    pageSize: number;
    ignoreCiList: any; 
    allowedAssignmentGroups: any;
    maxResourceDiscoveryCount: any;
    coreApiRetry: {
        attempts: number;
        initialDelayMs: number;
        maxDelayMs: number;
    };
    sourceIdCache: {
        enabled: boolean;
        prefix: string;
        ttlSeconds: number;
    };

    // Others
    [params: string]: any;
}

const config: FullConfig = {
    env: {
        current: process.env.NODE_ENV,
        PRODUCTION: 'production',
        DEVELOPMENT: DEVELOPMENT_ENV
    },

    port: Number.parseInt(process.env.PORT || '3000', 10),
    daprHost: process.env.DAPR_HOST || 'http://localhost',
    daprHttpPort: Number.parseInt(process.env.DAPR_HTTP_PORT || '3500', 10),
    apiKey: process.env.API_KEY || "",
    externalApiUrl: process.env.EXTERNAL_API_URL || "",
    externalApiSource: process.env.EXTERNAL_API_SOURCE && process.env.EXTERNAL_API_SOURCE === "edge" ? "edge" : "core",
    deployed_at: process.env.DEPLOYED_AT || "edge",
    dis_api_url: process.env.DIS_API_URL || "https://ig-dev-az.intelligeni.com/data/v1/ingest",

    ssoPassword: process.env.SSO_PASSWORD || "",
    ssoUsername: process.env.SSO_USERNAME || "",
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10), 
    redisPassword: process.env.REDIS_PASSWORD || "",
    redisUser: process.env.REDIS_USER ?? '',
    appInsightsConnectionString: process.env.APP_INSIGHTS_CONNECTION_STRING || '',
    cloudRoleName: process.env.CLOUD_ROLE_NAME || 'logicmonitor-pack',
    enableAppInsightsTracing: process.env.ENABLE_APP_INSIGHTS_TRACING || 'false',
    pageSize: Number.parseInt(process.env.PAGE_SIZE || '50', 10),
    ignoreCiList: process.env.IGNORE_CI_LIST,
    allowedAssignmentGroups: process.env.ALLOWED_ASSIGNMENT_GROUPS,
    maxResourceDiscoveryCount: process.env.MAX_RESOURCE_DISCOVERY_COUNT ? Number.parseInt(process.env.MAX_RESOURCE_DISCOVERY_COUNT) : undefined,
    coreApiRetry: {
        attempts: Number.parseInt(process.env.CORE_API_RETRY_ATTEMPTS || '5', 10),
        initialDelayMs: Number.parseInt(process.env.CORE_API_RETRY_DELAY_MS || '1000', 10),
        maxDelayMs: Number.parseInt(process.env.CORE_API_RETRY_MAX_DELAY_MS || '10000', 10)
    },
    sourceIdCache: {
        enabled: (process.env.SOURCE_ID_CACHE_ENABLED ?? 'true').toLowerCase() !== 'false',
        prefix: process.env.SOURCE_ID_CACHE_PREFIX || 'LogicmonitorDeviceName',
        ttlSeconds: Number.parseInt(process.env.SOURCE_ID_CACHE_TTL_SECONDS || '0', 10)
    },
    platforms: {
        LOGICMONITOR: 'logicmonitor'
    },

    // API configs
    api: {
        prefix: '/api/v1'
    },

    // Inject vault config
    ...vaultConfig,

    // Inject edge vault config
    ...edgeVaultConfig,

    // Inject Azure Config
    ...logicmonitorConfig,

    //inject discovery config
    ...discoveryConfig,

    ...loggerConfig,

    // Inject edge vault config
    ...edgeVaultConfig,

};

export default config;
