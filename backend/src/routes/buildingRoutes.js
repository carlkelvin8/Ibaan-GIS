import express from 'express';
import { addNew, getAll, getById, editById, deleteById } from '../controllers/buildingController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Building
 *   description: Building management
 */

/**
 * @swagger
 * /building:
 *   post:
 *     summary: Create new building
 *     tags: [Building]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             # Add properties
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/", addNew);

/**
 * @swagger
 * /building:
 *   get:
 *     summary: Get all buildings
 *     tags: [Building]
 *     responses:
 *       200:
 *         description: List of buildings
 */
router.get("/", getAll);

/**
 * @swagger
 * /building/{id}:
 *   get:
 *     summary: Get building by ID
 *     tags: [Building]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Building details
 */
router.get("/:id", getById);

/**
 * @swagger
 * /building/{id}:
 *   put:
 *     summary: Update building
 *     tags: [Building]
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
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/:id", editById);

/**
 * @swagger
 * /building/{id}:
 *   delete:
 *     summary: Delete building
 *     tags: [Building]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', deleteById);

export default router;