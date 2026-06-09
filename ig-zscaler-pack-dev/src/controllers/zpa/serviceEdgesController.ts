// src/controllers/zpa/serviceEdgesController.ts

import { Request, Response } from 'express';
import * as serviceEdgeService from '../../services/zpa/serviceEdges/serviceEdgeService';
import * as serviceEdgeGroupService from '../../services/zpa/serviceEdges/serviceEdgeGroupService';
import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';

export const listServiceEdgesController = createListController(serviceEdgeService.listServiceEdges, 'List Service Edges');
export const getServiceEdgeController = createGetController(serviceEdgeService.getServiceEdgeById, 'Get Service Edge', 'edgeId');
export const createServiceEdgeController = createCreateController(serviceEdgeService.createServiceEdge, 'Create Service Edge');
export const updateServiceEdgeController = createUpdateController(serviceEdgeService.updateServiceEdge, 'Update Service Edge', 'edgeId');
export const deleteServiceEdgeController = createDeleteController(serviceEdgeService.deleteServiceEdge, 'Service Edge', 'edgeId');

export const listServiceEdgeGroupsController = createListController(serviceEdgeGroupService.listServiceEdgeGroups, 'List Service Edge Groups');
export const getServiceEdgeGroupController = createGetController(serviceEdgeGroupService.getServiceEdgeGroupById, 'Get Service Edge Group', 'groupId');
export const createServiceEdgeGroupController = createCreateController(serviceEdgeGroupService.createServiceEdgeGroup, 'Create Service Edge Group');
export const updateServiceEdgeGroupController = createUpdateController(serviceEdgeGroupService.updateServiceEdgeGroup, 'Update Service Edge Group', 'groupId');
export const deleteServiceEdgeGroupController = createDeleteController(serviceEdgeGroupService.deleteServiceEdgeGroup, 'Service Edge Group', 'groupId');
