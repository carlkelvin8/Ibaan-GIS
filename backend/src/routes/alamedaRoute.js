// backend/src/routes/alamedaRoute.js
import express from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import {
  getAllAlameda,
  getAlamedaById,
  search,           // expects req.query.q (recommended)
  editAlamedaById
} from '../controllers/alamedaController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Alameda
 *   description: Alameda municipality data
 */

/**
 * @swagger
 * /alameda/search:
 *   get:
 *     summary: Search Alameda records
 *     tags: [Alameda]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search/:value', authRequired, search);

/**
 * @swagger
 * /alameda:
 *   get:
 *     summary: Get all Alameda records
 *     tags: [Alameda]
 *     responses:
 *       200:
 *         description: List of records
 */
router.get('/', authRequired, getAllAlameda);

/**
 * @swagger
 * /alameda/{id}:
 *   get:
 *     summary: Get Alameda record by ID
 *     tags: [Alameda]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record details
 */
router.get('/:id', authRequired, getAlamedaById);

/**
 * @swagger
 * /alameda/{id}:
 *   put:
 *     summary: Update Alameda record
 *     tags: [Alameda]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'ASSESSOR', 'PLANNER'),
  editAlamedaById
);

export default router;