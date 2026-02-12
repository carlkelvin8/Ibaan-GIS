import express from 'express';
import { getParcels, getBarangays, getParcelById, searchParcels } from '../controllers/mapController.js';

const router = express.Router();

// Read-only map endpoints
router.get('/parcels', getParcels);
router.get('/search', searchParcels);
router.get('/parcels/:id', getParcelById);
router.get('/barangays', getBarangays);

export default router;
