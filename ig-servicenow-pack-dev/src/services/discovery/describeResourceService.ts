import winston from 'winston';
import { Container } from 'typedi';
import  { AxiosInstance } from 'axios';
import { ServicenowDiscoveryBodyI, ServiceNowRelationI } from '../../interfaces/config';
import { publishToDIS } from '../../utils/publishToDIS';
import config from '../../config';
import pLimit from 'p-limit';
const describeResourceService = async(body: ServicenowDiscoveryBodyI, className: string, resourceId: string, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');

    // 🔥 Added: Initialize set for unique relationship types
    const uniqueRelationshipTypes = new Set<string>();

    const isNodeValid = (attributes: any): boolean => {
        const supportGroupName = attributes?.support_group?.display_value || attributes?.support_group || '';
        const installStatus = attributes?.install_status;
        const uItSupportTeam = attributes?.u_it_support_team;
        const modelId = attributes?.model_id;
        const name = attributes?.name;
    
        if (
            typeof supportGroupName === 'string' &&
            ![
                'NETWORK-VOICE-GLB',
                'NETWORK-WAN-GLB',
                'NETWORK-WLAN-GLB',
                'NETWORK-DDI-GLB',
                'NETWORK-SEC-GLB',
                'NETWORK-TOOLS-GLB',
                'NETWORK-LAN-GLB',
                'NETWORK-TECH-GLB',
                'NETWORK-OPERATIONS-GLB'
            ].includes(supportGroupName)
        ) {
            return false;
        }
    
        if (installStatus === 7) {
            return false;
        }
    
        if (uItSupportTeam !== '924') {
            return false;
        }
    
        if (
            typeof modelId === 'string' &&
            (modelId.toLowerCase().includes('ap-45') ||
             modelId.toLowerCase().includes('air') ||
             modelId.toLowerCase().includes('c91'))
        ) {
            return false;
        }
    
        if (typeof name === 'string' && name.toLowerCase().includes('ap')) {
            return false;
        }
    
        return true;
    };

    try{
        const {url, username, password} = body;
        const describeResourceURL = `${url}/api/now/cmdb/instance/${className}/${resourceId}`;
        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        const response = await axiosInstance.get(describeResourceURL, { 
            headers:{
                Authorization: authHeader
            }
          });

        const allowedAssignmentGroups = config.allowedAssignmentGroups?.split(','); 
        if(response.status === 200){
            const sourceNode:{outbound_relations: ServiceNowRelationI[], attributes: any, inbound_relations: ServiceNowRelationI[]} = response.data.result;

            if(!sourceNode.attributes?.u_id || (allowedAssignmentGroups && !allowedAssignmentGroups.includes(sourceNode.attributes?.u_id))){
                Logger.info(`Device skipped due to unmatched assignment group: ${sourceNode.attributes?.u_id}`);
                return;
            }
            const properties = {source_properties: sourceNode.attributes};
            let node:any = {
                source_name: sourceNode.attributes.name || "No Name",
                id: sourceNode.attributes.sys_id,
                zone_id: body.zone_id,
                stack_id: body.stack_id,
                properties: JSON.stringify(properties),
                location: sourceNode.attributes?.location?.display_value || "NA",
                type: "ci",
                source_type: sourceNode.attributes.sys_class_name || className,
                label: `CI`,
                citype: sourceNode.attributes.sys_class_name || className,
                display_type: sourceNode.attributes.sys_class_name || className,
            }
            if(sourceNode.attributes?.u_id){
                node.ci_merge_key = sourceNode.attributes?.u_id
            }

            let itsm:any = {};
            if(sourceNode.attributes?.category){
                itsm.category = sourceNode.attributes?.category;
            }
            if(sourceNode.attributes?.subcategory){
                itsm.sub_category = sourceNode.attributes?.subcategory;
            }
            if(sourceNode.attributes?.location){
                itsm.location = sourceNode.attributes?.location?.value;
            }
            if(sourceNode.attributes?.support_group){
                itsm.support_group = sourceNode.attributes?.support_group;
                itsm.assignment_group = sourceNode.attributes?.support_group?.display_value;
            }
            if(sourceNode.attributes?.u_id){
                itsm.center_id = sourceNode.attributes?.u_id
            }
            node = {
                ...node,
                itsm
            }

            // send node document to DIS APIs
            await publishToDIS(node, 'ci');

            // Collect all related sys_ids
            const relatedSysIds = new Set([
                ...sourceNode.outbound_relations.map(r => r.target.value),
                ...sourceNode.inbound_relations.map(r => r.target.value)
            ]);

            const relatedIdsArray = Array.from(relatedSysIds);
            let filteredSysIds = new Set<string>();

            const skippedSysIds: string[] = [];
 
            if (relatedIdsArray.length > 0) {
                const limit = pLimit(5); // Limit concurrency to 5
                const fetchRelatedNode = async (sysId: string) => {
                    try {
                        const relatedNodeResponse = await axiosInstance.get(`${url}/api/now/cmdb/instance/${className}/${sysId}`, {
                            headers: { Authorization: authHeader },
                            timeout: 10000 // 10 seconds timeout
                        });

                        const relatedAttributes = relatedNodeResponse.data.result.attributes;
                        if (isNodeValid(relatedAttributes)) {
                            filteredSysIds.add(sysId);
                        }
                    } catch (error: any) {
                        if (error.response?.status === 404) {
                            skippedSysIds.push(sysId);
                            return;
                        }
                        Logger.error(`Failed to fetch related node sys_id: ${sysId} - Error: ${error.message || error}`);
                    }
                };

                const fetchPromises = relatedIdsArray.map(sysId => limit(() => fetchRelatedNode(sysId)));
                await Promise.allSettled(fetchPromises);
                if (skippedSysIds.length > 0) {
                    Logger.info(`Skipped ${skippedSysIds.length} related nodes of resourceid  ${resourceId} due to 404. Sample sys_ids: ${skippedSysIds.slice(0, 5).join(', ')}`);
                }
            }

            // Instance Name Check
            const instance = config.instance || ''; // Get the instance name from the environment variable
            const isLillyInstance = instance === 'LILLY';
            // Relationships discovery
            let relationships = [];
            // Only discover relationships if enabled via env
            if (config.enableRelationshipDiscovery) {
                Logger.info(`Relationship discovery is ENABLED for resourceId ${resourceId}`);

                // capturing outbound relationships
                const outbound_relationships = sourceNode.outbound_relations.map((relation) => {
                    if (relation.type?.display_value) {
                        uniqueRelationshipTypes.add(relation.type.display_value);
                    }
                    let relationship = 'CONNECTS';
                    let source_id = sourceNode.attributes.sys_id;
                    let destination_id = relation.target.value;
                    let relationshipDoc = {
                        src_id: source_id,
                        dest_id: destination_id,
                        label: relationship,
                        properties: {
                            id: `${source_id}.${relationship}.${destination_id}`,
                            timestamp: new Date(),
                            weight: 1,
                            cost: 1
                        },
                        zone_id: body.zone_id,
                        stack_id: body.stack_id,
                    }
                    return relationshipDoc;
                });

                const inbound_relationships = sourceNode.inbound_relations.map((relation) => {
                    if (relation.type?.display_value) {
                        uniqueRelationshipTypes.add(relation.type.display_value);
                    }
                    let relationship = 'CONNECTS';
                    let destination_id = sourceNode.attributes.sys_id;
                    let source_id = relation.target.value;
                    let relationshipDoc = {
                        src_id: source_id,
                        dest_id: destination_id,
                        label: relationship,
                        properties: {
                            id: `${source_id}.${relationship}.${destination_id}`,
                            timestamp: new Date(),
                            weight: 1,
                            cost: 1
                        },
                        zone_id: body.zone_id,
                        stack_id: body.stack_id,
                    }
                    return relationshipDoc;
                });

                if (isLillyInstance) {
                    const filteredOutbound = outbound_relationships.filter(rel => filteredSysIds.has(rel.dest_id));
                    const filteredInbound = inbound_relationships.filter(rel => filteredSysIds.has(rel.src_id));
                    relationships = [...filteredOutbound, ...filteredInbound];
                } else {
                    relationships = [...outbound_relationships, ...inbound_relationships];
                }
                await publishToDIS(relationships, 'relationship');
                
                // 🔥 Log all unique relationship types found
                Logger.info(`Unique relationship types for resource ${resourceId}: ${[...uniqueRelationshipTypes].join(', ')}`);
            } else {
                Logger.info(`Relationship discovery is DISABLED for resourceId ${resourceId}`);
            }


        } else {
            Logger.error(`Cannot describe resource: ${response.data?.error?.detail}`);
            return new Error(response.data?.error?.detail)
        }
    } catch(err:any){
        Logger.error(`Cannot describe resource for given resource ID: ${err}`);
        return err;
    }
}

export {
    describeResourceService
}