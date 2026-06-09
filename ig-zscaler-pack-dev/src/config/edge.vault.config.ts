import { EdgeVaultConfigI } from '../interfaces/config';

const edgeVaultConfig: EdgeVaultConfigI = {
    vault: {
        baseUrl: process.env.EDGE_VAULT_BASE_URL || 'http://localhost:8200',
        namespace: process.env.EDGE_VAULT_NAMESPACE || 'secret',
    },
};

export default edgeVaultConfig;
