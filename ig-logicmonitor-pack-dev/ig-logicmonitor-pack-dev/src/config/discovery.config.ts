export default {
    discoveryPubSubName:
        process.env.DISCOVERY_PUB_SUB_NAME || 'discovery-pub-sub',
    corePubSubName: process.env.CORE_PUB_SUB_NAME || 'eventhubs-pubsub',
    coreDiscoveryTopicName:
        process.env.CORE_DISCOVERY_TOPIC_NAME || 'discovery_dapr_data',
    coreAlertTopicName: process.env.CORE_ALERT_TOPIC_NAME || 'alerts_input',
    startDiscoveryTopicName: process.env.START_DISCOVERY_TOPIC_NAME || 'logicmonitor-startdiscovery',
    listResourcesTopicName: process.env.LIST_RESOURCES_TOPIC_NAME || 'logicmonitor-listresources',
    describeResourcesTopicName: process.env.DESCRIBE_RESOURCES_TOPIC_NAME || 'logicmonitor-describeresources',
    metricDiscoveryTopicName: process.env.METRIC_DISCOVERY_TOPIC_NAME || 'logicmonitor-metricdiscovery',
    interfaceDiscoveryTopicName: process.env.INTERFACE_DISCOVERY_TOPIC_NAME || 'logicmonitor-interfacediscovery',
    waitTimeinMs: parseInt(process.env.WAIT_TIME_IN_MS || '10000', 10),
    eventHubConnectionString: process.env.EVENT_HUB_CONNECTION_STRING || "",
    enableMetricDiscovery: process.env.ENABLE_METRIC_DISCOVERY || 'false',
    enableInterfaceDiscovery: process.env.ENABLE_INTERFACE_DISCOVERY || 'false',
};
