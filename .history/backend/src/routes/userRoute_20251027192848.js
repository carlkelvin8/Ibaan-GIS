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

} from '../controllers/userController.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = express.Router();

/* ---------- Auth & session ---------- */
router.post('/user/signup', signup);
router.post('/user/login',  login);
router.post('/user/logout', authRequired, logout);
router.get ('/user/me',     authRequired, me);

/* ---------- Me (profile & password) ---------- */
router.patch('/user/me',          authRequired, updateMyProfile);
router.post ('/user/me/password', authRequired, changeMyPassword);

/* ---------- Admin-only user management ---------- */
router.get   ('/admin/users', authRequired, requireRole('ADMIN'), listFilteredUsers);
router.post  ('/user',        authRequired, requireRole('ADMIN'), createUser);
router.get   ('/user/:id',    authRequired, requireRole('ADMIN'), getUserById);
router.patch ('/user/:id',    authRequired, requireRole('ADMIN'), updateUser);
router.delete('/user/:id',    authRequired, requireRole('ADMIN'), deleteUser);

router.post('/user/forgot-password', forgotPassword);
router.get ('/user/reset-password/:token', verifyResetToken);
router.post('/user/reset-password', resetPassword);

export default router;