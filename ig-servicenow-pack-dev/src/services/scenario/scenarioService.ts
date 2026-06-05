import { Container } from 'typedi';
import winston from 'winston';
import { ServiceNowIncidentI, ScenarioCreateEventI, ScenarioResolveEventI } from '../../interfaces/scenario';
import config from '../../config';
import { publishToDIS } from '../../utils/publishToDIS';

const servicenowObserveFieldMap = {
    'urgency': 'severity',
    'short_description': 'title',
    'sys_id': 'scenario_id',
    'priority': 'priority',
    'cmdb_ci': 'source_ids'
}

const urgencyMap = {
    '1': 'High',
    '2': 'Medium',
    '3': 'Low'
}

const priorityMap = {
    '1': 'P1',
    '2': 'P2',
    '3': 'P3',
    '4': 'P4',
    '5': 'P5'
}

const stateMap = {
    '6': 'Resolved',
    '7': 'Closed',
    '8': 'Cancelled'
}

const convertSysIdToUuid = (sysId: string) => {
    if (sysId.length !== 32) {
        return sysId;
    }

    const uuid = `${sysId.slice(0, 8)}-${sysId.slice(8, 12)}-${sysId.slice(12, 16)}-${sysId.slice(16, 20)}-${sysId.slice(20)}`;
    return uuid;
}

const scenarioService = async(incident: ServiceNowIncidentI, stack_id: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try{
        let eventType = 'update';
        let closeStates = config.scenarioCloseServicenowState.split(',')
        eventType = closeStates.includes(incident.state) ? 'resolve' : (incident.is_new) ? 'create' : 'update'; 
        let comments = incident.comments_and_work_notes? incident.comments_and_work_notes.map((comment)=> {
            return `${comment.login_name} added ${comment.field_label} having value '${comment.value}' at ${comment.created_on}`;
        }): []
        Logger.info(`Event type: ${eventType}`)
        const scenario_id = convertSysIdToUuid(incident.sys_id);
        switch(eventType){
            case 'create': {
                let disRequestBody: ScenarioCreateEventI;
                disRequestBody = {
                    severity: urgencyMap[incident?.urgency as keyof typeof urgencyMap] || 'Low',
                    priority: priorityMap[incident?.priority as keyof typeof priorityMap] || 'P3',
                    title: incident.short_description,
                    scenario_id,
                    eventType: 'create',
                    messages: [
                        `Scenario created from Servicenow for incident ${incident.number}`,
                        ...comments
                    ],
                    source_ids: [`${stack_id}::${incident.cmdb_ci}`],
                    stack_id,
                    itsm: {
                        servicenow: incident.number
                    }
                }
                await publishToDIS(disRequestBody, "scenario")
                break;
            }
            case 'update': {
                let disRequestBody: any;
                disRequestBody = {
                    updateKeys: []
                }
                if('changed_fields' in incident && incident.changed_fields.length !== 0){
                    const servicenowUpdateKeys = incident.changed_fields;
                    servicenowUpdateKeys.map((field:keyof ServiceNowIncidentI) => {
                        let value = incident[field];
                        if(field === 'urgency'){
                            value = urgencyMap[incident[field] as keyof typeof urgencyMap];
                        }
                        if(field === 'priority'){
                            value = priorityMap[incident[field] as keyof typeof priorityMap];
                        }
                        if(field === 'cmdb_ci'){
                            value = [value];
                        }
                        disRequestBody[servicenowObserveFieldMap[field as keyof typeof servicenowObserveFieldMap]] = value; 
                    })
                    const observeUpdateKeys = servicenowUpdateKeys.map((field:any) => servicenowObserveFieldMap[field as keyof typeof servicenowObserveFieldMap]);
                  
                    disRequestBody = {
                        ...disRequestBody,
                        updateKeys: observeUpdateKeys,
                    }
                }
                disRequestBody = {
                    ...disRequestBody,
                    eventType: 'update',
                    scenario_id,
                    stack_id
                }
                if(comments.length !== 0){
                    disRequestBody.updateKeys.push("messages");
                    disRequestBody.messages = comments
                }
                await publishToDIS(disRequestBody, "scenario")
                break;
            }
            case 'resolve': {
                let disRequestBody: ScenarioResolveEventI;
                disRequestBody = {
                    scenario_id,
                    eventType: 'resolve'
                }
                comments.push(`Closing scenario as Incident is ${stateMap[incident.state as keyof typeof stateMap]}`);
                if(comments.length !== 0){
                    disRequestBody.messages = comments;
                }
                await publishToDIS(disRequestBody, "scenario")
                break;
            }
            default: {
                Logger.info('Event type not supported');
            }
        }

    } catch(err){
        Logger.error(`Error in scenario service: ${err}`);
        return {error: err, data: 'Error in scenario service'};
    }
}

export {
    scenarioService
}