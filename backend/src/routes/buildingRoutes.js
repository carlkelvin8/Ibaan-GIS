import express from 'express';
import { addNew, getAll, getById, editById, deleteById } from '../controllers/buildingController.js';

const router = express.Router();

router.post("/", addNew);
router.get("/", getAll);
router.get("/:id", getById);
router.put("/:id", editById);
router.delete('/:id', deleteById);

export default router;