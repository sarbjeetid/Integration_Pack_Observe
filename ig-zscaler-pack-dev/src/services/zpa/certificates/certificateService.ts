// src/services/zpa/certificates/certificateService.ts

import ZPAClient from '../zpaClient';
import { ZPACertificate, ZPAListResponse } from '../../../interfaces/zpa';

export const listCertificates = async (authHeader: any, baseUrl: string, customerId?: string, params?: any): Promise<ZPAListResponse<ZPACertificate>> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/certificate', customerId);
        return await ZPAClient.get<ZPAListResponse<ZPACertificate>>(client, endpoint, params);
    } catch (error) {
        throw new Error(`[listCertificates] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getCertificateById = async (certId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPACertificate> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/certificate/${certId}`, customerId);
        return await ZPAClient.get<ZPACertificate>(client, endpoint);
    } catch (error) {
        throw new Error(`[getCertificateById] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const createCertificate = async (certData: ZPACertificate, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPACertificate> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath('/certificate', customerId);
        return await ZPAClient.post<ZPACertificate>(client, endpoint, certData);
    } catch (error) {
        throw new Error(`[createCertificate] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const updateCertificate = async (certId: string, certData: Partial<ZPACertificate>, authHeader: any, baseUrl: string, customerId?: string): Promise<ZPACertificate> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/certificate/${certId}`, customerId);
        return await ZPAClient.put<ZPACertificate>(client, endpoint, certData);
    } catch (error) {
        throw new Error(`[updateCertificate] ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const deleteCertificate = async (certId: string, authHeader: any, baseUrl: string, customerId?: string): Promise<void> => {
    try {
        const client = ZPAClient.getClient(authHeader, baseUrl, customerId);
        const endpoint = ZPAClient.buildMgmtConfigPath(`/certificate/${certId}`, customerId);
        await ZPAClient.delete(client, endpoint);
    } catch (error) {
        throw new Error(`[deleteCertificate] ${error instanceof Error ? error.message : String(error)}`);
    }
};
