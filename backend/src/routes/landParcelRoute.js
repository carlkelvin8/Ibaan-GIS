import express from 'express';
import { 
  getAll, 
  addNew, 
  getById, 
  editById, 
  removeById   // ✅ import delete function
} from '../controllers/landParcelController.js';

const router = express.Router();

router.get("/", getAll);
router.post("/", addNew);
router.get("/:id", getById);
router.put("/:id", editById);
router.delete("/:id", removeById);  // ✅ new delete route

export default router;
