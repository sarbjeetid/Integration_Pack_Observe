// src/controllers/zpa/customerController.ts

import { Request, Response } from 'express';
import * as customerService from '../../services/zpa/customer/customerService';
import { getBaseUrlFromRequest, getCustomerIdFromRequest } from './controllerFactory';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

export const getCustomerController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await customerService.getCustomer(authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Customer');
    }
};

export const updateCustomerController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await customerService.updateCustomer(req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Customer');
    }
};
