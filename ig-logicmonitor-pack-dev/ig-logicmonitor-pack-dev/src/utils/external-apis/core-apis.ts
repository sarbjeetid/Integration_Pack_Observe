import { axiosInstance } from './core-auth';
import { Container } from 'typedi';
import winston from 'winston';
import path from 'path';

enum ApiPathOptions {
    fetchStackDocumentApi = '/api/packs/fetchStackDocument',
    deleteNodeApi = '/api/discovery/core/discovery/deleteNodes',
    getSourceIdBySourceNameApi = '/api/elasticsearch/getSourceIdBySourceName',
    auditLogApi = '/api/auditLogs/saveAuditLogs',
    updateStackById = '/api/onboarding/stack/updateById'

}


const logCoreApiError = (operation: string, error: any) => {
    
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    const message = error?.response?.data?.message || error?.message || error;
    loggerInstance.error(
        `[core-apis] ${operation} failed: ${message}`,
        { path: path.relative(process.cwd(), __filename) }
    );
};

const fetchStackDocument = async (id: string, zone_id: string) => {
    try {
        const res = await axiosInstance.post(
            ApiPathOptions.fetchStackDocumentApi as string,
            {
                id,
                zone_id
            }
        );

        if (!res.data.success) {
            throw new Error(res.data.message);
        } else {
            return res.data.message;
        }
    } catch (err: any) {
        logCoreApiError('fetchStackDocument', err);
    }

};

const deleteNode = async (source_ids: string[]) => {
    const res = await axiosInstance.post(
        ApiPathOptions.deleteNodeApi as string,
        {
            sourceIds: source_ids
        }
    );

    if (res.status === 400) {
        return false;
    } else {
        return true;
    }
}

const getSourceIdBySourceName = async (stack_id: string, source_name: string) => {
    try {
        const res = await axiosInstance.post(
            ApiPathOptions.getSourceIdBySourceNameApi as string,
            {
                stack_id,
                source_name
            }
        );

        if (res.status!= 200) {
            throw new Error(res.data.message);
        } else {
            const sourceIdObj = res.data.source_id;
            const keyOfSourceId = Object.keys(sourceIdObj)[0];  // Get the key in the object
            return sourceIdObj[keyOfSourceId];  // Return the value associated with the key
        }
    } catch (err: any) {
        logCoreApiError('getSourceIdBySourceName', err);
    }
};

const auditLog = async (auditLogData: object, action: string) => {
    const res = await axiosInstance.post(
        ApiPathOptions.auditLogApi as string,
        {
            ...auditLogData,
            action
        }
    );

    if (res.status === 400) {
        return false;
    } else {
        return true;
    }
}
const markDiscoverySuccess = async (
    stack_id: string,
    when?: Date | string
): Promise<boolean> => {
    try {
        const ts = when
            ? (typeof when === 'string' ? new Date(when) : when)
            : new Date();
        const iso = ts.toISOString();

        const url = `${ApiPathOptions.updateStackById}?stackId=${encodeURIComponent(stack_id)}`;
        const res = await axiosInstance.patch(url, {
            last_successful_discovery_timestamp: iso
        });

        return res.status >= 200 && res.status < 300;
    } catch (err: any) {
        logCoreApiError('markDiscoverySuccess', err);
        return false;
    }
};
const markInterfaceDiscoverySuccess = async (
    stack_id: string,
    when?: Date | string
): Promise<boolean> => {
    try {
        const ts = when
            ? (typeof when === 'string' ? new Date(when) : when)
            : new Date();
        const iso = ts.toISOString();

        const url = `${ApiPathOptions.updateStackById}?stackId=${encodeURIComponent(stack_id)}`;
        const res = await axiosInstance.patch(url, {
            last_successful_interface_discovery_timestamp: iso
        });

        return res.status >= 200 && res.status < 300;
    } catch (err: any) {
        logCoreApiError('markInterfaceDiscoverySuccess', err);
        return false;
    }
};
export { fetchStackDocument, deleteNode, getSourceIdBySourceName, auditLog, markDiscoverySuccess, markInterfaceDiscoverySuccess };
