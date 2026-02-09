// src/routes/taxRoute.js
import express from "express";
import {
  getAll,
  addNew,
  getById,
  editById,
  lookup,
  removeById,   // ✅ import delete function
} from "../controllers/taxController.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tax:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         arpNo:
 *           type: string
 *         accountNo:
 *           type: string
 *         ownerName:
 *           type: string
 *         # Add other properties as needed
 */

/**
 * @swagger
 * tags:
 *   name: Tax
 *   description: Tax form management
 */

/**
 * @swagger
 * /tax:
 *   get:
 *     summary: Get all tax forms
 *     tags: [Tax]
 *     responses:
 *       200:
 *         description: List of tax forms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tax'
 */
router.get("/", getAll);

/**
 * @swagger
 * /tax/lookup:
 *   get:
 *     summary: Lookup tax forms (e.g. by owner name)
 *     tags: [Tax]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/lookup", lookup);

/**
 * @swagger
 * /tax:
 *   post:
 *     summary: Create a new tax form
 *     tags: [Tax]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tax'
 *     responses:
 *       201:
 *         description: Tax form created
 */
router.post("/", addNew);

/**
 * @swagger
 * /tax/{id}:
 *   get:
 *     summary: Get tax form by ID
 *     tags: [Tax]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tax form details
 *       404:
 *         description: Not found
 */
router.get("/:id", getById);

/**
 * @swagger
 * /tax/{id}:
 *   put:
 *     summary: Update tax form
 *     tags: [Tax]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tax'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/:id", editById);

/**
 * @swagger
 * /tax/{id}:
 *   delete:
 *     summary: Delete tax form
 *     tags: [Tax]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete("/:id", removeById);  // ✅ new delete endpoint

export default router;
