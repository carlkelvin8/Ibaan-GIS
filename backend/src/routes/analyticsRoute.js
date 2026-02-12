import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Dashboard analytics and statistics
 */

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getDashboardStats);

export default router;
