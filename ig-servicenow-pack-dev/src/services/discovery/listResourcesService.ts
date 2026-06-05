import winston from 'winston';
import { Container } from 'typedi';
import  { AxiosInstance } from 'axios';
import config from "../../config"
import { ServicenowDiscoveryBodyI } from '../../interfaces/config';
import { DaprClient } from 'dapr-client';
import sleep from '../../utils/sleep';
const listResourcesService = async(body: ServicenowDiscoveryBodyI, className: string, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    let totalResourcesCount = 0;
    try{
        const {username, password, url} = body;
        const listResourcesURL = body.query ? `${url}/api/now/cmdb/instance/${className}?sysparm_query=${body.query}` : `${url}/api/now/cmdb/instance/${className}`;
        const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        let params:any = {
            sysparm_limit: 1000
        };
        let nextURL:any = listResourcesURL;
        while(nextURL){
            const response = await axiosInstance.get(nextURL, { 
                headers:{
                    Authorization: authHeader
                },
                params
              });
            if(response.status === 200){
                const resourcesList: {sys_id:string, name:string}[] = response.data.result;
                const resourceIdList = resourcesList.map(resource => resource.sys_id);
                const maxDiscoveryCount = config.maxResourceDiscoveryCount;
    
                //  loop over all resource IDs and add message in describeResource topic
                for (let resourceId of resourceIdList) {

                    // Stop if we've hit the limit
                    if (maxDiscoveryCount && totalResourcesCount >= maxDiscoveryCount) {
                        Logger.info(`Discovery limit of ${maxDiscoveryCount} reached. Stopping further processing.`);
                        nextURL = null; // Break the while loop
                        break;
                    }
                    let message = {
                        body,
                        className,
                        resourceId,
                        contextId
                    };
                    const pubSubName = config.discoveryPubSubName;
                    const topic = config.describeResourceTopicName;
                    try {
                        await sleep(config.waitTimeinMs);
                        const response = await daprClient.pubsub.publish(
                            pubSubName,
                            topic,
                            message
                        );
                    } catch (err) {
                        Logger.error(`Cannot publish to describe resource topic: ${err}`);
                    }
                    totalResourcesCount++; // Increment here instead of batch-size level
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
                Logger.error(`Cannot list resources for className: ${response.data?.error?.message}`);
                return new Error(response.data?.error?.message)
            }
        }
        Logger.info(`Total number of resources retrieved for class ${className}: ${totalResourcesCount}`);
        
    } catch(err:any){
        // cmdb apis are not accessible, so try table APIs
        if (err.response && err.response.status >= 400 && err.response.status < 500){
            // write code to add jobs to describeAllNodes and describeAllRelationships
            const pubSubName = config.discoveryPubSubName;
            const describeAllResourcesTopic = config.describeAllResourcesTopicName;
            const resourceMessage = {
                body,
                className,
                contextId
            }
            try {
                await sleep(config.waitTimeinMs);
               await daprClient.pubsub.publish(
                    pubSubName,
                    describeAllResourcesTopic,
                    resourceMessage
                );
            } catch (err) {
                Logger.error(`Cannot publish to describeAllResources topic: ${err}`);
            }

        } else {
            Logger.error(`Cannot list resources for the given className: ${err}`);
            return err;
        }
    }
}

export {
    listResourcesService
}