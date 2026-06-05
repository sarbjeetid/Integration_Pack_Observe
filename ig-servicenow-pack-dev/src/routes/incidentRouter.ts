import express from 'express';
import { createIncidentController, closeIncidentController, updateIncidentController, resolveIncidentController, fetchIncidentDataController, reassignIncidentController} from '../controllers/incidentController';

const router = express.Router();

// Route for creating an incident
router.post('/create', createIncidentController);

// Route for updating an incident
router.put('/update', updateIncidentController);

// Route for resolving an incident
router.put('/resolve', resolveIncidentController);

// Route for closing an incident
router.put('/close', closeIncidentController);

// Route for fetching incident data
router.post('/fetchIncidentData', fetchIncidentDataController);

// Route for reassigning incident
router.post('/reassign', reassignIncidentController);
export default router;