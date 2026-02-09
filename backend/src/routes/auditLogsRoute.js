// backend/src/routes/auditLogsRoute.js
import express from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import {
  listAuditLogs,
  getAuditLogById,
  getAuditStats,
  deleteAuditLog,
  exportAuditLogsCsv,     // ← add
} from '../controllers/auditLogsController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: System audit logs
 */

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: List audit logs
 *     tags: [AuditLogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of logs
 */
router.get('/audit',           authRequired, requireRole('ADMIN'), listAuditLogs);

/**
 * @swagger
 * /audit/stats:
 *   get:
 *     summary: Get audit log statistics
 *     tags: [AuditLogs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Stats
 */
router.get('/audit/stats',     authRequired, requireRole('ADMIN'), getAuditStats);

/**
 * @swagger
 * /audit/export.csv:
 *   get:
 *     summary: Export audit logs as CSV
 *     tags: [AuditLogs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/audit/export.csv', authRequired, requireRole('ADMIN'), exportAuditLogsCsv);

/**
 * @swagger
 * /audit/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [AuditLogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Log details
 */
router.get('/audit/:id',       authRequired, requireRole('ADMIN'), getAuditLogById);

/**
 * @swagger
 * /audit/{id}:
 *   delete:
 *     summary: Delete audit log
 *     tags: [AuditLogs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/audit/:id',    authRequired, requireRole('ADMIN'), deleteAuditLog);

export default router;