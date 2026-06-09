import { VaultConfigI } from '../interfaces/config';

const vaultConfig: VaultConfigI = {
    vault: {
        endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || '',
        namespace: process.env.VAULT_NAMESPACE || 'secret',
        requestTimeout: parseInt(process.env.VAULT_REQUEST_TIMEOUT || '30000'),
    },
};

export default vaultConfig;
