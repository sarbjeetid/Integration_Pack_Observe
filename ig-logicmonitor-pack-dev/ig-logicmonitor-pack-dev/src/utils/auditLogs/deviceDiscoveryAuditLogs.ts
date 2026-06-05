import { auditLog } from '../external-apis/core-apis';
import winston from 'winston';
import { Container } from 'typedi';

export const deviceDiscoveryAuditLogs = async ({
  status,
  url,
  deviceNames = [],
  totalDeviceCount = 0,
  errMessage = '',
}: {
  status: number;
  url: string;
  deviceNames?: string[];
  totalDeviceCount?: number;
  errMessage?: string;
}) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');

  const auditLogData =
    status === 200
      ? {
        timestamp: new Date().toISOString(),
        status: 'Success',
        details: {
          message: `Logicmonitor Device Discovery Is Successful With Status Code: ${status}`,
          URL: url,
          Total_Device_Count: totalDeviceCount,
          Device_Names: deviceNames
        },
      }
      : {
        timestamp: new Date().toISOString(),
        status: 'Failure',
        details: {
          URL: url,
          message: `Logicmonitor Device Discovery Failed. Status Code: ${status}. Error Message is: ${errMessage}`,
        },
      };
  try {
    await auditLog(auditLogData, 'Logicmonitor Device Discovery');
  } catch (error) {
    loggerInstance.error('Failed to log audit for Logicmonitor Device Discovery', error);
  }
};
