import { Request, Response } from 'express';
import { Container } from 'typedi';
import winston from 'winston';

import {
  startDiscoveryController,
  listResourcesController,
  describeResourceController,
  describeAllResourcesController,
  describeAllRelationshipsController,
  verifyCreateStack,
} from '../../src/controllers/discoveryController';

import { fetchDiscoveryCredentials } from '../../src/services/secretsManager';
import { fetchStackDocument } from '../../src/utils/external-apis';
import { startDiscoveryService } from '../../src/services/discovery/startDiscoveryService';
import { listResourcesService } from '../../src/services/discovery/listResourcesService';
import { describeResourceService } from '../../src/services/discovery/describeResourceService';
import { describeAllNodesService } from '../../src/services/discovery/describeAllNodesService';
import { describeAllRelationshipsService } from '../../src/services/discovery/describeAllRelationshipsService';

jest.mock('../../src/services/secretsManager');
jest.mock('../../src/utils/external-apis');
jest.mock('../../src/services/discovery/startDiscoveryService');
jest.mock('../../src/services/discovery/listResourcesService');
jest.mock('../../src/services/discovery/describeResourceService');
jest.mock('../../src/services/discovery/describeAllNodesService');
jest.mock('../../src/services/discovery/describeAllRelationshipsService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-context-id'),
}));

describe('Discovery Controllers – Complete Coverage', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let logger: winston.Logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockReturnValue(logger);

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* startDiscoveryController */

  describe('startDiscoveryController', () => {
    beforeEach(() => {
      req = {
        body: {
          vault_path: 'vault/path',
          stack_id: 'stack123',
          zone_id: 'zone123',
        },
      };
    });

    it('should start discovery with url and query', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      (fetchStackDocument as jest.Mock).mockResolvedValue({
        metadata: {
          url: 'https://sn.instance',
          query: 'sys_class_name=cmdb_ci',
        },
      });

      await startDiscoveryController(req as Request, res as Response);

      expect(fetchDiscoveryCredentials).toHaveBeenCalledWith('vault/path');
      expect(fetchStackDocument).toHaveBeenCalledWith('stack123', 'zone123');

      expect(startDiscoveryService).toHaveBeenCalledTimes(1);
      expect(startDiscoveryService).toHaveBeenCalledWith(
        {
          url: 'https://sn.instance',
          username: 'user',
          password: 'pass',
          zone_id: 'zone123',
          stack_id: 'stack123',
          query: 'sys_class_name=cmdb_ci',
        },
        'mock-context-id',
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        error: null,
        data: {
          message: 'Discovery started',
          discoveryContextID: 'mock-context-id',
        },
      });
    });

    it('should start discovery when only url exists', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      (fetchStackDocument as jest.Mock).mockResolvedValue({
        metadata: {
          url: 'https://sn.instance',
        },
      });

      await startDiscoveryController(req as Request, res as Response);

      expect(startDiscoveryService).toHaveBeenCalledWith(
        {
          url: 'https://sn.instance',
          username: 'user',
          password: 'pass',
          zone_id: 'zone123',
          stack_id: 'stack123',
        },
        'mock-context-id',
      );
    });

    it('should NOT start discovery when secrets are null', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue(null);

      await startDiscoveryController(req as Request, res as Response);

      expect(startDiscoveryService).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should NOT start discovery when username missing', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        password: 'pass',
      });

      await startDiscoveryController(req as Request, res as Response);

      expect(startDiscoveryService).not.toHaveBeenCalled();
    });

    it('should NOT start discovery when password missing', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
      });

      await startDiscoveryController(req as Request, res as Response);

      expect(startDiscoveryService).not.toHaveBeenCalled();
    });

    it('should start discovery even if metadata is missing', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      (fetchStackDocument as jest.Mock).mockResolvedValue({});

      await startDiscoveryController(req as Request, res as Response);

      expect(startDiscoveryService).toHaveBeenCalledWith(
        {
          url: undefined,
          username: 'user',
          password: 'pass',
          zone_id: 'zone123',
          stack_id: 'stack123',
        },
        'mock-context-id',
      );
    });

    it('should return 500 if fetchDiscoveryCredentials throws', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockRejectedValue(
        new Error('vault error'),
      );

      await startDiscoveryController(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(startDiscoveryService).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 if fetchStackDocument throws', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      (fetchStackDocument as jest.Mock).mockRejectedValue(
        new Error('stack error'),
      );

      await startDiscoveryController(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(startDiscoveryService).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 if startDiscoveryService throws', async () => {
      (fetchDiscoveryCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      (fetchStackDocument as jest.Mock).mockResolvedValue({
        metadata: { url: 'https://sn.instance' },
      });

      (startDiscoveryService as jest.Mock).mockImplementation(() => {
        throw new Error('service error');
      });

      await startDiscoveryController(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* listResourcesController*/

  describe('listResourcesController', () => {
    it('should call listResourcesService and return ok', async () => {
      req = {
        body: {
          body: { a: 1 },
          className: 'cmdb_ci',
          contextId: 'ctx1',
        },
      };

      await listResourcesController(req as Request, res as Response);

      expect(listResourcesService).toHaveBeenCalledWith(
        { a: 1 },
        'cmdb_ci',
        'ctx1',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ error: null, message: 'ok' });
    });

    it('should still return ok on error', async () => {
      (listResourcesService as jest.Mock).mockRejectedValue(new Error());

      req = {
        body: {
          body: {},
          className: 'cmdb_ci',
          contextId: 'ctx1',
        },
      };

      await listResourcesController(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ error: null, message: 'ok' });
    });
  });

  /*describeResourceController*/

  describe('describeResourceController', () => {
    it('should call describeResourceService', async () => {
      req = {
        body: {
          body: {},
          className: 'cmdb_ci',
          resourceId: 'res1',
          contextId: 'ctx1',
        },
      };

      await describeResourceController(req as Request, res as Response);

      expect(describeResourceService).toHaveBeenCalledWith(
        {},
        'cmdb_ci',
        'res1',
        'ctx1',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should swallow errors and return ok', async () => {
      (describeResourceService as jest.Mock).mockRejectedValue(new Error());

      await describeResourceController(req as Request, res as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ error: null, message: 'ok' });
    });
  });

  /* describeAllResourcesController*/

  describe('describeAllResourcesController', () => {
    it('should call describeAllNodesService', async () => {
      req = {
        body: {
          body: {},
          className: 'cmdb_ci',
          contextId: 'ctx1',
        },
      };

      await describeAllResourcesController(req as Request, res as Response);

      expect(describeAllNodesService).toHaveBeenCalledWith(
        {},
        'cmdb_ci',
        'ctx1',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  /*  describeAllRelationshipsController*/

  describe('describeAllRelationshipsController', () => {
    it('should call describeAllRelationshipsService', async () => {
      req = {
        body: {
          body: {},
          className: 'cmdb_ci',
          nodeIds: ['n1', 'n2'],
          contextId: 'ctx1',
        },
      };

      await describeAllRelationshipsController(req as Request, res as Response);

      expect(describeAllRelationshipsService).toHaveBeenCalledWith(
        {},
        'cmdb_ci',
        ['n1', 'n2'],
        'ctx1',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  /*  verifyCreateStack */

  describe('verifyCreateStack', () => {
    it('should return verified', async () => {
      req = {
        body: {
          url: 'https://example.com',
          vault_path: 'vault/path',
        },
      };

      await verifyCreateStack(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        error: null,
        message: 'verified',
      });
    });
  });
});
