import express from "express";
import { getByTaxId, upsertAssessmentSummary } from "../controllers/landAssessmentController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LandAssessment
 *   description: Land assessment summary
 */

/**
 * @swagger
 * /landassessment/{taxid}:
 *   get:
 *     summary: Get assessment summary by Tax ID
 *     tags: [LandAssessment]
 *     parameters:
 *       - in: path
 *         name: taxid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assessment summary
 */
router.get("/:taxid", getByTaxId);

/**
 * @swagger
 * /landassessment/{taxid}:
 *   post:
 *     summary: Insert or update assessment summary by Tax ID
 *     tags: [LandAssessment]
 *     parameters:
 *       - in: path
 *         name: taxid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marketValue:
 *                 type: number
 *               assessedValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Saved successfully
 */
router.post("/:taxid", upsertAssessmentSummary);


export default router;