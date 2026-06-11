export interface ZscalerConfigI {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  zpaBaseUrl?: string;
  ziaBaseUrl?: string;
  authType: 'api-key' | 'oauth2';
  cloudZone?: string;
}

export interface EdgeVaultConfigI {
  vault: {
    baseUrl: string;
    namespace: string;
  };
}

export interface LogConfigI {
  log: {
    level: string;
    transports: {
      console: boolean;
      file: boolean;
    };
  };
}

export interface DiscoveryConfigI {
  discovery: {
    enabled: boolean;
    interval: number;
  };
  discoveryPubSubName?: string;
  corePubSubName?: string;
  startDiscoveryTopicName?: string;
  listResourcesTopicName?: string;
  describeResourceTopicName?: string;
  describeAllResourcesTopicName?: string;
  describeAllRelationshipsTopicName?: string;
  coreDiscoveryTopicName?: string;
  waitTimeInMs?: number;
}

export interface PackConfigI {
  pack: {
    name: string;
    version: string;
  };
  packLocation?: string;
}

export interface VaultConfigI {
  vault: {
    endpoint: string;
    token: string;
    namespace: string;
    requestTimeout: number;
  };
}

export interface ZscalerDiscoveryBodyI {
  zone_id: string;
  stack_id: string;
  vault_path: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  customerId?: string;
  zpaBaseUrl?: string;
  ziaBaseUrl?: string;
}

