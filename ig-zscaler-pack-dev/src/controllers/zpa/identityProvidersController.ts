// src/controllers/zpa/identityProvidersController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as idpService from '../../services/zpa/identityProviders/idpService';

export const listIDPsController = createListController(idpService.listIDPs, 'List IDPs');
export const getIDPController = createGetController(idpService.getIDPById, 'Get IDP', 'idpId');
export const createIDPController = createCreateController(idpService.createIDP, 'Create IDP');
export const updateIDPController = createUpdateController(idpService.updateIDP, 'Update IDP', 'idpId');
export const deleteIDPController = createDeleteController(idpService.deleteIDP, 'IDP', 'idpId');
