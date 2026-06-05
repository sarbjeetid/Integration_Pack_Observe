export const constructAlertPayloadService = async () => {
    // create the payload
    return {
        lookup_map: {
            source_ci_id: 'source_id', // deviceID
            source_alert_id: 'source_alert_id', // ##ALERTID##
            alert_title: 'alert_title', // ##ALERTSTATUS## ##LEVEL## - ##HOSTNAME## ##DSNAME## ##INSTANCE## ##DATAPOINT##
            alert_type: 'alert_type', // ##ALERTTYPE##
            '@timestamp': 'start_epoch', // ##STARTEPOCH##
            positive: 'positive', // positive
            alert_state: 'alert_state', //ALERTSTATE
            metric_name: 'instance_name', // ##INSTANCE##
            datasource_name: 'datasource_name', // ##DATASOURCENAME##
            threshold: 'threshold', // ##THRESHOLD##
            description: 'description', // ##MESSAGE##
            severity: 'severity', // ##LEVEL##
            lm_alert_status: 'lm_alert_status', // ##ALERTSTATUS## (active, clear, ack, update, or test)
            alert_source_type: 'alert_source_type',
            alert_source: 'alert_source',
            priority: 'sn_urgency', // ##sn.urgency##
            sn_ci: 'sn_ci', // ##sn.urgency##

        },
        transform_map: {
            // severity: [
            //     'severity',
            //     {
            //         'warn': 'Sev3',
            //         'error': 'Sev2',
            //         'critical': 'Sev1'
            //     }
            // ], // The alert severity, where 2=warn, 3=error and 4=critical
            monitoring_status: [
                'status', // Convert severity to string
                {
                    'active': 'Fired',
                    'clear': 'Resolved',
                }
            ],
        },
        defaults_map: {
            alert_source: 'logicmonitor',
        }
    };

}
