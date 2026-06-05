/*
    interface for input servicenow incident event via webhook
    this is expected format at Observe, and is configured via Business Rules at ServiceNow
*/

interface CommentsAndWorkNotesI {
    field_label: string,
    value: string,
    login_name: string,
    created_on: string
}


export interface ServiceNowIncidentI {
    is_new: boolean,
    number: string, // incident number
    reported_by_email?: string,
    opened_at: string;
    impact?: string;
    urgency?: string;
    short_description: string;
    description?: string;
    category?: string;
    priority?: string;
    sys_id: string;
    subcategory?: string;
    state: string;
    assignment_group?: string;
    parent_incident?: string;
    parent?: string;
    cmdb_ci?: string;
    child_incidents?: string;
    comments_and_work_notes?: CommentsAndWorkNotesI[]
    changed_fields? : any
}

export interface ScenarioCreateEventI {
    severity: string,
    priority: string,
    title: string,
    scenario_id: string,
    '@timestamp'?: string,
    scenario_creation_time?: string,
    eventType: 'create',
    messages?: string[],
    source_ids: string[],
    stack_id: string,
    source_display_id?: string,
    itsm: any,
}

export interface ScenarioUpdateEventI {
    severity?: string,
    priority?: string,
    title?: string,
    scenario_id: string,
    eventType: 'update',
    updateKeys: string[],
    messages?: string[],
    source_ids?: string[],
    stack_id: string,
    '@timestamp'?: string,
}

export interface ScenarioResolveEventI {
    scenario_id: string,
    messages?: string[],
    eventType: 'resolve',
    allow_post_transient_resolution?: boolean,
}

export type ScenarioEventI = ScenarioCreateEventI | ScenarioUpdateEventI | ScenarioResolveEventI;

export type FieldMapping = {
  [standardField: string]: string | string[];
};

type SnowApiType = 'custom' | 'standard';

export interface EndpointConfig {
  type: string;
  table: string;
  apiPrefix?: string;
  fieldMapping?: FieldMapping;
  snowApiType?: SnowApiType;
}

export interface EndpointsMap {
  GET?: EndpointConfig;
  POST?: EndpointConfig;
  PUT?: EndpointConfig;
  PATCH?: EndpointConfig;
  'GET-USER'?: EndpointConfig;
  PUT_UPDATE?: EndpointConfig;
  PUT_RESOLVE?: EndpointConfig;
  PUT_CLOSE?: EndpointConfig;
  PUT_REASSIGN?: EndpointConfig;
}

export type EndpointKey = keyof EndpointsMap;

export interface ResolvePrerequisiteStateConfig {
  stateValue: string;
  endpointKey?: EndpointKey;
}

export interface CustomerConfig {
  name: string;
  apiType: 'servicenow' | 'middleware';
  baseUrl: string;
  apiPrefix?: string;
  authType?: 'basic_auth' | 'oauth_2.0' | 'oauth2.0_gt_cc';
  tokenUrl?: string; // for middleware OAuth
  underlyingServiceNowUrl?: string; // only for middleware
  fieldMapping: FieldMapping;
  defaultValues?: Record<string, any>;
  linkCI?: boolean;
  resolvePrerequisiteState?: ResolvePrerequisiteStateConfig;
  endpoints: EndpointsMap;
  [key: string]: any;
}

export interface EnsureResolvePrerequisiteStateParams {
  incidentId: string;
  sysId?: string | null;
  currentState?: string;
  incidentData: any;
  authHeader: string;
  vaultPath?: any;
  customerConfig?: CustomerConfig;
  operationName: string;
}
