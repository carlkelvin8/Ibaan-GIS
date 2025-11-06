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

// Put literal routes FIRST
// Prefer query param to avoid route conflicts: GET /api/alameda/search?q=foo
router.get('/search', authRequired, search);

// List
router.get('/', authRequired, getAllAlameda);

// Read one (param route AFTER literal ones)
router.get('/:id', authRequired, getAlamedaById);

// Update (restrict to roles that can edit)
router.put(
  '/:id',
  authRequired,
  requireRole('ADMIN', 'ASSESSOR', 'PLANNER'),
  editAlamedaById
);

export default router;