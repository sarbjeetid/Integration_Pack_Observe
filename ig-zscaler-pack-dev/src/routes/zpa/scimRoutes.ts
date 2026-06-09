// src/routes/zpa/scimRoutes.ts

import { Router } from 'express';
import * as scimController from '../../controllers/zpa/scimController';

const router = Router();

router.get('/scim-attributes', scimController.listSCIMAttributesController);
router.get('/scim-attributes/:attributeId', scimController.getSCIMAttributeController);

export default router;
