import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';
import { LogicMonitorDiscoveryRequestFullI } from '../../../interfaces/discovery';
import { publishToDIS } from '../../../utils/publishToDIS';
import sleep from '../../../utils/sleep';
import { deviceDatasourceDiscoveryCdpNeighbourAuditLogs, deviceDatasourceInstanceDiscoveryCdpNeighbourAuditLog } from '../../../utils/auditLogs/cdpNeighbourDiscoveryAuditLogs';
import https from 'https';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import config from '../../../config';
import { getSourceIdBySourceName } from '../../../utils/external-apis/core-apis';

export const interfaceToInterfaceRelationshipDiscoveryService = async (
    body: LogicMonitorDiscoveryRequestFullI, contextId: string, device: any) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    if (!device) {
        loggerInstance.warn(`No data in device`, { path: path.relative(process.cwd(), __filename) });
        return;
    }
    try {
        const allowedAssignmentGroups = config.allowedAssignmentGroups?.split(',') || [];

        // Check if 'assignmentgroup' is present in inheritedProperties
        let assignmentGroup =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.assignmentgroup")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.assignmentgroup")
            )?.value;

        if (!assignmentGroup || !allowedAssignmentGroups.includes(assignmentGroup)) {
            loggerInstance.info(`Device skipped due to unmatched assignment group: ${assignmentGroup}`, {
                path: path.relative(process.cwd(), __filename),
                deviceId: device.id
            });
            return;
        }
        await cdpNeighbourDiscoveryService(body, contextId, device.id.toString());

    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::relationshipDiscoveryService.ts::relationshipDiscoveryService] Error in fetching device details for LM in Relationship Discovery Service: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) })
    }
}

export const cdpNeighbourDiscoveryService = async (doc: LogicMonitorDiscoveryRequestFullI, contextId: string, deviceId: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const baseWaitTime = 1000;
    let dynamicWaitTime = baseWaitTime;

    try {
        // Use actual credentials
        const accessId = doc.access_id;
        const accessKey: any = doc.access_key;
        const accountName = doc.account_name;
        const stackId = doc.stack_id;

        // 1. Fetch all device datasources
        const deviceDataSources = await getDeviceDataSources(accessId, accessKey, accountName, deviceId);

        if (!Array.isArray(deviceDataSources)) {
            loggerInstance.error(`Error fetching device data sources: ${deviceDataSources.error}`);
            return;
        }

        if (!deviceDataSources || deviceDataSources.length === 0) {
            return;
        }

        const snmpNetworkInterfacesDataSources = deviceDataSources.filter((items) => items.dataSourceName === "SNMP_Network_Interfaces");

        const { instances: localSnmpInstances, waitTime: waitAfterSnmp } = await getSnmpInstances(
            doc,
            deviceId,
            snmpNetworkInterfacesDataSources,
            dynamicWaitTime
        );
        dynamicWaitTime = waitAfterSnmp;
        const localSnmpMap = buildSnmpMap(localSnmpInstances, deviceId);

        // 3. CDP neighbours
        const cdpNeighbourDataSources = deviceDataSources.filter((items) => items.dataSourceName === "CDP_Neighbors");

        const { instances: cdpNeighbourInstances, waitTime: waitAfterCdp } = await getCdpNeighbourInstances(
            doc,
            deviceId,
            cdpNeighbourDataSources,
            dynamicWaitTime
        );
        dynamicWaitTime = waitAfterCdp;

        // 4. Build relationships
        await buildCdpRelationships(
            doc,
            cdpNeighbourInstances,
            localSnmpMap,
            stackId,
            dynamicWaitTime,
            accessId,
            accessKey,
            accountName
        );
        loggerInstance.info(`Interface-Interface Relationship discovery published.`);

    } catch (err) {
        loggerInstance.error(
            `[src::api::services::discovery::interfaceDiscovery.ts::interfaceDiscoveryService] Error: ${err}`,
            { path: path.relative(process.cwd(), __filename) }
        );
        return { error: 'Error in interfaceDiscoveryService', data: err };
    }
}

