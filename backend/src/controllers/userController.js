import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  createUserProfile,
  getUserProfile,
  getUserByEmail,
  getAllUserProfiles,
  updateUserProfile,
  deleteUserProfile,
} from "../models/userModel.js";

const ALLOWED_ROLES = ["student", "teacher", "hod", "admin"];

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validateCreateUserInput(data) {
  const errors = [];
  if (!data.name || typeof data.name !== "string" || !data.name.trim()) errors.push("Name is required.");
  if (!data.email || !isValidEmail(data.email)) errors.push("A valid email address is required.");
  if (!data.password || typeof data.password !== "string" || data.password.length < 6) errors.push("Password must be at least 6 characters long.");
  if (!data.role || !ALLOWED_ROLES.includes(data.role)) errors.push(`Role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
  if (data.role === "student" && (!data.registerNumber || typeof data.registerNumber !== "string" || !data.registerNumber.trim())) errors.push("registerNumber is required for student accounts.");
  if ((data.role === "teacher" || data.role === "hod") && (!data.employeeId || typeof data.employeeId !== "string" || !data.employeeId.trim())) errors.push(`employeeId is required for ${data.role} accounts.`);
  return { isValid: errors.length === 0, errors };
}


function validateUpdateUserInput(data, isSelfUpdate = false) {
  const errors = [];
  if (data.email !== undefined && !isValidEmail(data.email)) errors.push("Valid email address is required.");
  if (data.role !== undefined) {
    if (isSelfUpdate) errors.push("Users cannot change their own role.");
    else if (!ALLOWED_ROLES.includes(data.role)) errors.push(`Role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
  }
  if (isSelfUpdate) {
    const forbiddenKeys = ["role", "isActive", "createdBy", "uid", "createdAt"];
    for (const key of forbiddenKeys) {
      if (data[key] !== undefined) errors.push(`You are not allowed to update field '${key}'.`);
    }
  }
  return { isValid: errors.length === 0, errors };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Create User (Admin Only)
 * Endpoint: POST /api/users
 */
export async function createUser(req, res) {
  try {
    const { name, email, password, role, department, registerNumber, employeeId } = req.body;

    const validation = validateCreateUserInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors,
      });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const uid = `USR-${crypto.randomUUID()}`;

    const profile = await createUserProfile(uid, {
      name,
      email,
      passwordHash,
      role,
      department: department || null,
      registerNumber: role === "student" ? registerNumber : null,
      employeeId: (role === "faculty" || role === "hod" || role === "admin") ? employeeId : null,
      createdBy: req.user ? req.user.uid : "admin",
    });

    return res.status(201).json({
      success: true,
      message: "User account and profile created successfully.",
      user: sanitizeUser(profile),
    });
  } catch (error) {
    console.error("Create user controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during user creation.",
    });
  }
}

/**
 * Get Current User Profile
 * Endpoint: GET /api/users/me
 */
export async function getCurrentUser(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user profile.",
    });
  }
}

/**
 * Get All Users (Admin / HOD)
 * Endpoint: GET /api/users
 */
export async function getUsers(req, res) {
  try {
    const { role, department } = req.query;
    let users = await getAllUserProfiles();

    if (req.user.role === "hod" && !department) {
      users = users.filter((u) => u.department === req.user.department);
    } else if (department) {
      users = users.filter((u) => u.department?.toLowerCase() === department.toLowerCase());
    }

    if (role) {
      users = users.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
    }

    const safeUsers = users.map(sanitizeUser);

    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      users: safeUsers,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while listing users.",
    });
  }
}

/**
 * Get User By UID
 * Endpoint: GET /api/users/:uid
 */
export async function getUserById(req, res) {
  try {
    const { uid } = req.params;

    if (req.user.role !== "admin" && req.user.role !== "hod" && req.user.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You can only view your own profile.",
      });
    }

    const targetUser = await getUserProfile(uid);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (req.user.role === "hod" && req.user.uid !== uid && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. HOD can only view users within their department.",
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(targetUser),
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving user profile.",
    });
  }
}

/**
 * Update User Profile
 * Endpoint: PATCH /api/users/:uid
 */
export async function updateUser(req, res) {
  try {
    const { uid } = req.params;
    const isSelfUpdate = req.user.uid === uid;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You can only update your own profile.",
      });
    }

    const validation = validateUpdateUserInput(req.body, isSelfUpdate);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors,
      });
    }

    const existingUser = await getUserProfile(uid);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const updates = {};
    const allowedKeysAdmin = ["name", "email", "department", "registerNumber", "employeeId", "role"];
    const allowedKeysSelf = ["name", "department"];

    const allowedKeys = isAdmin ? allowedKeysAdmin : allowedKeysSelf;

    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (isAdmin && req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const updatedProfile = await updateUserProfile(uid, updates);

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
      user: sanitizeUser(updatedProfile),
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating user profile.",
    });
  }
}

/**
 * Update User Active Status (Admin Only)
 * Endpoint: PATCH /api/users/:uid/status
 */
export async function updateUserStatus(req, res) {
  try {
    const { uid } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value (true or false).",
      });
    }

    if (req.user.uid === uid) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot disable their own account status.",
      });
    }

    const existingUser = await getUserProfile(uid);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const updatedProfile = await updateUserProfile(uid, { isActive });

    return res.status(200).json({
      success: true,
      message: `User account ${isActive ? "enabled" : "disabled"} successfully.`,
      user: sanitizeUser(updatedProfile),
    });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating user status.",
    });
  }
}

/**
 * Delete User Account (Admin Only)
 * Endpoint: DELETE /api/users/:uid
 */
export async function deleteUser(req, res) {
  try {
    const { uid } = req.params;

    if (req.user.uid === uid) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot delete their own account.",
      });
    }

    const existingUser = await getUserProfile(uid);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await deleteUserProfile(uid);

    return res.status(200).json({
      success: true,
      message: "User account and profile deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting user.",
    });
  }
}
