import {
  getRegisteredIncident,
  registerIncident,
  markIncidentPending,
  clearIncidentPending,
  isIncidentPending,
} from '../../src/utils/incidentRegistry';
import { getRedisClient } from '../../src/loaders/redisConnect';

jest.mock('../../src/loaders/redisConnect');

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);
});

describe('incidentRegistry', () => {
  const scenarioId = 'SCN123';

  describe('getRegisteredIncident', () => {
    it('returns null when no incident exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getRegisteredIncident(scenarioId);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(
        `observe:incident:scenario:${scenarioId}`
      );
    });

    it('returns parsed incident when valid JSON exists', async () => {
      const storedIncident = {
        incidentNumber: 'INC100',
        sysId: 'SYS100',
        createdAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedIncident));

      const result = await getRegisteredIncident(scenarioId);

      expect(result).toEqual(storedIncident);
    });

    it('returns null when stored data is invalid JSON', async () => {
      mockRedis.get.mockResolvedValue('INVALID_JSON');

      const result = await getRegisteredIncident(scenarioId);

      expect(result).toBeNull();
    });
  });

  describe('registerIncident', () => {
    it('stores incident data in Redis', async () => {
      const incidentNumber = 'INC200';
      const sysId = 'SYS200';

      await registerIncident(scenarioId, incidentNumber, sysId);

      expect(mockRedis.set).toHaveBeenCalledTimes(1);

      const [key, value] = mockRedis.set.mock.calls[0];

      expect(key).toBe(`observe:incident:scenario:${scenarioId}`);

      const parsedValue = JSON.parse(value);
      expect(parsedValue).toMatchObject({
        incidentNumber,
        sysId,
      });
      expect(parsedValue.createdAt).toBeDefined();
    });
  });

  describe('markIncidentPending', () => {
    it('sets pending key with TTL', async () => {
      await markIncidentPending(scenarioId);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `observe:incident:pending:${scenarioId}`,
        expect.any(String),
        { EX: 300 }
      );

      const [, value] = mockRedis.set.mock.calls[0];
      const parsedValue = JSON.parse(value);

      expect(parsedValue.startedAt).toBeDefined();
    });
  });

  describe('clearIncidentPending', () => {
    it('deletes pending key', async () => {
      await clearIncidentPending(scenarioId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `observe:incident:pending:${scenarioId}`
      );
    });
  });

  describe('isIncidentPending', () => {
    it('returns true when pending key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await isIncidentPending(scenarioId);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(
        `observe:incident:pending:${scenarioId}`
      );
    });

    it('returns false when pending key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await isIncidentPending(scenarioId);

      expect(result).toBe(false);
    });
  });
});
