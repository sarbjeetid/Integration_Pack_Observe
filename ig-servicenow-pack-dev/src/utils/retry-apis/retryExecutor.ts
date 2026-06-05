import { Container } from 'typedi';
import winston from 'winston';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const executeWithRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    baseDelayMs?: number;
    operationName: string;
  }
): Promise<T> => {
  const {
    retries = 4,
    baseDelayMs = 1000,
    operationName,
  } = options;

  const loggerInstance: winston.Logger = Container.get('loggerInstance');

  let lastError: any;

  loggerInstance.info(`[${operationName}] Starting operation with up to ${retries} attempts`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        loggerInstance.info(`[${operationName}] Retry attempt ${attempt}/${retries}`);
      }

      const result = await fn();

      if (attempt > 1) {
        loggerInstance.info(`[${operationName}] Succeeded on attempt ${attempt}`);
      }

      return result;
    } catch (err: any) {
      lastError = err;

      const status = err?.response?.status;
      const isTimeout =
        err?.code === 'ECONNABORTED' ||
        err?.message?.toLowerCase()?.includes('timeout');

      const isRetryable =
        isTimeout || !status || status >= 500;

      if (attempt === retries || !isRetryable) {
        loggerInstance.error(
          `[${operationName}] Failed after ${attempt} attempts`,
          {
            status,
            isTimeout,
            message: err?.message,
          }
        );
        break;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      loggerInstance.warn(
        `[${operationName}] Attempt ${attempt} failed. Retrying in ${delay}ms`,
        {
          status,
          isTimeout,
          message: err?.message,
        }
      );

      await sleep(delay);
    }
  }

  throw lastError;
};
