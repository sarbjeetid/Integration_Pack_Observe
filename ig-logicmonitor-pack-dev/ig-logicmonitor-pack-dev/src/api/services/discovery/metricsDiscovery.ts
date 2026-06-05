import { Container } from 'typedi';
import winston from 'winston';
import { LogicMonitorDiscoveryRequestFullI, LogicmonitorMetricI } from '../../../interfaces/discovery';
import path from "path";
import * as https from 'https';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import { publishToDIS } from '../../../utils/publishToDIS';
import config from '../../../config';
import sleep from '../../../utils/sleep';
import { deviceDatasourceDiscoveryAuditLogs, deviceDatasourceInstanceDiscoveryAuditLog, metricUnitDiscoveryAuditLog } from '../../../utils/auditLogs/metricDiscoveryAuditLogs';
export const metricsDiscoveryService = async (doc: LogicMonitorDiscoveryRequestFullI, contextId: string, deviceId: string, deviceType: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const baseWaitTime = 1000; // Start with 1 second
    let dynamicWaitTime = baseWaitTime;
    try {
        // Use actual credentials
        const accessId = doc.access_id;
        const accessKey: any = doc.access_key;
        const accountName = doc.account_name;

        const deviceDataSources = await getDeviceDataSources(accessId, accessKey, accountName, deviceId);

        // Check if an error occurred
        if (!Array.isArray(deviceDataSources)) {
            loggerInstance.error(`Error fetching device data sources: ${deviceDataSources.error}`);
            return;
        }

        if (!deviceDataSources || deviceDataSources.length === 0) {
            return;
        }
        const metricsDocumentsToSendToDIS: any = [];
        for (let deviceDataSource of deviceDataSources) {
            const deviceDataSourceId = deviceDataSource.deviceDataSourceId;
            await sleep(dynamicWaitTime); // Initial delay before fetching instances
            const dataSourceInstances = await getDataSourceInstances(accessId, accessKey, accountName, deviceId, deviceDataSourceId);

            // Check if an error occurred
            if (!Array.isArray(dataSourceInstances)) {
                loggerInstance.error(`Error fetching device data sources: ${dataSourceInstances.error}`);
                return;
            }
            if (!dataSourceInstances || dataSourceInstances.length === 0) {
                continue;
            }

            // To get each graph of device datasources to be mapped with each instances of data sources
            for (let graph of deviceDataSource.graphs) {
                for (let instance of dataSourceInstances) {
                    await sleep(dynamicWaitTime);
                    let { unit: unitOfMetrics, rateLimited } = await getUnitForMetrices(
                        deviceId, deviceDataSourceId, graph.graphId, instance.instanceId, accessId, accessKey, accountName
                    );
                    // If rate limited,
                    dynamicWaitTime = adjustWaitTime(rateLimited, dynamicWaitTime, deviceId, deviceDataSource.deviceDataSourceId, instance.instanceId);

                    metricsDocumentsToSendToDIS.push(
                        createMetricDocument(doc, deviceId, deviceType, deviceDataSource, graph, instance, unitOfMetrics)
                    );
                }
            }
        }
        // Send metric document to DIS APIs
        await publishToDIS(metricsDocumentsToSendToDIS, 'metric');

    } catch (err) {
        loggerInstance.error(`[src::api::services::discovery::metricDiscovery.ts::metricsDiscoveryService] Error in metricsDiscoveryService ${err}`, { path: path.relative(process.cwd(), __filename) });
        return { error: 'Error in metricsDiscoveryService', data: err };
    }
};

// Helper function to adjust wait time for rate limiting
const adjustWaitTime = (rateLimited: boolean, currentWaitTime: number, deviceId: string, deviceDataSourceId: string, instanceId: string): number => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    if (rateLimited) {
        const newWaitTime = Math.min(currentWaitTime * 2, 30000); // Exponential backoff, cap at 30s
        loggerInstance.warn(`Rate limit hit, increasing delay to ${newWaitTime}ms for device: ${deviceId}, deviceDataSourceId: ${deviceDataSourceId}, instanceId: ${instanceId}`);
        return newWaitTime;
    }
    return 1000; // Reset to base wait time on success
};

// Helper function to create metric document
const createMetricDocument = (
    doc: LogicMonitorDiscoveryRequestFullI, deviceId: string, deviceType: string,
    deviceDataSource: any, graph: any, instance: any, unitOfMetrics: string
): LogicmonitorMetricI => ({
    id: deviceId,
    importance: 'low',
    source: 'logicmonitor',
    citype: deviceType,
    source_type: deviceType,
    is_monitored: true,
    name: `${instance.instanceName}::${graph.graphName}`,
    stack_id: doc.stack_id,
    zone_id: doc.zone_id,
    unit: unitOfMetrics,
    default_aggregation: 'Average',
    supported_aggregations: ['Average', 'Minimum', 'Maximum', 'Standard Deviation'],
    source_properties: {
        deviceId: deviceId,
        deviceDataSourceId: deviceDataSource.deviceDataSourceId,
        dataSourceName: deviceDataSource.dataSourceName,
        dataSourceDescription: deviceDataSource.dataSourceDescription,
        graphId: graph.graphId,
        graphName: graph.graphName,
        graphTitle: graph.graphTitle,
        instanceId: instance.instanceId,
        instanceName: instance.instanceName,
        instanceDisplayName: instance.instanceDisplayName,
        instanceDescription: instance.instanceDescription,
    },
});


