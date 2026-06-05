import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import { LogicMonitorDiscoveryRequestFullI, LogicmonitorInterfaceI } from '../../../interfaces/discovery';
import { publishToDIS } from '../../../utils/publishToDIS';
import sleep from '../../../utils/sleep';
import { deviceDatasourceDiscoveryInterfaceAuditLogs, deviceDatasourceInstanceDiscoveryInterfaceAuditLog } from '../../../utils/auditLogs/interfaceDiscoveryAuditLogs';
import https from 'https';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import config from '../../../config';
import { fetchStackDocument, markInterfaceDiscoverySuccessCore } from '../../../utils/external-apis';
function toEpochSecondsFromDateLike(d: any): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

// Pulls baseline from stack.last_successful_interface_discovery_timestamp.
// If absent/invalid => null (meaning: do NOT filter this run).
function getDiscoveryBaselineEpoch(stackDoc: any): number | null {
  return toEpochSecondsFromDateLike(stackDoc?.last_successful_interface_discovery_timestamp) ?? null;
}

export const interfaceDiscoveryService = async (doc: LogicMonitorDiscoveryRequestFullI, contextId: string, deviceId: string) => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const baseWaitTime = 1000;
  let dynamicWaitTime = baseWaitTime;

  try {
    // Use actual credentials
    const accessId = doc.access_id;
    const accessKey: any = doc.access_key;
    const accountName = doc.account_name;
    const stackId = doc.stack_id;
    const zoneId = doc.zone_id;
    const rediscovery = doc?.rediscovery
    loggerInstance.info(`Rediscovery variable inside interfaceDiscovery is ${rediscovery}`);

    // Fetch Interface Instances
    const deviceDataSources = await getDeviceDataSources(accessId, accessKey, accountName, deviceId, stackId, zoneId, rediscovery);

    if (!Array.isArray(deviceDataSources)) {
      loggerInstance.error(`Error fetching device data sources: ${deviceDataSources?.error}`);
      return;
    }

    if (!deviceDataSources || deviceDataSources.length === 0) {
      return;
    }

    const snmpNetworkInterfacesDataSources = deviceDataSources.filter(items => items.dataSourceName === 'SNMP_Network_Interfaces');

    const interfaceNodeDocuments: any[] = [];
    for (let deviceDataSource of snmpNetworkInterfacesDataSources) {
      const deviceDataSourceId = deviceDataSource.deviceDataSourceId;
      await sleep(dynamicWaitTime);
      const dataSourceInstances = await getDataSourceInstances(accessId, accessKey, accountName, deviceId, deviceDataSourceId);
     
      // Check if an error occurred
      if (!Array.isArray(dataSourceInstances)) {
        loggerInstance.error(`Error fetching device data sources: ${dataSourceInstances.error}`);
        return;
      }
      if (!dataSourceInstances || dataSourceInstances.length === 0) {
        continue;
      }

      for (const instance of dataSourceInstances) {
        dynamicWaitTime = adjustWaitTime(dynamicWaitTime, deviceId, deviceDataSource.deviceDataSourceId, instance.instanceId);
        const interfaceNode = createInterfaceDocument(doc, instance);
        await publishToDIS(interfaceNode, 'ci');
        interfaceNodeDocuments.push(
          interfaceNode
        );
      }
    }
    const interfaceRelationships = createNodeInterfaceRelationships(interfaceNodeDocuments, deviceId, contextId);

    await publishToDIS(interfaceRelationships, 'relationship');

    loggerInstance.info(`Interface discovery published for device ${deviceId}`);
  } catch (err) {
    loggerInstance.error(
      `[src::api::services::discovery::interfaceDiscovery.ts::interfaceDiscoveryService] Error: ${err}`,
      { path: path.relative(process.cwd(), __filename) }
    );
    return { error: 'Error in interfaceDiscoveryService', data: err };
  }
}

