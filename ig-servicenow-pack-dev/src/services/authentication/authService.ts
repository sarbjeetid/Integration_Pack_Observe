import axios from 'axios';
import { fetchDiscoveryCredentials } from '../../services/secretsManager';
import winston from 'winston';
import { Container } from 'typedi';
import { CustomerConfig } from '../../interfaces/scenario';

interface OAuthToken {
     access_token: string;
     refresh_token: string;
     expires_at: number;
}
const oauthTokenMap: Record<string, OAuthToken> = {};

// Get Basic Authentication Header
export const getBasicAuthHeader = async (vaultPath?: string): Promise<string> => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');
     if (!vaultPath) {
          throw new Error('Vault path is required for Basic Auth');
     }
     try {
          loggerInstance.info('Authentication via Basic Auth');
          const secrets = await fetchDiscoveryCredentials(vaultPath);
          if (!secrets?.username || !secrets?.password) {
               throw new Error('Missing username or password in vault secrets');
          }

          return `Basic ${Buffer.from(secrets.username + ':' + secrets.password).toString('base64')}`;
     } catch (error) {
          loggerInstance.error(`Error fetching basic auth credentials: ${error}`);
          throw new Error('Failed to retrieve Basic Auth credentials');
     }
};

// Get OAuth 2.0 Token (Password Grant Type)
export const fetchNewOAuthToken = async (vaultPath: string, baseUrl: string, accessTokenUrl: string): Promise<void> => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');
     if (!vaultPath) {
          throw new Error('Vault path is required for OAuth');
     }
     const secrets = await fetchDiscoveryCredentials(vaultPath);
     if (!secrets?.client_id || !secrets?.client_secret || !secrets?.username || !secrets?.password) {
          throw new Error('Missing OAuth credentials in vault secrets');
     }
     try {
          const authTokenurl = `${baseUrl}${accessTokenUrl}`;
          const response = await axios.post(authTokenurl, new URLSearchParams({
               grant_type: 'password',
               client_id: secrets.client_id,
               client_secret: secrets.client_secret,
               username: secrets.username,
               password: secrets.password,
          }), {
               headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          // Store access and refresh tokens along with expiry time in map
          oauthTokenMap[baseUrl] = {
               access_token: response.data.access_token,
               refresh_token: response.data.refresh_token,
               expires_at: Date.now() + response.data.expires_in * 1000, // Convert expiry time to milliseconds
          };
     } catch (error) {
          loggerInstance.error(`Error fetching OAuth token: ${error}`);
          throw new Error('Failed to fetch OAuth token');
     }
};

// Refresh OAuth Token using Refresh Token
export const refreshOAuthToken = async (vaultPath: string, baseUrl: string, accessTokenUrl: string): Promise<void> => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');
     const token = oauthTokenMap[baseUrl];

     if (!vaultPath || !token?.refresh_token) {
          throw new Error('Vault path and refresh token are required for refreshing OAuth token');
     }

     const secrets = await fetchDiscoveryCredentials(vaultPath);
     if (!secrets?.client_id || !secrets?.client_secret) {
          throw new Error('Missing OAuth credentials in vault secrets');
     }
     try {
          const authTokenurl = `${baseUrl}${accessTokenUrl}`;
          const response = await axios.post(authTokenurl, new URLSearchParams({
               grant_type: 'refresh_token',
               client_id: secrets.client_id,
               client_secret: secrets.client_secret,
               refresh_token: token.refresh_token,
          }), {
               headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          // Update stored tokens
          oauthTokenMap[baseUrl] = {
               access_token: response.data.access_token,
               refresh_token: response.data.refresh_token || token.refresh_token, // Keep the old refresh token if a new one isn't provided
               expires_at: Date.now() + response.data.expires_in * 1000,
          };
     } catch (error) {
          loggerInstance.error('Error refreshing OAuth token:', error);
          loggerInstance.warn('Refresh token might be expired, fetching new token...');
          await fetchNewOAuthToken(vaultPath, baseUrl, accessTokenUrl); // Fetch a new token if refresh fails
     }
};

// Get OAuth Token with Refresh Handling
export const getOAuthToken = async (vaultPath: string, baseUrl: string, accessTokenUrl: string): Promise<string> => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');
     loggerInstance.info('Authentication via OAuth 2.0');
     const token = oauthTokenMap[baseUrl];
     if (!token) {
          loggerInstance.info('No token exists for baseUrl, fetching new token...');
          await fetchNewOAuthToken(vaultPath, baseUrl, accessTokenUrl);
     } else if (Date.now() >= token.expires_at) {
          loggerInstance.info('Token expired, refreshing...');
          await refreshOAuthToken(vaultPath, baseUrl, accessTokenUrl);
     }
     const currentToken = oauthTokenMap[baseUrl];
     if (!currentToken?.access_token) {
          throw new Error('OAuth token retrieval failed');
     }

     return `Bearer ${currentToken.access_token}`;
};

export const fetchNewClientCredsToken = async (vaultPath: string, baseUrl: string, accessTokenUrl: string): Promise<void> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    if (!vaultPath) throw new Error('Vault path is required for OAuth client_credentials');

    const secrets = await fetchDiscoveryCredentials(vaultPath);
    if (!secrets?.client_id || !secrets?.client_secret) {
        throw new Error('Missing client_id or client_secret in vault secrets');
    }

    try {
        const tokenUrl = `${baseUrl}${accessTokenUrl}`;

        const encoded = Buffer.from(`${secrets.client_id}:${secrets.client_secret}`).toString('base64');

        const response = await axios.post(
            tokenUrl,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: {
                    'Authorization': `Basic ${encoded}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        const expiresInSeconds = response.data.expires_in;
        const bufferInSeconds = 60; 

        oauthTokenMap[baseUrl] = {
            access_token: response.data.access_token,
            refresh_token: '', // Not applicable for client_credentials
            expires_at: Date.now() + (expiresInSeconds - bufferInSeconds) * 1000,
        };

    } catch (error) {
        loggerInstance.info(`Error fetching client_credentials token: ${error}`);
        throw new Error('Failed to fetch OAuth client_credentials token');
    }
};

export const getClientCredsToken = async (vaultPath: string, baseUrl: string, accessTokenUrl: string): Promise<string> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    loggerInstance.info('Authentication via OAuth 2.0 client_credentials');

    const token = oauthTokenMap[baseUrl];

    if (!token || Date.now() >= token.expires_at) {
        loggerInstance.info('Fetching new client_credentials token...');
        await fetchNewClientCredsToken(vaultPath, baseUrl, accessTokenUrl);
    }

    const currentToken = oauthTokenMap[baseUrl];
    if (!currentToken?.access_token) {
        throw new Error('OAuth token retrieval failed');
    }

    return `Bearer ${currentToken.access_token}`;
};

// Get Authentication Header Based on Type
export const getAuthHeader = async (authType: string, vaultPath: string, baseUrl: string, customerConfig?: CustomerConfig): Promise<string> => {
     if (!vaultPath) {
          throw new Error('Vault path is required for authentication');
     }
     let accessTokenUrl = customerConfig?.accessTokenUrl;
      
     switch (authType) {
          case 'oauth_2.0': //OAUTH2.0: GrantType = password
               return await getOAuthToken(vaultPath, baseUrl, accessTokenUrl); // Password Grant
          case 'oauth2.0_gt_cc': //OAUTH2.0: GrantType = client Credential
               return await getClientCredsToken(vaultPath, baseUrl, accessTokenUrl); // client Credential grant
          default:
               return await getBasicAuthHeader(vaultPath);
     }
};

// Get Middleware Headers using Vault credentials
export const getMiddlewareHeaders = async (
    vaultPath: string,
    authHeader: string
): Promise<Record<string, string>> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    if (!vaultPath) {
        throw new Error('Vault path is required to get middleware headers');
    }

    try {
        const secrets = await fetchDiscoveryCredentials(vaultPath);
        if (!secrets?.middleware_client_id || !secrets?.middleware_client_secret) {
            throw new Error('Missing middleware_client_id or middleware_client_secret in vault secrets');
        }

        loggerInstance.info('Middleware authentication headers prepared');

        return {
            client_id: secrets.middleware_client_id,
            client_secret: secrets.middleware_client_secret,
            Authorization: authHeader
        };
    } catch (error) {
        loggerInstance.error(`Error building middleware headers: ${error}`);
        throw new Error('Failed to build middleware headers');
    }
};
