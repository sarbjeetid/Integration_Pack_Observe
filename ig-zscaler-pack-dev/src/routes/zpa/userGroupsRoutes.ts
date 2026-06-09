// src/routes/zpa/userGroupsRoutes.ts

import { Router } from 'express';
import * as userGroupsController from '../../controllers/zpa/userGroupsController';

const router = Router();

router.get('/user-groups', userGroupsController.listUserGroupsController);
router.get('/user-groups/:groupId', userGroupsController.getUserGroupController);
router.post('/user-groups', userGroupsController.createUserGroupController);
router.put('/user-groups/:groupId', userGroupsController.updateUserGroupController);
router.delete('/user-groups/:groupId', userGroupsController.deleteUserGroupController);

export default router;