async function fetchDeviceDataSources(url: string, options: {
    method: string;
    headers: {
        'Content-Type': string;
        Authorization: string;
    }
}): Promise<any[]> {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    return new Promise<any[]>((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                // Parse JSON response
                try {
                    const response = JSON.parse(responseData);
                    resolve(response);
                } catch (error) {
                    loggerInstance.error(`Error parsing JSON response for deviceDataSources:', ${error}`);
                    resolve([]);
                }
            });
        });

        req.on('error', (error) => {
            loggerInstance.error('Error in req deviceDataSources:', error);
            reject(error);
        });

        req.end();
    });
}

function extractDeviceDataSources(response: any): any[] {
    if (response && response.data && Array.isArray(response.data.items) && response.data.items.length !== 0) {
        return response.data.items.map((item: any) => ({
            deviceDataSourceId: item.id || '',
            dataSourceName: item.dataSourceName || '',
            dataSourceDescription: item.dataSourceDescription || '',
            graphs: item.graphs ? item.graphs.map((graph: any) => ({
                graphId: graph.id || '',
                graphName: graph.name || '',
                graphTitle: graph.title || '',
            })) : []
        }));
    }
    return [];
}

async function getDeviceDataSources(accessId: string | undefined, accessKey: any, accountName: string | undefined, deviceId: string) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        // Request Info
        const httpVerb = 'GET';
        const data = '';

        // For pagination support
        const pageSize =  config.pageSize || 10; // Define the number of deviceDataSources per page
        let offset = 0; // Initial offset

        let hasMoreDeviceDataSources = true;

        const allDeviceDataSources: any[] = [];

        // Iterate until all devices are fetched
        while (hasMoreDeviceDataSources) {
            const resourcePath = `/device/devices/${deviceId}/devicedatasources`;
            // Construct URL
            const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}?size=${pageSize}&offset=${offset}`;

            const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);


            // Make request
            const options = {
                method: 'GET',
                headers: headers
            };

            const response: any = await fetchDeviceDataSources(url, options);
            const status = response?.status || 500;
            const errMessage = response?.errmsg || 'Unknown Error Occured';
            const deviceDataSources = extractDeviceDataSources(response);
            const dataSourceNames = deviceDataSources.map((ds: any) => ds.dataSourceName);

            // Audit log for this API call
            await deviceDatasourceDiscoveryAuditLogs({ status, url, deviceId, dataSourceNames, totalDataSourceCount: deviceDataSources.length, errMessage });
            
            if (deviceDataSources.length < pageSize) {
                hasMoreDeviceDataSources = false;
            } else {
                offset += pageSize;
            }
            allDeviceDataSources.push(...deviceDataSources); //Push all datasources
            await sleep(config.waitTimeinMs);
        }
        return allDeviceDataSources;

    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::metricDiscovery.ts::getDeviceDataSources] Error in getDeviceDataSources: ${error}`);
        return {
            error: 'Error in getDeviceDataSources',
            data: error
        };
    }
}

async function fetchDataSourceInstances(url: string, options: {
    method: string;
    headers: {
        'Content-Type': string;
        Authorization: string;
    }
}): Promise<{ status: number, errMessage: string, items: any[] }> {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    return new Promise<{ status: number, errMessage: string, items: any[] }>((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    const status = response.status || 500;
                    const errMessage = response.errmsg || 'Unknown Error Occured';
                    const items = Array.isArray(response.data?.items) ? response.data.items : [];

                    resolve({ status, errMessage, items });
                } catch (error) {
                    loggerInstance.error(`Error parsing JSON response: ${error}`);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            loggerInstance.error(`Error in request: ${error}`);
            reject(error);
        });
        req.end();
    });
}

function extractRequiredDataSourceInstances(items: any[]): any[] {
    return items.map((item: any) => ({
        instanceId: item.id || '',
        instanceName: item.name || '',
        instanceDisplayName: item.displayName || '',
        instanceDescription: item.description || '',
    }));
}

