import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

/**
 * GET /api/student/enrollment (and /api/student/courses/enrollment)
 * Fetch student profile, enrollment setting status, available courses filtered by student's department/semester/academic_year, and section-matched teacher assignment.
 */
router.get(["/", "/enrollment"], authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const uid = req.user.uid;

    // 1. Fetch student's dynamic profile
    const studentQuery = `
      SELECT 
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS "registerNumber",
        COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
        d.id AS department_id,
        d.name AS department_name,
        COALESCE(sp.batch_year, '2024') AS batch,
        '2026-2027' AS "academicYear",
        COALESCE(sp.year, 3) AS year,
        COALESCE(sp.semester, 5) AS semester,
        COALESCE(sp.section, 'A') AS section
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108'))
      )
      WHERE u.uid = $1;
    `;

    const studentRes = await pool.query(studentQuery, [uid]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const student = studentRes.rows[0];

    // 2. Check enrollment_settings table for student's academic year & semester
    const settingsQuery = `
      SELECT id, academic_year, semester, is_enabled, start_date, end_date
      FROM enrollment_settings
      WHERE (academic_year = $1 OR academic_year = '2026-2027') AND semester = $2
      ORDER BY (academic_year = $1) DESC
      LIMIT 1;
    `;

    const settingsRes = await pool.query(settingsQuery, [student.academicYear, student.semester]);
    const settingRow = settingsRes.rows[0] || null;

    const now = new Date();
    let isEnabled = false;
    let isWindowOpen = false;
    let startDate = null;
    let endDate = null;

    if (settingRow) {
      isEnabled = Boolean(settingRow.is_enabled);
      startDate = settingRow.start_date;
      endDate = settingRow.end_date;

      const afterStart = !startDate || now >= new Date(startDate);
      const beforeEnd = !endDate || now <= new Date(endDate);
      isWindowOpen = isEnabled && afterStart && beforeEnd;
    }

    // 3. Fetch courses matching ONLY student's semester & department
    const coursesQuery = `
      SELECT 
        c.id AS "courseId",
        c.code AS "courseCode",
        c.name AS "courseName",
        c.credit AS credits,
        c.category,
        c.sem AS semester,
        c.description,
        c.learning_objectives AS "learningObjectives",
        d.code AS department_code,
        d.name AS department_name,
        COALESCE(c.academic_year, $3) AS "academicYear"
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.sem = $1 
        AND (
          d.id = $2
          OR UPPER(d.code) = UPPER($4)
          OR UPPER(d.name) = UPPER($4)
          OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER($4) IN ('AI&DS', 'AIDS', 'AD123'))
        )
      ORDER BY c.code ASC;
    `;

    const coursesRes = await pool.query(coursesQuery, [
      student.semester,
      student.department_id || null,
      student.academicYear,
      student.department,
    ]);

    const availableCourses = coursesRes.rows;

    // 4. Fetch existing enrollments for this student
    const enrollmentsRes = await pool.query(
      `SELECT course_id FROM course_enrollments WHERE student_uid = $1`,
      [uid]
    );
    const enrolledCourseIds = new Set(enrollmentsRes.rows.map((r) => String(r.course_id)));

    // 5. Fetch teacher assignments for each course matching student's section
    const studentSection = String(student.section).trim();

    const formattedCourses = await Promise.all(
      availableCourses.map(async (course) => {
        const teacherQuery = `
          SELECT 
            u.uid AS teacher_uid,
            u.name AS teacher_name,
            u.email AS teacher_email,
            cta.section,
            cta.role
          FROM course_teacher_assignments cta
          JOIN users u ON cta.teacher_uid = u.uid
          WHERE cta.course_id = $1
            AND (cta.semester = $2 OR cta.semester IS NULL)
            AND cta.status = 'Active'
            AND (
              cta.section = 'All Sections'
              OR UPPER(cta.section) = UPPER($3)
              OR UPPER(cta.section) = UPPER('Section ' || $3)
              OR UPPER(REPLACE(cta.section, 'Section ', '')) = UPPER(REPLACE($3, 'Section ', ''))
            )
          LIMIT 1;
        `;

        const teacherRes = await pool.query(teacherQuery, [
          course.courseId,
          student.semester,
          studentSection,
        ]);

        const teacherInfo = teacherRes.rows.length > 0 ? { name: teacherRes.rows[0].teacher_name } : null;
        const isEnrolled = enrolledCourseIds.has(String(course.courseId));

        return {
          ...course,
          department: student.department,
          teacher: teacherInfo,
          status: isEnrolled ? "enrolled" : "available",
        };
      })
    );

    return res.status(200).json({
      success: true,
      student,
      enrollment: {
        isEnabled,
        isWindowOpen,
        startDate,
        endDate,
        message: isWindowOpen
          ? "Enrollment Open"
          : isEnabled
          ? "Enrollment window is currently closed."
          : `Course Enrollment is currently not available for Semester ${student.semester}.`,
      },
      courses: formattedCourses,
    });
  } catch (error) {
    console.error("Error in GET student enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student enrollment data.",
      error: error.message,
    });
  }
});

