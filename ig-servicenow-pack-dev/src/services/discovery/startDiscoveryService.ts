import winston from 'winston';
import { Container } from 'typedi';
import  { AxiosInstance } from 'axios';
import config from "../../config"
import { ServicenowDiscoveryBodyI } from '../../interfaces/config';
import { DaprClient } from 'dapr-client';
import sleep from '../../utils/sleep';
const startDiscoveryService = async(body: ServicenowDiscoveryBodyI, contextId: string)=>{
    const Logger: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    try{
       
        const classNames = ['cmdb_ci']

        //  loop over all classNames and add message in listResources topic
        for (let className of classNames) {
            let message = {
                body,
                className,
                contextId
            };
            const pubSubName = config.discoveryPubSubName;
            const topic = config.listResourcesTopicName;
            try {
                await sleep(config.waitTimeinMs);
               await daprClient.pubsub.publish(
                    pubSubName,
                    topic,
                    message
                );
            } catch (err) {
                Logger.error(`Cannot publish to list resources topic: ${err}`);
            }
        }

    } catch(err:any){
        // sys_db_object table is not accessible, only send request for cmdb_ci table
        if (err.response && err.response.status >= 400 && err.response.status < 500){
            const className = 'cmdb_ci';
            let message = {
                body,
                className,
                contextId
            };
            const pubSubName = config.discoveryPubSubName;
            const topic = config.listResourcesTopicName;
            try {
                await sleep(config.waitTimeinMs);
                const response = await daprClient.pubsub.publish(
                    pubSubName,
                    topic,
                    message
                );
            } catch (err) {
                Logger.error(`Cannot publish to list resources topic: ${err}`);
            }

        } else {
            Logger.error(`Error in start discovery from serviceNow instance: ${err}`);
            throw err;
        }
    }
}

export {
    startDiscoveryService
}