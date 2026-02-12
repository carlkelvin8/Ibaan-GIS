// backend/src/routes/ibaanRoute.js
import { Router } from "express";
import {
  getAll, getById, addNew, editById, removeById, search, getByTaxId
} from "../controllers/ibaanController.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ibaan
 *   description: Ibaan municipality data
 */

/**
 * @swagger
 * /ibaan/tax/{taxId}:
 *   get:
 *     summary: Get Parcel ID by Tax ID
 *     tags: [Ibaan]
 *     parameters:
 *       - in: path
 *         name: taxId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Parcel ID
 */
router.get("/tax/:taxId", getByTaxId);

/**
 * @swagger
 * /ibaan:
 *   get:
 *     summary: Get all Ibaan records
 *     tags: [Ibaan]
 *     responses:
 *       200:
 *         description: List of records
 */
router.get("/", getAll);

/**
 * @swagger
 * /ibaan/search/{value}:
 *   get:
 *     summary: Search Ibaan records
 *     tags: [Ibaan]
 *     parameters:
 *       - in: path
 *         name: value
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search/:value", search);

/**
 * @swagger
 * /ibaan/{id}:
 *   get:
 *     summary: Get Ibaan record by ID
 *     tags: [Ibaan]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Not found
 */
router.get("/:id", getById);

/**
 * @swagger
 * /ibaan:
 *   post:
 *     summary: Create new Ibaan record
 *     tags: [Ibaan]
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
 * /ibaan/{id}:
 *   put:
 *     summary: Update Ibaan record
 *     tags: [Ibaan]
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
 * /ibaan/{id}:
 *   delete:
 *     summary: Delete Ibaan record
 *     tags: [Ibaan]
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
router.delete("/:id", removeById);

export default router;
