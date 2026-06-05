import winston from 'winston';
import { Container } from 'typedi';
import { LogicmonitorAlertI, CoreAlertI } from "../../../../src/interfaces/alerts";
import { v4 as uuidv4 } from "uuid";
import { fetchStackDocument, getSourceIdBySourceName } from '../../../utils/external-apis';
import axios from 'axios';
import config from '../../../config';

// Function to clean up unwanted characters from strings
const cleanString = (str: string): string => {
    if (str) {
        return str.replace(/[\r\n]+/g, ' ').trim();  // Removes all variations of line breaks
    }
    return str;
};
export const alertTransformerService = async (alert: LogicmonitorAlertI, stackId: string, zoneId: string) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        // Clean up alert fields
        alert.title = cleanString(alert.title);
        alert.description = cleanString(alert.description);
        alert.deviceName = cleanString(alert.deviceName);
        alert.datasourceName = cleanString(alert.datasourceName);
        alert.instanceName = cleanString(alert.instanceName);

        // IF status is not 'active', 'update', or 'clear'
        if (!alert.status || !['active', 'update', 'clear'].includes(alert.status.toLowerCase())) {
            loggerInstance.info(`Dropping alert with status: ${alert.status}`);
            return {
                error: `Alert dropped due to status: ${alert.status}`,
                data: `Alert dropped, only 'active', 'update', 'clear' alerts status can be processed.`
            };
        }
        let deviceName = alert?.deviceName;

        const sourceId = await getSourceIdBySourceName(stackId, deviceName);
        if (!sourceId) {
            return {
                error: 'Error in getting deviceId by deviceName',
                data: 'Cannot fetch deviceId'
            }
        }
        const deviceId = sourceId.split('::')[1];

        // for positive alerts
        // let positive = false;
        // if (alert.status && alert.status.toLowerCase() === 'clear') {
        //     positive = true;
        // }

        let coreAlert: Partial<CoreAlertI> = {
            source_id: deviceId,
            source_alert_id: alert?.internalId,
            alert_title: alert?.title,
            alert_type: alert?.type || 'alert',
            start_epoch: alert?.startEpoch,
            instance_name: alert?.instanceName,
            datasource_name: alert?.datasourceName,
            threshold: alert?.threshold,
            description: alert?.description,  // Optional chaining to safely access `description`
            // severity: alert?.severity?.toLowerCase(),  // Ensure `severity` exists before calling `toLowerCase()`
            severity: `Sev${alert?.impact_servicenow?.toLowerCase()}`,
            lm_alert_status: alert?.status?.toLowerCase(),  // Ensure `status` exists before calling `toLowerCase()`
            alert_id: alert?.id,
            external_ticket_id: alert?.externalTicketId,
            alert_source: 'logicmonitor',
            alert_source_type: 'metricThreshold',
            alert_uuid: uuidv4(),
            stack_id: stackId,
            sn_urgency: alert?.sn_urgency,
            impacted_ci_id_list: alert?.sn_ci,
            priority: `P${alert?.sn_urgency}`,
        };
        if (alert.status && alert.status.toLowerCase() === 'clear') {
            coreAlert.alert_state = 'Resolved';
        }

        const stackDoc = await fetchStackDocument(stackId, zoneId);
        if (!stackDoc) {
            return {
                error: 'Error in startDiscoveryService',
                data: 'Stack not present or incomplete'
            }
        }

        let endpoint = stackDoc.transformer_endpoint;
        const API_KEY = config.apiKey; // Assuming you have it stored in your environment

        // Transformer url
        const apiUrl = `${endpoint}&apikey=${API_KEY}`;
        const response = await axios.post(apiUrl, coreAlert, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Handle the response
        if (response.status === 200) {
            loggerInstance.info(`Alert sent successfully: ${response.data}`);
            return response.data;
        } else {
            loggerInstance.error(`Failed to send alert: ${response.statusText}`);
            return {
                error: 'Error in sending alert',
                data: response.statusText
            };
        }

    } catch (error) {
        loggerInstance.error(`[src::api::services::alerts::alertTransformer.ts::alertTransformerService] Error in alertTransformerService: ${error}`);
    }
}
