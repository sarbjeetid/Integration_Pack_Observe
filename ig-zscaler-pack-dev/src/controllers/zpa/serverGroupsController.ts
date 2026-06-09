// src/controllers/zpa/serverGroupsController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as serverGroupService from '../../services/zpa/serverGroups/serverGroupService';

export const listServerGroupsController = createListController(serverGroupService.listServerGroups, 'List Server Groups');
export const getServerGroupController = createGetController(serverGroupService.getServerGroupById, 'Get Server Group', 'groupId');
export const createServerGroupController = createCreateController(serverGroupService.createServerGroup, 'Create Server Group');
export const updateServerGroupController = createUpdateController(serverGroupService.updateServerGroup, 'Update Server Group', 'groupId');
export const deleteServerGroupController = createDeleteController(serverGroupService.deleteServerGroup, 'Server Group', 'groupId');
