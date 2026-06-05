import { getRedisClient } from '../loaders/redisConnect';

const REASSIGNMENT_SCHEDULE_KEY = (scenarioId: string) =>
  `observe:reassignment:schedule:${scenarioId}`;

export const getReassignmentScheduleId = async (
  scenarioId?: string
): Promise<string | null> => {
  if (!scenarioId) return null;

  const redis = await getRedisClient();
  return redis.get(REASSIGNMENT_SCHEDULE_KEY(scenarioId));
};

export const registerReassignmentSchedule = async (
  scenarioId: string | undefined,
  scheduleId: string | undefined
): Promise<void> => {
  if (!scenarioId || !scheduleId) return;

  const redis = await getRedisClient();
  await redis.set(REASSIGNMENT_SCHEDULE_KEY(scenarioId), scheduleId);
};
