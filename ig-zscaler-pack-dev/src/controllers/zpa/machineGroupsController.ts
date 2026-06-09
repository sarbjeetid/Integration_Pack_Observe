// src/controllers/zpa/machineGroupsController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as machineGroupService from '../../services/zpa/machineGroups/machineGroupService';

export const listMachineGroupsController = createListController(machineGroupService.listMachineGroups, 'List Machine Groups');
export const getMachineGroupController = createGetController(machineGroupService.getMachineGroupById, 'Get Machine Group', 'groupId');
export const createMachineGroupController = createCreateController(machineGroupService.createMachineGroup, 'Create Machine Group');
export const updateMachineGroupController = createUpdateController(machineGroupService.updateMachineGroup, 'Update Machine Group', 'groupId');
export const deleteMachineGroupController = createDeleteController(machineGroupService.deleteMachineGroup, 'Machine Group', 'groupId');
