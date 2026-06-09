// src/controllers/zpa/certificatesController.ts

import { createListController, createGetController, createCreateController, createUpdateController, createDeleteController } from './controllerFactory';
import * as certificateService from '../../services/zpa/certificates/certificateService';

export const listCertificatesController = createListController(certificateService.listCertificates, 'List Certificates');
export const getCertificateController = createGetController(certificateService.getCertificateById, 'Get Certificate', 'certId');
export const createCertificateController = createCreateController(certificateService.createCertificate, 'Create Certificate');
export const updateCertificateController = createUpdateController(certificateService.updateCertificate, 'Update Certificate', 'certId');
export const deleteCertificateController = createDeleteController(certificateService.deleteCertificate, 'Certificate', 'certId');
