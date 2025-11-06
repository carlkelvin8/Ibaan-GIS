// backend/src/routes/ibaanRoute.js
import { Router } from "express";
import {
  getAll, getById, addNew, editById, removeById, search,
} from "../controllers/ibaanController.js";

const router = Router();

// ⚠️ IMPORTANT: more specific route FIRST
router.get("/", getAll);
router.get("/search/:value", search);
router.get("/:id", getById);
router.post("/", addNew);
router.put("/:id", editById);
router.delete("/:id", removeById);

export default router;
