// src/routes/zpa/connectorsRoutes.ts

import { Router } from 'express';
import * as connectorsController from '../../controllers/zpa/connectorsController';

const router = Router();

// Connectors
router.get('/connectors', connectorsController.listConnectorsController);
router.get('/connectors/:connectorId', connectorsController.getConnectorController);
router.post('/connectors', connectorsController.createConnectorController);
router.put('/connectors/:connectorId', connectorsController.updateConnectorController);
router.delete('/connectors/:connectorId', connectorsController.deleteConnectorController);

// Connector Groups
router.get('/connector-groups', connectorsController.listConnectorGroupsController);
router.get('/connector-groups/:groupId', connectorsController.getConnectorGroupController);
router.post('/connector-groups', connectorsController.createConnectorGroupController);
router.put('/connector-groups/:groupId', connectorsController.updateConnectorGroupController);
router.delete('/connector-groups/:groupId', connectorsController.deleteConnectorGroupController);

export default router;
