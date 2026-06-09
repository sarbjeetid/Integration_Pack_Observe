// src/routes/zpa/identityProvidersRoutes.ts

import { Router } from 'express';
import * as identityProvidersController from '../../controllers/zpa/identityProvidersController';

const router = Router();

router.get('/idps', identityProvidersController.listIDPsController);
router.get('/idps/:idpId', identityProvidersController.getIDPController);
router.post('/idps', identityProvidersController.createIDPController);
router.put('/idps/:idpId', identityProvidersController.updateIDPController);
router.delete('/idps/:idpId', identityProvidersController.deleteIDPController);

export default router;
