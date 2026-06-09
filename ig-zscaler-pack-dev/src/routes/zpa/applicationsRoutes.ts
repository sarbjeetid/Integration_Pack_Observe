// src/routes/zpa/applicationsRoutes.ts

import { Router } from 'express';
import * as applicationsController from '../../controllers/zpa/applicationsController';

const router = Router();

// Applications
router.get('/applications', applicationsController.listApplicationsController);
router.get('/applications/:applicationId', applicationsController.getApplicationController);
router.post('/applications', applicationsController.createApplicationController);
router.put('/applications/:applicationId', applicationsController.updateApplicationController);
router.delete('/applications/:applicationId', applicationsController.deleteApplicationController);

// Segment Groups
router.get('/segment-groups', applicationsController.listSegmentGroupsController);
router.get('/segment-groups/:groupId', applicationsController.getSegmentGroupController);
router.post('/segment-groups', applicationsController.createSegmentGroupController);
router.put('/segment-groups/:groupId', applicationsController.updateSegmentGroupController);
router.delete('/segment-groups/:groupId', applicationsController.deleteSegmentGroupController);

export default router;
