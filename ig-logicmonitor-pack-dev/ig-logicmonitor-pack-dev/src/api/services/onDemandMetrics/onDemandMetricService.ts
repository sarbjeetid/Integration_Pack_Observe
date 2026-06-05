import winston from 'winston';
import { Container } from 'typedi';
import { GetMetricResponseI, LogicmonitorGetMetricRequestI } from '../../../interfaces/onDemandMetrics';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import * as https from 'https';
export const getLogicmonitorMetricDataService = async (doc: LogicmonitorGetMetricRequestI): Promise<GetMetricResponseI> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        // return the response
        return await fetchLogicmonitorMetricData(doc);

    } catch (error) {
        loggerInstance.error(`[src::api::services::onDemandMetrics::getLogicmonitorMetricDataService.ts::getLogicmonitorMetricDataService] Error in getLogicmonitorMetricDataService: ${error}`);
        return { error: 'FetchMetricDataError', data: 'Error encountered' }
    }
}

async function fetchLogicmonitorMetricData(doc: LogicmonitorGetMetricRequestI): Promise<GetMetricResponseI> {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        // Request Info
        const httpVerb = 'GET';

        const data = '';

        const epochStartTimeInSeconds = Math.floor(new Date(doc.start_iso).getTime() / 1000);
        const epochEndTimeInSeconds = Math.floor(new Date(doc.end_iso).getTime() / 1000);

        const resourcePath = `/device/devices/${doc.deviceId}/devicedatasources/${doc.deviceDataSourceId}/instances/${doc.instanceId}/graphs/${doc.graphId}/data`;
        // Construct URL
        const url = `https://${doc.account_name}.logicmonitor.com/santaba/rest${resourcePath}?start=${epochStartTimeInSeconds}&end=${epochEndTimeInSeconds}`;

        const headers = generateAuthHeader(doc.access_id, doc.access_key, doc.account_name, httpVerb, resourcePath, data);

        // Make request
        const options = {
            method: 'GET',
            headers: headers
        };

        // return the onDemandMetricsData
        return await new Promise<GetMetricResponseI>((resolve, reject) => {

            const req = https.request(url, options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', async () => {
                    // Parse JSON response
                    try {
                        const response = JSON.parse(responseData);

                        // Check if items are present in the response
                        if (response && response.data && Array.isArray(response.data.lines) && response.data.lines.length != 0) {
                            const timeseries = response.data.lines[0].data;
                            const timestamps = response.data.timestamps;
                            const metricName = response.data.name;
                            const unit = response.data.verticalLabel;

                            // Sanitize the timeseries data
                            const sanitised_timeseries = timeseries.map((value: number, index: number) => {
                                return {
                                    timeStamp: timestamps[index],
                                    value: value
                                };
                            });

                            const onDemandMetricsResponseData = {
                                error: null,
                                data: {
                                    metric_name: metricName,
                                    unit: unit,
                                    timeseries: sanitised_timeseries
                                }
                            };

                            resolve(onDemandMetricsResponseData);
                        } else {
                            resolve({ error: null, data: { metric_name: '', unit: '', timeseries: [] } }); // No data found
                        }

                    } catch (error) {
                        loggerInstance.error(`Error parsing JSON response for fetchLogicmonitorMetricData:', ${error}, device info - ${doc.deviceId}, ${doc.deviceDataSourceId}, ${doc.instanceId}, ${doc.graphId}`);
                        resolve({ error: null, data: { metric_name: '', unit: '', timeseries: [] } });
                    }
                });
            });
            req.on('error', (error) => {
                loggerInstance.error('Error in req fetchLogicmonitorMetricData:', error);
                reject(error);
            });
            req.end();
        });

    } catch (error) {
        loggerInstance.error(`[src::api::services::onDemandMetrics::onDemandMetricService.ts::fetchLogicmonitorMetricData] Error in fetchLogicmonitorMetricData: ${error}`);
        throw error;
    }
}