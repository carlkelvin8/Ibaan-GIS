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

router.get('/audit',           authRequired, requireRole('ADMIN'), listAuditLogs);
router.get('/audit/stats',     authRequired, requireRole('ADMIN'), getAuditStats);

// Place CSV export BEFORE :id so it doesn’t get captured by that param route
router.get('/audit/export.csv', authRequired, requireRole('ADMIN'), exportAuditLogsCsv);

router.get('/audit/:id',       authRequired, requireRole('ADMIN'), getAuditLogById);
router.delete('/audit/:id',    authRequired, requireRole('ADMIN'), deleteAuditLog);

export default router;