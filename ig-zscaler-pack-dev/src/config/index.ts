import dotenv from 'dotenv';
dotenv.config();

import {
    ZscalerConfigI,
    LogConfigI,
    PackConfigI,
    DiscoveryConfigI
} from '../interfaces/config';

import loggerConfig from './logger.config';
import packConfig from './pack.config';
import discoveryConfig from './discovery.config';
import zscalerConfig from './zscaler.config';

// Default environment
const DEVELOPMENT_ENV = 'development';
process.env.NODE_ENV = process.env.NODE_ENV || DEVELOPMENT_ENV;

interface FullConfig
    extends LogConfigI,
        PackConfigI,
        DiscoveryConfigI,
        ZscalerConfigI {
    env: {
        current: string;
        PRODUCTION: string;
        DEVELOPMENT: string;
    };
    port: number;
    daprHost: string;
    daprHttpPort: number;
    apiKey: string;
    dis_api_url: string;
    externalApiUrl: string;
    maxResourceDiscoveryCount: number | undefined;
    packLocation: string;
    api: {
        prefix: string;
    };
}

const config: FullConfig = {
    env: {
        current: process.env.NODE_ENV || DEVELOPMENT_ENV,
        PRODUCTION: 'production',
        DEVELOPMENT: DEVELOPMENT_ENV,
    },

    port: parseInt(process.env.PORT || '3000', 10),
    daprHost: process.env.DAPR_HOST || 'localhost',
    daprHttpPort: parseInt(process.env.DAPR_HTTP_PORT || '3500', 10),
    apiKey: process.env.API_KEY || process.env.ZSCALER_API_KEY || "",
    dis_api_url: process.env.DIS_API_URL || "https://ig-dev-az.intelligeni.com/data/v1/ingest",
    externalApiUrl: process.env.EXTERNAL_API_URL || "",
    maxResourceDiscoveryCount: process.env.MAX_RESOURCE_DISCOVERY_COUNT ? parseInt(process.env.MAX_RESOURCE_DISCOVERY_COUNT, 10) : undefined,
    packLocation: process.env.PACK_LOCATION || "core",

    api: {
        prefix: '/api/v1',
    },

    ...loggerConfig,
    ...packConfig,
    ...discoveryConfig,
    ...zscalerConfig,
};


export default config;