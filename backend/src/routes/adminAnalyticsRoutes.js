import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router();

// Enforce authentication & admin/hod authorization for all analytics routes
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * Helper to build SQL WHERE conditions from global request query filters.
 */
function buildGlobalFilter(query, options = {}) {
  const {
    deptCol = "u.department",
    batchCol = "sp.batch_year",
    yearCol = "sp.year",
    semCol = "sp.semester",
    sectionCol = "sp.section",
    dateCol = "created_at"
  } = options;

  const conditions = [];
  const params = [];
  let idx = 1;

  const { department, batch, academic_year, semester, year, section, startDate, endDate } = query;

  if (department && department.trim() && department !== "all") {
    conditions.push(`(${deptCol} = $${idx} OR ${deptCol} ILIKE $${idx})`);
    params.push(department.trim());
    idx++;
  }

  if (batch && batch.trim() && batch !== "all") {
    conditions.push(`${batchCol} = $${idx}`);
    params.push(batch.trim());
    idx++;
  }

  if (year && !isNaN(parseInt(year, 10)) && year !== "all") {
    conditions.push(`${yearCol} = $${idx}`);
    params.push(parseInt(year, 10));
    idx++;
  }

  if (semester && !isNaN(parseInt(semester, 10)) && semester !== "all") {
    conditions.push(`${semCol} = $${idx}`);
    params.push(parseInt(semester, 10));
    idx++;
  }

  if (section && section.trim() && section !== "all") {
    conditions.push(`${sectionCol} ILIKE $${idx}`);
    params.push(`%${section.trim()}%`);
    idx++;
  }

  if (startDate && startDate.trim()) {
    conditions.push(`${dateCol} >= $${idx}`);
    params.push(new Date(startDate.trim()).toISOString());
    idx++;
  }

  if (endDate && endDate.trim()) {
    conditions.push(`${dateCol} <= $${idx}`);
    params.push(new Date(endDate.trim()).toISOString());
    idx++;
  }

  const whereClause = conditions.length > 0 ? "AND " + conditions.join(" AND ") : "";
  return { whereClause, params, nextIdx: idx };
}

/**
 * GET /api/admin/analytics/filters
 * Dropdown filter options from real database records
 */
router.get("/filters", async (req, res) => {
  try {
    const deptsRes = await pool.query(
      `SELECT id, name, code FROM departments ORDER BY name ASC`
    );

    const batchesRes = await pool.query(
      `SELECT DISTINCT batch_year FROM student_profiles WHERE batch_year IS NOT NULL ORDER BY batch_year DESC`
    );

    const acadYearsRes = await pool.query(
      `SELECT DISTINCT academic_year FROM (
        SELECT academic_year FROM student_results WHERE academic_year IS NOT NULL
        UNION
        SELECT academic_year FROM course_enrollments WHERE academic_year IS NOT NULL
        UNION
        SELECT academic_year FROM course_teacher_assignments WHERE academic_year IS NOT NULL
      ) combined ORDER BY academic_year DESC`
    );

    const sectionsRes = await pool.query(
      `SELECT DISTINCT section FROM student_profiles WHERE section IS NOT NULL ORDER BY section ASC`
    );

    return res.status(200).json({
      success: true,
      data: {
        departments: deptsRes.rows,
        batches: batchesRes.rows.map(r => r.batch_year),
        academicYears: acadYearsRes.rows.map(r => r.academic_year),
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        years: [1, 2, 3, 4],
        sections: sectionsRes.rows.map(r => r.section).filter(Boolean)
      }
    });
  } catch (err) {
    console.error("Error fetching analytics filters:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch filter options." });
  }
});

/**
 * GET /api/admin/analytics/overview
 * Overview KPI cards, summary charts, recent activity
 */
