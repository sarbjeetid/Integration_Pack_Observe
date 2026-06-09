// src/routes/zpa/machineGroupsRoutes.ts

import { Router } from 'express';
import * as machineGroupsController from '../../controllers/zpa/machineGroupsController';

const router = Router();

router.get('/machine-groups', machineGroupsController.listMachineGroupsController);
router.get('/machine-groups/:groupId', machineGroupsController.getMachineGroupController);
router.post('/machine-groups', machineGroupsController.createMachineGroupController);
router.put('/machine-groups/:groupId', machineGroupsController.updateMachineGroupController);
router.delete('/machine-groups/:groupId', machineGroupsController.deleteMachineGroupController);

export default router;
