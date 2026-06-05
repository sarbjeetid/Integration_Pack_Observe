export interface GetMetricRequestI {
    deviceId: number;
    deviceDataSourceId: number;
    graphId: number;
    instanceId: number;
    metric_name: string;
    start_iso: string;
    end_iso: string;
    aggregation: string;
    interval_in_seconds: number;
    zone_id: string;
    stack_id: string;
    vault_path?: string;
    filters?: any;
}
export interface GetMetricResponseDataI {
    timeseries: Array<{ timeStamp: string; value: number }>;
    unit: string;
    metric_name: string;
}
export interface GetMetricResponseI {
    error: any;
    data: GetMetricResponseDataI | string;
}
export interface LogicmonitorGetMetricRequestI extends GetMetricRequestI {
    access_id: string,
    access_key: string,
    account_name: string,
}