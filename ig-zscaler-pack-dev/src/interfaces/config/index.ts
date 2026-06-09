export interface ZscalerConfigI {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  zpaBaseUrl?: string;
  ziaBaseUrl?: string;
  authType: 'api-key' | 'oauth2';
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
}

export interface PackConfigI {
  pack: {
    name: string;
    version: string;
  };
}

export interface VaultConfigI {
  vault: {
    endpoint: string;
    token: string;
    namespace: string;
    requestTimeout: number;
  };
}
