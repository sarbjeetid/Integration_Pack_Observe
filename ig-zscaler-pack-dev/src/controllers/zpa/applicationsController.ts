// src/controllers/zpa/applicationsController.ts

import { Request, Response } from 'express';
import * as applicationService from '../../services/zpa/applications/applicationService';
import * as segmentGroupService from '../../services/zpa/applications/segmentGroupService';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

const authType = config.authType;

const getBaseUrlFromRequest = (req: Request): string | undefined => {
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') return req.query.baseUrl;
    if (req.headers['x-zscaler-base-url'] && typeof req.headers['x-zscaler-base-url'] === 'string') return req.headers['x-zscaler-base-url'];
    if (req.body?.baseUrl) return req.body.baseUrl;
    return undefined;
};

const getCustomerIdFromRequest = (req: Request): string | undefined => {
    if (req.query.customerId && typeof req.query.customerId === 'string') return req.query.customerId;
    if (req.headers['x-zscaler-customer-id'] && typeof req.headers['x-zscaler-customer-id'] === 'string') return req.headers['x-zscaler-customer-id'];
    if (req.body?.customerId) return req.body.customerId;
    return undefined;
};

// Applications
export const listApplicationsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await applicationService.listApplications(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Applications');
    }
};

export const getApplicationController = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        if (!applicationId) throw new Error('Missing applicationId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await applicationService.getApplicationById(applicationId, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Application');
    }
};

export const createApplicationController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await applicationService.createApplication(req.body, authHeader, baseUrl, customerId);
        res.status(201).json(data);
    } catch (error) {
        handleControllerError(error, res, 'Create Application');
    }
};

export const updateApplicationController = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        if (!applicationId) throw new Error('Missing applicationId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await applicationService.updateApplication(applicationId, req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Application');
    }
};

export const deleteApplicationController = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        if (!applicationId) throw new Error('Missing applicationId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await applicationService.deleteApplication(applicationId, authHeader, baseUrl, customerId);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        handleControllerError(error, res, 'Delete Application');
    }
};

// Segment Groups
export const listSegmentGroupsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await segmentGroupService.listSegmentGroups(authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Segment Groups');
    }
};

export const getSegmentGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await segmentGroupService.getSegmentGroupById(groupId, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Segment Group');
    }
};

export const createSegmentGroupController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await segmentGroupService.createSegmentGroup(req.body, authHeader, baseUrl, customerId);
        res.status(201).json(data);
    } catch (error) {
        handleControllerError(error, res, 'Create Segment Group');
    }
};

export const updateSegmentGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const data = await segmentGroupService.updateSegmentGroup(groupId, req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Segment Group');
    }
};

export const deleteSegmentGroupController = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        if (!groupId) throw new Error('Missing groupId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await segmentGroupService.deleteSegmentGroup(groupId, authHeader, baseUrl, customerId);
        res.json({ message: 'Segment Group deleted successfully' });
    } catch (error) {
        handleControllerError(error, res, 'Delete Segment Group');
    }
};
