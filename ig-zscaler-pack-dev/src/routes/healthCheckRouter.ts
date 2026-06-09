// src/routes/healthCheckRouter.ts

import express from 'express';
import { healthCheckController } from '../controllers/healthCheckController';

const router = express.Router();

router.get('/', healthCheckController);
router.get('/health', healthCheckController);

export default router;