router.get("/overview", async (req, res) => {
  try {
    const { whereClause: userWhere, params: userParams } = buildGlobalFilter(req.query, {
      deptCol: "u.department",
      batchCol: "sp.batch_year",
      yearCol: "sp.year",
      semCol: "sp.semester",
      sectionCol: "sp.section",
      dateCol: "u.created_at"
    });

    // 1. Student Counts
    const studentStatsQuery = `
      SELECT
        COUNT(u.uid) AS total_students,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) AS active_students,
        COUNT(CASE WHEN u.is_active = false THEN 1 END) AS inactive_students
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' ${userWhere}
    `;
    const studentStatsRes = await pool.query(studentStatsQuery, userParams);
    const { total_students, active_students, inactive_students } = studentStatsRes.rows[0];

    // 2. Faculty Count
    const facultyCountRes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = true`
    );

    // 3. Department & Course Counts
    const deptCountRes = await pool.query(`SELECT COUNT(*) FROM departments`);
    const courseCountRes = await pool.query(`SELECT COUNT(*) FROM courses`);

    // 4. Enrollments & Pending Enrollments
    const enrollmentStatsRes = await pool.query(`
      SELECT 
        COUNT(ce.id) AS total_enrollments
      FROM course_enrollments ce
    `);

    // Pending enrollments: eligible active students not enrolled in active semester courses
    const pendingEnrollmentRes = await pool.query(`
      SELECT COUNT(DISTINCT u.uid) AS pending
      FROM users u
      JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' AND u.is_active = true
      AND u.uid NOT IN (SELECT DISTINCT student_uid FROM course_enrollments)
    `);

    // 5. Result Publications Summary
    const pubStatsRes = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'Published' THEN 1 END) AS published_semesters,
        COUNT(CASE WHEN status IN ('Ready to Publish', 'Draft') THEN 1 END) AS awaiting_publication
      FROM result_publications
    `);

    // 6. Charts: Department Distribution
    const deptDistRes = await pool.query(`
      SELECT 
        COALESCE(d.code, u.department, 'Unassigned') AS department,
        COUNT(u.uid) AS student_count
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
      WHERE u.role = 'student' ${userWhere}
      GROUP BY COALESCE(d.code, u.department, 'Unassigned')
      ORDER BY student_count DESC
    `, userParams);

    // 7. Charts: Batch Distribution
    const batchDistRes = await pool.query(`
      SELECT 
        COALESCE(sp.batch_year, 'Unassigned') AS batch_year,
        COUNT(u.uid) AS count
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' ${userWhere}
      GROUP BY COALESCE(sp.batch_year, 'Unassigned')
      ORDER BY batch_year DESC
    `, userParams);

    // 8. Charts: Semester Distribution
    const semDistRes = await pool.query(`
      SELECT 
        COALESCE(sp.semester, 1) AS semester,
        COUNT(u.uid) AS count
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' ${userWhere}
      GROUP BY semester
      ORDER BY semester ASC
    `, userParams);

    // 9. Academic Performance Trend Line Chart
    const perfTrendRes = await pool.query(`
      SELECT 
        semester,
        ROUND(AVG(NULLIF(total_marks, 0)), 2) AS avg_marks,
        ROUND(COUNT(CASE WHEN status = 'Pass' THEN 1 END)::numeric * 100.0 / NULLIF(COUNT(*), 0), 2) AS pass_percentage
      FROM student_results
      WHERE is_draft = false
      GROUP BY semester
      ORDER BY semester ASC
    `);

    // 10. Recent Activity Log
    const recentActivityRes = await pool.query(`
      SELECT 
        l.id, l.activity_type, l.user_role, l.department, l.details, l.created_at,
        u.name AS user_name
      FROM lms_activity_logs l
      LEFT JOIN users u ON l.user_uid = u.uid
      ORDER BY l.created_at DESC
      LIMIT 8
    `);

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalStudents: parseInt(total_students || 0, 10),
          activeStudents: parseInt(active_students || 0, 10),
          inactiveStudents: parseInt(inactive_students || 0, 10),
          totalFaculty: parseInt(facultyCountRes.rows[0].count || 0, 10),
          totalDepartments: parseInt(deptCountRes.rows[0].count || 0, 10),
          totalCourses: parseInt(courseCountRes.rows[0].count || 0, 10),
          totalEnrollments: parseInt(enrollmentStatsRes.rows[0].total_enrollments || 0, 10),
          pendingEnrollments: parseInt(pendingEnrollmentRes.rows[0].pending || 0, 10),
          publishedSemesters: parseInt(pubStatsRes.rows[0].published_semesters || 0, 10),
          awaitingPublication: parseInt(pubStatsRes.rows[0].awaiting_publication || 0, 10)
        },
        charts: {
          byDepartment: deptDistRes.rows,
          byBatch: batchDistRes.rows,
          bySemester: semDistRes.rows,
          accountStatus: [
            { name: "Active", value: parseInt(active_students || 0, 10) },
            { name: "Inactive", value: parseInt(inactive_students || 0, 10) }
          ],
          enrollmentStatus: [
            { name: "Enrolled", value: parseInt(enrollmentStatsRes.rows[0].total_enrollments || 0, 10) },
            { name: "Pending", value: parseInt(pendingEnrollmentRes.rows[0].pending || 0, 10) }
          ],
          performanceTrend: perfTrendRes.rows
        },
        recentActivity: recentActivityRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching overview analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch overview analytics." });
  }
});

