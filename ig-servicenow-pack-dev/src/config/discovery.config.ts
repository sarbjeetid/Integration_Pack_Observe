export default {
    discoveryPubSubName:
        process.env.DISCOVERY_PUB_SUB_NAME || 'discovery-pub-sub',
    corePubSubName: process.env.CORE_PUB_SUB_NAME || 'core-pub-sub',
    listResourcesTopicName:
        process.env.LIST_RESOURCES_TOPIC_NAME ||
        'servicenow-listresources',
    describeResourceTopicName:
        process.env.DESCRIBE_RESOURCE_TOPIC_NAME || 'servicenow-describeresource',
    describeAllResourcesTopicName:
        process.env.DESCRIBE_ALL_RESOURCES_TOPIC_NAME || 'servicenow-describeallresources',
    describeAllRelationshipsTopicName:
        process.env.DESCRIBE_ALL_RELATIONSHIPS_TOPIC_NAME || 'servicenow-describeallrelationships',
    coreDiscoveryTopicName:
        process.env.CORE_DISCOVERY_TOPIC_NAME || 'discovery_dapr_data',
    waitTimeInMs: parseInt(process.env.WAIT_TIME_IN_MS || '5000', 10),
};
