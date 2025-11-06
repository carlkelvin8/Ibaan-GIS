import express from "express";
import { upsertOtherDetails, getByTaxId } from "../controllers/taxOtherDetailsController.js";

const router = express.Router();

router.get("/:taxid", getByTaxId);
// Insert or update Other Details by taxId
router.post("/:taxid", upsertOtherDetails);

export default router;