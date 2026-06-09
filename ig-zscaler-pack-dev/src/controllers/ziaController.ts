// src/controllers/ziaController.ts

import { Request, Response } from 'express';
import * as ziaService from '../services/zia';
import { getAuthHeader } from '../services/authentication/authService';
import config from '../config';
import { handleControllerError } from '../utils/errorHandling';
import { resolveZIABaseUrl } from '../utils/endpointResolver';

const authType = config.authType;

/**
 * Extract base URL from request (query param, header, or use default)
 */
const getBaseUrlFromRequest = (req: Request): string | undefined => {
    // Check query parameter first (?baseUrl=...)
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') {
        return req.query.baseUrl;
    }
    
    // Check request header (X-Zscaler-Base-URL)
    if (req.headers['x-zscaler-base-url'] && typeof req.headers['x-zscaler-base-url'] === 'string') {
        return req.headers['x-zscaler-base-url'];
    }
    
    // Check request body (for POST/PUT requests)
    if (req.body?.ziaBaseUrl) {
        return req.body.ziaBaseUrl;
    }
    
    return undefined;
};

/**
 * List all URL categories in ZIA
 */
export const listURLCategoriesController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const categories = await ziaService.listURLCategories(authHeader, baseUrl);
        res.json(categories);
    } catch (error) {
        handleControllerError(error, res, 'List URL Categories');
    }
};

/**
 * Get a specific URL category
 */
export const getURLCategoryController = async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.params;
        if (!categoryId) {
            throw new Error('[getURLCategoryController] Missing categoryId in request params');
        }
        const baseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const category = await ziaService.getURLCategoryById(categoryId, authHeader, baseUrl);
        res.json(category);
    } catch (error) {
        handleControllerError(error, res, 'Get URL Category');
    }
};

/**
 * List all URL policies in ZIA
 */
export const listURLPoliciesController = async (req: Request, res: Response) => {
    try {baseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const policies = await ziaService.listURLPolicies(authHeader, beUrl || baseUrl);
        const policies = await ziaService.listURLPolicies(authHeader, ziaBaseUrl);
        res.json(policies);
    } catch (error) {
        handleControllerError(error, res, 'List URL Policies');
    }
};

/**
 * Get a specific URL policy
 */
export const getURLPolicyController = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.params;
        if (!policyId) {
            throw new Error('[getURLPolicyController] Missing policyId in request params');
        }baseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const policy = await ziaService.getURLPolicyById(policyId, authHeader, baseUrl);
        const policy = await ziaService.getURLPolicyById(policyId, authHeader, ziaBaseUrl);
        res.json(policy);
    } catch (error) {
        handleControllerError(error, res, 'Get URL Policy');
    }
};

/**
 * Create a new URL policy in ZIA
 */
export const createURLPolicyController = async (req: Request, res: Response) => {
    try {
        const policyData = req.body;
        if (!policyData?.name || !policyData?.action || !policyData?.urlCategories) {
            thbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const newPolicy = await ziaService.createURLPolicy(policyData, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const newPolicy = await ziaService.createURLPolicy(policyData, authHeader, ziaBaseUrl);
        res.status(201).json(newPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Create URL Policy');
    }
};

/**
 * Update an existing URL policy in ZIA
 */
export const updateURLPolicyController = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.params;
        const policyData = req.body;
        if (!policyId) {
            thbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const updatedPolicy = await ziaService.updateURLPolicy(policyId, policyData, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const updatedPolicy = await ziaService.updateURLPolicy(policyId, policyData, authHeader, ziaBaseUrl);
        res.json(updatedPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Update URL Policy');
    }
};

/**
 * Delete a URL policy from ZIA
 */
export const deleteURLPolicyController = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.params;
        if (!policyId) {
            thbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await ziaService.deleteURLPolicy(policyId, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        await ziaService.deleteURLPolicy(policyId, authHeader, ziaBaseUrl);
        res.status(204).send();
    } catch (error) {
        handleControllerError(error, res, 'Delete URL Policy');
    }
};

/**
 * Get threat reports from ZIA
 */
export const getThreatReportsController = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime } = req.query;
        const timeRange = (startTime && endTime) ? {
            start: parseInt(startTime as string),
            enbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const threats = await ziaService.getThreatReports(timeRange, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const threats = await ziaService.getThreatReports(timeRange, authHeader, ziaBaseUrl);
        res.json(threats);
    } catch (error) {
        handleControllerError(error, res, 'Get Threat Reports');
    }
};

/**
 * Get DLP incidents from ZIA
 */
export const getDLPIncidentsController = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime } = req.query;
        const timeRange = (startTime && endTime) ? {
            stbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const incidents = await ziaService.getDLPIncidents(timeRange, authHeader, b
        } : undefined;
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const incidents = await ziaService.getDLPIncidents(timeRange, authHeader, ziaBaseUrl);
        res.json(incidents);
    } catch (error) {
        handleControllerError(error, res, 'Get DLP Incidents');
    }
};

/**
 * Get admin audit logs from ZIA
 */
export const getAdminAuditLogsController = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime } = req.query;
        const timeRange = (startTime && endTime) ? {
            stbaseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const logs = await ziaService.getAdminAuditLogs(timeRange, authHeader, b
        } : undefined;
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const logs = await ziaService.getAdminAuditLogs(timeRange, authHeader, ziaBaseUrl);
        res.json(logs);
    } catch (error) {
        handleControllerError(error, res, 'Get Admin Audit Logs');
    }
};

/**
 * Get security report from ZIA
 */
export const getSecurityReportController = async (req: Request, res: Response) => {
    try {
        const { startTime, endTime } = req.query;
        const baseUrl = getBaseUrlFromRequest(req) || resolveZIABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const report = await ziaService.getSecurityReport(timeRange, authHeader, b
            end: parseInt(endTime as string),
        } : undefined;
        const authHeader = await getAuthHeader(authType, undefined, ziaBaseUrl || baseUrl);
        const report = await ziaService.getSecurityReport(timeRange, authHeader, ziaBaseUrl);
        res.json(report);
    } catch (error) {
        handleControllerError(error, res, 'Get Security Report');
    }
};
