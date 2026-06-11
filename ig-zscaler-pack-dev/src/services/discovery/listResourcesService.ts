import winston from 'winston';
import { Container } from 'typedi';
import axios from 'axios';
import { URLSearchParams } from 'url';
import config from "../../config";
import { ZscalerDiscoveryBodyI } from '../../interfaces/config';
import { DaprClient } from 'dapr-client';
import { resolveZPABaseUrl, resolveZIABaseUrl } from '../../utils/endpointResolver';

// Import services
import * as applicationService from '../zpa/applications/applicationService';
import * as connectorService from '../zpa/connectors/connectorService';
import * as connectorGroupService from '../zpa/connectors/connectorGroupService';
import * as serviceEdgeService from '../zpa/serviceEdges/serviceEdgeService';
import * as serviceEdgeGroupService from '../zpa/serviceEdges/serviceEdgeGroupService';
import * as ziaService from '../zia';

const sleepMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAuthHeaderFromDiscoveryBody = async (body: ZscalerDiscoveryBodyI, baseUrl: string): Promise<any> => {
    if (body.apiKey) {
        return {
            'Authorization': `Bearer ${body.apiKey}`,
            'Content-Type': 'application/json'
        };
    }
    if (body.clientId && body.clientSecret) {
        const tokenUrl = `${baseUrl}/signin`;
        const params = new URLSearchParams();
        params.append('client_id', body.clientId);
        params.append('client_secret', body.clientSecret);

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
        });

        if (!response.data?.access_token) {
            throw new Error('Zscaler API response missing access_token');
        }

        return {
            'Authorization': `Bearer ${response.data.access_token}`,
            'Content-Type': 'application/json'
        };
    }

    // Fallback to static config
    if (config.authType === 'api-key') {
        return {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        };
    } else {
        const tokenUrl = `${baseUrl}/signin`;
        const params = new URLSearchParams();
        params.append('client_id', config.clientId);
        params.append('client_secret', config.clientSecret);
        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
        });
        return {
            'Authorization': `Bearer ${response.data.access_token}`,
            'Content-Type': 'application/json'
        };
    }
};

export const listResourcesService = async (body: ZscalerDiscoveryBodyI, className: string, contextId: string) => {
    const Logger: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');
    let totalResourcesCount = 0;

    try {
        const isZIA = className.startsWith('zia_');
        const baseUrl = isZIA ? (body.ziaBaseUrl || resolveZIABaseUrl()) : (body.zpaBaseUrl || resolveZPABaseUrl());
        const customerId = body.customerId;

        const authHeader = await getAuthHeaderFromDiscoveryBody(body, baseUrl);

        let items: any[] = [];

        switch (className) {
            case 'zpa_application': {
                const res = await applicationService.listApplications(authHeader, baseUrl, customerId);
                items = res.list || res.data || [];
                break;
            }
            case 'zpa_connector': {
                const res = await connectorService.listConnectors(authHeader, baseUrl, customerId);
                items = res.list || res.data || [];
                break;
            }
            case 'zpa_connector_group': {
                const res = await connectorGroupService.listConnectorGroups(authHeader, baseUrl, customerId);
                items = res.list || res.data || [];
                break;
            }
            case 'zpa_service_edge': {
                const res = await serviceEdgeService.listServiceEdges(authHeader, baseUrl, customerId);
                items = res.list || res.data || [];
                break;
            }
            case 'zpa_service_edge_group': {
                const res = await serviceEdgeGroupService.listServiceEdgeGroups(authHeader, baseUrl, customerId);
                items = res.list || res.data || [];
                break;
            }
            case 'zia_url_category': {
                const res = await ziaService.listURLCategories(authHeader, baseUrl);
                items = res.list || res.data || (Array.isArray(res) ? res : []);
                break;
            }
            case 'zia_url_policy': {
                const res = await ziaService.listURLPolicies(authHeader, baseUrl);
                items = res.list || res.data || (Array.isArray(res) ? res : []);
                break;
            }
            default:
                throw new Error(`Unknown Zscaler className: ${className}`);
        }

        const maxDiscoveryCount = config.maxResourceDiscoveryCount;
        const pubSubName = config.discoveryPubSubName || 'discovery-pub-sub';
        const topic = config.describeResourceTopicName || 'zscaler-describeresource';

        for (const item of items) {
            const resourceId = item.id || item.sys_id;
            if (!resourceId) {
                Logger.warn(`Skipping item without ID for className ${className}: ${JSON.stringify(item)}`);
                continue;
            }

            if (maxDiscoveryCount && totalResourcesCount >= maxDiscoveryCount) {
                Logger.info(`Discovery limit of ${maxDiscoveryCount} reached. Stopping.`);
                break;
            }

            const message = {
                body,
                className,
                resourceId: String(resourceId),
                contextId
            };

            try {
                await sleepMs(config.waitTimeInMs || 5000);
                await daprClient.pubsub.publish(pubSubName, topic, message);
                totalResourcesCount++;
            } catch (err) {
                Logger.error(`Cannot publish describe resource for ${className}/${resourceId}: ${err}`);
            }
        }

        Logger.info(`Total resources identified for class ${className}: ${totalResourcesCount}`);
    } catch (err: any) {
        Logger.error(`Error listing resources for class ${className}: ${err.message || err}`);
    }
};
