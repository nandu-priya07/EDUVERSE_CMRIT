import express from "express";
import {
  createUser,
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
} from "../controllers/userController.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user account (Admin only)
 * @access  Private (Admin)
 */
router.post("/", authenticate, authorizeRoles("admin"), createUser);

/**
 * @route   GET /api/users/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get("/me", authenticate, getCurrentUser);

/**
 * @route   GET /api/users
 * @desc    List user accounts (Admin / HOD)
 * @access  Private (Admin, HOD)
 */
router.get("/", authenticate, authorizeRoles("admin", "hod"), getUsers);

/**
 * @route   GET /api/users/:uid
 * @desc    Retrieve user profile by UID
 * @access  Private (Self, Admin, HOD)
 */
router.get("/:uid", authenticate, getUserById);

/**
 * @route   PATCH /api/users/:uid
 * @desc    Update permitted user profile fields
 * @access  Private (Self permitted fields, Admin all)
 */
router.patch("/:uid", authenticate, updateUser);

/**
 * @route   PATCH /api/users/:uid/status
 * @desc    Enable or disable user account (Admin only)
 * @access  Private (Admin)
 */
router.patch("/:uid/status", authenticate, authorizeRoles("admin"), updateUserStatus);

/**
 * @route   DELETE /api/users/:uid
 * @desc    Delete user account and profile (Admin only)
 * @access  Private (Admin)
 */
router.delete("/:uid", authenticate, authorizeRoles("admin"), deleteUser);

export default router;
