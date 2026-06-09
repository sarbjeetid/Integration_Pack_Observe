// src/routes/zpa/policiesRoutes.ts

import { Router } from 'express';
import * as policiesController from '../../controllers/zpa/policiesController';

const router = Router();

// Policy Sets
router.get('/policy-sets', policiesController.listPolicySetsController);
router.get('/policy-sets/:policySetId', policiesController.getPolicySetController);
router.post('/policy-sets', policiesController.createPolicySetController);
router.put('/policy-sets/:policySetId', policiesController.updatePolicySetController);
router.delete('/policy-sets/:policySetId', policiesController.deletePolicySetController);

// Policy Rules
router.get('/policy-sets/:policySetId/rules', policiesController.listPolicyRulesController);
router.get('/policy-sets/:policySetId/rules/:ruleId', policiesController.getPolicyRuleController);
router.post('/policy-sets/:policySetId/rules', policiesController.createPolicyRuleController);
router.put('/policy-sets/:policySetId/rules/:ruleId', policiesController.updatePolicyRuleController);
router.delete('/policy-sets/:policySetId/rules/:ruleId', policiesController.deletePolicyRuleController);

export default router;
