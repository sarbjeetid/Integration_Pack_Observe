export interface VaultConfigI {
    vault_uri: string;
    vault_role_id: string;
    vault_secret_id: string;
    vault_secrets_path: string;
    vault_secrets_sub_path: string;
    secrets_update_interval: string;
    onboardingParentPath: string;
    onboardingPath: string;
}

export interface EdgeVaultConfigI {
    edge_vault_uri: string;
    edge_vault_secrets_path: string;
}

export interface LogicmonitorConfigI {
    ignoreSeverityList: string,
}
export interface DiscoveryConfigI {
    discoveryPubSubName: string;
    corePubSubName: string;
    listResourcesTopicName: string;
    startDiscoveryTopicName: string;
    describeResourcesTopicName: string;
    interfaceDiscoveryTopicName: string;
    metricDiscoveryTopicName: string;
    coreDiscoveryTopicName: string;
    coreAlertTopicName: string;
    waitTimeinMs: number;
    eventHubConnectionString: string;
    enableMetricDiscovery: string;
    enableInterfaceDiscovery: string;
}
export interface LogConfigI {
    // Used by Winston Logger
    logs: {
       level: string;
   };
   logLevels: Array<string>;
   logColors: {
       [params: string]: string;
   };
}
