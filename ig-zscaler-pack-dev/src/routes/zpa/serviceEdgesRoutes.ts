// src/routes/zpa/serviceEdgesRoutes.ts

import { Router } from 'express';
import * as serviceEdgesController from '../../controllers/zpa/serviceEdgesController';

const router = Router();

// Service Edges
router.get('/service-edges', serviceEdgesController.listServiceEdgesController);
router.get('/service-edges/:edgeId', serviceEdgesController.getServiceEdgeController);
router.post('/service-edges', serviceEdgesController.createServiceEdgeController);
router.put('/service-edges/:edgeId', serviceEdgesController.updateServiceEdgeController);
router.delete('/service-edges/:edgeId', serviceEdgesController.deleteServiceEdgeController);

// Service Edge Groups
router.get('/service-edge-groups', serviceEdgesController.listServiceEdgeGroupsController);
router.get('/service-edge-groups/:groupId', serviceEdgesController.getServiceEdgeGroupController);
router.post('/service-edge-groups', serviceEdgesController.createServiceEdgeGroupController);
router.put('/service-edge-groups/:groupId', serviceEdgesController.updateServiceEdgeGroupController);
router.delete('/service-edge-groups/:groupId', serviceEdgesController.deleteServiceEdgeGroupController);

export default router;