/**
 * GET /api/admin/analytics/students
 * Detailed Student Analytics & searchable paginated table
 */
router.get("/students", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const { whereClause, params, nextIdx } = buildGlobalFilter(req.query, {
      deptCol: "u.department",
      batchCol: "sp.batch_year",
      yearCol: "sp.year",
      semCol: "sp.semester",
      sectionCol: "sp.section",
      dateCol: "u.created_at"
    });

    const searchConditions = [...(whereClause ? [whereClause.replace(/^AND\s+/, "")] : [])];
    const searchParams = [...params];
    let idx = nextIdx;

    if (search && search.trim()) {
      searchConditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.register_number ILIKE $${idx})`);
      searchParams.push(`%${search.trim()}%`);
      idx++;
    }

    const finalWhere = searchConditions.length > 0 ? "WHERE u.role = 'student' AND " + searchConditions.join(" AND ") : "WHERE u.role = 'student'";

    // Summary Distributions
    const deptDist = await pool.query(`
      SELECT COALESCE(d.name, u.department) AS label, COUNT(u.uid) AS value
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
      ${finalWhere}
      GROUP BY COALESCE(d.name, u.department) ORDER BY value DESC
    `, searchParams);

    const batchDist = await pool.query(`
      SELECT COALESCE(sp.batch_year, 'N/A') AS label, COUNT(u.uid) AS value
      FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid
      ${finalWhere} GROUP BY COALESCE(sp.batch_year, 'N/A') ORDER BY label DESC
    `, searchParams);

    const semDist = await pool.query(`
      SELECT 'Sem ' || COALESCE(sp.semester, 1) AS label, COUNT(u.uid) AS value
      FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid
      ${finalWhere} GROUP BY sp.semester ORDER BY sp.semester ASC
    `, searchParams);

    const yearDist = await pool.query(`
      SELECT 'Year ' || COALESCE(sp.year, 1) AS label, COUNT(u.uid) AS value
      FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid
      ${finalWhere} GROUP BY sp.year ORDER BY sp.year ASC
    `, searchParams);

    const sectionDist = await pool.query(`
      SELECT 'Section ' || COALESCE(sp.section, 'A') AS label, COUNT(u.uid) AS value
      FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid
      ${finalWhere} GROUP BY sp.section ORDER BY sp.section ASC
    `, searchParams);

    const hostelDist = await pool.query(`
      SELECT CASE WHEN sp.is_hostel = true THEN 'Hosteller' ELSE 'Day Scholar' END AS label, COUNT(u.uid) AS value
      FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid
      ${finalWhere} GROUP BY sp.is_hostel
    `, searchParams);

    // Searchable student list table
    const countQuery = `SELECT COUNT(u.uid) AS total FROM users u LEFT JOIN student_profiles sp ON u.uid = sp.uid ${finalWhere}`;
    const totalRes = await pool.query(countQuery, searchParams);
    const total = parseInt(totalRes.rows[0]?.total || 0, 10);

    const dataParams = [...searchParams, limitNum, offset];
    const listQuery = `
      SELECT 
        u.uid, u.name, u.email, u.register_number, u.is_active, u.department,
        d.name AS department_name, d.code AS department_code,
        sp.batch_year, sp.year, sp.semester, sp.section, sp.is_hostel, sp.academic_status
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
      ${finalWhere}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const listRes = await pool.query(listQuery, dataParams);

    return res.status(200).json({
      success: true,
      data: {
        distributions: {
          department: deptDist.rows,
          batch: batchDist.rows,
          semester: semDist.rows,
          year: yearDist.rows,
          section: sectionDist.rows,
          hostel: hostelDist.rows
        },
        students: listRes.rows,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error("Error fetching student analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch student analytics." });
  }
});

/**
 * GET /api/admin/analytics/academics
 * Academic Performance Analytics (excluding draft results)
 */
