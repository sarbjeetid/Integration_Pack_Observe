import winston from 'winston';
import { Container } from 'typedi';
import config from "../../config";
import { ZscalerDiscoveryBodyI } from '../../interfaces/config';
import { publishToDIS } from '../../utils/publishToDIS';
import { resolveZPABaseUrl, resolveZIABaseUrl } from '../../utils/endpointResolver';
import { getAuthHeaderFromDiscoveryBody } from './listResourcesService';

// Import services
import * as applicationService from '../zpa/applications/applicationService';
import * as connectorService from '../zpa/connectors/connectorService';
import * as connectorGroupService from '../zpa/connectors/connectorGroupService';
import * as serviceEdgeService from '../zpa/serviceEdges/serviceEdgeService';
import * as serviceEdgeGroupService from '../zpa/serviceEdges/serviceEdgeGroupService';
import * as ziaService from '../zia';

export const describeResourceService = async (
    body: ZscalerDiscoveryBodyI,
    className: string,
    resourceId: string,
    contextId: string
) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    try {
        const isZIA = className.startsWith('zia_');
        const baseUrl = isZIA ? (body.ziaBaseUrl || resolveZIABaseUrl()) : (body.zpaBaseUrl || resolveZPABaseUrl());
        const customerId = body.customerId;

        const authHeader = await getAuthHeaderFromDiscoveryBody(body, baseUrl);

        let resourceData: any = null;

        switch (className) {
            case 'zpa_application':
                resourceData = await applicationService.getApplicationById(resourceId, authHeader, baseUrl, customerId);
                break;
            case 'zpa_connector':
                resourceData = await connectorService.getConnectorById(resourceId, authHeader, baseUrl, customerId);
                break;
            case 'zpa_connector_group':
                resourceData = await connectorGroupService.getConnectorGroupById(resourceId, authHeader, baseUrl, customerId);
                break;
            case 'zpa_service_edge':
                resourceData = await serviceEdgeService.getServiceEdgeById(resourceId, authHeader, baseUrl, customerId);
                break;
            case 'zpa_service_edge_group':
                resourceData = await serviceEdgeGroupService.getServiceEdgeGroupById(resourceId, authHeader, baseUrl, customerId);
                break;
            case 'zia_url_category':
                resourceData = await ziaService.getURLCategoryById(resourceId, authHeader, baseUrl);
                break;
            case 'zia_url_policy':
                resourceData = await ziaService.getURLPolicyById(resourceId, authHeader, baseUrl);
                break;
            default:
                throw new Error(`Unknown Zscaler className: ${className}`);
        }

        if (!resourceData) {
            throw new Error(`No resource data retrieved for class ${className} id ${resourceId}`);
        }

        const properties = { source_properties: resourceData };
        const node: any = {
            source_name: resourceData.name || resourceData.displayName || "No Name",
            id: resourceId,
            zone_id: body.zone_id,
            stack_id: body.stack_id,
            properties: JSON.stringify(properties),
            location: resourceData.location || "NA",
            type: "ci",
            source_type: className,
            label: `CI:${className.toUpperCase()}`,
            citype: className,
            display_type: className,
        };

        // Publish CI to DIS
        await publishToDIS(node, 'ci');

        // Capture Relationships
        if (config.enableRelationshipDiscovery !== false) {
            const relationships: any[] = [];

            // 1. ZPA Connector -> ZPA Connector Group relationship
            if (className === 'zpa_connector' && resourceData.appConnectorGroupId) {
                relationships.push({
                    src_id: resourceId,
                    dest_id: String(resourceData.appConnectorGroupId),
                    label: 'BELONGS_TO',
                    properties: {
                        id: `${resourceId}.BELONGS_TO.${resourceData.appConnectorGroupId}`,
                        timestamp: new Date(),
                        weight: 1,
                        cost: 1
                    },
                    zone_id: body.zone_id,
                    stack_id: body.stack_id,
                });
            }

            // 2. ZPA Service Edge -> ZPA Service Edge Group relationship
            if (className === 'zpa_service_edge' && resourceData.serviceEdgeGroupId) {
                relationships.push({
                    src_id: resourceId,
                    dest_id: String(resourceData.serviceEdgeGroupId),
                    label: 'BELONGS_TO',
                    properties: {
                        id: `${resourceId}.BELONGS_TO.${resourceData.serviceEdgeGroupId}`,
                        timestamp: new Date(),
                        weight: 1,
                        cost: 1
                    },
                    zone_id: body.zone_id,
                    stack_id: body.stack_id,
                });
            }

            // 3. ZPA Application -> App Server Group relationships
            if (className === 'zpa_application' && Array.isArray(resourceData.appServerGroups)) {
                for (const group of resourceData.appServerGroups) {
                    if (group.id) {
                        relationships.push({
                            src_id: resourceId,
                            dest_id: String(group.id),
                            label: 'ASSOCIATED_WITH',
                            properties: {
                                id: `${resourceId}.ASSOCIATED_WITH.${group.id}`,
                                timestamp: new Date(),
                                weight: 1,
                                cost: 1
                            },
                            zone_id: body.zone_id,
                            stack_id: body.stack_id,
                        });
                    }
                }
            }

            if (relationships.length > 0) {
                await publishToDIS(relationships, 'relationship');
                Logger.info(`Published ${relationships.length} relationships for Zscaler resource ${resourceId}`);
            }
        }
    } catch (err: any) {
        Logger.error(`Error describing resource ${className}/${resourceId}: ${err.message || err}`);
    }
};
