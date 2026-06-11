import { edgeSecrets } from '../loaders/vault';
import { Container } from 'typedi';
import winston from 'winston';

export interface ZscalerSecretsI {
    apiKey?: string;
    client_id?: string;
    client_secret?: string;
    customerId?: string;
    zpaBaseUrl?: string;
    ziaBaseUrl?: string;
}

export const fetchDiscoveryCredentials = async (credentialPath: string): Promise<ZscalerSecretsI | undefined> => {
    const vaultClient: edgeSecrets = Container.get('edgeVaultClient');
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        if (credentialPath) {
            const EdgeVaultSecrets: any = await vaultClient.fetch_secrets_from_edge_vault(credentialPath);

            if (EdgeVaultSecrets) {
                return {
                    apiKey: EdgeVaultSecrets.apiKey || EdgeVaultSecrets.api_key || '',
                    client_id: EdgeVaultSecrets.client_id || EdgeVaultSecrets.clientId || '',
                    client_secret: EdgeVaultSecrets.client_secret || EdgeVaultSecrets.clientSecret || '',
                    customerId: EdgeVaultSecrets.customerId || EdgeVaultSecrets.customer_id || '',
                    zpaBaseUrl: EdgeVaultSecrets.zpaBaseUrl || EdgeVaultSecrets.zpa_base_url || '',
                    ziaBaseUrl: EdgeVaultSecrets.ziaBaseUrl || EdgeVaultSecrets.zia_base_url || '',
                };
            }
        }
    }
    catch (err) {
        loggerInstance.error(`Error fetching secrets from vault: ${err}`);
    }
    return undefined;
};