router.get("/academics", async (req, res) => {
  try {
    const { whereClause, params } = buildGlobalFilter(req.query, {
      deptCol: "department",
      batchCol: "batch_year",
      yearCol: "semester", // rough mapping
      semCol: "semester",
      sectionCol: "section",
      dateCol: "created_at"
    });

    const baseWhere = "WHERE is_draft = false " + whereClause;

    // 1. Overall Key Indicators
    const overallStatsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_results,
        COUNT(CASE WHEN status = 'Pass' THEN 1 END) AS pass_count,
        COUNT(CASE WHEN status = 'Fail' THEN 1 END) AS fail_count,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) AS absent_count,
        COUNT(CASE WHEN status = 'Withheld' THEN 1 END) AS withheld_count,
        ROUND(AVG(NULLIF(total_marks, 0)), 2) AS avg_marks,
        ROUND(AVG(NULLIF(grade_points, 0)), 2) AS avg_cgpa
      FROM student_results
      ${baseWhere}
    `, params);

    const row = overallStatsRes.rows[0] || {};
    const totalResults = parseInt(row.total_results || 0, 10);
    const passCount = parseInt(row.pass_count || 0, 10);
    const failCount = parseInt(row.fail_count || 0, 10);
    const passPercentage = totalResults > 0 ? Number(((passCount / totalResults) * 100).toFixed(2)) : 0;
    const failPercentage = totalResults > 0 ? Number(((failCount / totalResults) * 100).toFixed(2)) : 0;

    // 2. Grade Distribution
    const gradeDistRes = await pool.query(`
      SELECT grade, COUNT(*) AS count
      FROM student_results
      ${baseWhere}
      GROUP BY grade
      ORDER BY count DESC
    `, params);

    // 3. Subject-wise performance
    const subjectPerfRes = await pool.query(`
      SELECT 
        course_code, course_name,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'Pass' THEN 1 END) AS pass,
        ROUND(COUNT(CASE WHEN status = 'Pass' THEN 1 END)::numeric * 100.0 / NULLIF(COUNT(*), 0), 2) AS pass_pct,
        ROUND(AVG(NULLIF(total_marks, 0)), 2) AS avg_marks
      FROM student_results
      ${baseWhere}
      GROUP BY course_code, course_name
      ORDER BY avg_marks DESC
    `, params);

    // 4. Department-wise Performance
    const deptPerfRes = await pool.query(`
      SELECT 
        department,
        COUNT(*) AS total,
        ROUND(COUNT(CASE WHEN status = 'Pass' THEN 1 END)::numeric * 100.0 / NULLIF(COUNT(*), 0), 2) AS pass_pct,
        ROUND(AVG(NULLIF(total_marks, 0)), 2) AS avg_marks
      FROM student_results
      ${baseWhere}
      GROUP BY department
      ORDER BY pass_pct DESC
    `, params);

    // 5. Arrear & Support Required Students (Failed status)
    const arrearsListRes = await pool.query(`
      SELECT 
        sr.id, sr.student_uid, u.name AS student_name, u.register_number,
        sr.course_code, sr.course_name, sr.department, sr.semester, sr.total_marks, sr.status
      FROM student_results sr
      LEFT JOIN users u ON sr.student_uid = u.uid
      ${baseWhere} AND sr.status IN ('Fail', 'Absent', 'Withheld')
      ORDER BY u.name ASC
      LIMIT 15
    `, params);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalResults,
          passCount,
          failCount,
          absentCount: parseInt(row.absent_count || 0, 10),
          withheldCount: parseInt(row.withheld_count || 0, 10),
          passPercentage,
          failPercentage,
          avgMarks: parseFloat(row.avg_marks || 0),
          avgCgpa: parseFloat(row.avg_cgpa || 0)
        },
        gradeDistribution: gradeDistRes.rows,
        subjectPerformance: subjectPerfRes.rows,
        departmentPerformance: deptPerfRes.rows,
        arrearsList: arrearsListRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching academic analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch academic analytics." });
  }
});

/**
 * GET /api/admin/analytics/enrollments
 * Course Enrollment Analytics & Pending Student List
 */
router.get("/enrollments", async (req, res) => {
  try {
    // 1. Overall Eligible vs Enrolled
    const totalStudentsRes = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true`);
    const totalEligible = parseInt(totalStudentsRes.rows[0].count || 0, 10);

    const enrolledStudentsRes = await pool.query(`SELECT COUNT(DISTINCT student_uid) FROM course_enrollments`);
    const totalEnrolled = parseInt(enrolledStudentsRes.rows[0].count || 0, 10);
    const notEnrolled = Math.max(0, totalEligible - totalEnrolled);
    const completionPct = totalEligible > 0 ? Number(((totalEnrolled / totalEligible) * 100).toFixed(1)) : 0;

    // 2. Department Breakdown
    const deptEnrollRes = await pool.query(`
      SELECT 
        COALESCE(d.name, u.department) AS department,
        COUNT(DISTINCT u.uid) AS total_students,
        COUNT(DISTINCT ce.student_uid) AS enrolled_count
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
      LEFT JOIN course_enrollments ce ON u.uid = ce.student_uid
      WHERE u.role = 'student' AND u.is_active = true
      GROUP BY COALESCE(d.name, u.department)
      ORDER BY total_students DESC
    `);

    // 3. Course-wise Enrollment Counts
    const courseEnrollRes = await pool.query(`
      SELECT 
        c.id, c.code, c.name AS course_name, c.sem,
        d.name AS department_name,
        COUNT(ce.id) AS enrolled_students
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      GROUP BY c.id, c.code, c.name, c.sem, d.name
      ORDER BY enrolled_students ASC
    `);

    // 4. Pending (Unenrolled) Students List
    const pendingListRes = await pool.query(`
      SELECT 
        u.uid, u.name, u.email, u.register_number, u.department,
        sp.batch_year, sp.semester, sp.section
      FROM users u
      JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' AND u.is_active = true
      AND u.uid NOT IN (SELECT DISTINCT student_uid FROM course_enrollments)
      ORDER BY u.name ASC
      LIMIT 20
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEligible,
          totalEnrolled,
          notEnrolled,
          completionPct
        },
        departmentEnrollment: deptEnrollRes.rows,
        courseEnrollment: courseEnrollRes.rows,
        pendingStudents: pendingListRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching enrollment analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch enrollment analytics." });
  }
});

/**
 * GET /api/admin/analytics/faculty
 * Faculty Workload & Course Assignment Analytics
 */
router.get("/faculty", async (req, res) => {
  try {
    const totalFacultyRes = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = true`);
    const totalFaculty = parseInt(totalFacultyRes.rows[0].count || 0, 10);

    // Faculty Workload Table
    const workloadRes = await pool.query(`
      SELECT 
        u.uid, u.name, u.email, u.department,
        COUNT(DISTINCT cta.course_id) AS assigned_courses,
        COUNT(DISTINCT sct.student_uid) AS total_students_handled
      FROM users u
      LEFT JOIN course_teacher_assignments cta ON u.uid = cta.teacher_uid
      LEFT JOIN student_course_teacher sct ON u.uid = sct.teacher_uid
      WHERE u.role = 'teacher' AND u.is_active = true
      GROUP BY u.uid, u.name, u.email, u.department
      ORDER BY assigned_courses DESC
    `);

    // Unassigned Courses
    const unassignedCoursesRes = await pool.query(`
      SELECT c.id, c.code, c.name, c.sem, d.name AS department_name
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id NOT IN (SELECT DISTINCT course_id FROM course_teacher_assignments)
      ORDER BY c.code ASC
    `);

    // Coverage stats
    const totalCoursesRes = await pool.query(`SELECT COUNT(*) FROM courses`);
    const totalCourses = parseInt(totalCoursesRes.rows[0].count || 0, 10);
    const assignedCoursesCount = Math.max(0, totalCourses - unassignedCoursesRes.rows.length);
    const coveragePct = totalCourses > 0 ? Number(((assignedCoursesCount / totalCourses) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFaculty,
          totalCourses,
          assignedCoursesCount,
          unassignedCoursesCount: unassignedCoursesRes.rows.length,
          coveragePct
        },
        workload: workloadRes.rows,
        unassignedCourses: unassignedCoursesRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching faculty analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch faculty analytics." });
  }
});