export const getSnmpInstances = async (
    doc: LogicMonitorDiscoveryRequestFullI,
    deviceId: string,
    snmpNetworkInterfacesDataSources: any[],
    dynamicWaitTime: number
): Promise<{ instances: any[]; waitTime: number }> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const { access_id: accessId, access_key: accessKey, account_name: accountName } = doc;

    const allInstances: any[] = [];

    for (const deviceDataSource of snmpNetworkInterfacesDataSources) {
        const deviceDataSourceId = deviceDataSource.deviceDataSourceId;

        await sleep(dynamicWaitTime);
        const dataSourceInstances = await getDataSourceInstances(
            accessId,
            accessKey,
            accountName,
            deviceId,
            deviceDataSourceId
        );

        if (!Array.isArray(dataSourceInstances)) {
            loggerInstance.error(`Error fetching SNMP datasource instances for device ${deviceId}: ${JSON.stringify(dataSourceInstances)}`);
            continue;
        }

        if (dataSourceInstances.length === 0) {
            continue;
        }

        for (const instance of dataSourceInstances) {
            allInstances.push(instance);

            dynamicWaitTime = adjustWaitTime(
                dynamicWaitTime,
                deviceId,
                deviceDataSource.deviceDataSourceId,
                instance.instanceId
            );
        }
    }

    return { instances: allInstances, waitTime: dynamicWaitTime };
};

export const getCdpNeighbourInstances = async (
    doc: LogicMonitorDiscoveryRequestFullI,
    deviceId: string,
    cdpNeighbourDataSources: any[],
    dynamicWaitTime: number
): Promise<{ instances: any[]; waitTime: number }> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const { access_id: accessId, access_key: accessKey, account_name: accountName } = doc;

    const allInstances: any[] = [];

    for (const deviceDataSource of cdpNeighbourDataSources) {
        const deviceDataSourceId = deviceDataSource.deviceDataSourceId;

        await sleep(dynamicWaitTime);
        const dataSourceInstances = await getDataSourceInstances(
            accessId,
            accessKey,
            accountName,
            deviceId,
            deviceDataSourceId
        );

        if (!Array.isArray(dataSourceInstances)) {
            loggerInstance.error(`Error fetching SNMP datasource instances for device ${deviceId}: ${JSON.stringify(dataSourceInstances)}`);
            continue;
        }

        if (dataSourceInstances.length === 0) {
            continue;
        }

        for (const instance of dataSourceInstances) {
            allInstances.push(instance);

            dynamicWaitTime = adjustWaitTime(
                dynamicWaitTime,
                deviceId,
                deviceDataSource.deviceDataSourceId,
                instance.instanceId
            );
        }
    }

    return { instances: allInstances, waitTime: dynamicWaitTime };
};

// Map builder for SNMP interfaces
const buildSnmpMap = (snmpInstances: any[], deviceId: string) => {
    const snmpMap: Record<string, { deviceId: string; instanceId: string }> = {};

    for (const instance of snmpInstances) {
        const ifaceName = instance?.instanceName?.trim();
        if (!ifaceName) continue;
        snmpMap[ifaceName] = {
            deviceId,
            instanceId: instance.instanceId,
        };
    }

    return snmpMap;
};

function normalizeDeviceName(rawName: string): string {
    if (!rawName) return rawName;

    // remove domain suffix like `.am.lilly.com`
    let shortName = rawName.split('.')[0];

    // also handle prefixed `elly` if present
    if (shortName.startsWith("elly")) {
        shortName = shortName.replace(/^elly/, "");
    }

    return shortName;
}

const resolveRemoteDeviceId = async (stackId: string, remoteDeviceName: string) => {
    let remoteDeviceId = await getSourceIdBySourceName(stackId, remoteDeviceName.toLowerCase());
    if (!remoteDeviceId) {
        remoteDeviceId = await getSourceIdBySourceName(stackId, remoteDeviceName.toUpperCase());
    }
    return remoteDeviceId;
};

