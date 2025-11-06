import express from 'express'
import { addNew, getAll, deleteOne } from '../controllers/landAppraisalController.js';
const router = express.Router();

router.post("/:taxid", addNew);
router.get("/:taxid", getAll);
router.delete("/:taxid/:id", deleteOne);

export default router;