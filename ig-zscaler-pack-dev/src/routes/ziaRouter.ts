// src/routes/ziaRouter.ts

import express from 'express';
import {
    listURLCategoriesController,
    getURLCategoryController,
    listURLPoliciesController,
    getURLPolicyController,
    createURLPolicyController,
    updateURLPolicyController,
    deleteURLPolicyController,
    getThreatReportsController,
    getDLPIncidentsController,
    getAdminAuditLogsController,
    getSecurityReportController,
} from '../controllers/ziaController';

const router = express.Router();

// URL Categories endpoints
router.get('/url-categories', listURLCategoriesController);
router.get('/url-categories/:categoryId', getURLCategoryController);

// URL Policies endpoints
router.get('/url-policies', listURLPoliciesController);
router.get('/url-policies/:policyId', getURLPolicyController);
router.post('/url-policies', createURLPolicyController);
router.put('/url-policies/:policyId', updateURLPolicyController);
router.delete('/url-policies/:policyId', deleteURLPolicyController);

// Security Reports endpoints
router.get('/threat-reports', getThreatReportsController);
router.get('/dlp-incidents', getDLPIncidentsController);
router.get('/admin-audit-logs', getAdminAuditLogsController);
router.get('/security-report', getSecurityReportController);

export default router;
