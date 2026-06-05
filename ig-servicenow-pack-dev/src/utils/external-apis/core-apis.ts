import { axiosInstance } from './core-auth';

enum ApiPathOptions {
    fetchStackDocument = '/api/packs/fetchStackDocument',
    deleteNode = '/api/discovery/core/discovery/deleteNodes',
    auditLog = '/api/auditLogs/saveAuditLogs'
};
import path from 'path';
import { Container } from 'typedi';
import winston from 'winston';

const fetchStackDocument = async (id: string, zone_id: string) => {
    const res = await axiosInstance.post(
        ApiPathOptions.fetchStackDocument as string,
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
};

const deleteNode = async (source_ids: string[]) => {
    const res = await axiosInstance.post(
        ApiPathOptions.deleteNode as string,
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

const auditLogApi = async (auditLogData: object, action: string): Promise<boolean> => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');

    try {
        const res = await axiosInstance.post(
            ApiPathOptions.auditLog as string,
            {
                ...auditLogData,
                action,
            }
        );

        if (![200, 201].includes(res.status)) {
            loggerInstance.warn(`⚠️ Audit log failed with ${res.status} Bad Request: ${JSON.stringify(auditLogData)}`, {
                path: path.relative(process.cwd(), __filename),
            });
            return false;
        }

        loggerInstance.info(`✅ Audit log successfully created for action: ${action}`, {
            path: path.relative(process.cwd(), __filename),
        });
        return true;
    } catch (error: any) {
        const statusCode = error?.response?.status;
        const responseMessage = error?.response?.data?.message || JSON.stringify(error?.response?.data);
        const defaultMessage = error.message || 'Unknown error';

        loggerInstance.error(`❌ Error while sending audit log: ${defaultMessage}${statusCode ? ` | Status: ${statusCode}` : ''}${responseMessage ? ` | Message: ${responseMessage}` : ''}`, {
            path: path.relative(process.cwd(), __filename),
            stack: error.stack,
            auditLogPayload: auditLogData,
        });
        return false;
    }
};

export { fetchStackDocument, deleteNode, auditLogApi };
