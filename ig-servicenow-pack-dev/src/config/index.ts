import dotenv from 'dotenv';

dotenv.config();

import {
    VaultConfigI,
    LogConfigI,
    PackConfigI,
    EdgeVaultConfigI,
    DiscoveryConfigI
} from '../interfaces/config';

import loggerConfig from './logger.config'
import vaultConfig from './vault.config';
import packConfig from './pack.config';
import edgeVaultConfig from './edge.vault.config';
import discoveryConfig from './discovery.config';

// Set the NODE_ENV to 'development' by default
const DEVELOPMENT_ENV = 'development';
process.env.NODE_ENV = process.env.NODE_ENV || DEVELOPMENT_ENV;

interface FullConfig extends VaultConfigI, LogConfigI, PackConfigI, EdgeVaultConfigI, DiscoveryConfigI {
    env: {
        current: string;
        PRODUCTION: string;
        DEVELOPMENT: string;
    };
    port: number;
    externalApiUrl: string
    externalApiSource: "core" | "edge",
    username: string
    password: string,
    daprHost: string,
    daprHttpPort: number,
    scenarioCloseServicenowState: string,
    // API configs
    api: {
        prefix: string;
    };
    baseURL: string,
    redisHost: string;
    redisPort: number;
    redisPassword: string;
    redisUser: string;
    appInsightsConnectionString: string;
    cloudRoleName: string;
    enableAppInsightsTracing: string;
    authType: string;
    callerId: string;
    instance: string;
    allowedAssignmentGroups: any;
    maxResourceDiscoveryCount: any;
    enableRelationshipDiscovery: any;
    customerConfigUrl: string;
    customerConfigToken: string;
    apiKeySchedule: string;
    teamsWebhookUrl: string;
    // Others
    [params: string]: any;
}

const config: FullConfig = {
    env: {
        current: process.env.NODE_ENV,
        PRODUCTION: 'production',
        DEVELOPMENT: DEVELOPMENT_ENV
    },

    port: parseInt(process.env.PORT || '3000', 10),
    daprHost: process.env.DAPR_HOST || 'http://localhost',
    daprHttpPort: parseInt(process.env.DAPR_HTTP_PORT  || '3500', 10),
    apiKey: process.env.API_KEY || "",
    dis_api_url: process.env.DIS_API_URL || "https://ig-dev-az.intelligeni.com/data/v1/ingest",
    externalApiUrl: process.env.EXTERNAL_API_URL || "",
    externalApiSource: process.env.EXTERNAL_API_SOURCE || process.env.EXTERNAL_API_SOURCE === "edge" ? "edge" : "core",
    password: process.env.PASSWORD || "",
    username: process.env.USERNAME || "",
    apiKeyToken: process.env.API_KEY_TOKEN || "",
    sysDomain: process.env.SYS_DOMAIN || "",
    assignmentGroup: process.env.ASSIGNMENT_GROUP ||"",
    scenarioCloseServicenowState: process.env.SCENARIO_CLOSE_SERVICENOW_STATE || "6,7,8",
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10), 
    redisPassword: process.env.REDIS_PASSWORD || "",
    redisUser: process.env.REDIS_USER || '',
    appInsightsConnectionString: process.env.APP_INSIGHTS_CONNECTION_STRING || '',
    cloudRoleName: process.env.CLOUD_ROLE_NAME || 'servicenow-pack',
    enableAppInsightsTracing: process.env.ENABLE_APP_INSIGHTS_TRACING || 'false',
    authType: process.env.AUTH_TYPE || 'basic_auth',
    callerId: process.env.CALLER_ID || 'Observe',
    instance: process.env.INSTANCE || 'OBSERVE',
    allowedAssignmentGroups: process.env.ALLOWED_ASSIGNMENT_GROUPS,
    maxResourceDiscoveryCount: process.env.MAX_RESOURCE_DISCOVERY_COUNT ? parseInt(process.env.MAX_RESOURCE_DISCOVERY_COUNT) : undefined,
    enableRelationshipDiscovery: process.env.ENABLE_RELATIONSHIP_DISCOVERY?.toLowerCase() !== 'false',
    customerConfigUrl: process.env.CUSTOMER_CONFIG_URL || 'https://gitlab.com/api/v4/projects/intelligeni-core%2Fservicenow-customer-config/repository/files/customer-config.json/raw?ref=main',
    customerConfigToken: process.env.CUSTOMER_CONFIG_TOKEN || '',
    apiKeySchedule: process.env.API_KEY_SCHEDULE || '',
    teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
    // API configs
    api: {
        prefix: '/api/incident'
    },
    baseURL: process.env.BASE_URL || 'https://microlanddev.service-now.com',
    // Inject vault config
    ...loggerConfig,
    ...vaultConfig,
    ...packConfig,
    ...edgeVaultConfig,
    ...discoveryConfig,
};

export default config;
