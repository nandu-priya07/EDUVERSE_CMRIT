import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply auth middleware to all admin teacher endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/teachers
 * Fetch paginated list of faculty/teachers with search & filters
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      status = "all",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = ["u.role = 'teacher'"];
    const queryParams = [];
    let paramIdx = 1;

    // Search filter (name, email, employee_id)
    if (search && search.trim()) {
      whereConditions.push(
        `(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.employee_id ILIKE $${paramIdx} OR tp.employee_id ILIKE $${paramIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // Department filter
    if (department && department.trim()) {
      whereConditions.push(
        `(u.department = $${paramIdx} OR d.id::text = $${paramIdx} OR d.code = $${paramIdx})`
      );
      queryParams.push(department.trim());
      paramIdx++;
    }

    // Status filter
    if (status === "active") {
      whereConditions.push(`u.is_active = true`);
    } else if (status === "inactive") {
      whereConditions.push(`u.is_active = false`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.uid) AS total
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
      )
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query
    const dataQueryParams = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT 
        u.uid,
        u.name,
        u.email,
        COALESCE(u.employee_id, tp.employee_id) AS employee_id,
        u.is_active,
        u.created_at,
        u.department AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        tp.designation,
        tp.qualification,
        tp.phone,
        COALESCE(tp.employment_type, 'full-time') AS employment_type
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
      )
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const teachersResult = await pool.query(dataQuery, dataQueryParams);

    return res.status(200).json({
      success: true,
      data: {
        teachers: teachersResult.rows,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty list.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/teachers
 * Create a new faculty member account & profile
 */
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      email,
      password,
      employee_id,
      department_id,
      designation = "",
      qualification = "",
      phone = "",
      employment_type = "full-time",
    } = req.body;

    if (!name || !email || !password || !employee_id || !department_id) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, employee ID, and department are required.",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT uid FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Check existing employee_id
    const existingEmp = await pool.query(
      "SELECT uid FROM users WHERE LOWER(employee_id) = LOWER($1)",
      [employee_id.trim()]
    );
    if (existingEmp.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Faculty with this employee ID already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = crypto.randomUUID();

    await client.query("BEGIN");

    // Insert into users
    const insertUserQuery = `
      INSERT INTO users (
        uid, name, email, password_hash, role, department, employee_id, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'teacher', $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING uid, name, email, employee_id, department, is_active, created_at
    `;
    const userRes = await client.query(insertUserQuery, [
      uid,
      name.trim(),
      email.trim(),
      passwordHash,
      department_id.trim(),
      employee_id.trim(),
    ]);

    // Insert into teacher_profiles
    const insertProfileQuery = `
      INSERT INTO teacher_profiles (
        uid, name, email, full_name, phone, employee_id, department, designation, qualification, employment_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    await client.query(insertProfileQuery, [
      uid,
      name.trim(),
      email.trim(),
      name.trim(),
      phone.trim(),
      employee_id.trim(),
      department_id.trim(),
      designation.trim(),
      qualification.trim(),
      employment_type.trim(),
    ]);

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Faculty created successfully.",
      data: {
        teacher: userRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating faculty:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create faculty account.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/teachers/:uid
 * Update faculty member details
 */
router.put("/:uid", async (req, res) => {
  const client = await pool.connect();
  try {
    const { uid } = req.params;
    const {
      name,
      email,
      employee_id,
      department_id,
      designation,
      qualification,
      phone,
      employment_type,
    } = req.body;

    const userCheck = await pool.query(
      "SELECT uid FROM users WHERE uid = $1 AND role = 'teacher'",
      [uid]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty record not found.",
      });
    }

    await client.query("BEGIN");

    // Update users table
    const updateUserQuery = `
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          employee_id = COALESCE($3, employee_id),
          department = COALESCE($4, department),
          updated_at = CURRENT_TIMESTAMP
      WHERE uid = $5 AND role = 'teacher'
    `;
    await client.query(updateUserQuery, [
      name ? name.trim() : null,
      email ? email.trim() : null,
      employee_id ? employee_id.trim() : null,
      department_id ? department_id.trim() : null,
      uid,
    ]);

    // Upsert teacher_profiles table
    const upsertProfileQuery = `
      INSERT INTO teacher_profiles (
        uid, name, full_name, email, phone, employee_id, department, designation, qualification, employment_type, updated_at
      ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (uid) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, teacher_profiles.name),
        full_name = COALESCE(EXCLUDED.full_name, teacher_profiles.full_name),
        email = COALESCE(EXCLUDED.email, teacher_profiles.email),
        phone = COALESCE(EXCLUDED.phone, teacher_profiles.phone),
        employee_id = COALESCE(EXCLUDED.employee_id, teacher_profiles.employee_id),
        department = COALESCE(EXCLUDED.department, teacher_profiles.department),
        designation = COALESCE(EXCLUDED.designation, teacher_profiles.designation),
        qualification = COALESCE(EXCLUDED.qualification, teacher_profiles.qualification),
        employment_type = COALESCE(EXCLUDED.employment_type, teacher_profiles.employment_type),
        updated_at = CURRENT_TIMESTAMP
    `;
    await client.query(upsertProfileQuery, [
      uid,
      name ? name.trim() : null,
      email ? email.trim() : null,
      phone !== undefined ? phone.trim() : null,
      employee_id ? employee_id.trim() : null,
      department_id ? department_id.trim() : null,
      designation !== undefined ? designation.trim() : null,
      qualification !== undefined ? qualification.trim() : null,
      employment_type !== undefined ? employment_type.trim() : null,
    ]);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Faculty record updated successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating faculty:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update faculty record.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/admin/teachers/:uid/status
 * Toggle active/inactive status
 */
router.patch("/:uid/status", async (req, res) => {
  try {
    const { uid } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "'is_active' boolean status is required.",
      });
    }

    const updateRes = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2 AND role = 'teacher' RETURNING uid, is_active`,
      [is_active, uid]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Faculty status changed to ${is_active ? "active" : "inactive"}.`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error updating faculty status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update faculty status.",
      error: error.message,
    });
  }
});

export default router;
