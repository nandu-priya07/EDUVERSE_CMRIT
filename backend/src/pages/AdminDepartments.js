import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply auth middleware to all admin department endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * Ensure is_active column exists on departments table
 */
async function ensureDepartmentsSchema() {
  try {
    await pool.query(
      `ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`
    );
  } catch (err) {
    console.error("Departments schema alteration notice:", err.message);
  }
}
ensureDepartmentsSchema();

/**
 * GET /api/admin/departments
 * Fetch departments list with search, pagination, and counts (faculty, students, courses)
 */
router.get("/", async (req, res) => {
  try {
    const { page, limit, search = "" } = req.query;

    // If no page and limit supplied, return all departments for dropdown selectors
    if (!page && !limit && !search) {
      const allDepts = await pool.query(
        "SELECT id, name, code, description, COALESCE(is_active, true) AS is_active, created_at FROM departments ORDER BY name ASC"
      );
      return res.status(200).json({
        success: true,
        data: {
          departments: allDepts.rows,
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const queryParams = [];
    let paramIdx = 1;

    if (search && search.trim()) {
      whereConditions.push(
        `(d.name ILIKE $${paramIdx} OR d.code ILIKE $${paramIdx} OR d.description ILIKE $${paramIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Count total matching departments
    const countQuery = `SELECT COUNT(*) AS total FROM departments d ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query with subqueries for faculty_count, student_count, course_count
    const dataQueryParams = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT 
        d.id,
        d.name,
        d.code,
        d.description,
        COALESCE(d.is_active, true) AS is_active,
        d.created_at,
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u.role = 'teacher' 
            AND (
              u.department = d.id::text 
              OR UPPER(u.department) = UPPER(d.code) 
              OR UPPER(u.department) = UPPER(d.name)
              OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
              OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
            )
        )::int AS faculty_count,
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u.role = 'student' 
            AND (
              u.department = d.id::text 
              OR UPPER(u.department) = UPPER(d.code) 
              OR UPPER(u.department) = UPPER(d.name)
              OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
              OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
            )
        )::int AS student_count,
        (
          SELECT COUNT(*)
          FROM courses c
          WHERE c.department_id = d.id
        )::int AS course_count
      FROM departments d
      ${whereClause}
      ORDER BY d.name ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const result = await pool.query(dataQuery, dataQueryParams);

    return res.status(200).json({
      success: true,
      data: {
        departments: result.rows,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/departments
 * Create a new academic department
 */
router.post("/", async (req, res) => {
  try {
    const { name, code, description = "" } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required.",
      });
    }

    const upperCode = code.trim().toUpperCase();

    // Check duplicate code
    const existingCode = await pool.query(
      "SELECT id FROM departments WHERE UPPER(code) = UPPER($1)",
      [upperCode]
    );
    if (existingCode.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Department with code '${upperCode}' already exists.`,
      });
    }

    const insertQuery = `
      INSERT INTO departments (name, code, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, code, description, is_active, created_at
    `;

    const result = await pool.query(insertQuery, [
      name.trim(),
      upperCode,
      description.trim(),
    ]);

    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: {
        department: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create department.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/departments/bulk-import
 * Bulk import departments from parsed CSV/Excel array
 */
router.post("/bulk-import", async (req, res) => {
  try {
    const { departments } = req.body;

    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No departments provided for import.",
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let index = 0; index < departments.length; index++) {
      const item = departments[index];
      const name = item.name ? String(item.name).trim() : "";
      const code = item.code ? String(item.code).trim().toUpperCase() : "";
      const description = item.description ? String(item.description).trim() : "";

      if (!name || !code) {
        skippedCount++;
        errors.push(`Row ${index + 1}: Name and Code are required.`);
        continue;
      }

      // Check if department code exists
      const existing = await pool.query(
        "SELECT id FROM departments WHERE UPPER(code) = UPPER($1)",
        [code]
      );

      if (existing.rows.length > 0) {
        // Update existing department details
        await pool.query(
          `UPDATE departments 
           SET name = $1, description = CASE WHEN $2 != '' THEN $2 ELSE description END, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [name, description, existing.rows[0].id]
        );
        updatedCount++;
      } else {
        // Insert new department
        await pool.query(
          `INSERT INTO departments (name, code, description, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [name, code, description]
        );
        createdCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
      data: {
        createdCount,
        updatedCount,
        skippedCount,
        errors,
      },
    });
  } catch (error) {
    console.error("Error bulk importing departments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk import departments.",
      error: error.message,
    });
  }
});


/**
 * PUT /api/admin/departments/:id
 * Update an existing department
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required.",
      });
    }

    const upperCode = code.trim().toUpperCase();

    // Check if another department uses the same code
    const checkDuplicate = await pool.query(
      "SELECT id FROM departments WHERE UPPER(code) = UPPER($1) AND id != $2",
      [upperCode, id]
    );
    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Another department with code '${upperCode}' already exists.`,
      });
    }

    const updateQuery = `
      UPDATE departments
      SET name = $1,
          code = $2,
          description = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, code, description, is_active
    `;

    const result = await pool.query(updateQuery, [
      name.trim(),
      upperCode,
      description ? description.trim() : "",
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: {
        department: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update department.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/departments/:id/status
 * Toggle active/inactive status
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "'is_active' boolean status is required.",
      });
    }

    const updateRes = await pool.query(
      `UPDATE departments SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, is_active`,
      [is_active, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Department status changed to ${is_active ? "active" : "inactive"}.`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error updating department status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update department status.",
      error: error.message,
    });
  }
});

export default router;