/**
 * GET /api/admin/analytics/courses
 * Course & Curriculum Analytics
 */
router.get("/courses", async (req, res) => {
  try {
    const courseStatsRes = await pool.query(`
      SELECT 
        COUNT(c.id) AS total_courses,
        COUNT(DISTINCT c.department_id) AS total_departments,
        COUNT(CASE WHEN cta.id IS NULL THEN 1 END) AS unassigned_courses
      FROM courses c
      LEFT JOIN course_teacher_assignments cta ON c.id = cta.course_id
    `);

    // Courses by Category
    const categoryDistRes = await pool.query(`
      SELECT COALESCE(category, 'General') AS category, COUNT(*) AS count
      FROM courses GROUP BY category ORDER BY count DESC
    `);

    // Courses by Semester
    const semDistRes = await pool.query(`
      SELECT sem AS semester, COUNT(*) AS count
      FROM courses GROUP BY sem ORDER BY sem ASC
    `);

    // Courses missing content/assessments
    const missingMaterialsRes = await pool.query(`
      SELECT c.id, c.code, c.name, d.name AS department_name
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN quizzes q ON c.id = q.course_id
      LEFT JOIN assignments a ON c.id = a.course_id
      WHERE q.id IS NULL AND a.id IS NULL
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: courseStatsRes.rows[0],
        categoryDistribution: categoryDistRes.rows,
        semesterDistribution: semDistRes.rows,
        coursesLackingAssessments: missingMaterialsRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching course analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch course analytics." });
  }
});

/**
 * GET /api/admin/analytics/assessments
 * Quiz & Assessment Analytics
 */
router.get("/assessments", async (req, res) => {
  try {
    const quizStatsRes = await pool.query(`
      SELECT 
        COUNT(q.id) AS total_quizzes,
        COUNT(CASE WHEN q.status = 'published' THEN 1 END) AS published_quizzes,
        COUNT(CASE WHEN q.status = 'draft' THEN 1 END) AS draft_quizzes
      FROM quizzes q
    `);

    const attemptStatsRes = await pool.query(`
      SELECT 
        COUNT(qa.id) AS total_attempts,
        ROUND(AVG(NULLIF(qa.score, 0)), 2) AS avg_score,
        MAX(qa.score) AS max_score,
        MIN(qa.score) AS min_score
      FROM quiz_attempts qa
      WHERE qa.status IN ('submitted', 'evaluated')
    `);

    const coursePerfRes = await pool.query(`
      SELECT 
        c.code, c.name AS course_name,
        COUNT(qa.id) AS attempts,
        ROUND(AVG(NULLIF(qa.score, 0)), 2) AS avg_score
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      JOIN quiz_attempts qa ON q.id = qa.quiz_id
      GROUP BY c.code, c.name
      ORDER BY attempts DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          ...quizStatsRes.rows[0],
          ...attemptStatsRes.rows[0]
        },
        coursePerformance: coursePerfRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching assessment analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch assessment analytics." });
  }
});

