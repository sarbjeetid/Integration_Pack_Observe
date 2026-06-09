// src/controllers/zpa/browserAccessController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as browserAccessService from '../../services/zpa/browserAccess/browserAccessService';

export const listBrowserAccessAppsController = createListController(browserAccessService.listBrowserAccessApps, 'List Browser Access Apps');
export const getBrowserAccessAppController = createGetController(browserAccessService.getBrowserAccessAppById, 'Get Browser Access App', 'appId');
export const createBrowserAccessAppController = createCreateController(browserAccessService.createBrowserAccessApp, 'Create Browser Access App');
export const updateBrowserAccessAppController = createUpdateController(browserAccessService.updateBrowserAccessApp, 'Update Browser Access App', 'appId');
export const deleteBrowserAccessAppController = createDeleteController(browserAccessService.deleteBrowserAccessApp, 'Browser Access App', 'appId');
