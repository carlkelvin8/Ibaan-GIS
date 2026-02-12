// backend/src/routes/userRoute.js
import express from 'express';
import {
  signup, login, logout, me,
  createUser, listFilteredUsers, getUserById, updateUser, deleteUser,
  updateMyProfile,
  changeMyPassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  uploadAvatar,
} from '../controllers/userController.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: The user name
 *         email:
 *           type: string
 *           description: The user email
 *         role:
 *           type: string
 *           description: The user role (e.g., ADMIN, USER)
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *     SignupRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user session management
 */

/**
 * @swagger
 * /user/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/user/signup', signup);

/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/user/login',  login);

/**
 * @swagger
 * /user/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/user/logout', authRequired, logout);

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get ('/user/me',     authRequired, me);

/* ---------- Me (profile & password) ---------- */
router.patch('/user/me',          authRequired, updateMyProfile);
router.post ('/user/me/password', authRequired, changeMyPassword);
router.post ('/user/me/avatar',   authRequired, upload.single('avatar'), uploadAvatar);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin user management
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users (filtered)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: List of users
 */
router.get   ('/admin/users',           authRequired, requireRole('ADMIN'), listFilteredUsers);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User created
 */
router.post  ('/admin/users',           authRequired, requireRole('ADMIN'), createUser);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get   ('/admin/users/:id',       authRequired, requireRole('ADMIN'), getUserById);

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
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
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch ('/admin/users/:id',       authRequired, requireRole('ADMIN'), updateUser);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/admin/users/:id',       authRequired, requireRole('ADMIN'), deleteUser);

/* ---------- Password reset ---------- */
router.post('/user/forgot-password', forgotPassword);
router.get ('/user/reset-password/:token', verifyResetToken);
router.post('/user/reset-password', resetPassword);


export default router;