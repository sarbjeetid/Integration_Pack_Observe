export interface VaultConfigI {
    vault_uri: string;
    vault_role_id: string;
    vault_secret_id: string;
    vault_secrets_path: string;
    vault_secrets_sub_path: string;
    secrets_update_interval: string;
}

export interface PackConfigI {
    packLocation: string;
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
export interface EdgeVaultConfigI {
    edge_vault_uri: string;
}

export interface ServicenowSecretsI {
    username: string;
    password: string;
    client_id?: string;
    client_secret?: string;
    middleware_client_id?: string;
    middleware_client_secret?: string;
}

export interface DiscoveryConfigI {
    discoveryPubSubName: string;
    corePubSubName: string;
    listResourcesTopicName: string;
    describeResourceTopicName: string;
    describeAllResourcesTopicName: string;
    describeAllRelationshipsTopicName: string;
    coreDiscoveryTopicName: string;
    waitTimeInMs: number;
}

export interface ServicenowDiscoveryBodyI {
    url: string;
    username: string;
    password: string;
    zone_id: string;
    stack_id: string;
    query?: string;
}
export interface ServiceNowRelationI {
    sys_id: string;
    type: {
        display_value: string;
        link: string;
        value: string;
    }
    target: {
        display_value: string;
        link: string;
        value: string;
    }
}