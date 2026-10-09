import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply admin/HOD protection to all endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/course-assignments
 * Fetch assignments, available courses, and faculty members
 */
router.get("/", async (req, res) => {
  try {
    const { department = "", search = "" } = req.query;

    // Fetch courses with department information and semester mappings
    const coursesQuery = `
      SELECT 
        c.id,
        c.code,
        c.name,
        c.credit AS credits,
        c.year,
        c.sem AS semester,
        COALESCE(c.academic_year, '2026-2027') AS "academicYear",
        c.category,
        c.department_id,
        d.name AS department_name,
        d.code AS department_code,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT sc.sem), NULL) AS "availableSemesters",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT sc.academic_year), NULL) AS "availableAcademicYears"
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN semester_courses sc ON c.id = sc.course_id
      GROUP BY c.id, d.name, d.code
      ORDER BY c.code ASC
    `;
    const coursesRes = await pool.query(coursesQuery);

    // Fetch faculty members
    const teachersQuery = `
      SELECT 
        u.uid AS id,
        u.name,
        u.email,
        COALESCE(u.employee_id, tp.employee_id) AS employee_id,
        COALESCE(d.name, u.department) AS department_name,
        COALESCE(d.code, u.department) AS department_code,
        tp.designation,
        tp.qualification
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108'))
      )
      WHERE u.role = 'teacher' AND u.is_active = true
      ORDER BY u.name ASC
    `;
    const teachersRes = await pool.query(teachersQuery);

    // Fetch existing course-teacher assignments
    const assignmentsQuery = `
      SELECT 
        cta.id,
        cta.course_id AS "courseId",
        cta.teacher_uid AS "teacherId",
        cta.academic_year AS "academicYear",
        cta.semester,
        COALESCE(cta.section, 'Section A') AS section,
        cta.role,
        cta.status,
        cta.created_at AS "createdAt",
        c.code AS course_code,
        c.name AS course_name,
        c.credit AS course_credits,
        cd.code AS course_dept_code,
        cd.name AS course_dept_name,
        u.name AS teacher_name,
        u.email AS teacher_email,
        COALESCE(u.employee_id, tp.employee_id) AS teacher_employee_id,
        td.code AS teacher_dept_code,
        td.name AS teacher_dept_name
      FROM course_teacher_assignments cta
      JOIN courses c ON cta.course_id = c.id
      LEFT JOIN departments cd ON c.department_id = cd.id
      JOIN users u ON cta.teacher_uid = u.uid
      LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
      LEFT JOIN departments td ON (
        u.department = td.id::text 
        OR UPPER(u.department) = UPPER(td.code) 
        OR UPPER(u.department) = UPPER(td.name)
      )
      ORDER BY cta.created_at DESC
    `;
    const assignmentsRes = await pool.query(assignmentsQuery);

    return res.status(200).json({
      success: true,
      data: {
        courses: coursesRes.rows,
        teachers: teachersRes.rows,
        assignments: assignmentsRes.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching course assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course assignments data.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/course-assignments
 * Create a new teacher assignment
 */
router.post("/", async (req, res) => {
  try {
    const { courseId, teacherId, academicYear = "2026-2027", semester = 5, section = "Section A", role = "Primary" } = req.body;

    if (!courseId || !teacherId) {
      return res.status(400).json({
        success: false,
        message: "Course and Teacher selection are required.",
      });
    }

    // Insert new assignment record
    const insertQuery = `
      INSERT INTO course_teacher_assignments (course_id, teacher_uid, academic_year, semester, section, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Active')
      ON CONFLICT (course_id, teacher_uid, academic_year, semester, section, role)
      DO UPDATE SET status = 'Active', updated_at = CURRENT_TIMESTAMP
      RETURNING id, course_id AS "courseId", teacher_uid AS "teacherId", academic_year AS "academicYear", semester, section, role, status
    `;

    const result = await pool.query(insertQuery, [
      courseId,
      teacherId,
      academicYear,
      parseInt(semester, 10) || 5,
      section || "Section A",
      role || "Primary",
    ]);

    return res.status(201).json({
      success: true,
      message: "Teacher assigned to course successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating course assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create course assignment.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/course-assignments/:id
 * Update an existing teacher assignment record
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, teacherId, academicYear = "2026-2027", semester = 5, section = "Section A", role = "Primary" } = req.body;

    if (!courseId || !teacherId) {
      return res.status(400).json({
        success: false,
        message: "Course and Teacher selection are required.",
      });
    }

    const updateQuery = `
      UPDATE course_teacher_assignments
      SET course_id = $1,
          teacher_uid = $2,
          academic_year = $3,
          semester = $4,
          section = $5,
          role = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, course_id AS "courseId", teacher_uid AS "teacherId", academic_year AS "academicYear", semester, section, role, status
    `;

    const result = await pool.query(updateQuery, [
      courseId,
      teacherId,
      academicYear,
      parseInt(semester, 10) || 5,
      section || "Section A",
      role || "Primary",
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Teacher assignment updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating course assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course assignment.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/course-assignments/:id/status
 * Toggle assignment status between Active and Inactive
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateRes = await pool.query(
      `UPDATE course_teacher_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status`,
      [status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Assignment status updated to ${status}.`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error updating assignment status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update assignment status.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/course-assignments/:id
 * Delete assignment record
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRes = await pool.query(
      "DELETE FROM course_teacher_assignments WHERE id = $1 RETURNING id",
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Teacher assignment removed successfully.",
      data: deleteRes.rows[0],
    });
  } catch (error) {
    console.error("Error deleting course assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete assignment record.",
      error: error.message,
    });
  }
});

export default router;
