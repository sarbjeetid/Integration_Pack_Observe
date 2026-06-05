import winston from 'winston';
import { Container } from 'typedi';
import axios from 'axios';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import path from "path";
import { auditLog } from '../../../utils/external-apis/core-apis';

export const updateAlertNoteService = async (accessId: string, accessKey: string, accountName: string, source_alert_id: string, servicenow_ticket_id: string, observe_display_id: string) => {
     const loggerInstance: winston.Logger = Container.get('loggerInstance');
     try {

          const httpVerb = 'POST';
          const resourcePath = `/alert/alerts/${source_alert_id}/note`;

          const data = JSON.stringify({ ackComment: `Servicenow Ticket: ${servicenow_ticket_id}, Observe Incident Id: ${observe_display_id}` });

          // Construct URL
          const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}`;

          const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);

          const response = await updateAlertNoteData(url, headers, data);

          if (response.status === 200) {
               loggerInstance.info(`Successfully updated note for alert ID: ${source_alert_id}`);
               const auditLogData = {
                timestamp: new Date().toISOString(),
                status: "Success",
                details: {
                    URL : url,
                    source_alert_id: source_alert_id,
                    servicenow_ticket_id: servicenow_ticket_id,
                    message: `Successfully updated note for alert ID: ${source_alert_id}`,
                }
            };
            auditLog(auditLogData, "Update Logicmonitor Alert Note");
               return response;
          } else {
               loggerInstance.error(`Failed to update note for alert ID: ${source_alert_id}`);
               const auditLogData = {
                timestamp: new Date().toISOString(),
                status: 'Failure',
                details: {
                  URL: url,
                  message: `Failed to update note for alert ID: ${source_alert_id}`
                },
              };
              auditLog(auditLogData, 'Update Logicmonitor Alert Note');
               return { error: 'Update failed', status: response.status, data: response.data };
          }
     } catch (error) {
          loggerInstance.error(`[src::api::services::alerts::updateAlertNote.ts::updateAlertNoteService] Error in updateAlertNoteService: ${error}`);
          return { error: 'Exception occurred', details: error };
     }
}

async function updateAlertNoteData(url: string, headers: any, data: any) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            loggerInstance.error(`[services::alerts::UpdateAlertNote.ts::updateAlertNoteData] Axio Error: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
            throw new Error(`Request failed with status ${error.response?.status}: ${JSON.stringify(error.response?.data)}`);
        } else {
            loggerInstance.error(`[src::api::services::alerts::UpdateAlertNote.ts::updateAlertNoteData] Error: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
            throw new Error('An unexpected error occurred');
        }
    }
}
