import { DaprClient } from 'dapr-client';
import { Container } from 'typedi';
import config from '../../../config';
import winston from 'winston';
import { LogicMonitorDiscoveryRequestFullI } from '../../../interfaces/discovery';
import sleep from '../../../utils/sleep';
import path from "path";
import * as https from 'https';
import { logicmonitorMockData } from '../../../testing/mockDeviceList'
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import { deviceDiscoveryAuditLogs } from '../../../utils/auditLogs/deviceDiscoveryAuditLogs';
import { fetchStackDocument, markDiscoverySuccessCore, markInterfaceDiscoverySuccessCore } from '../../../utils/external-apis';

export const startDiscoveryService = async (doc: LogicMonitorDiscoveryRequestFullI, contextId: string, discoveryType?: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        const useMockData = process.env.USE_MOCK_DATA === 'true';

        if (useMockData) {
            await startDiscoveryWithMockData(doc, contextId);
        }
        else {
            const currentTime = new Date().toISOString();
            await fetchAndPublishDevices(doc, contextId, discoveryType);
            // update time for discovery
            try {
                const ok = await markDiscoverySuccessCore(doc.stack_id, currentTime);
                if (!ok) {
                  loggerInstance.warn(`markDiscoverySuccess returned false for stack_id=${doc.stack_id}`);
                } else {
                  loggerInstance.info(`Marked last_successful_discovery_timestamp for stack_id=${doc.stack_id}`);
                }
            } catch (markErr) {
             loggerInstance.warn(`Failed to mark discovery success for stack_id=${doc.stack_id}: ${markErr}`);
            }
            // update time for interface discovery based on env
            try {
                if (config.enableInterfaceDiscovery === 'true') {
                  const okInterface = await markInterfaceDiscoverySuccessCore(doc.stack_id, currentTime);
                  if (!okInterface) {
                    loggerInstance.warn(`markInterfaceDiscoverySuccess returned false for stack_id=${doc.stack_id}`);
                  } else {
                    loggerInstance.info(`Marked last_successful_interface_discovery_timestamp for stack_id=${doc.stack_id}`);
                  }
                }
            } catch (markErr) {
             loggerInstance.warn(`Failed to mark interface discovery success for stack_id=${doc.stack_id}: ${markErr}`);
            }
        }
     } catch (err) {
        loggerInstance.error(`[src::api::services::discovery::startDiscovery.ts::startDiscoveryService] Error in startDiscoveryService ${err}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in startDiscoveryService',
            data: err
        };
    }
}
function toEpochSecondsFromDateLike(d: any): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function getDiscoveryBaselineEpoch(stackDoc: any): number | null {
  return toEpochSecondsFromDateLike(stackDoc?.last_successful_discovery_timestamp) ?? null;
}
const fetchAndPublishDevices = async (
  doc: LogicMonitorDiscoveryRequestFullI,
  contextId: string,
  discoveryType?: string
) => {
  const logger: winston.Logger = Container.get('loggerInstance');

  try {
    logger.info(`Rediscovery variable inside startDiscovery is ${doc.rediscovery}`);
    const { access_id: accessId, access_key: accessKey, account_name: accountName } = doc;
    const httpVerb = 'GET';
    const data = '';
    const pageSize = config.pageSize || 200;
    let offset = 0;
    let hasMore = true;

    // 1) Get stack document safely
    let stackDoc: any;
    try {
      stackDoc = await fetchStackDocument(doc.stack_id, doc.zone_id);
      if (!stackDoc) {
        logger.warn(`No stack document found for stack_id=${doc.stack_id}, zone_id=${doc.zone_id}`);
        return;
      }
    } catch (stackErr) {
      logger.error(`Failed to fetch stack document: ${stackErr}`);
      return;
    }

    // 2) Baseline from last_successful_discovery_timestamp (or null for first run)
    const baselineEpoch = getDiscoveryBaselineEpoch(stackDoc);
    if (baselineEpoch == null) {
      logger.info(
        `No last_successful_discovery_timestamp found for stack_id=${doc.stack_id}. First/backfill run: NOT filtering devices.`
      );
    } else {
      logger.info(
        `Using last_successful_discovery_timestamp (${stackDoc.last_successful_discovery_timestamp}) -> epoch ${baselineEpoch} as device filter baseline.`
      );
    }

    let publishedSomething = false;

    // 3) Fetch LM devices in pages
    while (hasMore) {
      const resourcePath = '/device/devices';
      const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}?size=${pageSize}&offset=${offset}`;
      const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);

      try {
        const { status, errMessage, items: devices } = await fetchDevices(url, headers);

        if (!devices || !Array.isArray(devices)) {
          logger.warn(`Invalid device list received for offset=${offset}. Skipping.`);
          break;
        }

        const totalDeviceCount = devices.length;
        const deviceNames = devices.map((d: any) => d.displayName);

        await deviceDiscoveryAuditLogs({
          status,
          url,
          deviceNames,
          totalDeviceCount,
          errMessage,
        });

        if (totalDeviceCount === 0) {
          logger.info('No devices found in this page. Stopping discovery.');
          hasMore = false;
          break;
        }

        // 4) Filter only when baseline exists; else keep all (first run/backfill)
        const devicesToPublish =
          doc.rediscovery === "true" && baselineEpoch != null
            ? devices.filter((device: any) => {
                const createdOn = Number(device.createdOn);
                return Number.isFinite(createdOn) && createdOn > baselineEpoch;
              })
            : devices;

        if (devicesToPublish.length === 0) {
          if (baselineEpoch != null) {
            logger.info(`No new or updated devices since epoch ${baselineEpoch}. Skipping publish for this page.`);
          } else {
            logger.info(`Baseline absent and page returned 0 post-filter items (unexpected).`);
          }
        } else {
          logger.info(
            `Publishing ${devicesToPublish.length}/${totalDeviceCount} devices ` +
            (baselineEpoch == null ? `(first run - no filtering).` : `(new/updated since baseline).`)
          );

          try {
            const maxDiscoveryCount = config.maxResourceDiscoveryCount;
            await publishDevicesInBatches(doc, contextId, devicesToPublish, maxDiscoveryCount, discoveryType);
            publishedSomething = true;
          } catch (publishErr) {
            logger.error(`Error publishing device batches: ${publishErr}`);
          }
        }

        // 5) Pagination
        if (devices.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      } catch (fetchErr) {
        logger.error(`Error fetching devices from LogicMonitor (offset=${offset}): ${fetchErr}`);
        hasMore = false; // stop if repeated failure
      }
    }
    logger.info(
      `Device discovery completed for stack: ${stackDoc.name} (filtered=${baselineEpoch != null}).`
    );
  } catch (outerErr) {
    logger.error(`Unhandled error in fetchAndPublishDevices: ${outerErr}`);
  }
};


