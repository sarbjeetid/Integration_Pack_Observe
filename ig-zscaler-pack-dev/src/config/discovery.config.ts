import { DiscoveryConfigI } from '../interfaces/config';

const discoveryConfig: DiscoveryConfigI = {
    discovery: {
        enabled: process.env.DISCOVERY_ENABLED !== 'false',
        interval: parseInt(process.env.DISCOVERY_INTERVAL || '3600000'), // 1 hour default
    },
    discoveryPubSubName:
        process.env.DISCOVERY_PUB_SUB_NAME || 'discovery-pub-sub',
    corePubSubName: process.env.CORE_PUB_SUB_NAME || 'core-pub-sub',
    startDiscoveryTopicName:
        process.env.START_DISCOVERY_TOPIC_NAME ||
        'zscaler-startdiscovery',
    listResourcesTopicName:
        process.env.LIST_RESOURCES_TOPIC_NAME ||
        'zscaler-listresources',
    describeResourceTopicName:
        process.env.DESCRIBE_RESOURCE_TOPIC_NAME || 'zscaler-describeresource',
    describeAllResourcesTopicName:
        process.env.DESCRIBE_ALL_RESOURCES_TOPIC_NAME || 'zscaler-describeallresources',
    describeAllRelationshipsTopicName:
        process.env.DESCRIBE_ALL_RELATIONSHIPS_TOPIC_NAME || 'zscaler-describeallrelationships',
    coreDiscoveryTopicName:
        process.env.CORE_DISCOVERY_TOPIC_NAME || 'discovery_dapr_data',
    waitTimeInMs: parseInt(process.env.WAIT_TIME_IN_MS || '5000', 10),
};

export default discoveryConfig;
