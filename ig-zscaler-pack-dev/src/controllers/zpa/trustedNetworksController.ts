// src/controllers/zpa/trustedNetworksController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as trustedNetworkService from '../../services/zpa/trustedNetworks/trustedNetworkService';

export const listTrustedNetworksController = createListController(trustedNetworkService.listTrustedNetworks, 'List Trusted Networks');
export const getTrustedNetworkController = createGetController(trustedNetworkService.getTrustedNetworkById, 'Get Trusted Network', 'networkId');
export const createTrustedNetworkController = createCreateController(trustedNetworkService.createTrustedNetwork, 'Create Trusted Network');
export const updateTrustedNetworkController = createUpdateController(trustedNetworkService.updateTrustedNetwork, 'Update Trusted Network', 'networkId');
export const deleteTrustedNetworkController = createDeleteController(trustedNetworkService.deleteTrustedNetwork, 'Trusted Network', 'networkId');