// Build CDP relationships
const buildCdpRelationships = async (
    doc: LogicMonitorDiscoveryRequestFullI,
    cdpInstances: any[],
    localSnmpMap: Record<string, { deviceId: string; instanceId: string }>,
    stackId: string,
    dynamicWaitTime: number,
    accessId: string | undefined,
    accessKey: any,
    accountName: string | undefined
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    const getAutoPropertyValue = (autoProps: any[], propName: string): string | undefined => {
        return autoProps?.find(p => p.name === propName)?.value;
    };

    for (const cdp of cdpInstances) {
        const localInterface = getAutoPropertyValue(cdp.autoProperties, "auto.cdpinterfacename");
        const remoteInterface = getAutoPropertyValue(cdp.autoProperties, "auto.cdpcachedeviceport");

        const rawRemoteDeviceName = getAutoPropertyValue(cdp.autoProperties, "auto.cdpcachedeviceid");
        const remoteDeviceName = normalizeDeviceName(rawRemoteDeviceName!);

        if (!localInterface || !remoteDeviceName || !remoteInterface) continue;

        // Resolve remote deviceId
        const remoteDeviceIdFull = await resolveRemoteDeviceId(stackId, remoteDeviceName);
        if (!remoteDeviceIdFull) {
            loggerInstance.warn(`Could not resolve remote device for ${remoteDeviceName}`);
            continue;
        }

        const remoteDeviceIdParts = remoteDeviceIdFull.split('::');
        const remoteDeviceId = remoteDeviceIdParts[remoteDeviceIdParts.length - 1];

        const remoteDeviceDataSources = await getDeviceDataSources(accessId, accessKey, accountName, remoteDeviceId);

        if (!Array.isArray(remoteDeviceDataSources)) {
            loggerInstance.error(`Error fetching device data sources: ${remoteDeviceDataSources.error}`);
            return;
        }

        if (!remoteDeviceDataSources || remoteDeviceDataSources.length === 0) {
            return;
        }

        const remoteSnmpNetworkInterfacesDataSources = remoteDeviceDataSources.filter((items) => items.dataSourceName === "SNMP_Network_Interfaces");

        // Remote SNMP map
        const { instances: remoteSnmpInstances, waitTime: waitAfterSnmp } = await getSnmpInstances(
            doc,
            remoteDeviceId,
            remoteSnmpNetworkInterfacesDataSources,
            dynamicWaitTime
        );
        dynamicWaitTime = waitAfterSnmp;

        const remoteSnmpMap = buildSnmpMap(remoteSnmpInstances, remoteDeviceId);

        // Inside your CDP relationships builder
        const localEntry = Object.entries(localSnmpMap).find(([key, _value]) =>
            key.startsWith(localInterface)
        )?.[1];

        const remoteEntry = Object.entries(remoteSnmpMap).find(([key, _value]) =>
            key.startsWith(remoteInterface)
        )?.[1];

        if (localEntry && remoteEntry) {
            const interfaceToInterfaceRelationship = createInterfaceInterfaceRelationships(localEntry, remoteEntry, stackId);
            await publishToDIS(interfaceToInterfaceRelationship, 'relationship');

        } else {
            loggerInstance.warn(`No SNMP match found for CDP link: ${localInterface} <-> ${remoteInterface}`);
        }
    }
};

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
            dataSourceName: item.dataSourceName || ''
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
        const pageSize = config.pageSize || 10; // Define the number of deviceDataSources per page
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
            await deviceDatasourceDiscoveryCdpNeighbourAuditLogs({ status, url, deviceId, dataSourceNames, totalDataSourceCount: deviceDataSources.length, errMessage });

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
        loggerInstance.error(`[src::api::services::discovery::interfaceDiscovery.ts::getDeviceDataSources] Error in getDeviceDataSources: ${error}`);
        return {
            error: 'Error in getDeviceDataSources',
            data: error
        };
    }
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
            await deviceDatasourceInstanceDiscoveryCdpNeighbourAuditLog({ status, url, deviceId, deviceDataSourceId, dataSourceInstanceNames, totalDataSourceInstanceCount: dataSourceInstancesRequired.length, errMessage });

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
        loggerInstance.error(`[src::api::services::discovery::metricDiscovery.ts::getDataSourceInstances] Error in getDataSourceInstances: ${error}`);
        return {
            error: 'Error in getDataSourceInstances',
            data: error,
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
            instanceDescription: item.description || '',
            autoProperties: item.autoProperties,  // should be full object
        };
    });
}

const createInterfaceInterfaceRelationships = (localEntry: any, remoteEntry: any, stackId: string): any[] => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const relationships: any[] = [];
    const uniquenessSet: Set<string> = new Set();

    try {

        if (!localEntry || !remoteEntry) {
            loggerInstance.warn(`[No interfaces present for devices`);
            return [];
        }

        const localinstanceId = localEntry.instanceId;
        const localDeviceId = localEntry.deviceId;

        const remoteDeviceId = remoteEntry.deviceId;
        const remoteinstanceId = remoteEntry.instanceId;

        const localInterfaceId = `${localDeviceId}.${localinstanceId}`
        const remoteInterfaceId = `${remoteDeviceId}.${remoteinstanceId}`

        const label = 'CONNECTS';
        const uniqueId = `${localInterfaceId}_${remoteInterfaceId}_${label}`;

        if (!uniquenessSet.has(uniqueId)) {
            const relationship = {
                src_id: String(localInterfaceId),
                dest_id: String(remoteInterfaceId),
                properties: {
                    id: uniqueId,
                },
                stack_id: stackId,
                label: label,
            };

            relationships.push(relationship);
            uniquenessSet.add(uniqueId);
        }

        loggerInstance.info(`Created ${relationships.length} interface-to-interface relationships: ${localInterfaceId}_${remoteInterfaceId}_${label}`);
        return relationships;
    } catch (err: any) {
        loggerInstance.error(
            `[Error creating interface-to-interface relationships: ${err.message}`,
        );
        return [];
    }
};
