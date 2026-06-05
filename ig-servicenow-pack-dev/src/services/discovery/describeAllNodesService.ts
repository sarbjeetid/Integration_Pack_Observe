import winston from 'winston';
import { Container } from 'typedi';
import  { AxiosInstance } from 'axios';
import config from "../../config";
import sleep from '../../utils/sleep';
import { ServicenowDiscoveryBodyI } from '../../interfaces/config';
import { publishToDIS } from '../../utils/publishToDIS';
import { DaprClient } from 'dapr-client';

const describeAllNodesService = async(body: ServicenowDiscoveryBodyI, className: string, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    try{
        const {url, username, password} = body;
        const describeAllResourcesURL = body.query ? `${url}/api/now/table/${className}?sysparm_query=${body.query}` : `${url}/api/now/table/${className}`;
        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        let params:any = {
            sysparm_limit: 100
        };
        let nextURL:any = describeAllResourcesURL;
        while(nextURL) {
            // local nodes array for every iteration
            // let nodes:any[] = [];
            const response = await axiosInstance.get(nextURL, { 
                headers:{
                    Authorization: authHeader
                },
                params
              });
            if(response.status === 200){
                const sourceNodes:any[] = response.data.result;
                let nodes = sourceNodes.map((sourceNode) => {
                    const properties  = {source_properties: sourceNode};
                    let node:any = {
                        source_name: sourceNode.name || "No Name",
                        id: sourceNode.sys_id,
                        zone_id: body.zone_id,
                        stack_id: body.stack_id,
                        properties: JSON.stringify(properties),
                        location: sourceNode.location?.display_value || "NA",
                        type: "ci",
                        source_type: sourceNode.sys_class_name || className,
                        label: `CI:${(sourceNode.sys_class_name || className).toUpperCase()}`,
                        citype: sourceNode.sys_class_name || className,
                        display_type: sourceNode.sys_class_name || className,
                    }
                    if(sourceNode.u_id){
                        node.ci_merge_key = sourceNode.u_id;
                    }
                    let itsm:any = {};
                    if(sourceNode.category){
                        itsm.category = sourceNode.category;
                    }
                    if(sourceNode.subcategory){
                        itsm.sub_category = sourceNode.subcategory;
                    }
                    if(sourceNode.location){
                        itsm.location = sourceNode.location?.value;
                    }
                    if(sourceNode.assignment_group){
                        itsm.assignment_group = sourceNode.assignment_group;
                    }
                    if(sourceNode.u_id){
                        itsm.center_id = sourceNode.u_id;
                    }
                    node = {
                        ...node,
                        itsm
                    }
                    return node;
                });
                // send nodes to DIS
                await publishToDIS(nodes, 'ci');
            

                // take out sys_id from the nodes
                let nodeIds = nodes.map(node => node.id);
                // add job to describe all relationships queue
                const pubSubName = config.discoveryPubSubName;
                const describeAllRelationshipsTopic = config.describeAllRelationshipsTopicName;
                // querying relationships from cmdb_rel_ci table
                const relationshipMessage = {
                    body,
                    className: 'cmdb_rel_ci',
                    nodeIds,
                    contextId
                }
                try {
                    await sleep(config.waitTimeinMs);
                    await daprClient.pubsub.publish(
                        pubSubName,
                        describeAllRelationshipsTopic,
                        relationshipMessage
                    );
                } catch (err) {
                    Logger.error(`Cannot publish to describeAllRelationships topic: ${err}`);
                }
                // Check for the next link in headers
                const linkHeader = response.headers['link'];
                nextURL = null; // default to no next URL
                if (linkHeader) {
                    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                    if (match) {
                        nextURL = match[1];
                    }
                }

                // Clear params for subsequent requests if nextUrl is set
                if (nextURL) {
                    params = {};
                }
            } else {
                Logger.error(`Cannot describe all resources for className: ${className}`)
                nextURL = null;
            }
        }
    } catch(err){
        Logger.error(`Cannot describe all resources for given the className: ${err}`);
        return err;
    }

}

export {
    describeAllNodesService
}