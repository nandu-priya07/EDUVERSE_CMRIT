import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply auth middleware to admin dashboard endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/dashboard/stats
 * Fetch live dashboard numbers, department student distribution, and recent activity logs
 */
router.get("/stats", async (req, res) => {
  try {
    // 1. Fetch Summary Counts
    const statsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS "totalStudents",
        (SELECT COUNT(*)::int FROM users WHERE role = 'student' AND COALESCE(is_active, true) = true) AS "activeStudents",
        (SELECT COUNT(*)::int FROM users WHERE role IN ('teacher', 'hod')) AS "totalFaculty",
        (SELECT COUNT(*)::int FROM users WHERE role IN ('teacher', 'hod') AND COALESCE(is_active, true) = true) AS "activeFaculty",
        (SELECT COUNT(*)::int FROM departments) AS "totalDepartments",
        (SELECT COUNT(*)::int FROM courses) AS "totalCourses",
        (
          SELECT COUNT(*)::int FROM (
            SELECT student_uid, course_id FROM student_course_teacher
            UNION
            SELECT student_uid, course_id FROM course_enrollments
          ) e
        ) AS "totalEnrollments",
        (SELECT COUNT(*)::int FROM assignments WHERE status = 'published') AS "publishedAssignments",
        (SELECT COUNT(*)::int FROM quizzes WHERE status = 'published') AS "publishedQuizzes"
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0] || {
      totalStudents: 0,
      activeStudents: 0,
      totalFaculty: 0,
      activeFaculty: 0,
      totalDepartments: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      publishedAssignments: 0,
      publishedQuizzes: 0,
    };

    // 2. Fetch Department-wise Student Counts
    const deptQuery = `
      SELECT 
        d.id,
        d.name,
        d.code,
        (
          SELECT COUNT(*)::int
          FROM users u
          WHERE u.role = 'student' 
            AND (
              u.department = d.id::text 
              OR UPPER(u.department) = UPPER(d.code) 
              OR UPPER(u.department) = UPPER(d.name)
              OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
              OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
            )
        ) AS student_count
      FROM departments d
      ORDER BY student_count DESC, d.name ASC
    `;
    const deptResult = await pool.query(deptQuery);

    // 3. Fetch Recent System Activities (Latest registrations, courses, assignments, quizzes)
    const recentActivityQuery = `
      (
        SELECT 
          uid::text AS id,
          CONCAT('New ', role, ' registered: ', name) AS title,
          COALESCE(department, 'General') AS subtitle,
          name AS actor,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          id::text AS id,
          CONCAT('Course created: ', name) AS title,
          code AS subtitle,
          'Admin/Faculty' AS actor,
          created_at
        FROM courses
        ORDER BY created_at DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          id::text AS id,
          CONCAT('Assignment published: ', title) AS title,
          'Assignment' AS subtitle,
          'Faculty' AS actor,
          created_at
        FROM assignments
        ORDER BY created_at DESC
        LIMIT 5
      )
      ORDER BY created_at DESC
      LIMIT 8
    `;

    const activityResult = await pool.query(recentActivityQuery);

    return res.status(200).json({
      success: true,
      data: {
        stats,
        departments: deptResult.rows,
        recentActivities: activityResult.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data.",
      error: error.message,
    });
  }
});

export default router;
