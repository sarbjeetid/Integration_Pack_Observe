// incidentLock.ts
import { getRedisClient } from '../loaders/redisConnect';

const LOCK_KEY = (scenarioId: string) =>
  `observe:incident:lock:${scenarioId}`;

export const acquireIncidentLock = async (
  scenarioId: string
): Promise<boolean> => {
  const redis = await getRedisClient();

  const result = await redis.set(
    LOCK_KEY(scenarioId),
    'locked',
    {
      NX: true,
      EX: 60, // Auto-release in case of crash
    }
  );

  return result === 'OK';
};

export const releaseIncidentLock = async (
  scenarioId: string
): Promise<void> => {
  const redis = await getRedisClient();
  await redis.del(LOCK_KEY(scenarioId));
};