/**
 * POST /api/student/enrollment (and /api/student/courses/enrollment)
 * Enroll student in selected courses with server-side validation
 */
router.post(["/", "/enrollment"], authenticate, authorizeRoles("student"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { courses: courseIds = [] } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one course to enroll.",
      });
    }

    // 1. Fetch student's verified profile from DB
    const studentQuery = `
      SELECT 
        u.uid,
        '2026-2027' AS "academicYear",
        COALESCE(sp.semester, 5) AS semester,
        COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
        d.id AS department_id
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
      )
      WHERE u.uid = $1 AND u.is_active = true;
    `;

    const studentRes = await pool.query(studentQuery, [uid]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const student = studentRes.rows[0];

    // 2. Validate enrollment_settings for student's academic year and semester
    const settingsRes = await pool.query(
      `SELECT is_enabled, start_date, end_date FROM enrollment_settings WHERE (academic_year = $1 OR academic_year = '2026-2027') AND semester = $2 LIMIT 1`,
      [student.academicYear, student.semester]
    );

    const setting = settingsRes.rows[0];
    if (!setting || !setting.is_enabled) {
      return res.status(403).json({
        success: false,
        message: `Course Enrollment is currently closed for Semester ${student.semester}.`,
      });
    }

    const now = new Date();
    if (setting.start_date && now < new Date(setting.start_date)) {
      return res.status(403).json({
        success: false,
        message: "Enrollment window has not started yet.",
      });
    }
    if (setting.end_date && now > new Date(setting.end_date)) {
      return res.status(403).json({
        success: false,
        message: "Enrollment window has expired.",
      });
    }

    // 3. Verify that all requested courses belong to student's semester
    const validCoursesRes = await pool.query(
      `SELECT id FROM courses WHERE id::text = ANY($1::text[]) AND sem = $2`,
      [courseIds.map(String), student.semester]
    );

    const validCourseIds = validCoursesRes.rows.map((r) => r.id);
    if (validCourseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected courses are invalid or not available for your semester.",
      });
    }

    // 4. Perform insertions in course_enrollments with conflict handling
    const insertQuery = `
      INSERT INTO course_enrollments (student_uid, course_id, academic_year, semester, enrolled_by, enrollment_type, status)
      VALUES ($1, $2, $3, $4, $5, 'student', 'enrolled')
      ON CONFLICT (student_uid, course_id, academic_year) DO UPDATE SET
        status = 'enrolled',
        semester = EXCLUDED.semester,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, course_id;
    `;

    const enrolledList = [];
    for (const cId of validCourseIds) {
      const inserted = await pool.query(insertQuery, [
        uid,
        cId,
        student.academicYear,
        student.semester,
        uid,
      ]);
      enrolledList.push(inserted.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${enrolledList.length} course(s)!`,
      count: enrolledList.length,
    });
  } catch (error) {
    console.error("Error in student enrollment POST:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete course enrollment.",
      error: error.message,
    });
  }
});

export default router;
