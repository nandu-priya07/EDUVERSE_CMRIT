import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply admin/hod protection to all enrollment endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/enrollment/academic-years
 * Fetch all distinct available academic years present in DB
 */
router.get(["/academic-years", "/enrollment/academic-years"], async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT academic_year FROM (
        SELECT academic_year FROM courses WHERE academic_year IS NOT NULL AND TRIM(academic_year) != ''
        UNION
        SELECT academic_year FROM enrollment_settings WHERE academic_year IS NOT NULL AND TRIM(academic_year) != ''
        UNION
        SELECT academic_year FROM course_teacher_assignments WHERE academic_year IS NOT NULL AND TRIM(academic_year) != ''
        UNION
        SELECT academic_year FROM course_enrollments WHERE academic_year IS NOT NULL AND TRIM(academic_year) != ''
      ) combined_years
      ORDER BY academic_year DESC
    `;

    const result = await pool.query(query);
    let years = result.rows.map((r) => String(r.academic_year).trim()).filter(Boolean);

    if (years.length === 0) {
      years = ["2026-2027", "2025-2026", "2024-2025"];
    }

    return res.status(200).json({
      success: true,
      data: years,
    });
  } catch (error) {
    console.error("Error fetching academic years from DB:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic years.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/enrollment-settings (also GET /api/admin/enrollment/settings)
 * Fetch all configured enrollment period settings
 */
router.get(["/", "/settings", "/enrollment-settings"], async (req, res) => {
  try {
    const { academicYear = "", semester = "", status = "All" } = req.query;

    let query = `
      SELECT 
        id,
        academic_year AS "academicYear",
        semester,
        is_enabled AS "isEnabled",
        start_date AS "startDate",
        end_date AS "endDate",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM enrollment_settings
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (academicYear && academicYear !== "All") {
      query += ` AND academic_year = $${paramIndex++}`;
      values.push(academicYear);
    }

    if (semester && semester !== "All") {
      query += ` AND semester = $${paramIndex++}`;
      values.push(parseInt(semester, 10));
    }

    if (status === "Enabled") {
      query += ` AND is_enabled = true`;
    } else if (status === "Disabled") {
      query += ` AND is_enabled = false`;
    }

    query += ` ORDER BY academic_year DESC, semester ASC`;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching enrollment settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment settings.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/enrollment-settings
 * Create or upsert an enrollment setting period
 */
router.post(["/", "/settings", "/enrollment-settings"], async (req, res) => {
  try {
    const { academicYear, semester, isEnabled = true, startDate = null, endDate = null } = req.body;

    if (!academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: "Academic Year and Semester are required.",
      });
    }

    const query = `
      INSERT INTO enrollment_settings (academic_year, semester, is_enabled, start_date, end_date, created_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (academic_year, semester) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING 
        id,
        academic_year AS "academicYear",
        semester,
        is_enabled AS "isEnabled",
        start_date AS "startDate",
        end_date AS "endDate",
        updated_at AS "updatedAt"
    `;

    const values = [
      academicYear,
      parseInt(semester, 10),
      Boolean(isEnabled),
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      req.user?.uid || "admin",
    ];

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      message: `Enrollment for ${academicYear} Semester ${semester} updated successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error saving enrollment setting:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save enrollment setting.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/enrollment-settings/:id
 * Update an existing enrollment setting period by ID
 */
router.put(["/:id", "/settings/:id", "/enrollment-settings/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, semester, isEnabled, startDate = null, endDate = null } = req.body;

    const query = `
      UPDATE enrollment_settings
      SET academic_year = COALESCE($1, academic_year),
          semester = COALESCE($2, semester),
          is_enabled = COALESCE($3, is_enabled),
          start_date = $4,
          end_date = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING 
        id,
        academic_year AS "academicYear",
        semester,
        is_enabled AS "isEnabled",
        start_date AS "startDate",
        end_date AS "endDate",
        updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, [
      academicYear || null,
      semester ? parseInt(semester, 10) : null,
      typeof isEnabled === "boolean" ? isEnabled : null,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment setting updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating enrollment setting:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enrollment setting.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/enrollment-settings/:id/toggle
 * Toggle enrollment enabled state for a specific setting
 */
router.patch(["/:id/toggle", "/settings/:id/toggle", "/enrollment-settings/:id/toggle"], async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE enrollment_settings
      SET is_enabled = NOT is_enabled,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id,
        academic_year AS "academicYear",
        semester,
        is_enabled AS "isEnabled",
        start_date AS "startDate",
        end_date AS "endDate"
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment setting not found.",
      });
    }

    const updated = result.rows[0];
    return res.status(200).json({
      success: true,
      message: `Enrollment for ${updated.academicYear} Sem ${updated.semester} is now ${updated.isEnabled ? "ENABLED" : "DISABLED"}.`,
      data: updated,
    });
  } catch (error) {
    console.error("Error toggling enrollment status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle enrollment status.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/enrollment/students
 * Fetch all students with their computed enrollment status for academic year & semester
 */
router.get("/students", async (req, res) => {
  try {
    const {
      academicYear = "2026-2027",
      semester = "5",
      department = "All",
      section = "All",
      batch = "All",
      search = "",
    } = req.query;

    const semNum = parseInt(semester, 10) || 5;

    // Fetch students
    let studentQuery = `
      SELECT 
        u.uid AS id,
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS "registerNumber",
        COALESCE(d.code, u.department, sp.department, 'GEN') AS department,
        d.name AS "departmentName",
        COALESCE(sp.year, 3) AS year,
        COALESCE(sp.section, 'A') AS section,
        COALESCE(sp.batch_year, '2024') AS batch
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108'))
      )
      WHERE u.role = 'student' AND u.is_active = true
    `;

    const params = [];
    let index = 1;

    if (search) {
      studentQuery += ` AND (LOWER(u.name) LIKE $${index} OR LOWER(u.email) LIKE $${index} OR LOWER(COALESCE(sp.register_number, u.register_number, '')) LIKE $${index})`;
      params.push(`%${search.toLowerCase()}%`);
      index++;
    }

    if (department && department !== "All") {
      studentQuery += ` AND (UPPER(d.code) = UPPER($${index}) OR UPPER(u.department) = UPPER($${index}))`;
      params.push(department);
      index++;
    }

    if (section && section !== "All") {
      studentQuery += ` AND UPPER(COALESCE(sp.section, 'A')) = UPPER($${index})`;
      params.push(section);
      index++;
    }

    if (batch && batch !== "All") {
      studentQuery += ` AND COALESCE(sp.batch_year, '2024') = $${index}`;
      params.push(batch);
      index++;
    }

    studentQuery += ` ORDER BY u.name ASC`;
    const studentsRes = await pool.query(studentQuery, params);

    // Fetch total courses per department for this semester
    const coursesCountRes = await pool.query(`
      SELECT 
        d.code AS dept_code,
        COUNT(c.id) AS course_count
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.sem = $1
      GROUP BY d.code
    `, [semNum]);

    const deptCourseCountMap = {};
    coursesCountRes.rows.forEach((r) => {
      deptCourseCountMap[r.dept_code] = parseInt(r.course_count, 10);
    });

    // Fetch existing course enrollments for this academic year & semester
    const enrollmentsRes = await pool.query(`
      SELECT 
        ce.student_uid,
        ce.course_id,
        ce.id AS enrollment_id
      FROM course_enrollments ce
      WHERE ce.academic_year = $1 AND (ce.semester = $2 OR ce.semester IS NULL)
    `, [academicYear, semNum]);

    const studentEnrollmentMap = {};
    enrollmentsRes.rows.forEach((e) => {
      if (!studentEnrollmentMap[e.student_uid]) {
        studentEnrollmentMap[e.student_uid] = [];
      }
      studentEnrollmentMap[e.student_uid].push(e.course_id);
    });

    const studentsWithStatus = studentsRes.rows.map((s) => {
      const enrolledCourses = studentEnrollmentMap[s.id] || [];
      const enrolledCount = enrolledCourses.length;
      const totalAvailable = deptCourseCountMap[s.department] || 4; // fallback 4 if not configured

      let enrollmentStatus = "Not Enrolled";
      if (enrolledCount === 0) {
        enrollmentStatus = "Not Enrolled";
      } else if (enrolledCount >= totalAvailable) {
        enrollmentStatus = "Fully Enrolled";
      } else {
        enrollmentStatus = "Partially Enrolled";
      }

      return {
        ...s,
        enrollmentStatus,
        enrolledCount,
        totalAvailable,
        enrolledCourseIds: enrolledCourses,
      };
    });

    return res.status(200).json({
      success: true,
      data: studentsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching students enrollment list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students enrollment list.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/enrollment/not-enrolled
 * Fetch students who are not fully enrolled for selected academic year & semester
 */
router.get("/not-enrolled", async (req, res) => {
  try {
    const {
      academicYear = "2026-2027",
      semester = "5",
      department = "All",
      section = "All",
      batch = "All",
      search = "",
    } = req.query;

    const reqUrl = `${req.baseUrl}/students?academicYear=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}&department=${encodeURIComponent(department)}&section=${encodeURIComponent(section)}&batch=${encodeURIComponent(batch)}&search=${encodeURIComponent(search)}`;
    
    // Internal delegate to /students query logic
    const studentRes = await fetch(`http://localhost:${process.env.PORT || 5000}${reqUrl}`, {
      headers: { Authorization: req.headers.authorization },
    });

    if (!studentRes.ok) {
      throw new Error("Failed to fetch students.");
    }

    const json = await studentRes.json();
    const notFullyEnrolled = (json.data || []).filter(
      (s) => s.enrollmentStatus !== "Fully Enrolled"
    );

    return res.status(200).json({
      success: true,
      data: notFullyEnrolled,
    });
  } catch (error) {
    console.error("Error fetching not enrolled students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch not enrolled students.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/enrollment/manual
 * Manually enroll an individual student into selected courses
 */
router.post("/manual", async (req, res) => {
  try {
    const {
      studentUid,
      academicYear = "2026-2027",
      semester = 5,
      courseIds = [],
      enrollmentType = "admin",
    } = req.body;

    if (!studentUid || !courseIds || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student UID and at least one course selection are required.",
      });
    }

    const semNum = parseInt(semester, 10) || 5;
    const adminUid = req.user?.uid || "admin";

    const insertQuery = `
      INSERT INTO course_enrollments (student_uid, course_id, academic_year, semester, enrolled_by, enrollment_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'enrolled')
      ON CONFLICT (student_uid, course_id, academic_year) DO UPDATE SET
        status = 'enrolled',
        semester = EXCLUDED.semester,
        enrolled_by = EXCLUDED.enrolled_by,
        enrollment_type = EXCLUDED.enrollment_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, student_uid, course_id, academic_year, semester, status
    `;

    const enrolledRecords = [];
    for (const courseId of courseIds) {
      const res = await pool.query(insertQuery, [
        studentUid,
        courseId,
        academicYear,
        semNum,
        adminUid,
        enrollmentType,
      ]);
      enrolledRecords.push(res.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully enrolled student into ${enrolledRecords.length} course(s).`,
      data: enrolledRecords,
    });
  } catch (error) {
    console.error("Error in manual enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to manually enroll student.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/enrollment/bulk
 * Bulk enroll multiple students into selected courses
 */
router.post("/bulk", async (req, res) => {
  try {
    const {
      studentUids = [],
      academicYear = "2026-2027",
      semester = 5,
      courseIds = [],
      enrollmentType = "bulk_admin",
    } = req.body;

    if (!studentUids || studentUids.length === 0 || !courseIds || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one student and at least one course.",
      });
    }

    const semNum = parseInt(semester, 10) || 5;
    const adminUid = req.user?.uid || "admin";

    const insertQuery = `
      INSERT INTO course_enrollments (student_uid, course_id, academic_year, semester, enrolled_by, enrollment_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'enrolled')
      ON CONFLICT (student_uid, course_id, academic_year) DO UPDATE SET
        status = 'enrolled',
        semester = EXCLUDED.semester,
        enrolled_by = EXCLUDED.enrolled_by,
        enrollment_type = EXCLUDED.enrollment_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, student_uid, course_id
    `;

    let totalEnrolled = 0;
    for (const studentUid of studentUids) {
      for (const courseId of courseIds) {
        await pool.query(insertQuery, [
          studentUid,
          courseId,
          academicYear,
          semNum,
          adminUid,
          enrollmentType,
        ]);
        totalEnrolled++;
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bulk enrollment complete! Enrolled ${studentUids.length} student(s) into ${courseIds.length} course(s).`,
      count: totalEnrolled,
    });
  } catch (error) {
    console.error("Error in bulk enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform bulk enrollment.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/enrollment/student/:studentUid
 * Fetch detailed enrollments for a specific student
 */
router.get("/student/:studentUid", async (req, res) => {
  try {
    const { studentUid } = req.params;

    const query = `
      SELECT 
        ce.id,
        ce.student_uid AS "studentUid",
        ce.course_id AS "courseId",
        ce.academic_year AS "academicYear",
        ce.semester,
        ce.enrollment_type AS "enrollmentType",
        ce.created_at AS "enrolledAt",
        ce.status,
        c.code AS course_code,
        c.name AS course_name,
        c.credit AS course_credits,
        d.code AS department_code,
        d.name AS department_name
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE ce.student_uid = $1
      ORDER BY ce.created_at DESC
    `;

    const result = await pool.query(query, [studentUid]);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching student enrollments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student enrollments.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/enrollment/roster
 * Fetch all active enrollment history records
 */
router.get("/roster", async (req, res) => {
  try {
    const { academicYear = "", semester = "", search = "" } = req.query;

    let query = `
      SELECT 
        ce.id,
        ce.student_uid AS "studentUid",
        ce.course_id AS "courseId",
        ce.academic_year AS "academicYear",
        ce.semester,
        ce.enrollment_type AS "enrollmentType",
        ce.created_at AS "enrolledAt",
        ce.status,
        u.name AS student_name,
        u.email AS student_email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS student_reg_no,
        c.code AS course_code,
        c.name AS course_name,
        d.code AS department_code
      FROM course_enrollments ce
      JOIN users u ON ce.student_uid = u.uid
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE 1=1
    `;

    const values = [];
    let index = 1;

    if (academicYear && academicYear !== "All") {
      query += ` AND ce.academic_year = $${index++}`;
      values.push(academicYear);
    }

    if (semester && semester !== "All") {
      query += ` AND ce.semester = $${index++}`;
      values.push(parseInt(semester, 10));
    }

    if (search) {
      query += ` AND (LOWER(u.name) LIKE $${index} OR LOWER(COALESCE(sp.register_number, u.register_number, '')) LIKE $${index} OR LOWER(c.name) LIKE $${index} OR LOWER(c.code) LIKE $${index})`;
      values.push(`%${search.toLowerCase()}%`);
      index++;
    }

    query += ` ORDER BY ce.created_at DESC LIMIT 200`;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching enrollment roster:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment roster.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/enrollment/:id
 * Remove a course enrollment record
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`DELETE FROM course_enrollments WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course enrollment removed successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error removing enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove course enrollment.",
      error: error.message,
    });
  }
});

export default router;
