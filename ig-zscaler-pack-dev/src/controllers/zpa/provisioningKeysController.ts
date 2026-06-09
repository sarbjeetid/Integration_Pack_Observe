// src/controllers/zpa/provisioningKeysController.ts

import { Request, Response } from 'express';
import * as provisioningKeyService from '../../services/zpa/provisioningKeys/provisioningKeyService';
import { createGetController, createCreateController, createUpdateController, createDeleteController, getBaseUrlFromRequest, getCustomerIdFromRequest } from './controllerFactory';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

export const listConnectorProvisioningKeysController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await provisioningKeyService.listConnectorProvisioningKeys(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Connector Provisioning Keys');
    }
};

export const listServiceEdgeProvisioningKeysController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await provisioningKeyService.listServiceEdgeProvisioningKeys(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Service Edge Provisioning Keys');
    }
};

export const getProvisioningKeyController = createGetController(provisioningKeyService.getProvisioningKeyById, 'Get Provisioning Key', 'keyId');
export const createProvisioningKeyController = createCreateController(provisioningKeyService.createProvisioningKey, 'Create Provisioning Key');
export const updateProvisioningKeyController = createUpdateController(provisioningKeyService.updateProvisioningKey, 'Update Provisioning Key', 'keyId');
export const deleteProvisioningKeyController = createDeleteController(provisioningKeyService.deleteProvisioningKey, 'Provisioning Key', 'keyId');
