import { Request, Response } from 'express';
import * as ziaService from '../services/zia';
import { getAuthHeader } from '../services/authentication/authService';
import config from '../config';
import { handleControllerError } from '../utils/errorHandling';
import { resolveZIABaseUrl } from '../utils/endpointResolver';

const authType = config.authType;

/**
 * Extract base URL from request (query param, header, or body)
 */
const getBaseUrlFromRequest = (req: Request): string | undefined => {
    if (req.query.baseUrl && typeof req.query.baseUrl === 'string') {
        return req.query.baseUrl;
    }

    if (
        req.headers['x-zscaler-base-url'] &&
        typeof req.headers['x-zscaler-base-url'] === 'string'
    ) {
        return req.headers['x-zscaler-base-url'];
    }

    if (req.body?.ziaBaseUrl) {
        return req.body.ziaBaseUrl;
    }

    return undefined;
};

/**
 * List all URL categories
 */
export const listURLCategoriesController = async (
    req: Request,
    res: Response
) => {
    try {
        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const categories = await ziaService.listURLCategories(
            authHeader,
            baseUrl
        );

        res.json(categories);
    } catch (error) {
        handleControllerError(error, res, 'List URL Categories');
    }
};

/**
 * Get URL category by ID
 */
export const getURLCategoryController = async (
    req: Request,
    res: Response
) => {
    try {
        const { categoryId } = req.params;

        if (!categoryId) {
            throw new Error(
                '[getURLCategoryController] Missing categoryId in request params'
            );
        }

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const category = await ziaService.getURLCategoryById(
            categoryId,
            authHeader,
            baseUrl
        );

        res.json(category);
    } catch (error) {
        handleControllerError(error, res, 'Get URL Category');
    }
};

/**
 * List URL policies
 */
export const listURLPoliciesController = async (
    req: Request,
    res: Response
) => {
    try {
        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const policies = await ziaService.listURLPolicies(
            authHeader,
            baseUrl
        );

        res.json(policies);
    } catch (error) {
        handleControllerError(error, res, 'List URL Policies');
    }
};

/**
 * Get URL policy by ID
 */
export const getURLPolicyController = async (
    req: Request,
    res: Response
) => {
    try {
        const { policyId } = req.params;

        if (!policyId) {
            throw new Error(
                '[getURLPolicyController] Missing policyId in request params'
            );
        }

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const policy = await ziaService.getURLPolicyById(
            policyId,
            authHeader,
            baseUrl
        );

        res.json(policy);
    } catch (error) {
        handleControllerError(error, res, 'Get URL Policy');
    }
};

/**
 * Create URL policy
 */
export const createURLPolicyController = async (
    req: Request,
    res: Response
) => {
    try {
        const policyData = req.body;

        if (
            !policyData?.name ||
            !policyData?.action ||
            !policyData?.urlCategories
        ) {
            throw new Error(
                '[createURLPolicyController] Missing required fields: name, action, urlCategories'
            );
        }

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const newPolicy = await ziaService.createURLPolicy(
            policyData,
            authHeader,
            baseUrl
        );

        res.status(201).json(newPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Create URL Policy');
    }
};

/**
 * Update URL policy
 */
export const updateURLPolicyController = async (
    req: Request,
    res: Response
) => {
    try {
        const { policyId } = req.params;
        const policyData = req.body;

        if (!policyId) {
            throw new Error(
                '[updateURLPolicyController] Missing policyId in request params'
            );
        }

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const updatedPolicy = await ziaService.updateURLPolicy(
            policyId,
            policyData,
            authHeader,
            baseUrl
        );

        res.json(updatedPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Update URL Policy');
    }
};

/**
 * Delete URL policy
 */
export const deleteURLPolicyController = async (
    req: Request,
    res: Response
) => {
    try {
        const { policyId } = req.params;

        if (!policyId) {
            throw new Error(
                '[deleteURLPolicyController] Missing policyId in request params'
            );
        }

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        await ziaService.deleteURLPolicy(
            policyId,
            authHeader,
            baseUrl
        );

        res.status(204).send();
    } catch (error) {
        handleControllerError(error, res, 'Delete URL Policy');
    }
};

/**
 * Get threat reports
 */
export const getThreatReportsController = async (
    req: Request,
    res: Response
) => {
    try {
        const { startTime, endTime } = req.query;

        const timeRange =
            startTime && endTime
                ? {
                      start: parseInt(startTime as string, 10),
                      end: parseInt(endTime as string, 10),
                  }
                : undefined;

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const threats = await ziaService.getThreatReports(
            timeRange,
            authHeader,
            baseUrl
        );

        res.json(threats);
    } catch (error) {
        handleControllerError(error, res, 'Get Threat Reports');
    }
};

/**
 * Get DLP incidents
 */
export const getDLPIncidentsController = async (
    req: Request,
    res: Response
) => {
    try {
        const { startTime, endTime } = req.query;

        const timeRange =
            startTime && endTime
                ? {
                      start: parseInt(startTime as string, 10),
                      end: parseInt(endTime as string, 10),
                  }
                : undefined;

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const incidents = await ziaService.getDLPIncidents(
            timeRange,
            authHeader,
            baseUrl
        );

        res.json(incidents);
    } catch (error) {
        handleControllerError(error, res, 'Get DLP Incidents');
    }
};

/**
 * Get admin audit logs
 */
export const getAdminAuditLogsController = async (
    req: Request,
    res: Response
) => {
    try {
        const { startTime, endTime } = req.query;

        const timeRange =
            startTime && endTime
                ? {
                      start: parseInt(startTime as string, 10),
                      end: parseInt(endTime as string, 10),
                  }
                : undefined;

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const logs = await ziaService.getAdminAuditLogs(
            timeRange,
            authHeader,
            baseUrl
        );

        res.json(logs);
    } catch (error) {
        handleControllerError(error, res, 'Get Admin Audit Logs');
    }
};

/**
 * Get security report
 */
export const getSecurityReportController = async (
    req: Request,
    res: Response
) => {
    try {
        const { startTime, endTime } = req.query;

        const timeRange =
            startTime && endTime
                ? {
                      start: parseInt(startTime as string, 10),
                      end: parseInt(endTime as string, 10),
                  }
                : undefined;

        const baseUrl =
            getBaseUrlFromRequest(req) || resolveZIABaseUrl();

        const authHeader = await getAuthHeader(
            authType,
            undefined,
            baseUrl
        );

        const report = await ziaService.getSecurityReport(
            timeRange,
            authHeader,
            baseUrl
        );

        res.json(report);
    } catch (error) {
        handleControllerError(error, res, 'Get Security Report');
    }
};
