import express from 'express';
import { 
  getAll, 
  addNew, 
  getById, 
  editById, 
  removeById   // ✅ import delete function
} from '../controllers/landParcelController.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LandParcel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         parcelID:
 *           type: string
 *         ownerName:
 *           type: string
 *         # Add other properties as needed
 */

/**
 * @swagger
 * tags:
 *   name: LandParcel
 *   description: Land parcel management
 */

/**
 * @swagger
 * /landparcel:
 *   get:
 *     summary: Get all land parcels
 *     tags: [LandParcel]
 *     responses:
 *       200:
 *         description: List of land parcels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LandParcel'
 */
router.get("/", getAll);

/**
 * @swagger
 * /landparcel:
 *   post:
 *     summary: Create a new land parcel
 *     tags: [LandParcel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LandParcel'
 *     responses:
 *       201:
 *         description: Land parcel created
 */
router.post("/", addNew);

/**
 * @swagger
 * /landparcel/{id}:
 *   get:
 *     summary: Get land parcel by ID
 *     tags: [LandParcel]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Land parcel details
 *       404:
 *         description: Not found
 */
router.get("/:id", getById);

/**
 * @swagger
 * /landparcel/{id}:
 *   put:
 *     summary: Update land parcel
 *     tags: [LandParcel]
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
 *             $ref: '#/components/schemas/LandParcel'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put("/:id", editById);

/**
 * @swagger
 * /landparcel/{id}:
 *   delete:
 *     summary: Delete land parcel
 *     tags: [LandParcel]
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
router.delete("/:id", removeById);  // ✅ new delete route

export default router;
