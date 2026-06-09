// src/services/zpa/customer/customerService.ts

import ZPAClient from '../zpaClient';
import { ZPACustomer } from '../../../interfaces/zpa';

/**
 * Get customer information
 */
export const getCustomer = async (
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPACustomer> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('', customerId);
        return await ZPAClient.get<ZPACustomer>(client, endpoint || '/mgmtconfig/v1/admin/customers');
    } catch (error) {
        throw new Error(`[getCustomer] ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Update customer information
 */
export const updateCustomer = async (
    customerData: Partial<ZPACustomer>,
    authHeader: any,
    baseUrl: string,
    customerId?: string
): Promise<ZPACustomer> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('', customerId);
        return await ZPAClient.put<ZPACustomer>(client, endpoint || '/mgmtconfig/v1/admin/customers', customerData);
    } catch (error) {
        throw new Error(`[updateCustomer] ${error instanceof Error ? error.message : String(error)}`);
    }
};
