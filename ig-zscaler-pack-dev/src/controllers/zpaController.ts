// src/controllers/zpaController.ts

import { Request, Response } from 'express';
import * as zpaService from '../services/zpa';
import { getAuthHeader } from '../services/authentication/authService';
import config from '../config';
import { handleControllerError } from '../utils/errorHandling';
import { resolveZPABaseUrl } from '../utils/endpointResolver';

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
    if (req.body?.zpaBaseUrl) {
        return req.body.zpaBaseUrl;
    }
    
    return undefined;
};

/**
 * List all ZPA applications
 */
export const listApplicationsController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const applications = await zpaService.listApplications(authHeader, baseUrl);
        res.json(applications);
    } catch (error) {
        handleControllerError(error, res, 'List ZPA Applications');
    }
};

/**
 * Get a specific ZPA application
 */
export const getApplicationController = async (req: Request, res: Response) => {
    try {
        const { applicationId } = req.params;
        if (!applicationId) {
            throw new Error('[getApplicationController] Missing applicationId in request params');
        }
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const application = await zpaService.getApplicationById(applicationId, authHeader, baseUrl);
        res.json(application);
    } catch (error) {
        handleControllerError(error, res, 'Get ZPA Application');
    }
};

/**
 * List all ZPA users
 */
export const listUsersController = async (req: Request, res: Response) => {
    try {baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const users = await zpaService.listUsers(authHeader, bd, zpaBaseUrl || baseUrl);
        const users = await zpaService.listUsers(authHeader, zpaBaseUrl);
        res.json(users);
    } catch (error) {
        handleControllerError(error, res, 'List ZPA Users');
    }
};

/**
 * Get a specific ZPA user
 */
export const getUserController = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            throw new Error('[getUserController] Missing userId in request params');
        }baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const user = await zpaService.getUserById(userId, authHeader, beUrl || baseUrl);
        const user = await zpaService.getUserById(userId, authHeader, zpaBaseUrl);
        res.json(user);
    } catch (error) {
        handleControllerError(error, res, 'Get ZPA User');
    }
};

/**
 * Create a new ZPA user
 */
export const createUserController = async (req: Request, res: Response) => {
    try {
        const userData = req.body;
        if (!userData?.name || !userData?.email) {
            throw new Error('[createUserController] Missing required fields: name, email');
        }baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const newUser = await zpaService.createUser(userData, authHeader, b || baseUrl);
        const newUser = await zpaService.createUser(userData, authHeader, zpaBaseUrl);
        res.status(201).json(newUser);
    } catch (error) {
        handleControllerError(error, res, 'Create ZPA User');
    }
};

/**
 * Update an existing ZPA user
 */
export const updateUserController = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const userData = req.body;
        if (!userId) {
            thbaseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const updatedUser = await zpaService.updateUser(userId, userData, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        const updatedUser = await zpaService.updateUser(userId, userData, authHeader, zpaBaseUrl);
        res.json(updatedUser);
    } catch (error) {
        handleControllerError(error, res, 'Update ZPA User');
    }
};

/**
 * List all ZPA access policies
 */
export const lbaseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const policies = await zpaService.listAccessPolicies(authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        const policies = await zpaService.listAccessPolicies(authHeader, zpaBaseUrl);
        res.json(policies);
    } catch (error) {
        handleControllerError(error, res, 'List ZPA Policies');
    }
};

/**
 * Get a specific ZPA access policy
 */
export const getPolicyController = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.params;
        if (!policyId) {
            thbaseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const policy = await zpaService.getPolicyById(policyId, authHeader, b
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        const policy = await zpaService.getPolicyById(policyId, authHeader, zpaBaseUrl);
        res.json(policy);
    } catch (error) {
        handleControllerError(error, res, 'Get ZPA Policy');
    }
};

/**
 * Create a new ZPA access policy
 */
export const createPolicyController = async (req: Request, res: Response) => {
    try {
        const policyData = req.body;
        if (!pbaseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const newPolicy = await zpaService.createPolicy(policyData, authHeader, b action');
        }
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        const newPolicy = await zpaService.createPolicy(policyData, authHeader, zpaBaseUrl);
        res.status(201).json(newPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Create ZPA Policy');
    }
};

/**
 * Update an existing ZPA access policy
 */
export const updatePolicyController = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.params;
        const policyData = req.body;
        if (!pbaseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        const updatedPolicy = await zpaService.updatePolicy(policyId, policyData, authHeader, b
        }
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        const updatedPolicy = await zpaService.updatePolicy(policyId, policyData, authHeader, zpaBaseUrl);
        res.json(updatedPolicy);
    } catch (error) {
        handleControllerError(error, res, 'Update ZPA Policy');
    }
};

/**
 * Delete a ZPA access policy
 */
export const deletePolicyController = async (req: Request, res: Response) => {
    try {
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const authHeader = await getAuthHeader(authType, undefined, baseUrl);
        await zpaService.deletePolicy(policyId, authHeader, b
            throw new Error('[deletePolicyController] Missing policyId in request params');
        }
        const authHeader = await getAuthHeader(authType, undefined, zpaBaseUrl || baseUrl);
        await zpaService.deletePolicy(policyId, authHeader, zpaBaseUrl);
        res.status(204).send();
    } catch (error) {
        handleControllerError(error, res, 'Delete ZPA Policy');
    }
};
