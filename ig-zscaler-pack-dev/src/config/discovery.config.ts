import { DiscoveryConfigI } from '../interfaces/config';

const discoveryConfig: DiscoveryConfigI = {
    discovery: {
        enabled: process.env.DISCOVERY_ENABLED !== 'false',
        interval: parseInt(process.env.DISCOVERY_INTERVAL || '3600000'), // 1 hour default
    },
};

export default discoveryConfig;
