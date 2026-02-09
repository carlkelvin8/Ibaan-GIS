import express from "express";
import { upsertOtherDetails, getByTaxId } from "../controllers/taxOtherDetailsController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: TaxOtherDetails
 *   description: Tax other details management
 */

/**
 * @swagger
 * /taxotherdetails/{taxid}:
 *   get:
 *     summary: Get other details by Tax ID
 *     tags: [TaxOtherDetails]
 *     parameters:
 *       - in: path
 *         name: taxid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Other details
 */
router.get("/:taxid", getByTaxId);

/**
 * @swagger
 * /taxotherdetails/{taxid}:
 *   post:
 *     summary: Insert or update other details by Tax ID
 *     tags: [TaxOtherDetails]
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
 *               swornStatement:
 *                 type: string
 *               swornDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Saved successfully
 */
router.post("/:taxid", upsertOtherDetails);

export default router;