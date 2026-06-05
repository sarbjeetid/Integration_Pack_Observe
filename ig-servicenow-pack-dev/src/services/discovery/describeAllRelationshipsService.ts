import winston from 'winston';
import { Container } from 'typedi';
import  { AxiosInstance } from 'axios';
import { ServicenowDiscoveryBodyI } from '../../interfaces/config';
import { publishToDIS } from '../../utils/publishToDIS';

const describeAllRelationshipsService = async(body: ServicenowDiscoveryBodyI, className: string, nodeIds: string[], contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const axiosInstance: AxiosInstance = Container.get('axiosInstance');
    try{
        const {url, username, password} = body;
        const describeAllRelationshipsURL = `${url}/api/now/table/${className}`;
        const credentials = `${username}:${password}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');
        const authHeader = `Basic ${encodedCredentials}`;
        
        let params:any = {
            sysparm_query: `parent.sys_idIN${nodeIds.join(',')}^ORchild.sys_idIN${nodeIds.join(',')}`,
            sysparm_limit: 100
        };
        let nextURL:any = describeAllRelationshipsURL;
        while(nextURL) {
            // local nodes array for every iteration
            const response = await axiosInstance.get(nextURL, { 
                headers:{
                    Authorization: authHeader
                },
                params
              });
            if(response.status === 200){
                const sourceRelationships:any[] = response.data.result;
                let relationships = sourceRelationships.map((sourceRelationship) => {
                   // figure out relationship type, using CONNECTS for now
                    let relationshipType = 'CONNECTS';
                    let source_id = sourceRelationship.parent.value;
                    let destination_id = sourceRelationship.child.value;
                    let relationship = {
                        src_id: source_id,
                        dest_id: destination_id,
                        label: relationshipType,
                        properties: {
                            id: `${source_id}.${relationshipType}.${destination_id}`,
                            timestamp: new Date(),
                            weight: 1,
                            cost: 1
                        },
                    }
                    return relationship;
                });
                // send nodes to DIS
                await publishToDIS(relationships, 'relationship');

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
                Logger.error(`Cannot describe all relationships for className: ${className} and URL: ${nextURL}`)
                nextURL = null;
            }
        }     
    } catch(err){
        Logger.error(`Cannot describe all relationships for given the className: ${err}`);
        return err;
    }

}

export {
    describeAllRelationshipsService
}