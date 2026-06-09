// src/routes/zpa/postureRoutes.ts

import { Router } from 'express';
import * as postureController from '../../controllers/zpa/postureController';

const router = Router();

router.get('/posture-profiles', postureController.listPostureProfilesController);
router.get('/posture-profiles/:profileId', postureController.getPostureProfileController);
router.post('/posture-profiles', postureController.createPostureProfileController);
router.put('/posture-profiles/:profileId', postureController.updatePostureProfileController);
router.delete('/posture-profiles/:profileId', postureController.deletePostureProfileController);

export default router;
