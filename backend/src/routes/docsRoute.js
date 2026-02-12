import express from 'express';
import { getDocContent } from '../controllers/docsController.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/:docId', authRequired, requireRole('ADMIN'), getDocContent);

export default router;
