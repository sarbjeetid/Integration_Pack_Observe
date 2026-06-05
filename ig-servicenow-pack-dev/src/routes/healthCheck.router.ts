import express from 'express';

const router = express.Router();
import { healthCheck, healthConnectivity } from '../controllers/healthCheckController';

// Define your API endpoints
router.get('/check', healthCheck);
router.get('/connectivity', healthConnectivity);

export default router;
