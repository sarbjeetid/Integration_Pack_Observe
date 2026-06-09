// src/routes/zpa/certificatesRoutes.ts

import { Router } from 'express';
import * as certificatesController from '../../controllers/zpa/certificatesController';

const router = Router();

router.get('/certificates', certificatesController.listCertificatesController);
router.get('/certificates/:certId', certificatesController.getCertificateController);
router.post('/certificates', certificatesController.createCertificateController);
router.put('/certificates/:certId', certificatesController.updateCertificateController);
router.delete('/certificates/:certId', certificatesController.deleteCertificateController);

export default router;
