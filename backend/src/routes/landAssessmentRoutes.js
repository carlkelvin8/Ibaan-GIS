import express from "express";
import { getByTaxId, upsertAssessmentSummary } from "../controllers/landAssessmentController.js";

const router = express.Router();

router.get("/:taxid", getByTaxId);
// Insert or update by taxId
router.post("/:taxid", upsertAssessmentSummary);


export default router;