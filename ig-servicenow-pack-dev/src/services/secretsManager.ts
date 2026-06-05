import { ServicenowSecretsI } from '../interfaces/config/index';
import { edgeSecrets } from '../loaders/vault';
import { Container } from 'typedi';
import winston from 'winston';

const fetchDiscoveryCredentials = async (credentialPath: string): Promise<ServicenowSecretsI | undefined> => {

    //edge vault
    const vaultClient: edgeSecrets = Container.get('edgeVaultClient');
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        if (credentialPath) {
            const secrets_path = `${credentialPath}`;
            const EdgeVaultSecrets: any = await vaultClient.fetch_secrets_from_edge_vault(secrets_path);

            // If Secret present in edge vault
            if (EdgeVaultSecrets) {
                const response = {
                    username: EdgeVaultSecrets.username || '',
                    password: EdgeVaultSecrets.password || '',
                    client_id: EdgeVaultSecrets.client_id || '',
                    client_secret: EdgeVaultSecrets.client_secret || '',
                    middleware_client_id: EdgeVaultSecrets.middleware_client_id || '',
                    middleware_client_secret: EdgeVaultSecrets.middleware_client_secret || '',
                };
                return response;
            }
        }
    }
    catch (err) {
        loggerInstance.error(`Error fetching secrets from vault: ${err}`);
    }
}

export { fetchDiscoveryCredentials };
