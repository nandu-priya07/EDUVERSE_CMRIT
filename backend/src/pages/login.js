import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail, getUserProfile } from "../models/userModel.js";

const router = express.Router();

/**
 * Inline Email Validator
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Handle User Login & Exception Handling
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Missing credentials check
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // 2. Email format check
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // 3. User lookup exception handling
    let user;
    try {
      user = await getUserByEmail(email);
    } catch (dbError) {
      console.error("Database query error during login:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database error during authentication.",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 4. Password comparison exception handling
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError) {
      console.error("Password verification error:", bcryptError);
      return res.status(500).json({
        success: false,
        message: "Error verifying credentials.",
      });
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 5. Disabled account check
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact administrator.",
      });
    }

    // 6. JWT token generation exception handling
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

    let token;
    try {
      token = jwt.sign(
        {
          uid: user.uid,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn }
      );
    } catch (jwtError) {
      console.error("JWT token signing error:", jwtError);
      return res.status(500).json({
        success: false,
        message: "Failed to generate authorization token.",
      });
    }

    // Determine target redirect route based on role
    let redirectTo = "/";
    if (user.role === "student") {
      redirectTo = "/studentdashboard";
    } else if (user.role === "teacher") {
      redirectTo = "/teacher-dashboard";
    } else if (user.role === "admin" || user.role === "hod") {
      redirectTo = "/admin/dashboard";
    }

    // Remove sensitive password hash
    const { passwordHash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      expiresIn,
      redirectTo,
      user: safeUser,
    });
  } catch (error) {
    console.error("Unexpected login error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during sign in.",
    });
  }
}

/**
 * Authentication Middleware
 * Verifies Bearer token and loads user profile
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authorization token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Malformed token format.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "smartcampus_jwt_secret_key_supabase_2026";
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authorization token.",
      });
    }

    const userProfile = await getUserProfile(decoded.uid);

    if (!userProfile) {
      return res.status(403).json({
        success: false,
        message: "Access denied. User profile does not exist.",
      });
    }

    if (userProfile.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your account has been disabled.",
      });
    }

    const { passwordHash, ...safeUser } = userProfile;
    req.user = safeUser;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
}

/**
 * Role-Based Authorization Middleware
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied. User profile or role missing.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
}

// Router endpoint mapping
router.post("/login", login);

export default router;