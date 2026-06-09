// src/controllers/zpa/postureController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as postureProfileService from '../../services/zpa/posture/postureProfileService';

export const listPostureProfilesController = createListController(postureProfileService.listPostureProfiles, 'List Posture Profiles');
export const getPostureProfileController = createGetController(postureProfileService.getPostureProfileById, 'Get Posture Profile', 'profileId');
export const createPostureProfileController = createCreateController(postureProfileService.createPostureProfile, 'Create Posture Profile');
export const updatePostureProfileController = createUpdateController(postureProfileService.updatePostureProfile, 'Update Posture Profile', 'profileId');
export const deletePostureProfileController = createDeleteController(postureProfileService.deletePostureProfile, 'Posture Profile', 'profileId');
