// src/controllers/zpa/scimController.ts

import { createListController, createGetController } from './controllerFactory';
import * as scimService from '../../services/zpa/scim/scimService';

export const listSCIMAttributesController = createListController(scimService.listSCIMAttributes, 'List SCIM Attributes');
export const getSCIMAttributeController = createGetController(scimService.getSCIMAttributeById, 'Get SCIM Attribute', 'attributeId');
