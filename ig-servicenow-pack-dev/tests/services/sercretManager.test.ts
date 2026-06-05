import winston from 'winston';
import { Container } from 'typedi';
import { fetchDiscoveryCredentials } from '../../src/services/secretsManager';

describe('fetchDiscoveryCredentials', () => {
  let logger: winston.Logger;
  let vaultClient: any;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
    } as any;

    vaultClient = {
      fetch_secrets_from_edge_vault: jest.fn(),
    };

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'edgeVaultClient') return vaultClient;
      if (key === 'loggerInstance') return logger;
      return undefined as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return credentials when vault returns full secrets', async () => {
    vaultClient.fetch_secrets_from_edge_vault.mockResolvedValue({
      username: 'user',
      password: 'pass',
      client_id: 'cid',
      client_secret: 'csecret',
      middleware_client_id: 'mid',
      middleware_client_secret: 'msecret',
    });

    const result = await fetchDiscoveryCredentials('vault/path');

    expect(vaultClient.fetch_secrets_from_edge_vault)
      .toHaveBeenCalledWith('vault/path');

    expect(result).toEqual({
      username: 'user',
      password: 'pass',
      client_id: 'cid',
      client_secret: 'csecret',
      middleware_client_id: 'mid',
      middleware_client_secret: 'msecret',
    });
  });

  it('should return empty strings when username or password is missing', async () => {
    vaultClient.fetch_secrets_from_edge_vault.mockResolvedValue({
      username: '',
      password: '',
    });

    const result = await fetchDiscoveryCredentials('vault/path');

    expect(result).toEqual({
      username: '',
      password: '',
      client_id: '',
      client_secret: '',
      middleware_client_id: '',
      middleware_client_secret: '',
    });
  });

  it('should return empty OAuth fields when OAuth credentials are missing', async () => {
    vaultClient.fetch_secrets_from_edge_vault.mockResolvedValue({
      username: 'user',
      password: 'pass',
    });

    const result = await fetchDiscoveryCredentials('vault/path');

    expect(result).toEqual({
      username: 'user',
      password: 'pass',
      client_id: '',
      client_secret: '',
      middleware_client_id: '',
      middleware_client_secret: '',
    });
  });

  it('should return undefined when vault returns null', async () => {
    vaultClient.fetch_secrets_from_edge_vault.mockResolvedValue(null);

    const result = await fetchDiscoveryCredentials('vault/path');

    expect(result).toBeUndefined();
  });

  it('should not call vault when credentialPath is empty', async () => {
    const result = await fetchDiscoveryCredentials('' as any);

    expect(vaultClient.fetch_secrets_from_edge_vault)
      .not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should log error and return undefined when vault throws', async () => {
    vaultClient.fetch_secrets_from_edge_vault.mockRejectedValue(
      new Error('vault down'),
    );

    const result = await fetchDiscoveryCredentials('vault/path');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching secrets from vault'),
    );
    expect(result).toBeUndefined();
  });
});
