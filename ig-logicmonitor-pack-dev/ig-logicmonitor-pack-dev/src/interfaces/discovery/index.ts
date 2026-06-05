export interface LogicMonitorDiscoveryRequestI {
  zone_id: string,
  stack_id: string,
  access_id?: string,
  access_key?: string,
  account_name?: string,
  vault_path?: string,
  rediscovery?: string,
}

export interface LogicMonitorDiscoveryRequestFullI {
  zone_id: string,
  stack_id: string,
  access_id?: string,
  access_key?: string,
  account_name?: string,
  vault_path?: string,
  rediscovery?: string,
}

export interface LogicMonitorDevice {
  logCollectorGroupId: number;
  disableAlerting: boolean;
  netflowCollectorGroupId: number;
  rolePrivileges: string[];
  systemProperties: { name: string; value: string }[];
  isPreferredLogCollectorConfigured: boolean;
  hostStatus: string;
  autoBalancedCollectorGroupId: number;
  inheritedProperties: { name: string; value: string }[];
  id: number;
  syntheticsCollectorIds: string;
  upTimeInSeconds: number;
  deviceType: number;
  currentCollectorId: number;
  netflowCollectorId: number;
  autoPropsAssignedOn: number;
  updatedOn: number;
  preferredCollectorGroupId: number;
  customProperties: { name: string; value: string }[];
  collectorDescription: string;
  preferredCollectorId: number;
  lastRawdataTime: number;
  name: string;
  deletedTimeInMs: number;
  netflowCollectorGroupName: string;
  azureState: number;
  relatedDeviceId: number;
  logCollectorGroupName: string;
  displayName: string;
  logCollectorDescription: string;
  link: string;
  awsState: number;
  description: string;
  createdOn: number;
  gcpState: number;
  autoPropsUpdatedOn: number;
  scanConfigId: number;
  enableNetflow: boolean;
  lastDataTime: number;
  hostGroupIds: string;
  resourceIds: { name: string; value: string }[];
  op: string;
  currentLogCollectorId: number;
  logCollectorId: number;
  netflowCollectorDescription: string;
  userPermission: string;
  preferredCollectorGroupName: string;
  autoProperties: { name: string; value: string }[];
  toDeleteTimeInMs: number;
}

export interface MetricI {
  // metric_id: string,
  name: string;
  id: string;
  citype: string;
  source: string;
  is_monitored: boolean;
  importance: string;
  source_type: string;
  source_properties: any;
  zone_id?: string;
  stack_id?: string;
}

export interface LogicmonitorMetricI extends MetricI {
  default_aggregation: string;
  supported_aggregations: Array<string>;
  unit: string;
}

export interface LogicmonitorInterfaceI {
  id: string;
  citype: string;
  source_type: string;
  source_name: string;
  stack_id: string;
  zone_id: string;
  properties?: any,
  type: string,
  label: string,
}

export interface RelationshipI {
  src_id: string;
  dest_id: string;
  stack_id: string;
  label: string;
  properties: {
    id: string;
  };
}