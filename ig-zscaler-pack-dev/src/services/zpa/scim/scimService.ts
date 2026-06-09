// src/services/zpa/scim/scimService.ts

import ZPAClient from '../zpaClient';
import { ZPASCIMAttribute, ZPAListResponse } from '../../../interfaces/zpa';

export const listSCIMAttributes = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPASCIMAttribute>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/scimattributeheader', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPASCIMAttribute>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listSCIMAttributes] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getSCIMAttributeById = async (attributeId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPASCIMAttribute> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/scimattributeheader/${attributeId}`, customerId);
        return await ZPAClient.get<ZPASCIMAttribute>(client, endpoint);
    } catch (error) {
        throw new Error(`[getSCIMAttributeById] ${error instanceof Error ? error.message : String(error)}`);
    }
};