/**
 * GET /api/admin/analytics/usage
 * Platform & LMS Activity Analytics
 */
router.get("/usage", async (req, res) => {
  try {
    const activeUsersRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN user_uid END) AS daily_active,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN user_uid END) AS weekly_active,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN user_uid END) AS monthly_active
      FROM lms_activity_logs
    `);

    const activityTypeRes = await pool.query(`
      SELECT activity_type, COUNT(*) AS count
      FROM lms_activity_logs
      GROUP BY activity_type ORDER BY count DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        activeUsers: activeUsersRes.rows[0],
        activityBreakdown: activityTypeRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching usage analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch usage analytics." });
  }
});

/**
 * GET /api/admin/analytics/ai
 * AI Feature Usage Analytics
 */
router.get("/ai", async (req, res) => {
  try {
    const overallAiStats = await pool.query(`
      SELECT 
        COUNT(*) AS total_requests,
        COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_requests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_requests,
        ROUND(AVG(latency_ms), 0) AS avg_latency_ms
      FROM ai_request_logs
    `);

    const featureBreakdown = await pool.query(`
      SELECT feature_name, COUNT(*) AS count, ROUND(AVG(latency_ms), 0) AS avg_latency
      FROM ai_request_logs
      GROUP BY feature_name ORDER BY count DESC
    `);

    const modelBreakdown = await pool.query(`
      SELECT model_name, is_local_model, COUNT(*) AS count
      FROM ai_request_logs
      GROUP BY model_name, is_local_model ORDER BY count DESC
    `);

    const recentErrors = await pool.query(`
      SELECT feature_name, user_role, error_message, created_at
      FROM ai_request_logs
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: overallAiStats.rows[0],
        byFeature: featureBreakdown.rows,
        byModel: modelBreakdown.rows,
        recentErrors: recentErrors.rows
      }
    });
  } catch (err) {
    console.error("Error fetching AI analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch AI analytics." });
  }
});

/**
 * GET /api/admin/analytics/results
 * Result Publication Analytics
 */
router.get("/results", async (req, res) => {
  try {
    const pubStatusRes = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM result_publications
      GROUP BY status ORDER BY count DESC
    `);

    const pubListRes = await pool.query(`
      SELECT id, department, batch_year, academic_year, semester, section, status, published_at, updated_at
      FROM result_publications
      ORDER BY updated_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        statusBreakdown: pubStatusRes.rows,
        publications: pubListRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching result analytics:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch result publication analytics." });
  }
});

/**
 * GET /api/admin/analytics/alerts
 * Automated Actionable Insights and System Alerts
 */
router.get("/alerts", async (req, res) => {
  try {
    const alerts = [];

    // 1. Unenrolled students alert
    const unenrolledRes = await pool.query(`
      SELECT COUNT(DISTINCT u.uid) AS count
      FROM users u JOIN student_profiles sp ON u.uid = sp.uid
      WHERE u.role = 'student' AND u.is_active = true
      AND u.uid NOT IN (SELECT DISTINCT student_uid FROM course_enrollments)
    `);
    const unenrolledCount = parseInt(unenrolledRes.rows[0].count || 0, 10);
    if (unenrolledCount > 0) {
      alerts.push({
        id: "alert-unenrolled",
        category: "Enrollment",
        severity: "warning",
        title: "Eligible Students Pending Course Enrollment",
        message: `${unenrolledCount} active students have not enrolled in any courses for the current semester.`,
        actionLink: "/admin/enrollment",
        actionText: "Manage Enrollments"
      });
    }

    // 2. Semesters awaiting result publication
    const awaitingPubRes = await pool.query(`
      SELECT COUNT(*) AS count FROM result_publications WHERE status IN ('Ready to Publish', 'Draft')
    `);
    const awaitingPubCount = parseInt(awaitingPubRes.rows[0].count || 0, 10);
    if (awaitingPubCount > 0) {
      alerts.push({
        id: "alert-results-pub",
        category: "Results",
        severity: "info",
        title: "Semesters Awaiting Result Publication",
        message: `${awaitingPubCount} department semesters have completed results ready for publication.`,
        actionLink: "/admin/results",
        actionText: "Review & Publish Results"
      });
    }

    // 3. Courses without assigned faculty
    const unassignedCoursesRes = await pool.query(`
      SELECT COUNT(*) AS count FROM courses WHERE id NOT IN (SELECT DISTINCT course_id FROM course_teacher_assignments)
    `);
    const unassignedCount = parseInt(unassignedCoursesRes.rows[0].count || 0, 10);
    if (unassignedCount > 0) {
      alerts.push({
        id: "alert-unassigned-courses",
        category: "Faculty",
        severity: "high",
        title: "Courses Without Assigned Faculty",
        message: `${unassignedCount} active courses do not have a primary faculty member assigned.`,
        actionLink: "/admin/course-assignments",
        actionText: "Assign Faculty"
      });
    }

    // 4. Courses without quizzes/assessments
    const missingAssessmentsRes = await pool.query(`
      SELECT COUNT(c.id) AS count FROM courses c
      LEFT JOIN quizzes q ON c.id = q.course_id
      LEFT JOIN assignments a ON c.id = a.course_id
      WHERE q.id IS NULL AND a.id IS NULL
    `);
    const missingAssessCount = parseInt(missingAssessmentsRes.rows[0].count || 0, 10);
    if (missingAssessCount > 0) {
      alerts.push({
        id: "alert-missing-assessments",
        category: "Courses",
        severity: "info",
        title: "Courses Lacking Assessments & Quizzes",
        message: `${missingAssessCount} courses have zero published quizzes or assignments.`,
        actionLink: "/admin/courses",
        actionText: "View Courses"
      });
    }

    // 5. AI Service failure rate alert
    const aiFailureRes = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
      FROM ai_request_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    const totalAi = parseInt(aiFailureRes.rows[0].total || 0, 10);
    const failedAi = parseInt(aiFailureRes.rows[0].failed || 0, 10);
    if (totalAi > 0 && (failedAi / totalAi) > 0.15) {
      alerts.push({
        id: "alert-ai-failures",
        category: "AI Features",
        severity: "high",
        title: "High AI Feature Failure Rate Detected",
        message: `${failedAi} out of ${totalAi} AI API requests failed over the last 7 days (${((failedAi / totalAi) * 100).toFixed(1)}% error rate).`,
        actionLink: "#ai-analytics",
        actionText: "Inspect AI Logs"
      });
    }

    return res.status(200).json({
      success: true,
      data: { alerts }
    });
  } catch (err) {
    console.error("Error fetching analytics alerts:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics alerts." });
  }
});

/**
 * GET /api/admin/analytics/reports/export
 * Export CSV reports for filtered analytics datasets
 */
router.get("/reports/export", async (req, res) => {
  try {
    const { reportType = "students" } = req.query;

    let csvContent = "";
    let fileName = `smartcampus_${reportType}_report.csv`;

    if (reportType === "students") {
      const rows = await pool.query(`
        SELECT u.register_number, u.name, u.email, COALESCE(d.code, u.department) AS department, sp.batch_year, sp.year, sp.semester, sp.section, u.is_active
        FROM users u
        LEFT JOIN student_profiles sp ON u.uid = sp.uid
        LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code))
        WHERE u.role = 'student'
        ORDER BY u.name ASC
      `);

      csvContent = "Register Number,Name,Email,Department,Batch,Year,Semester,Section,Is Active\n" +
        rows.rows.map(r => `"${r.register_number || ''}","${r.name || ''}","${r.email || ''}","${r.department || ''}","${r.batch_year || ''}","${r.year || ''}","${r.semester || ''}","${r.section || ''}","${r.is_active}"`).join("\n");
    } else if (reportType === "enrollments") {
      const rows = await pool.query(`
        SELECT ce.id, u.register_number, u.name AS student_name, c.code AS course_code, c.name AS course_name, ce.enrollment_date, ce.status
        FROM course_enrollments ce
        JOIN users u ON ce.student_uid = u.uid
        JOIN courses c ON ce.course_id = c.id
        ORDER BY ce.enrollment_date DESC
      `);

      csvContent = "Enrollment ID,Register Number,Student Name,Course Code,Course Name,Date,Status\n" +
        rows.rows.map(r => `"${r.id}","${r.register_number}","${r.student_name}","${r.course_code}","${r.course_name}","${r.enrollment_date}","${r.status}"`).join("\n");
    } else if (reportType === "academics") {
      const rows = await pool.query(`
        SELECT u.register_number, u.name, sr.course_code, sr.course_name, sr.department, sr.semester, sr.internal_marks, sr.external_marks, sr.total_marks, sr.grade, sr.status
        FROM student_results sr
        JOIN users u ON sr.student_uid = u.uid
        WHERE sr.is_draft = false
        ORDER BY u.name ASC
      `);

      csvContent = "Register Number,Student Name,Course Code,Course Name,Department,Semester,Internal Marks,External Marks,Total Marks,Grade,Status\n" +
        rows.rows.map(r => `"${r.register_number}","${r.name}","${r.course_code}","${r.course_name}","${r.department}","${r.semester}","${r.internal_marks}","${r.external_marks}","${r.total_marks}","${r.grade}","${r.status}"`).join("\n");
    } else if (reportType === "ai") {
      const rows = await pool.query(`
        SELECT feature_name, user_role, department, course_code, model_name, status, latency_ms, created_at
        FROM ai_request_logs
        ORDER BY created_at DESC
      `);

      csvContent = "Feature Name,User Role,Department,Course Code,Model Name,Status,Latency (ms),Timestamp\n" +
        rows.rows.map(r => `"${r.feature_name}","${r.user_role}","${r.department}","${r.course_code}","${r.model_name}","${r.status}","${r.latency_ms}","${r.created_at}"`).join("\n");
    } else {
      // General overview export fallback
      const rows = await pool.query(`SELECT id, code, name, credit, sem FROM courses ORDER BY code ASC`);
      csvContent = "Course ID,Code,Name,Credits,Semester\n" +
        rows.rows.map(r => `"${r.id}","${r.code}","${r.name}","${r.credit}","${r.sem}"`).join("\n");
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error("Error exporting analytics report:", err);
    return res.status(500).json({ success: false, message: "Failed to export report." });
  }
});

export default router;
