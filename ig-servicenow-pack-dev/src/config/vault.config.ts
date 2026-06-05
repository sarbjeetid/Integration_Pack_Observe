export default {
    vault_uri: process.env.VAULT_URI || '',
    vault_role_id: process.env.VAULT_ROLE_ID || '',
    vault_secret_id: process.env.VAULT_SECRET_ID || '',
    vault_secrets_path: process.env.VAULT_SECRETS_PATH || '',
    vault_secrets_sub_path: process.env.VAULT_SECRETS_SUB_PATH || '',
    secrets_update_interval: process.env.SECRETS_UPDATE_INTERVAL || '60',
};
