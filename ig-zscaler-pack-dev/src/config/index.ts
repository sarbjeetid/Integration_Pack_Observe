import dotenv from 'dotenv';

dotenv.config();

import {
    ZscalerConfigI,
    LogConfigI,
    PackConfigI,
    EdgeVaultConfigI,
    DiscoveryConfigI,
    VaultConfigI
} from '../interfaces/config';

import loggerConfig from './logger.config'
import vaultConfig from './vault.config';
import packConfig from './pack.config';
import edgeVaultConfig from './edge.vault.config';
import discoveryConfig from './discovery.config';
import zscalerConfig from './zscaler.config';

// Set the NODE_ENV to 'development' by default
const DEVELOPMENT_ENV = 'development';
process.env.NODE_ENV = process.env.NODE_ENV || DEVELOPMENT_ENV;

interface FullConfig extends VaultConfigI, LogConfigI, PackConfigI, EdgeVaultConfigI, DiscoveryConfigI, ZscalerConfigI {
    env: {
        current: string;
        PRODUCTION: string;
        DEVELOPMENT: string;
    };
    port: number;
    daprHost: string;
    daprHttpPort: number;
    // API configs
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
    port: parseInt(process.env.PORT || '3000'),
    daprHost: process.env.DAPR_HOST || 'localhost',
    daprHttpPort: parseInt(process.env.DAPR_HTTP_PORT || '3500'),
    api: {
        prefix: '/api/v1',
    },
    ...loggerConfig,
    ...vaultConfig,
    ...packConfig,
    ...edgeVaultConfig,
    ...discoveryConfig,
    ...zscalerConfig,
};

export default config;
