import { fetchStackDocument, deleteNode, auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { axiosInstance } from '../../../src/utils/external-apis/core-auth';
import { Container } from 'typedi';
import winston from 'winston';

jest.mock('../../../src/utils/external-apis/core-auth', () => ({
  axiosInstance: {
    post: jest.fn(),
  },
}));

describe('coreApis utils', () => {
  let logger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
      if (key === 'loggerInstance') return logger;
      return undefined;
    });

    jest.clearAllMocks();
  });

  /* fetchStackDocument */
  describe('fetchStackDocument', () => {
    it('should return message when API succeeds', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          message: { stack: 'data' },
        },
      });

      const result = await fetchStackDocument('stack1', 'zone1');

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/packs/fetchStackDocument',
        {
          id: 'stack1',
          zone_id: 'zone1',
        },
      );
      expect(result).toEqual({ stack: 'data' });
    });

    it('should throw error when API returns success=false', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          message: 'Invalid stack',
        },
      });

      await expect(fetchStackDocument('stack1', 'zone1'))
        .rejects
        .toThrow('Invalid stack');
    });
  });

  /* deleteNode */

  describe('deleteNode', () => {
    it('should return true when status is not 400', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await deleteNode(['node1', 'node2']);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/discovery/core/discovery/deleteNodes',
        {
          sourceIds: ['node1', 'node2'],
        },
      );
      expect(result).toBe(true);
    });

    it('should return false when status is 400', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        status: 400,
      });

      const result = await deleteNode(['node1']);

      expect(result).toBe(false);
    });
  });

  /* auditLogApi */
  describe('auditLogApi', () => {
    const auditPayload = { user: 'atharv', entity: 'incident' };

    it('should return true and log info for status 200', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await auditLogApi(auditPayload, 'CREATE');

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/api/auditLogs/saveAuditLogs',
        {
          ...auditPayload,
          action: 'CREATE',
        },
      );
      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true and log info for status 201', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        status: 201,
      });

      const result = await auditLogApi(auditPayload, 'UPDATE');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false and log warn for non-200/201 status', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({
        status: 400,
      });

      const result = await auditLogApi(auditPayload, 'DELETE');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Audit log failed'),
        expect.objectContaining({
          path: expect.any(String),
        }),
      );
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      (axiosInstance.post as jest.Mock).mockRejectedValue({
        message: 'Network error',
        response: {
          status: 500,
          data: { message: 'Internal error' },
        },
        stack: 'stacktrace',
      });

      const result = await auditLogApi(auditPayload, 'CREATE');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error while sending audit log'),
        expect.objectContaining({
          path: expect.any(String),
          auditLogPayload: auditPayload,
        }),
      );
      expect(result).toBe(false);
    });
  });
});
