// src/controllers/zpa/policiesController.ts

import { Request, Response } from 'express';
import * as policySetService from '../../services/zpa/policies/policySetService';
import * as policyRuleService from '../../services/zpa/policies/policyRuleService';
import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController, getBaseUrlFromRequest, getCustomerIdFromRequest } from './controllerFactory';
import { getAuthHeader } from '../../services/authentication/authService';
import config from '../../config';
import { handleControllerError } from '../../utils/errorHandling';
import { resolveZPABaseUrl } from '../../utils/endpointResolver';

export const listPolicySetsController = createListController(policySetService.listPolicySets, 'List Policy Sets');
export const getPolicySetController = createGetController(policySetService.getPolicySetById, 'Get Policy Set', 'policySetId');
export const createPolicySetController = createCreateController(policySetService.createPolicySet, 'Create Policy Set');
export const updatePolicySetController = createUpdateController(policySetService.updatePolicySet, 'Update Policy Set', 'policySetId');
export const deletePolicySetController = createDeleteController(policySetService.deletePolicySet, 'Policy Set', 'policySetId');

export const listPolicyRulesController = async (req: Request, res: Response) => {
    try {
        const { policySetId } = req.params;
        if (!policySetId) throw new Error('Missing policySetId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await policyRuleService.listPolicyRules(policySetId, authHeader, baseUrl, customerId, req.query);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'List Policy Rules');
    }
};

export const getPolicyRuleController = async (req: Request, res: Response) => {
    try {
        const { policySetId, ruleId } = req.params;
        if (!policySetId || !ruleId) throw new Error('Missing policySetId or ruleId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await policyRuleService.getPolicyRuleById(policySetId, ruleId, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Get Policy Rule');
    }
};

export const createPolicyRuleController = async (req: Request, res: Response) => {
    try {
        const { policySetId } = req.params;
        if (!policySetId) throw new Error('Missing policySetId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await policyRuleService.createPolicyRule(policySetId, req.body, authHeader, baseUrl, customerId);
        res.status(201).json(data);
    } catch (error) {
        handleControllerError(error, res, 'Create Policy Rule');
    }
};

export const updatePolicyRuleController = async (req: Request, res: Response) => {
    try {
        const { policySetId, ruleId } = req.params;
        if (!policySetId || !ruleId) throw new Error('Missing policySetId or ruleId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        const data = await policyRuleService.updatePolicyRule(policySetId, ruleId, req.body, authHeader, baseUrl, customerId);
        res.json(data);
    } catch (error) {
        handleControllerError(error, res, 'Update Policy Rule');
    }
};

export const deletePolicyRuleController = async (req: Request, res: Response) => {
    try {
        const { policySetId, ruleId } = req.params;
        if (!policySetId || !ruleId) throw new Error('Missing policySetId or ruleId');
        const baseUrl = getBaseUrlFromRequest(req) || resolveZPABaseUrl();
        const customerId = getCustomerIdFromRequest(req);
        const authHeader = await getAuthHeader(config.authType, undefined, baseUrl);
        await policyRuleService.deletePolicyRule(policySetId, ruleId, authHeader, baseUrl, customerId);
        res.json({ message: 'Policy Rule deleted successfully' });
    } catch (error) {
        handleControllerError(error, res, 'Delete Policy Rule');
    }
};
