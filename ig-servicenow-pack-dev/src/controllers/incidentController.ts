// src/controllers/incidentController.ts

import { Request, Response } from 'express';
import { createIncident, closeIncident, updateIncident, resolveIncident, fetchIncidentData, reassignIncident } from '../services/incident/index';
import config from '../config';
import { getAuthHeader } from '../services/authentication/authService';
import { handleControllerError } from '../utils/errorHandling';
import { CustomerConfig } from '../interfaces/scenario/index';
import { fetchCustomerConfig } from './../services/incident/incidentUtils';
const api_key = config.apiKey;
const defaultAuthType = config.authType;
let customerConfig: CustomerConfig | undefined;

const createIncidentController = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;

    if (!incidentData?.tenant_id) {
      throw new Error("[createIncidentController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[createIncidentController] No config found for customer: ${incidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const apiKeyToken = customerConfig?.apiKey || api_key;
    const authHeader = await getAuthHeader(authType, incidentData.vault_path, baseUrl, customerConfig);
    const newIncident = await createIncident(incidentData, authHeader, apiKeyToken, incidentData.vault_path, customerConfig);

    res.json(newIncident);
  } catch (error) {
    handleControllerError(error, res, 'Create Incident');
  }
};

const updateIncidentController = async (req: Request, res: Response) => {
  try {
    const updatedIncidentData = req.body;
    
    if (!updatedIncidentData?.tenant_id) {
      throw new Error("[updateIncidentController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(updatedIncidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[updateIncidentController] No config found for customer: ${updatedIncidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || updatedIncidentData.base_url;
    const authHeader = await getAuthHeader(authType, updatedIncidentData.vault_path, baseUrl, customerConfig);
    const updatedIncident = await updateIncident(updatedIncidentData, authHeader, updatedIncidentData.vault_path, customerConfig);
    res.json(updatedIncident);
  } catch (error) {
    handleControllerError(error, res, 'Update Incident');
  }
};

const resolveIncidentController = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;

    if (!incidentData?.tenant_id) {
      throw new Error("[resolveIncidentController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[resolveIncidentController] No config found for customer: ${incidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const apiKeyToken = customerConfig?.apiKey || api_key;
    const authHeader = await getAuthHeader(authType, incidentData.vault_path, baseUrl, customerConfig);
    const resolvedIncident = await resolveIncident(incidentData, authHeader, apiKeyToken, incidentData.vault_path, customerConfig);
    res.json(resolvedIncident);
  } catch (error) {
    handleControllerError(error, res, 'Resolve Incident');
  }
};

const closeIncidentController = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;
    
    if (!incidentData?.tenant_id) {
      throw new Error("[closeIncidentController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[closeIncidentController] No config found for customer: ${incidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const authHeader = await getAuthHeader(authType, incidentData.vault_path, baseUrl, customerConfig);
    const closedIncident = await closeIncident(incidentData, authHeader, incidentData.vault_path, customerConfig);

    res.json(closedIncident);
  } catch (error) {
    handleControllerError(error, res, 'Close Incident');
  }
};

const fetchIncidentDataController = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;

    if (!incidentData?.tenant_id) {
      throw new Error("[fetchIncidentDataController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[fetchIncidentDataController] No config found for customer: ${incidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const authHeader = await getAuthHeader(authType, incidentData.vault_path, baseUrl, customerConfig);
    const incidentDataResponse = await fetchIncidentData(incidentData, authHeader, incidentData.vault_path, customerConfig);

    res.json(incidentDataResponse);
  } catch (error) {
    handleControllerError(error, res, 'Fetch Incident');
  }
};

const reassignIncidentController = async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;

    if (!incidentData?.tenant_id) {
      throw new Error("[reassignIncidentController] Missing tenant_id in request body");
    }
    customerConfig = await fetchCustomerConfig(incidentData.tenant_id);
    if (!customerConfig) {
        throw new Error(`[reassignIncidentController] No config found for customer: ${incidentData.tenant_id}`);
    }
    const authType = customerConfig?.authType || defaultAuthType;
    const baseUrl = customerConfig?.baseUrl || incidentData.base_url;
    const authHeader = await getAuthHeader(authType, incidentData.vault_path, baseUrl, customerConfig);
    const incidentDataResponse = await reassignIncident(incidentData, authHeader, incidentData.vault_path, customerConfig);
    if (incidentDataResponse) {
      res.json(incidentDataResponse);
    } else {
      res.json({ error: 'could not reassign ticket' });
    }
  } catch (error) {
    handleControllerError(error, res, 'Reassign Incident');
  }
};

export {
  createIncidentController,
  updateIncidentController,
  resolveIncidentController,
  closeIncidentController,
  fetchIncidentDataController,
  reassignIncidentController,
};
