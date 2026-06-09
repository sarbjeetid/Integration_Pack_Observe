import express from 'express';
import {
    listConnectorsController,
    fetchAllConnectorsController,
    getConnectorController,
    getConnectorsByGroupController,
    getConnectorStatusController,
    getBulkConnectorStatusController,
    getAvailableZonesController,
} from '../controllers/connectorController';

const router = express.Router();

/**
 * Health / Zones
 */
router.get('/zones', getAvailableZonesController);

/**
 * Connectors (read-only)
 */
router.get('/list', listConnectorsController);
router.get('/all', fetchAllConnectorsController);

/**
 * Connector details
 */
router.get('/:connectorId', getConnectorController);
router.get('/:connectorId/status', getConnectorStatusController);

/**
 * Bulk status
 */
router.post('/status/bulk', getBulkConnectorStatusController);

/**
 * Group queries
 */
router.get('/group/:groupId', getConnectorsByGroupController);

export default router;