const adjustWaitTime = (currentWaitTime: number, deviceId: string, deviceDataSourceId: string, instanceId: string): number => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const rateLimited = false;
  if (rateLimited) {
    const newWaitTime = Math.min(currentWaitTime * 2, 30000); // Exponential backoff
    loggerInstance.warn(`Rate limit hit, increasing delay to ${newWaitTime}ms for device: ${deviceId}, deviceDataSourceId: ${deviceDataSourceId}, instanceId: ${instanceId}`);
    return newWaitTime;
  }

  return 1000; // Reset to base wait time
};


const createInterfaceDocument = (
  doc: LogicMonitorDiscoveryRequestFullI, instance: any,
): LogicmonitorInterfaceI => ({
  id: `${String(instance.deviceId)}.${String(instance.instanceId)}`,
  citype: "network_interface",
  source_type: "network_interface",
  source_name: instance.displayName || instance.instanceName || `interface-${instance.id}`,
  stack_id: doc.stack_id,
  zone_id: doc.zone_id,
  type: "ci",
  label: "CI",
  properties: JSON.stringify({ source_properties: instance.instanceSourceProperties }),
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
      dataProperties: item,
    }));
  }
  return [];
}

async function getDeviceDataSources(
  accessId: string | undefined,
  accessKey: any,
  accountName: string | undefined,
  deviceId: string,
  stack_id: string,
  zone_id: string,
  rediscovery: string | undefined
) {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');

  try {
    let stackDoc: any;
    try {
      stackDoc = await fetchStackDocument(stack_id, zone_id);

      if (!stackDoc) {
        loggerInstance.warn(
          `No stack document found for stack_id=${stack_id}, zone_id=${zone_id}. Stopping discovery.`
        );
        return;
      }
    } catch (stackErr) {
      loggerInstance.error(
        `Failed to fetch stack document for stack_id=${stack_id}, zone_id=${zone_id}: ${stackErr}`
      );
      return;
    }


    // 2) baseline from last_successful_interface_discovery_timestamp (or null on first run)
    const baselineEpoch: number | null = getDiscoveryBaselineEpoch(stackDoc);
    if (baselineEpoch == null) {
      loggerInstance.info(`No last_successful_interface_discovery_timestamp found → NOT filtering deviceDataSources this run.`);
    } else {
      loggerInstance.info(
        `Using last_successful_interface_discovery_timestamp (${stackDoc.last_successful_interface_discovery_timestamp}) → epoch ${baselineEpoch} for deviceDataSources.`
      );
    }

    // 3) request setup
    const httpVerb = 'GET';
    const data = '';
    const pageSize = config.pageSize || 10;
    let offset = 0;
    let hasMoreDeviceDataSources = true;

    const collected: any[] = [];

    // 4) pagination loop
    while (hasMoreDeviceDataSources) {
      const resourcePath = `/device/devices/${deviceId}/devicedatasources`;
      const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}?size=${pageSize}&offset=${offset}`;
      const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);

      try {
        const response: any = await fetchDeviceDataSources(url, { method: httpVerb, headers });
        const status = response?.status || 500;
        const errMessage = response?.errmsg || 'Unknown Error Occurred';
        const deviceDataSources = extractDeviceDataSources(response);
        const dataSourceNames = deviceDataSources.map((ds: any) => ds.dataSourceName);

        // audit log
        await deviceDatasourceDiscoveryInterfaceAuditLogs({
          status,
          url,
          deviceId,
          dataSourceNames,
          totalDataSourceCount: deviceDataSources.length,
          errMessage,
        });

        if (!Array.isArray(deviceDataSources) || deviceDataSources.length === 0) {
          loggerInstance.info(`No deviceDataSources found for deviceId=${deviceId}, offset=${offset}`);
          hasMoreDeviceDataSources = false;
          break;
        }

        // 5) filter only when baseline exists; otherwise keep all
        let batchToKeep = deviceDataSources;
        if (baselineEpoch != null && rediscovery === "true") {
          batchToKeep = deviceDataSources.filter((ds: any) => {
            const createdOn = Number(ds.dataProperties?.createdOn);
            return Number.isFinite(createdOn) && createdOn > baselineEpoch;
          });

          loggerInstance.info(
            `Device ${deviceId}: kept ${batchToKeep.length}/${deviceDataSources.length} dataSources after baseline filter.`
          );
        } else {
          loggerInstance.info(
            `Device ${deviceId}: baseline absent → kept all ${deviceDataSources.length} dataSources (first/backfill run).`
          );
        }

        collected.push(...batchToKeep);

        // pagination
        if (deviceDataSources.length < pageSize) {
          hasMoreDeviceDataSources = false;
        } else {
          offset += pageSize;
        }

        await sleep(config.waitTimeinMs);
      } catch (pageErr) {
        loggerInstance.error(`Error fetching deviceDataSources for deviceId=${deviceId}, offset=${offset}: ${pageErr}`);
        hasMoreDeviceDataSources = false;
      }
    }

    loggerInstance.info(
      `Total ${collected.length} deviceDataSources returned for deviceId=${deviceId} (filtered=${baselineEpoch != null}).`
    );

    // return SAME SHAPE as before
    return collected;
  } catch (error) {
    loggerInstance.error(`[getDeviceDataSources] Error: ${error}`);
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
  return items.map((item: any) => {
    return {
      instanceId: item.id || '',
      instanceName: item.displayName || item.name || '',
      deviceId: item.deviceId || '',
      deviceDataSourceId: item.deviceDataSourceId || '',
      instanceSourceProperties: item,  // should be full object
    };
  });
}


async function getDataSourceInstances(accessId: string | undefined, accessKey: any, accountName: string | undefined, deviceId: string, deviceDataSourceId: string) {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  try {

    // Request Info
    const httpVerb = 'GET';
    const data = '';

    // For pagination support
    const pageSize = config.pageSize || 10; // Define the number of deviceDataSources per page
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
      await deviceDatasourceInstanceDiscoveryInterfaceAuditLog({ status, url, deviceId, deviceDataSourceId, dataSourceInstanceNames, totalDataSourceInstanceCount: dataSourceInstancesRequired.length, errMessage });

      if (!Array.isArray(items)) {
        loggerInstance.warn(`Invalid instance response structure for device ${deviceId}, dataSource ${deviceDataSourceId}`);
        break;
      }

      if (items.length < pageSize) {
        hasMoreDataSourceInstances = false;
      } else {
        offset += pageSize;
      }
      allDataSourceInstances.push(...dataSourceInstancesRequired);
      await sleep(config.waitTimeinMs);
    }
    return allDataSourceInstances;

  } catch (error) {
    loggerInstance.error(`[src::api::services::discovery::interfaceDiscovery.ts::getDataSourceInstances] Error in getDataSourceInstances: ${error}`);
    return {
      error: 'Error in getDataSourceInstances',
      data: error,
    };
  }
}


const createNodeInterfaceRelationships = (interfaceDocuments: any[], deviceId: string, contextId: string): any[] => {
  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const relationships: any[] = [];
  const uniquenessSet: Set<string> = new Set();

  try {

    if (!interfaceDocuments || interfaceDocuments.length === 0) {
      loggerInstance.warn(`[${contextId}] No interface documents available to generate relationships`);
      return [];
    }

    for (const iface of interfaceDocuments) {
      const interfaceId = iface.id;
      const stackId = iface.stack_id;

      let interfaceProperties: any = iface.source_properties || iface.properties || {};
      const deviceID = interfaceProperties.deviceId || deviceId;
      if (!deviceID || !interfaceId) {
        loggerInstance.debug(`[Skipping relationship due to missing deviceId or interfaceId`);
        continue;
      }

      const label = 'HOSTS';
      const uniqueId = `${deviceId}_${interfaceId}_${label}`;

      if (!uniquenessSet.has(uniqueId)) {
        const relationship = {
          src_id: String(deviceId),
          dest_id: String(interfaceId),
          properties: {
            id: uniqueId,
          },
          stack_id: stackId,
          label: label,
        };

        relationships.push(relationship);
        uniquenessSet.add(uniqueId);
      }
    }

    loggerInstance.info(`Created ${relationships.length} node-to-interface relationships`);
    return relationships;
  } catch (err: any) {
    loggerInstance.error(
      `[Error creating node-to-interface relationships: ${err.message}`,
    );
    return [];
  }
};
