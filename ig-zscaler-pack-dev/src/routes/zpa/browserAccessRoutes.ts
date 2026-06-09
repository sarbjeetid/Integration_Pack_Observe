// src/routes/zpa/browserAccessRoutes.ts

import { Router } from 'express';
import * as browserAccessController from '../../controllers/zpa/browserAccessController';

const router = Router();

router.get('/browser-access', browserAccessController.listBrowserAccessAppsController);
router.get('/browser-access/:appId', browserAccessController.getBrowserAccessAppController);
router.post('/browser-access', browserAccessController.createBrowserAccessAppController);
router.put('/browser-access/:appId', browserAccessController.updateBrowserAccessAppController);
router.delete('/browser-access/:appId', browserAccessController.deleteBrowserAccessAppController);

export default router;
