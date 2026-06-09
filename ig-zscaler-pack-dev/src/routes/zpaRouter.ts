// src/routes/zpaRouter.ts

import express from 'express';
import {
    listApplicationsController,
    getApplicationController,
    listUsersController,
    getUserController,
    createUserController,
    updateUserController,
    listPoliciesController,
    getPolicyController,
    createPolicyController,
    updatePolicyController,
    deletePolicyController,
} from '../controllers/zpaController';

const router = express.Router();

// Applications endpoints
router.get('/applications', listApplicationsController);
router.get('/applications/:applicationId', getApplicationController);

// Users endpoints
router.get('/users', listUsersController);
router.get('/users/:userId', getUserController);
router.post('/users', createUserController);
router.put('/users/:userId', updateUserController);

// Policies endpoints
router.get('/policies', listPoliciesController);
router.get('/policies/:policyId', getPolicyController);
router.post('/policies', createPolicyController);
router.put('/policies/:policyId', updatePolicyController);
router.delete('/policies/:policyId', deletePolicyController);

export default router;
