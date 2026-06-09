// src/routes/zpa/serverGroupsRoutes.ts

import { Router } from 'express';
import * as serverGroupsController from '../../controllers/zpa/serverGroupsController';

const router = Router();

router.get('/server-groups', serverGroupsController.listServerGroupsController);
router.get('/server-groups/:groupId', serverGroupsController.getServerGroupController);
router.post('/server-groups', serverGroupsController.createServerGroupController);
router.put('/server-groups/:groupId', serverGroupsController.updateServerGroupController);
router.delete('/server-groups/:groupId', serverGroupsController.deleteServerGroupController);

export default router;
