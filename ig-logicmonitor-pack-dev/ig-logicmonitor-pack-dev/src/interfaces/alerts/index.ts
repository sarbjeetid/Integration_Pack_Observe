export interface AlertRequestI {
    zone_id?: string;
    stack_id?: string;
}

export interface UpdateAlertNoteRequestI {
    zone_id: string;
    stack_id: string;
    vault_path?: string;
    source_alert_id?: string;
    servicenow_ticket_id?: string;
    observe_display_id?: string;
}

export interface LogicmonitorAlertI {

    deviceName: string;
    id: string;
    internalId: string;
    externalTicketId: string;
    title: string;
    type: string;
    threshold: string;
    startEpoch: string;
    severity: string;
    status: string;
    instanceName: string;
    datasourceName: string;
    description: string;
    positive?: string;
    alert_state?: string;
    sn_urgency?: string;
    sn_ci?: string;
    impact_servicenow?: string;
}
export interface CoreAlertI {
    alert_title: string;
    '@timestamp': string;
    // check if we need source_id or id, and the format as well (tool_id or stack::tool_id)
    source_id: string;
    id?: string;
    description?: string;
    alert_type: string;
    alert_source: string;
    alert_source_type: string;
    alert_generated_at_core: boolean;
    reference_id: string;
    alert_uuid: string;
    zone_id?: string;
    stack_id: string;
    severity?: string;
    positive?: boolean;
    alert_state?: string;
    sn_urgency?: string;
    sn_ci?: string;
    priority?: string;
    [key: string]: any;
}