const fetchDevices = (url: string, headers: any): Promise<{ status: number, errMessage: string, items: any[] }> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    return new Promise((resolve, reject) => {
        // Make request
        const options = {
            method: 'GET',
            headers: headers
        };
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
                    loggerInstance.error(`Error parsing JSON response for fetching device list: ${error}`);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            loggerInstance.error('Error in req deviceList:', error);
            reject(error);
        });

        req.end();
    });
}

const publishDevicesInBatches = async (doc: LogicMonitorDiscoveryRequestFullI, contextId: string, devices: any[], maxResourceDiscoveryCount?: number, discoveryType?: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');

    const maxBatchSize = 5;
    const pubSubName = config.discoveryPubSubName;
    const topic = config.listResourcesTopicName;
    let totalPublished = 0;

    for (let i = 0; i < devices.length; i += maxBatchSize) {

        if (maxResourceDiscoveryCount !== undefined && totalPublished >= maxResourceDiscoveryCount) {
            loggerInstance.info(`Discovery limit of ${maxResourceDiscoveryCount} reached. Stopping further publishing.`);
            break;
        }
        const batchOfDevices = devices.slice(i, i + maxBatchSize);

        // Limit batch only if limit is set
        const allowedBatch = maxResourceDiscoveryCount !== undefined
            ? batchOfDevices.slice(0, maxResourceDiscoveryCount - totalPublished)
            : batchOfDevices;
        const message = {
            body: doc,
            contextId,
            devices: allowedBatch,
            discoveryType
        };

        try {
            await sleep(config.waitTimeinMs);
            await daprClient.pubsub.publish(
                pubSubName,
                topic,
                message
            );
            totalPublished += allowedBatch.length;
        } catch (err) {
            loggerInstance.error(`Error in publishing to listResources topic ${err}`, { path: path.relative(process.cwd(), __filename) });
            throw new Error('Error in publishing to listResources topic');
        }
    }
}

async function startDiscoveryWithMockData(doc: LogicMonitorDiscoveryRequestFullI, contextId: string) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    try {

        const mockResponseData = logicmonitorMockData; // Replace this with your mock data or mock service call
        const pubSubName = config.discoveryPubSubName;
        const topic = config.listResourcesTopicName;

        const message = {
            body: doc,
            contextId,
            devices: mockResponseData
        };

        try {
            await sleep(config.waitTimeinMs);
            await daprClient.pubsub.publish(
                pubSubName,
                topic,
                message
            );
        } catch (err) {
            loggerInstance.error(`Error in publishing to listResources topic ${err}`, { path: path.relative(process.cwd(), __filename) });
            return {
                error: 'Error in publishing to listResources topic',
                data: err
            };
        }
    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::startDiscovery.ts::startDiscoveryWithMockData] Error in startDiscoveryWithMockData ${error}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in startDiscoveryService',
            data: error
        };
    }
}
