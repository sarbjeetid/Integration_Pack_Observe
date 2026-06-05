import { Inject, Service } from 'typedi';
import winston from 'winston';
import { Secrets, EdgeSecrets } from '../loaders/vault';
import { LogicMonitorPlatformSecretsDataI } from '../interfaces/secrets';

import config from '../config';

type Platforms = 'azure' | 'appdynamics' | 'solarwinds' | 'aws' | 'logicmonitor';

type ObjectType<T> = T extends 'logicmonitor' ? LogicMonitorPlatformSecretsDataI : never;

@Service()
export default class SecretsManager {
  loggerInstance: winston.Logger;
  vaultClient: Secrets | EdgeSecrets;

  constructor(
    @Inject('loggerInstance') loggerInstance: winston.Logger,
    @Inject(config.deployed_at === 'core' ? 'vaultClient' : 'edgeVaultClient') client: Secrets | EdgeSecrets,
  ) {
    this.loggerInstance = loggerInstance;
    this.vaultClient = client;

    this.getCredentialInstance = this.getCredentialInstance.bind(this);
    this.fetchDiscoveryCredentials = this.fetchDiscoveryCredentials.bind(this);
  }

  getCredentialInstance(): Secrets | EdgeSecrets {
    return this.vaultClient;
  }

  private async fetchCoreSecrets(zoneId: string, stackId: string): Promise<LogicMonitorPlatformSecretsDataI | null> {
    const secrets: any = await (this.vaultClient as Secrets).fetch_secrets_from_vault(
      config.onboardingParentPath,
      config.onboardingPath
    );

    if (zoneId in secrets && typeof secrets[zoneId] === 'object' && stackId in secrets[zoneId]) {
      return {
        accessId: secrets[zoneId][stackId].accessId,
        accessKey: secrets[zoneId][stackId].accessKey,
        accountName: secrets[zoneId][stackId].accountName,
      };
    }
    return null;
  }

  private async fetchEdgeSecrets(credentialPath: string | null, stackId: string): Promise<LogicMonitorPlatformSecretsDataI | null> {
    const secretsPath = credentialPath ? `${credentialPath}` : `stack/${stackId}/${config.edge_vault_secrets_path}`;
    const EdgeVaultSecrets: any = await (this.vaultClient as EdgeSecrets).fetch_secrets_from_edge_vault(secretsPath);

    if (EdgeVaultSecrets) {
      return {
        accessId: EdgeVaultSecrets.accessId || EdgeVaultSecrets.access_id,
        accessKey: EdgeVaultSecrets.accessKey || EdgeVaultSecrets.access_key,
        accountName: EdgeVaultSecrets.accountName || EdgeVaultSecrets.account_name,
      };
    }
    return null;
  }

  async fetchDiscoveryCredentials<T extends Platforms>(
    zoneId: string,
    stackId: string,
    platform: T,
    credentialPath: string | null = null
  ): Promise<Promise<ObjectType<T>>> {
    let response: null | LogicMonitorPlatformSecretsDataI = null;

    if (platform === config.platforms.LOGICMONITOR) {

      // 2 cases for deployed_at: core or edge
      response = config.deployed_at === 'core'
        ? await this.fetchCoreSecrets(zoneId, stackId)
        : await this.fetchEdgeSecrets(credentialPath, stackId);
    }
    return response as ObjectType<T>;
  }
}
