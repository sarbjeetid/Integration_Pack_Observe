// src/routes/zpa/provisioningKeysRoutes.ts

import { Router } from 'express';
import * as provisioningKeysController from '../../controllers/zpa/provisioningKeysController';

const router = Router();

router.get('/provisioning-keys/connectors', provisioningKeysController.listConnectorProvisioningKeysController);
router.get('/provisioning-keys/service-edges', provisioningKeysController.listServiceEdgeProvisioningKeysController);
router.get('/provisioning-keys/:keyId', provisioningKeysController.getProvisioningKeyController);
router.post('/provisioning-keys', provisioningKeysController.createProvisioningKeyController);
router.put('/provisioning-keys/:keyId', provisioningKeysController.updateProvisioningKeyController);
router.delete('/provisioning-keys/:keyId', provisioningKeysController.deleteProvisioningKeyController);

export default router;
