// src/controllers/zpa/userGroupsController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as userGroupService from '../../services/zpa/userGroups/userGroupService';

export const listUserGroupsController = createListController(userGroupService.listUserGroups, 'List User Groups');
export const getUserGroupController = createGetController(userGroupService.getUserGroupById, 'Get User Group', 'groupId');
export const createUserGroupController = createCreateController(userGroupService.createUserGroup, 'Create User Group');
export const updateUserGroupController = createUpdateController(userGroupService.updateUserGroup, 'Update User Group', 'groupId');
export const deleteUserGroupController = createDeleteController(userGroupService.deleteUserGroup, 'User Group', 'groupId');
