// src/routes/zpa/trustedNetworksRoutes.ts

import { Router } from 'express';
import * as trustedNetworksController from '../../controllers/zpa/trustedNetworksController';

const router = Router();

router.get('/trusted-networks', trustedNetworksController.listTrustedNetworksController);
router.get('/trusted-networks/:networkId', trustedNetworksController.getTrustedNetworkController);
router.post('/trusted-networks', trustedNetworksController.createTrustedNetworkController);
router.put('/trusted-networks/:networkId', trustedNetworksController.updateTrustedNetworkController);
router.delete('/trusted-networks/:networkId', trustedNetworksController.deleteTrustedNetworkController);

export default router;
