import express from 'express'
import { addNew, getAll, deleteOne } from '../controllers/landAppraisalController.js';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LandAppraisal
 *   description: Land appraisal management
 */

/**
 * @swagger
 * /landappraisal/{taxid}:
 *   post:
 *     summary: Add new land appraisal for a tax record
 *     tags: [LandAppraisal]
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
 *               class:
 *                 type: string
 *               subClass:
 *                 type: string
 *               area:
 *                 type: number
 *               unitValue:
 *                 type: number
 *     responses:
 *       201:
 *         description: Appraisal added
 */
router.post("/:taxid", addNew);

/**
 * @swagger
 * /landappraisal/{taxid}:
 *   get:
 *     summary: Get all appraisals for a tax record
 *     tags: [LandAppraisal]
 *     parameters:
 *       - in: path
 *         name: taxid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of appraisals
 */
router.get("/:taxid", getAll);

/**
 * @swagger
 * /landappraisal/{taxid}/{id}:
 *   delete:
 *     summary: Delete a specific appraisal record
 *     tags: [LandAppraisal]
 *     parameters:
 *       - in: path
 *         name: taxid
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete("/:taxid/:id", deleteOne);

export default router;