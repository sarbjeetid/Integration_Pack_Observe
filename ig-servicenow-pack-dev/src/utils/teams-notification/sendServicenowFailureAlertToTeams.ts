import config from '../../config';
import { sendTeamsAlert } from './sendTeamsAlerts';
import path from 'path';
import { Container } from 'typedi';
import winston from 'winston';

interface ServicenowFailureParams {
    incidentId: string;
    tenantId: string;
    errorMessage: string;
    failureType: 'create' | 'update' | 'resolve' | 'close' | 'postCreateAction' | 'observeNotify' | 'fetchPriority' | 'associateCIWithIncident' | 'fetchSysId' | 'fetchIncidentData' | 'reassign' | 'createScheduleInObserve';
    customActionMessage?: string;
    extraDetails?: {
        scenarioId?: string;
        endpoint?: string;
        payload?: any;
    };
}

export const sendServicenowFailureAlertToTeams = async ({
    incidentId,
    tenantId,
    errorMessage,
    failureType,
    customActionMessage,
    extraDetails,

}: ServicenowFailureParams): Promise<void> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const webhookUrl = config.teamsWebhookUrl;

    const failureTitleMap: Record<string, string> = {
        create: '🚨 ServiceNow Incident Creation Failed 🚨',
        update: '🚨 ServiceNow Incident Update Failed 🚨',
        resolve: '🚨 ServiceNow Incident Resolution Failed 🚨',
        close: '🚨 ServiceNow Incident Closure Failed 🚨',
        postCreateAction: '⚠️ Post ServiceNow Incident Creation Action Failed ⚠️',
        observeNotify: '⚠️ Observe Scenario Message Failed ⚠️',
        fetchPriority: '⚠️ Failed to Fetch Incident Priority from ServiceNow ⚠️',
        associateCIWithIncident: '⚠️ CI Association to Incident Failed ⚠️',
        fetchSysId: '⚠️ Failed to Fetch sys_id for Incident ⚠️',
        fetchIncidentData: '⚠️ Failed to Retrieve Incident Data ⚠️',
        reassign: '⚠️ Failed to Reassign Incident ⚠️',
        createScheduleInObserve: '⚠️ Failed to Create Schedule in Observe ⚠️',
    };

    const failureActionMap: Record<string, string> = {
        create: 'Servicenow ticket creation failed.',
        update: 'Servicenow ticket update failed.',
        resolve: 'Resolve API failed and was not triggered by Observe.',
        close: 'Servicenow ticket closure failed.',
        postCreateAction: 'One or more post-creation actions (e.g., Observe update, scheduler creation) failed.',
        observeNotify: 'Failed to post scenario resolution message to Observe.',
        fetchPriority: 'Could not retrieve sys_id or priority for the incident.',
        associateCIWithIncident: 'Failed to associate the CI with the ServiceNow ticket.',
        fetchSysId: 'Could not fetch sys_id for the given incident number.',
        fetchIncidentData: 'ServiceNow incident data could not be fetched.',
        reassign: 'Could not re-assign the incident',
        createScheduleInObserve: 'Could not create schedule in Observe for the incident',
        
    };

    if (!failureTitleMap[failureType]) {
        loggerInstance.warn(`Unrecognized failureType received in Teams alert: ${failureType}`);
    }

    const title = failureTitleMap[failureType] || '🚨 ServiceNow Incident Failure 🚨';
    const actionMessage =
        customActionMessage || failureActionMap[failureType] || 'Unknown failure during ServiceNow incident processing.';

    let scenarioId: string | undefined;
    let endpoint: string | undefined;
    let payload: any;

    if (extraDetails) {
        scenarioId = extraDetails.scenarioId;
        endpoint = extraDetails.endpoint;
        payload = extraDetails.payload;
    }

    const message = [
        `🆔 **Incident ID:** ${incidentId}`,
        `🏢 **Tenant:** ${tenantId}`,
        `🔁 **Action Skipped:** ${actionMessage}`,
        `🧩 **Scenario ID:** ${scenarioId}`,
        `🌐 **Endpoint URL:** ${endpoint}`,
        `📦 **Payload:**\n\`\`\`json\n${payload ? JSON.stringify(payload, null, 2) : 'N/A'}\n\`\`\``,
        `📅 **Timestamp:** ${new Date().toISOString()}`,
        `🛑 **Error:**\n\`\`\`\n${errorMessage}\n\`\`\``,
    ].join('\n\n');

    try {
        await sendTeamsAlert(webhookUrl, title, message);
    } catch (err: any) {
        loggerInstance?.error(`❌ Failed to send Teams failure alert: ${err.message}`, {
            path: path.relative(process.cwd(), __filename),
            stack: err.stack,
        });
    }
};
