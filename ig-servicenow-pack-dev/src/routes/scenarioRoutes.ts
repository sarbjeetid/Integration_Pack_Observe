import express from 'express';
import { createScenarioController } from '../controllers/scenarioController';

const router = express.Router();

// Route for creating a scenario
router.post('/', createScenarioController);


export default router;