async function getDataSourceInstances(accessId: string | undefined, accessKey: any, accountName: string | undefined, deviceId: string, deviceDataSourceId: string) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        // Request Info
        const httpVerb = 'GET';
        const data = '';

        // For pagination support
        const pageSize =  config.pageSize || 10; // Define the number of deviceDataSources per page
        let offset = 0; // Initial offset

        let hasMoreDataSourceInstances = true;

        const allDataSourceInstances: any[] = [];

        // Iterate until all devices are fetched
        while (hasMoreDataSourceInstances) {
            const resourcePath = `/device/devices/${deviceId}/devicedatasources/${deviceDataSourceId}/instances`;
            // Construct URL
            const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}?size=${pageSize}&offset=${offset}`;

            const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);

            // Make request
            const options = {
                method: 'GET',
                headers: headers
            };

            const dataSourceInstancesResponse = await fetchDataSourceInstances(url, options);
            const { status, errMessage, items } = dataSourceInstancesResponse;

            const dataSourceInstancesRequired = extractRequiredDataSourceInstances(items);
            const dataSourceInstanceNames = dataSourceInstancesRequired.map(instance =>
                instance.instanceName || instance.instanceDisplayName || ''
            );
            await deviceDatasourceInstanceDiscoveryAuditLog({ status, url, deviceId, deviceDataSourceId, dataSourceInstanceNames, totalDataSourceInstanceCount: dataSourceInstancesRequired.length, errMessage });

            if (dataSourceInstancesRequired.length < pageSize) {
                hasMoreDataSourceInstances = false;
            } else {
                offset += pageSize;
            }

            allDataSourceInstances.push(...dataSourceInstancesRequired);
            await sleep(config.waitTimeinMs);
        }
        return allDataSourceInstances;

    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::metricDiscovery.ts::getDataSourceInstances] Error in getDataSourceInstances: ${error}`);
        return {
            error: 'Error in getDataSourceInstances',
            data: error
        };
    }
}

async function fetchMetricUnit(url: string, options: {
    method: string;
    headers: {
        'Content-Type': string;
        Authorization: string;
    }
},
    logContext: {
        deviceId: any;
        deviceDataSourceId: number;
        instanceId: number;
        graphId: number;
    }
): Promise<{ unit: string; rateLimited: boolean }> {
    return new Promise((resolve, reject) => {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', chunk => responseData += chunk);
            res.on('end', async () => {
                const { statusCode } = res;

                if (statusCode === 429) {
                    loggerInstance.warn(`[fetchMetricUnit] Rate limited (429)`);
                    await metricUnitDiscoveryAuditLog({
                        ...logContext,
                        url,
                        status: statusCode!,
                        unit: 'default',
                        errMessage: 'Rate limited',
                    });
                    return resolve({ unit: 'default', rateLimited: true });
                }

                if (statusCode !== 200) {
                    loggerInstance.error(`[fetchMetricUnit] Non-200: ${statusCode}, Body: ${responseData}`);
                    await metricUnitDiscoveryAuditLog({
                        ...logContext,
                        url,
                        status: statusCode!,
                        unit: 'default',
                        errMessage: responseData,
                    });
                    return reject(new Error(`HTTP ${statusCode}: ${responseData}`));
                }

                try {
                    const response = JSON.parse(responseData);
                    const unit = response?.data?.verticalLabel || 'default';

                    await metricUnitDiscoveryAuditLog({
                        ...logContext,
                        url,
                        status: statusCode!,
                        unit,
                    });
                    resolve({ unit, rateLimited: false });
                } catch (err) {
                    loggerInstance.error(`[fetchMetricUnit] JSON parse error: ${err}`);
                    await metricUnitDiscoveryAuditLog({
                        ...logContext,
                        url,
                        status: statusCode!,
                        unit: 'default',
                        errMessage: 'Invalid JSON',
                    });
                    reject(err);
                }
            });
        });

        req.on('error', async (err) => {
            loggerInstance.error(`[fetchMetricUnit] Request failed: ${err}`);
            await metricUnitDiscoveryAuditLog({
                ...logContext,
                url,
                status: 500,
                unit: 'default',
                errMessage: err.message,
            });
            reject(err);
        });

        req.end();
    });
}

export async function getUnitForMetrices(
    deviceId: any, 
    deviceDataSourceId: number, 
    graphId: number, 
    instanceId: number, 
    accessId: string | undefined, 
    accessKey: any, 
    accountName: string | undefined
): Promise<{ unit: string; rateLimited: boolean }> {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const maxRetries = 3;
    let retryCount = 0;
    let delay = 1000;

    const httpVerb = 'GET';
    const resourcePath = `/device/devices/${deviceId}/devicedatasources/${deviceDataSourceId}/instances/${instanceId}/graphs/${graphId}/data`;
    const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}`;
    const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, '');
    const options = { method: 'GET', headers };

    const logContext = { deviceId, deviceDataSourceId, instanceId, graphId };

    while (retryCount < maxRetries) {
        try {
            const result = await fetchMetricUnit(url, options, logContext);
            if (result.rateLimited) {
                await sleep(delay);
                delay = Math.min(delay * 2, 30000); // exponential backoff
                retryCount++;
                continue;
            }
            return result;
        } catch (error: any) {
            retryCount++;
            delay = Math.min(delay * 2, 30000);
            loggerInstance.warn(`[getUnitForMetrices] Attempt ${retryCount} failed: ${error.message}. Retrying in ${delay.toFixed(0)}ms...`);
            if (retryCount < maxRetries) await sleep(delay);
        }
    }

    loggerInstance.error(`[getUnitForMetrices] Max retries reached. Returning default value.`);
    return { unit: 'default', rateLimited: false };
}
