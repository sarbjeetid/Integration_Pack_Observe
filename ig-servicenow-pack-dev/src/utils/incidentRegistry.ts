// incidentRegistry.ts
import { getRedisClient } from '../loaders/redisConnect';

const INCIDENT_KEY = (scenarioId: string) =>
  `observe:incident:scenario:${scenarioId}`;

const PENDING_KEY = (scenarioId: string) =>
  `observe:incident:pending:${scenarioId}`;

export interface RegisteredIncident {
  incidentNumber: string;
  sysId: string;
  createdAt: string;
}

export const getRegisteredIncident = async (
  scenarioId: string
): Promise<RegisteredIncident | null> => {
  const redis = await getRedisClient();
  const data = await redis.get(INCIDENT_KEY(scenarioId));

  if (!data) return null;

  try {
    return JSON.parse(data) as RegisteredIncident;
  } catch {
    // Corrupt or unexpected data — treat as non-existent
    return null;
  }
};

export const registerIncident = async (
  scenarioId: string,
  incidentNumber: string,
  sysId: string
): Promise<void> => {
  const redis = await getRedisClient();

  await redis.set(
    INCIDENT_KEY(scenarioId),
    JSON.stringify({
      incidentNumber,
      sysId,
      createdAt: new Date().toISOString(),
    })
    // TTL intentionally omitted — incidents are long-lived
  );
};

export const markIncidentPending = async (scenarioId: string): Promise<void> => {
  const redis = await getRedisClient();

  await redis.set(
    PENDING_KEY(scenarioId),
    JSON.stringify({ startedAt: Date.now() }),
    { EX: 300 } // 5 minutes safety window
  );
};

export const clearIncidentPending = async (
  scenarioId: string
): Promise<void> => {
  const redis = await getRedisClient();
  await redis.del(PENDING_KEY(scenarioId));
};

export const isIncidentPending = async (
  scenarioId: string
): Promise<boolean> => {
  const redis = await getRedisClient();
  return (await redis.exists(PENDING_KEY(scenarioId))) === 1;
};
