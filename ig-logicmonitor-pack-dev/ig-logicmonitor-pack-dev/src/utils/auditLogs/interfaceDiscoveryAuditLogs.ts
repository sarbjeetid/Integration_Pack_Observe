import { auditLog } from '../external-apis/core-apis';
import winston from 'winston';
import { Container } from 'typedi';

export const deviceDatasourceDiscoveryInterfaceAuditLogs = async ({
     status,
     url,
     deviceId,
     dataSourceNames = [],
     totalDataSourceCount = 0,
     errMessage = ''
}: {
     status: number;
     url: string;
     deviceId: string;
     dataSourceNames?: string[];
     totalDataSourceCount?: number;
     errMessage?: string;
}) => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');

     const auditLogData =
          status === 200
               ? {
                    timestamp: new Date().toISOString(),
                    status: 'Success',
                    details: {
                         message: `Device DataSource Discovery succeeded for Device ID: ${deviceId} with Status Code: ${status}`,
                         URL: url,
                         Device_ID: deviceId,
                         Total_DataSource_Count: totalDataSourceCount,
                         DataSource_Names: dataSourceNames,
                    }
               }
               : {
                    timestamp: new Date().toISOString(),
                    status: 'Failure',
                    details: {
                         message: `Device DataSource Discovery failed for Device ID: ${deviceId} with Status Code: ${status}. Error: ${errMessage}`,
                         URL: url,
                         Device_ID: deviceId
                    }
               };

     try {
          await auditLog(auditLogData, 'Logicmonitor Device DataSource Discovery');
     } catch (error) {
          loggerInstance.error('Failed to log audit for Device DataSource Discovery', error);
     }
};

export const deviceDatasourceInstanceDiscoveryInterfaceAuditLog = async ({
     status,
     url,
     deviceId,
     deviceDataSourceId,
     dataSourceInstanceNames = [],
     totalDataSourceInstanceCount = 0,
     errMessage = ''
}: {
     status: number;
     url: string;
     deviceId: string;
     deviceDataSourceId: string;
     dataSourceInstanceNames?: string[];
     totalDataSourceInstanceCount?: number;
     errMessage?: string;
}) => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');

     let auditLogData;

     if (status === 200 && totalDataSourceInstanceCount === 0) {
          // No instances found, still successful but worth logging differently
          auditLogData = {
               timestamp: new Date().toISOString(),
               status: 'Success',
               details: {
                    message: `Logicmonitor DataSource Instance Discovery completed with status 200, but no instances were found.`,
                    URL: url,
                    Device_ID: deviceId,
                    DataSource_ID: deviceDataSourceId,
                    Total_Instance_Count: 0
               }
          };
     } else if (status === 200) {
          // Successful discovery with instances
          auditLogData = {
               timestamp: new Date().toISOString(),
               status: 'Success',
               details: {
                    message: `Logicmonitor DataSource Instance Discovery is successful with status 200.`,
                    URL: url,
                    Device_ID: deviceId,
                    DataSource_ID: deviceDataSourceId,
                    DataSource_Instance_Names: dataSourceInstanceNames,
                    Total_Instance_Count: totalDataSourceInstanceCount
               }
          };
     } else {
          // Failure case
          auditLogData = {
               timestamp: new Date().toISOString(),
               status: 'Failure',
               details: {
                    message: `Logicmonitor DataSource Instance Discovery failed. Status: ${status}. Error: ${errMessage}`,
                    URL: url,
                    Device_ID: deviceId,
                    DataSource_ID: deviceDataSourceId
               }
          };
     }
     try {
          await auditLog(auditLogData, 'Logicmonitor DataSource Instance Discovery');
     } catch (error) {
          loggerInstance.error('Failed to log audit for Logicmonitor Device DataSource Instance Discovery', error);
     }
};

