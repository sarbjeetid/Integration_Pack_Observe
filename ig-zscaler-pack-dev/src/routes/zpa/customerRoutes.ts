// src/routes/zpa/customerRoutes.ts

import { Router } from 'express';
import * as customerController from '../../controllers/zpa/customerController';

const router = Router();

router.get('/customer', customerController.getCustomerController);
router.put('/customer', customerController.updateCustomerController);

export default router;
