import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Protect all admin course routes
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/courses
 * Fetch paginated courses list with search, department, year, and semester filters
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      year = "",
      sem = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const queryParams = [];
    let paramIdx = 1;

    // Search filter (name or code)
    if (search && search.trim()) {
      whereConditions.push(
        `(c.name ILIKE $${paramIdx} OR c.code ILIKE $${paramIdx} OR c.description ILIKE $${paramIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // Department filter
    if (department && department.trim()) {
      whereConditions.push(
        `(c.department_id::text = $${paramIdx} OR d.code = $${paramIdx})`
      );
      queryParams.push(department.trim());
      paramIdx++;
    }

    // Year filter
    if (year && !isNaN(parseInt(year, 10))) {
      whereConditions.push(`c.year = $${paramIdx}`);
      queryParams.push(parseInt(year, 10));
      paramIdx++;
    }

    // Semester filter
    if (sem && !isNaN(parseInt(sem, 10))) {
      whereConditions.push(`c.sem = $${paramIdx}`);
      queryParams.push(parseInt(sem, 10));
      paramIdx++;
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query
    const dataQueryParams = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.code,
        c.description,
        c.department_id,
        d.name AS department_name,
        d.code AS department_code,
        c.credit,
        c.category,
        c.year,
        c.sem,
        COALESCE(c.academic_year, '2024-2025') AS academic_year,
        c.thumbnail_url,
        c.syllabus_url,
        c.learning_objectives,
        c.created_at
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereClause}
      ORDER BY c.created_at DESC, c.code ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const coursesResult = await pool.query(dataQuery, dataQueryParams);

    return res.status(200).json({
      success: true,
      data: {
        courses: coursesResult.rows,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses list.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/courses
 * Create a new academic course
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      description = "",
      department_id,
      credit = 3,
      category = "Core",
      year = 1,
      sem = 1,
      academic_year = "2024-2025",
      thumbnail_url = "",
      syllabus_url = "",
      learning_objectives = "",
    } = req.body;

    if (!name || !code || !department_id) {
      return res.status(400).json({
        success: false,
        message: "Course name, code, and department are required.",
      });
    }

    const upperCode = code.trim().toUpperCase();

    // Verify department exists
    const deptCheck = await pool.query(
      "SELECT id FROM departments WHERE id::text = $1 OR code = $1",
      [department_id]
    );

    if (deptCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected department does not exist.",
      });
    }

    const actualDeptId = deptCheck.rows[0].id;

    // Check duplicate code within department/year/sem
    const existingCourse = await pool.query(
      "SELECT id FROM courses WHERE UPPER(code) = UPPER($1) AND department_id = $2 AND year = $3 AND sem = $4",
      [upperCode, actualDeptId, parseInt(year, 10), parseInt(sem, 10)]
    );

    if (existingCourse.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Course with code '${upperCode}' already exists for this department, year and semester.`,
      });
    }

    const insertQuery = `
      INSERT INTO courses (
        name, code, description, department_id, credit, category, year, sem, academic_year,
        thumbnail_url, syllabus_url, learning_objectives, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, code, department_id, credit, category, year, sem, academic_year, created_at
    `;

    const result = await pool.query(insertQuery, [
      name.trim(),
      upperCode,
      description.trim(),
      actualDeptId,
      parseFloat(credit) || 3.0,
      category || "Core",
      parseInt(year, 10) || 1,
      parseInt(sem, 10) || 1,
      academic_year || "2024-2025",
      thumbnail_url.trim(),
      syllabus_url.trim(),
      learning_objectives.trim(),
    ]);

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: {
        course: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Error creating course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create course.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/courses/bulk-import
 * Bulk import courses from parsed CSV/Excel array
 */
router.post("/bulk-import", async (req, res) => {
  try {
    const { courses } = req.body;

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No courses provided for import.",
      });
    }

    // Pre-fetch all departments for quick lookup by name or code
    const deptsRes = await pool.query("SELECT id, code, name FROM departments");
    const depts = deptsRes.rows;

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let index = 0; index < courses.length; index++) {
      const item = courses[index];
      const code = item.code ? String(item.code).trim().toUpperCase() : "";
      const name = item.name ? String(item.name).trim() : "";
      const description = item.description ? String(item.description).trim() : "";
      const deptStr = item.department ? String(item.department).trim() : "";
      const credit = parseFloat(item.credit) || 3;
      const category = item.category ? String(item.category).trim() : "Core";
      const sem = parseInt(item.sem, 10) || 1;
      const year = parseInt(item.year, 10) || 1;
      const academicYear = item.academic_year ? String(item.academic_year).trim() : "2024-2025";
      const learningObjectives = item.learning_objectives ? String(item.learning_objectives).trim() : "";

      if (!code || !name) {
        skippedCount++;
        errors.push(`Row ${index + 1}: Course code and Course name are required.`);
        continue;
      }

      // Find matching department
      let deptId = null;
      if (deptStr) {
        const found = depts.find(
          (d) =>
            d.code.toUpperCase() === deptStr.toUpperCase() ||
            d.name.toUpperCase() === deptStr.toUpperCase() ||
            d.id.toString() === deptStr
        );
        if (found) {
          deptId = found.id;
        }
      }

      // Fallback department if not found
      if (!deptId && depts.length > 0) {
        deptId = depts[0].id;
      } else if (!deptId) {
        const defaultDept = await pool.query(
          `INSERT INTO departments (name, code, description) VALUES ('General', 'GEN', 'General Department') RETURNING id`
        );
        deptId = defaultDept.rows[0].id;
        depts.push({ id: deptId, code: "GEN", name: "General" });
      }

      // Check if course exists by code for THIS department, year and semester
      const existing = await pool.query(
        "SELECT id FROM courses WHERE UPPER(code) = UPPER($1) AND department_id = $2 AND sem = $3 AND year = $4",
        [code, deptId, sem, year]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE courses
           SET name = $1,
               description = CASE WHEN $2 != '' THEN $2 ELSE description END,
               department_id = $3,
               credit = $4,
               category = $5,
               sem = $6,
               year = $7,
               academic_year = $8,
               learning_objectives = CASE WHEN $9 != '' THEN $9 ELSE learning_objectives END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $10`,
          [name, description, deptId, credit, category, sem, year, academicYear, learningObjectives, existing.rows[0].id]
        );
        updatedCount++;
      } else {
        await pool.query(
          `INSERT INTO courses (
            name, code, description, department_id, credit, category, year, sem, academic_year, learning_objectives, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [name, code, description, deptId, credit, category, year, sem, academicYear, learningObjectives]
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
    console.error("Error bulk importing courses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk import courses.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/courses/:id
 * Update an existing course
 */

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description = "",
      department_id,
      credit = 3,
      category = "Core",
      year = 1,
      sem = 1,
      academic_year = "2024-2025",
      thumbnail_url = "",
      syllabus_url = "",
      learning_objectives = "",
    } = req.body;

    if (!name || !code || !department_id) {
      return res.status(400).json({
        success: false,
        message: "Course name, code, and department are required.",
      });
    }

    const upperCode = code.trim().toUpperCase();

    // Verify department
    const deptCheck = await pool.query(
      "SELECT id FROM departments WHERE id::text = $1 OR code = $1",
      [department_id]
    );

    if (deptCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected department does not exist.",
      });
    }

    const actualDeptId = deptCheck.rows[0].id;

    // Check duplicate code
    const duplicateCheck = await pool.query(
      "SELECT id FROM courses WHERE UPPER(code) = UPPER($1) AND department_id = $2 AND year = $3 AND sem = $4 AND id != $5",
      [upperCode, actualDeptId, parseInt(year, 10), parseInt(sem, 10), id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Another course with code '${upperCode}' already exists for this department and semester.`,
      });
    }

    const updateQuery = `
      UPDATE courses
      SET name = $1,
          code = $2,
          description = $3,
          department_id = $4,
          credit = $5,
          category = $6,
          year = $7,
          sem = $8,
          academic_year = $9,
          thumbnail_url = $10,
          syllabus_url = $11,
          learning_objectives = $12,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING id, name, code, department_id, credit, category, year, sem, academic_year
    `;

    const result = await pool.query(updateQuery, [
      name.trim(),
      upperCode,
      description ? description.trim() : "",
      actualDeptId,
      parseFloat(credit) || 3.0,
      category || "Core",
      parseInt(year, 10) || 1,
      parseInt(sem, 10) || 1,
      academic_year ? academic_year.trim() : "2024-2025",
      thumbnail_url ? thumbnail_url.trim() : "",
      syllabus_url ? syllabus_url.trim() : "",
      learning_objectives ? learning_objectives.trim() : "",
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: {
        course: result.rows[0],
      },
    });


    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: {
        course: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/courses/:id
 * Delete a course
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleteResult = await pool.query(
      "DELETE FROM courses WHERE id = $1 RETURNING id, name, code",
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Course '${deleteResult.rows[0].name}' deleted successfully.`,
      data: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete course.",
      error: error.message,
    });
  }
});

export default router;
