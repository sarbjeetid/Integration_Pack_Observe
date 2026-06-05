import axios from 'axios';
import winston from 'winston';
import { CustomerConfig } from '../../../src/interfaces/scenario';

const vaultPath = 'vault/test';
const accessTokenUrl = '/oauth_token';

const mockLogger: Partial<winston.Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const loadAuthService = async () => {
  jest.resetModules();

  jest.doMock('typedi', () => ({
    Container: {
      get: jest.fn(() => mockLogger),
    },
  }));

  jest.doMock('../../../src/services/secretsManager', () => ({
    fetchDiscoveryCredentials: jest.fn(),
  }));

  jest.doMock('axios');

  const authService = await import('../../../src/services/authentication/authService');
  const secretsManager = await import('../../../src/services/secretsManager');
  const axiosModule = await import('axios');

  return {
    authService,
    fetchDiscoveryCredentials: secretsManager.fetchDiscoveryCredentials as jest.Mock,
    axios: axiosModule.default as jest.Mocked<typeof axios>,
  };
};

describe('Auth Service', () => {

  /* BASIC AUTH  */

  it('getBasicAuthHeader → success', async () => {
    const { authService, fetchDiscoveryCredentials } = await loadAuthService();

    fetchDiscoveryCredentials.mockResolvedValue({
      username: 'user',
      password: 'pass',
    });

    const header = await authService.getBasicAuthHeader(vaultPath);
    expect(header.startsWith('Basic')).toBe(true);
  });

  /*  PASSWORD GRANT  */

  it('fetchNewOAuthToken + getOAuthToken → success', async () => {
    const { authService, fetchDiscoveryCredentials, axios } = await loadAuthService();
    const baseUrl = 'https://pw.com';

    fetchDiscoveryCredentials.mockResolvedValue({
      client_id: 'cid',
      client_secret: 'secret',
      username: 'u',
      password: 'p',
    });

    axios.post.mockResolvedValue({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
      },
    } as any);

    await authService.fetchNewOAuthToken(vaultPath, baseUrl, accessTokenUrl);
    const token = await authService.getOAuthToken(vaultPath, baseUrl, accessTokenUrl);

    expect(token).toBe('Bearer access');
  });

  /* REFRESH FLOW  */

  it('refreshOAuthToken → refreshes expired token', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    const { authService, fetchDiscoveryCredentials, axios } = await loadAuthService();
    const baseUrl = 'https://refresh.com';

    fetchDiscoveryCredentials.mockResolvedValue({
      client_id: 'cid',
      client_secret: 'secret',
      username: 'u',
      password: 'p',
    });

    axios.post
      .mockResolvedValueOnce({
        data: {
          access_token: 'old',
          refresh_token: 'refresh',
          expires_in: -1,
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          access_token: 'new',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        },
      } as any);

    const token = await authService.getOAuthToken(vaultPath, baseUrl, accessTokenUrl);
    expect(token).toBe('Bearer old');

    jest.restoreAllMocks();
  });

  it('refreshOAuthToken → fallback to fetchNewOAuthToken', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    const { authService, fetchDiscoveryCredentials, axios } = await loadAuthService();
    const baseUrl = 'https://fallback.com';

    fetchDiscoveryCredentials.mockResolvedValue({
      client_id: 'cid',
      client_secret: 'secret',
      username: 'u',
      password: 'p',
    });

    axios.post
      .mockResolvedValueOnce({
        data: {
          access_token: 'old',
          refresh_token: 'refresh',
          expires_in: -1,
        },
      } as any)
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce({
        data: {
          access_token: 'fallback',
          refresh_token: 'r2',
          expires_in: 3600,
        },
      } as any);

    const token = await authService.getOAuthToken(vaultPath, baseUrl, accessTokenUrl);
    expect(token).toBe('Bearer old');

    jest.restoreAllMocks();
  });

  /*  CLIENT CREDENTIALS  */

  it('getClientCredsToken → success', async () => {
    const { authService, fetchDiscoveryCredentials, axios } = await loadAuthService();
    const baseUrl = 'https://cc.com';

    fetchDiscoveryCredentials.mockResolvedValue({
      client_id: 'cid',
      client_secret: 'secret',
    });

    axios.post.mockResolvedValue({
      data: {
        access_token: 'cc',
        expires_in: 3600,
      },
    } as any);

    const token = await authService.getClientCredsToken(vaultPath, baseUrl, accessTokenUrl);
    expect(token).toBe('Bearer cc');
  });

  /* AUTH HEADER  */

  it('getAuthHeader → oauth_2.0', async () => {
    const { authService, fetchDiscoveryCredentials, axios } = await loadAuthService();
    const baseUrl = 'https://auth-oauth.com';

    fetchDiscoveryCredentials.mockResolvedValue({
      client_id: 'cid',
      client_secret: 'secret',
      username: 'u',
      password: 'p',
    });

    axios.post.mockResolvedValue({
      data: {
        access_token: 'oauth',
        refresh_token: 'r',
        expires_in: 3600,
      },
    } as any);

    const config = { accessTokenUrl } as Partial<CustomerConfig> as CustomerConfig;

    const header = await authService.getAuthHeader(
      'oauth_2.0',
      vaultPath,
      baseUrl,
      config
    );

    expect(header).toBe('Bearer oauth');
  });

  /* MIDDLEWARE  */

  it('getMiddlewareHeaders → success', async () => {
    const { authService, fetchDiscoveryCredentials } = await loadAuthService();

    fetchDiscoveryCredentials.mockResolvedValue({
      middleware_client_id: 'mid',
      middleware_client_secret: 'msecret',
    });

    const headers = await authService.getMiddlewareHeaders(
      vaultPath,
      'Bearer token'
    );

    expect(headers).toEqual({
      client_id: 'mid',
      client_secret: 'msecret',
      Authorization: 'Bearer token',
    });
  });
});
