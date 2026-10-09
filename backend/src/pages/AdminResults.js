import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";
import { calculateGradeAndStatus } from "../utils/grading.js";

const router = express.Router();

// Enforce admin/hod role authentication for all admin result endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/results/options
 * Returns metadata lists for dropdowns: departments, batches, academic years, etc.
 */
router.get("/options", async (req, res) => {
  try {
    const deptsRes = await pool.query(
      `SELECT id, name, code FROM departments ORDER BY code ASC`
    );

    const defaultBatches = ["2021-2025", "2022-2026", "2023-2027", "2024-2028"];
    const defaultAcademicYears = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];
    const defaultSections = ["A", "B", "C", "All"];

    // Also collect actual batch years present in student profiles
    const batchRes = await pool.query(
      `SELECT DISTINCT batch_year FROM student_profiles WHERE batch_year IS NOT NULL AND batch_year != ''`
    );
    const existingBatches = batchRes.rows.map((r) => r.batch_year);
    const combinedBatches = Array.from(new Set([...defaultBatches, ...existingBatches])).sort();

    return res.status(200).json({
      success: true,
      data: {
        departments: deptsRes.rows,
        batchYears: combinedBatches,
        academicYears: defaultAcademicYears,
        sections: defaultSections,
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    });
  } catch (error) {
    console.error("Error fetching result options:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dropdown options.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/results/dashboard
 * Summary counters & filterable dashboard view
 */
router.get("/dashboard", async (req, res) => {
  try {
    const {
      department = "",
      batch_year = "",
      academic_year = "",
      year = "",
      semester = "",
      section = "",
      status = "",
    } = req.query;

    // Build filter clauses for results
    const resultWhere = [];
    const resultParams = [];
    let rIdx = 1;

    if (department && department.trim() && department !== "All") {
      resultWhere.push(`UPPER(sr.department) = UPPER($${rIdx})`);
      resultParams.push(department.trim());
      rIdx++;
    }
    if (batch_year && batch_year.trim() && batch_year !== "All") {
      resultWhere.push(`sr.batch_year = $${rIdx}`);
      resultParams.push(batch_year.trim());
      rIdx++;
    }
    if (academic_year && academic_year.trim() && academic_year !== "All") {
      resultWhere.push(`sr.academic_year = $${rIdx}`);
      resultParams.push(academic_year.trim());
      rIdx++;
    }
    if (semester && !isNaN(parseInt(semester, 10)) && parseInt(semester, 10) > 0) {
      resultWhere.push(`sr.semester = $${rIdx}`);
      resultParams.push(parseInt(semester, 10));
      rIdx++;
    }
    if (section && section.trim() && section !== "All") {
      resultWhere.push(`sr.section = $${rIdx}`);
      resultParams.push(section.trim());
      rIdx++;
    }

    const whereClauseResults = resultWhere.length > 0 ? `WHERE ${resultWhere.join(" AND ")}` : "";

    // 1. Total students with results
    const totalStudentsQuery = `SELECT COUNT(DISTINCT sr.student_uid) AS count FROM student_results sr ${whereClauseResults}`;
    const totalStudentsRes = await pool.query(totalStudentsQuery, resultParams);
    const totalStudentsWithResults = parseInt(totalStudentsRes.rows[0]?.count || 0, 10);

    // 2. Total results entered
    const totalResultsQuery = `SELECT COUNT(*) AS count FROM student_results sr ${whereClauseResults}`;
    const totalResultsRes = await pool.query(totalResultsQuery, resultParams);
    const totalResultsEntered = parseInt(totalResultsRes.rows[0]?.count || 0, 10);

    // 3. Publications statistics
    const pubWhere = [];
    const pubParams = [];
    let pIdx = 1;

    if (department && department.trim() && department !== "All") {
      pubWhere.push(`UPPER(rp.department) = UPPER($${pIdx})`);
      pubParams.push(department.trim());
      pIdx++;
    }
    if (batch_year && batch_year.trim() && batch_year !== "All") {
      pubWhere.push(`rp.batch_year = $${pIdx}`);
      pubParams.push(batch_year.trim());
      pIdx++;
    }
    if (academic_year && academic_year.trim() && academic_year !== "All") {
      pubWhere.push(`rp.academic_year = $${pIdx}`);
      pubParams.push(academic_year.trim());
      pIdx++;
    }
    if (semester && !isNaN(parseInt(semester, 10)) && parseInt(semester, 10) > 0) {
      pubWhere.push(`rp.semester = $${pIdx}`);
      pubParams.push(parseInt(semester, 10));
      pIdx++;
    }
    if (status && status.trim() && status !== "All") {
      pubWhere.push(`rp.status = $${pIdx}`);
      pubParams.push(status.trim());
      pIdx++;
    }

    const whereClausePub = pubWhere.length > 0 ? `WHERE ${pubWhere.join(" AND ")}` : "";

    const pubStatsQuery = `
      SELECT
        COUNT(CASE WHEN rp.status = 'Published' THEN 1 END) AS published_count,
        COUNT(CASE WHEN rp.status = 'Ready to Publish' THEN 1 END) AS ready_count,
        COUNT(CASE WHEN rp.status = 'Draft' THEN 1 END) AS draft_count,
        COUNT(CASE WHEN rp.status = 'Unpublished' THEN 1 END) AS unpublished_count
      FROM result_publications rp
      ${whereClausePub}
    `;
    const pubStatsRes = await pool.query(pubStatsQuery, pubParams);
    const pubStats = pubStatsRes.rows[0] || {};

    const publishedSemesters = parseInt(pubStats.published_count || 0, 10);
    const resultsAwaitingPublication = parseInt(pubStats.ready_count || 0, 10) + parseInt(pubStats.draft_count || 0, 10);

    // Fetch publications list with student and result counts
    const pubListQuery = `
      SELECT
        rp.id,
        rp.department,
        rp.batch_year,
        rp.academic_year,
        rp.semester,
        rp.section,
        rp.status,
        rp.published_at,
        rp.published_by,
        rp.unpublished_at,
        rp.unpublish_reason,
        COALESCE(st_count.eligible_students, 0) AS eligible_students,
        COALESCE(res_count.results_entered, 0) AS results_entered
      FROM result_publications rp
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT u.uid) AS eligible_students
        FROM users u
        LEFT JOIN student_profiles sp ON u.uid = sp.uid
        WHERE u.role = 'student'
          AND (UPPER(u.department) = UPPER(rp.department) OR UPPER(sp.department) = UPPER(rp.department))
          AND (sp.batch_year = rp.batch_year OR rp.batch_year IS NULL)
          AND (rp.section = 'All' OR sp.section = rp.section)
      ) st_count ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT sr.student_uid) AS results_entered
        FROM student_results sr
        WHERE UPPER(sr.department) = UPPER(rp.department)
          AND sr.batch_year = rp.batch_year
          AND sr.academic_year = rp.academic_year
          AND sr.semester = rp.semester
          AND (rp.section = 'All' OR sr.section = rp.section)
      ) res_count ON TRUE
      ${whereClausePub}
      ORDER BY rp.academic_year DESC, rp.semester DESC, rp.department ASC
      LIMIT 50
    `;

    const pubListRes = await pool.query(pubListQuery, pubParams);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudentsWithResults,
          totalResultsEntered,
          resultsAwaitingPublication,
          publishedSemesters,
          pendingEntrySemesters: Math.max(0, 32 - publishedSemesters - resultsAwaitingPublication),
        },
        publications: pubListRes.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching results dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load results dashboard data.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/results/semester-courses
 * Get assigned subjects for a given department and semester
 */
router.get("/semester-courses", async (req, res) => {
  try {
    const { department, semester } = req.query;

    if (!department || !semester) {
      return res.status(400).json({
        success: false,
        message: "Department and semester parameters are required.",
      });
    }

    const semNum = parseInt(semester, 10);

    // Query courses table by department (id or code or name) and sem
    const coursesQuery = `
      SELECT 
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credit AS credits,
        c.sem AS semester,
        50 AS internal_max_marks,
        50 AS external_max_marks,
        100 AS max_marks
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.sem = $1
        AND (
          UPPER(d.code) = UPPER($2)
          OR UPPER(d.name) = UPPER($2)
          OR d.id::text = $2
          OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER($2) IN ('AI&DS', 'AIDS', 'AD123'))
          OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER($2) IN ('AI&ML', 'AIML', 'AIML108'))
        )
      ORDER BY c.code ASC
    `;

    const coursesRes = await pool.query(coursesQuery, [semNum, department.trim()]);

    // Fallback: If no courses linked specifically by dept ID, fetch any courses for that semester
    let courses = coursesRes.rows;
    if (courses.length === 0) {
      const fallbackQuery = `
        SELECT 
          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credit AS credits,
          c.sem AS semester,
          50 AS internal_max_marks,
          50 AS external_max_marks,
          100 AS max_marks
        FROM courses c
        WHERE c.sem = $1
        ORDER BY c.code ASC
        LIMIT 10
      `;
      const fallbackRes = await pool.query(fallbackQuery, [semNum]);
      courses = fallbackRes.rows;
    }

    return res.status(200).json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    console.error("Error fetching semester courses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses for selected semester.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/results/eligible-students
 * Fetch students matching department, batch, semester, section filters
 */
router.get("/eligible-students", async (req, res) => {
  try {
    const {
      department = "",
      batch_year = "",
      academic_year = "",
      semester = "",
      section = "",
      search = "",
    } = req.query;

    const whereConditions = ["u.role = 'student'"];
    const queryParams = [];
    let paramIdx = 1;

    if (search && search.trim()) {
      whereConditions.push(
        `(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.register_number ILIKE $${paramIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    if (department && department.trim() && department !== "All") {
      whereConditions.push(
        `(UPPER(u.department) = UPPER($${paramIdx}) OR UPPER(sp.department) = UPPER($${paramIdx}))`
      );
      queryParams.push(department.trim());
      paramIdx++;
    }

    if (batch_year && batch_year.trim() && batch_year !== "All") {
      whereConditions.push(`sp.batch_year = $${paramIdx}`);
      queryParams.push(batch_year.trim());
      paramIdx++;
    }

    if (section && section.trim() && section !== "All") {
      whereConditions.push(`sp.section = $${paramIdx}`);
      queryParams.push(section.trim());
      paramIdx++;
    }

    const whereClause = whereConditions.join(" AND ");

    const studentsQuery = `
      SELECT 
        u.uid,
        u.name,
        u.email,
        u.register_number,
        COALESCE(sp.department, u.department) AS department,
        COALESCE(sp.batch_year, '2023-2027') AS batch_year,
        COALESCE(sp.year, 1) AS year,
        COALESCE(sp.semester, 1) AS semester,
        COALESCE(sp.section, 'A') AS section
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      WHERE ${whereClause}
      ORDER BY u.register_number ASC, u.name ASC
      LIMIT 200
    `;

    const studentsRes = await pool.query(studentsQuery, queryParams);

    // Also check existing results already entered for this batch/sem
    let existingResultsMap = {};
    if (department && semester && academic_year) {
      const exRes = await pool.query(
        `SELECT student_uid, course_code, internal_marks, external_marks, total_marks, grade, status, is_draft
         FROM student_results
         WHERE UPPER(department) = UPPER($1)
           AND semester = $2
           AND academic_year = $3`,
        [department.trim(), parseInt(semester, 10), academic_year.trim()]
      );

      exRes.rows.forEach((r) => {
        if (!existingResultsMap[r.student_uid]) {
          existingResultsMap[r.student_uid] = {};
        }
        existingResultsMap[r.student_uid][r.course_code] = r;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        students: studentsRes.rows,
        existingResults: existingResultsMap,
      },
    });
  } catch (error) {
    console.error("Error fetching eligible students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch eligible students.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/results/entry
 * Save individual or bulk student subject results
 */
router.post("/entry", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      department,
      batch_year,
      academic_year,
      semester,
      section = "A",
      is_draft = false,
      results = [], // Array of result objects
    } = req.body;

    if (!department || !batch_year || !academic_year || !semester || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Department, batch_year, academic_year, semester, and valid results array are required.",
      });
    }

    const semNum = parseInt(semester, 10);
    const adminUid = req.user.uid;

    await client.query("BEGIN");

    let updatedCount = 0;
    const errors = [];

    for (const item of results) {
      const {
        student_uid,
        course_id = null,
        course_code,
        course_name,
        internal_marks = 0,
        internal_max_marks = 50,
        external_marks = 0,
        external_max_marks = 50,
        credits = 3,
        status = "Pass",
      } = item;

      if (!student_uid || !course_code || !course_name) {
        errors.push(`Missing mandatory student UID or course details.`);
        continue;
      }

      // Calculate totals and grades via grading engine
      const gradeResult = calculateGradeAndStatus({
        internalMarks: internal_marks,
        internalMax: internal_max_marks,
        externalMarks: external_marks,
        externalMax: external_max_marks,
        resultStatus: status,
      });

      // Upsert record in student_results table
      const upsertQuery = `
        INSERT INTO student_results (
          student_uid, course_id, course_code, course_name, department, batch_year, academic_year,
          semester, section, internal_marks, internal_max_marks, external_marks, external_max_marks,
          total_marks, max_marks, grade, grade_points, credits, status, is_draft, created_by, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP
        )
        ON CONFLICT (student_uid, course_code, semester, academic_year) DO UPDATE SET
          course_name = EXCLUDED.course_name,
          internal_marks = EXCLUDED.internal_marks,
          internal_max_marks = EXCLUDED.internal_max_marks,
          external_marks = EXCLUDED.external_marks,
          external_max_marks = EXCLUDED.external_max_marks,
          total_marks = EXCLUDED.total_marks,
          max_marks = EXCLUDED.max_marks,
          grade = EXCLUDED.grade,
          grade_points = EXCLUDED.grade_points,
          credits = EXCLUDED.credits,
          status = EXCLUDED.status,
          is_draft = EXCLUDED.is_draft,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;

      const upsertRes = await client.query(upsertQuery, [
        student_uid,
        course_id,
        course_code.trim(),
        course_name.trim(),
        department.trim(),
        batch_year.trim(),
        academic_year.trim(),
        semNum,
        section ? section.trim() : "A",
        gradeResult.internalMarks,
        internal_max_marks,
        gradeResult.externalMarks,
        external_max_marks,
        gradeResult.totalMarks,
        gradeResult.maxMarks,
        gradeResult.grade,
        gradeResult.gradePoints,
        parseFloat(credits) || 3,
        gradeResult.status,
        Boolean(is_draft),
        adminUid,
      ]);

      const resultId = upsertRes.rows[0]?.id;

      // Log action in audit logs
      await client.query(
        `INSERT INTO result_audit_logs (
          action_type, student_result_id, student_uid, course_code, department,
          academic_year, semester, section, new_value, performed_by, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          is_draft ? "DRAFT_ENTRY" : "RESULT_ENTRY",
          resultId,
          student_uid,
          course_code.trim(),
          department.trim(),
          academic_year.trim(),
          semNum,
          section ? section.trim() : "A",
          JSON.stringify(gradeResult),
          adminUid,
          is_draft ? "Saved draft result" : "Entered semester examination result",
        ]
      );

      updatedCount++;
    }

    // Ensure publication status record exists for this semester
    const targetStatus = is_draft ? "Draft" : "Ready to Publish";
    await client.query(
      `INSERT INTO result_publications (
        department, batch_year, academic_year, semester, section, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (department, batch_year, academic_year, semester, section)
       DO UPDATE SET
        status = CASE 
          WHEN result_publications.status = 'Published' THEN 'Published'
          ELSE EXCLUDED.status
        END,
        updated_at = CURRENT_TIMESTAMP`,
      [department.trim(), batch_year.trim(), academic_year.trim(), semNum, section ? section.trim() : "All", targetStatus]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${updatedCount} result records.`,
      data: {
        updatedCount,
        errors,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving student results:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save student results.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/results/review
 * Detailed semester results review for editing & validation
 */
router.get("/review", async (req, res) => {
  try {
    const {
      department = "",
      batch_year = "",
      academic_year = "",
      semester = "",
      section = "",
      search = "",
      status = "",
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const queryParams = [];
    let pIdx = 1;

    if (department && department.trim() && department !== "All") {
      whereConditions.push(`UPPER(sr.department) = UPPER($${pIdx})`);
      queryParams.push(department.trim());
      pIdx++;
    }

    if (batch_year && batch_year.trim() && batch_year !== "All") {
      whereConditions.push(`sr.batch_year = $${pIdx}`);
      queryParams.push(batch_year.trim());
      pIdx++;
    }

    if (academic_year && academic_year.trim() && academic_year !== "All") {
      whereConditions.push(`sr.academic_year = $${pIdx}`);
      queryParams.push(academic_year.trim());
      pIdx++;
    }

    if (semester && !isNaN(parseInt(semester, 10)) && parseInt(semester, 10) > 0) {
      whereConditions.push(`sr.semester = $${pIdx}`);
      queryParams.push(parseInt(semester, 10));
      pIdx++;
    }

    if (section && section.trim() && section !== "All") {
      whereConditions.push(`sr.section = $${pIdx}`);
      queryParams.push(section.trim());
      pIdx++;
    }

    if (status && status.trim() && status !== "All") {
      whereConditions.push(`sr.status = $${pIdx}`);
      queryParams.push(status.trim());
      pIdx++;
    }

    if (search && search.trim()) {
      whereConditions.push(
        `(u.name ILIKE $${pIdx} OR u.register_number ILIKE $${pIdx} OR sr.course_code ILIKE $${pIdx} OR sr.course_name ILIKE $${pIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM student_results sr
      LEFT JOIN users u ON sr.student_uid = u.uid
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const dataQueryParams = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT 
        sr.id,
        sr.student_uid,
        sr.course_id,
        sr.course_code,
        sr.course_name,
        sr.department,
        sr.batch_year,
        sr.academic_year,
        sr.semester,
        sr.section,
        sr.internal_marks,
        sr.internal_max_marks,
        sr.external_marks,
        sr.external_max_marks,
        sr.total_marks,
        sr.max_marks,
        sr.grade,
        sr.grade_points,
        sr.credits,
        sr.status,
        sr.is_draft,
        sr.updated_at,
        u.name AS student_name,
        u.register_number
      FROM student_results sr
      LEFT JOIN users u ON sr.student_uid = u.uid
      ${whereClause}
      ORDER BY u.register_number ASC, sr.course_code ASC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const dataRes = await pool.query(dataQuery, dataQueryParams);

    // Publication state for this specific combination
    let pubStatus = "Draft";
    if (department && batch_year && academic_year && semester) {
      const pubCheck = await pool.query(
        `SELECT status FROM result_publications 
         WHERE UPPER(department) = UPPER($1) 
           AND batch_year = $2 
           AND academic_year = $3 
           AND semester = $4`,
        [department.trim(), batch_year.trim(), academic_year.trim(), parseInt(semester, 10)]
      );
      if (pubCheck.rows.length > 0) {
        pubStatus = pubCheck.rows[0].status;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        results: dataRes.rows,
        total,
        page: pageNum,
        limit: limitNum,
        publicationStatus: pubStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching results review data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load results for review.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/results/update-single
 * Update individual student mark with audit tracking
 */
router.put("/update-single", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      id,
      internal_marks,
      external_marks,
      status = "Pass",
      reason = "Administrative mark correction",
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Result ID is required.",
      });
    }

    const adminUid = req.user.uid;

    await client.query("BEGIN");

    // Fetch existing result record
    const existingRes = await client.query(
      `SELECT * FROM student_results WHERE id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Result record not found.",
      });
    }

    const oldRecord = existingRes.rows[0];

    // Check if semester is published
    const pubCheck = await client.query(
      `SELECT status FROM result_publications 
       WHERE UPPER(department) = UPPER($1) 
         AND batch_year = $2 
         AND academic_year = $3 
         AND semester = $4`,
      [oldRecord.department, oldRecord.batch_year, oldRecord.academic_year, oldRecord.semester]
    );

    const isPublished = pubCheck.rows.length > 0 && pubCheck.rows[0].status === "Published";

    if (isPublished && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "A justification reason is required when modifying a published result.",
      });
    }

    const gradeResult = calculateGradeAndStatus({
      internalMarks: internal_marks !== undefined ? internal_marks : oldRecord.internal_marks,
      internalMax: oldRecord.internal_max_marks,
      externalMarks: external_marks !== undefined ? external_marks : oldRecord.external_marks,
      externalMax: oldRecord.external_max_marks,
      resultStatus: status,
    });

    const updateQuery = `
      UPDATE student_results
      SET internal_marks = $1,
          external_marks = $2,
          total_marks = $3,
          grade = $4,
          grade_points = $5,
          status = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const updatedRes = await client.query(updateQuery, [
      gradeResult.internalMarks,
      gradeResult.externalMarks,
      gradeResult.totalMarks,
      gradeResult.grade,
      gradeResult.gradePoints,
      gradeResult.status,
      id,
    ]);

    const newRecord = updatedRes.rows[0];

    // Record audit log entry
    await client.query(
      `INSERT INTO result_audit_logs (
        action_type, student_result_id, student_uid, course_code, department,
        academic_year, semester, section, old_value, new_value, performed_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        isPublished ? "PUBLISHED_RESULT_UPDATE" : "RESULT_UPDATE",
        id,
        oldRecord.student_uid,
        oldRecord.course_code,
        oldRecord.department,
        oldRecord.academic_year,
        oldRecord.semester,
        oldRecord.section,
        JSON.stringify(oldRecord),
        JSON.stringify(newRecord),
        adminUid,
        reason.trim(),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Result record updated successfully.",
      data: { result: newRecord },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating result record:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update result record.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/results/publication-status
 * Toggle or set semester result publication status (Draft, Ready to Publish, Published, Unpublished)
 */
router.post("/publication-status", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      department,
      batch_year,
      academic_year,
      semester,
      section = "All",
      status, // 'Draft', 'Ready to Publish', 'Published', 'Unpublished'
      unpublish_reason = "",
    } = req.body;

    if (!department || !batch_year || !academic_year || !semester || !status) {
      return res.status(400).json({
        success: false,
        message: "Department, batch_year, academic_year, semester, and status are required.",
      });
    }

    const validStatuses = ["Draft", "Ready to Publish", "Published", "Unpublished"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    const adminUid = req.user.uid;
    const semNum = parseInt(semester, 10);

    if (status === "Unpublished" && (!unpublish_reason || !unpublish_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when unpublishing semester results.",
      });
    }

    await client.query("BEGIN");

    // Fetch existing publication entry
    const existingPub = await client.query(
      `SELECT * FROM result_publications 
       WHERE UPPER(department) = UPPER($1) 
         AND batch_year = $2 
         AND academic_year = $3 
         AND semester = $4 
         AND section = $5`,
      [department.trim(), batch_year.trim(), academic_year.trim(), semNum, section.trim()]
    );

    let publishedAt = null;
    let publishedBy = null;
    let unpublishedAt = null;
    let unpublishedBy = null;
    let reason = null;

    if (status === "Published") {
      publishedAt = new Date();
      publishedBy = adminUid;
    } else if (status === "Unpublished") {
      unpublishedAt = new Date();
      unpublishedBy = adminUid;
      reason = unpublish_reason.trim();
    }

    const upsertQuery = `
      INSERT INTO result_publications (
        department, batch_year, academic_year, semester, section, status,
        published_at, published_by, unpublished_at, unpublished_by, unpublish_reason, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (department, batch_year, academic_year, semester, section) DO UPDATE SET
        status = EXCLUDED.status,
        published_at = COALESCE(EXCLUDED.published_at, result_publications.published_at),
        published_by = COALESCE(EXCLUDED.published_by, result_publications.published_by),
        unpublished_at = COALESCE(EXCLUDED.unpublished_at, result_publications.unpublished_at),
        unpublished_by = COALESCE(EXCLUDED.unpublished_by, result_publications.unpublished_by),
        unpublish_reason = COALESCE(EXCLUDED.unpublish_reason, result_publications.unpublish_reason),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const pubRes = await client.query(upsertQuery, [
      department.trim(),
      batch_year.trim(),
      academic_year.trim(),
      semNum,
      section.trim(),
      status,
      publishedAt,
      publishedBy,
      unpublishedAt,
      unpublishedBy,
      reason,
    ]);

    // Audit log
    await client.query(
      `INSERT INTO result_audit_logs (
        action_type, department, academic_year, semester, section,
        old_value, new_value, performed_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        `SEMESTER_PUBLICATION_${status.toUpperCase().replace(/\s+/g, "_")}`,
        department.trim(),
        academic_year.trim(),
        semNum,
        section.trim(),
        JSON.stringify(existingPub.rows[0] || null),
        JSON.stringify(pubRes.rows[0]),
        adminUid,
        reason || `Publication status updated to ${status}`,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Semester publication status updated to '${status}'.`,
      data: { publication: pubRes.rows[0] },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating publication status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update publication status.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/results/publish-bulk
 * Bulk publish all eligible semesters that are ready
 */
router.post("/publish-bulk", async (req, res) => {
  const client = await pool.connect();
  try {
    const { publication_ids = [] } = req.body;

    if (!Array.isArray(publication_ids) || publication_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Array of publication IDs is required for bulk publishing.",
      });
    }

    const adminUid = req.user.uid;

    await client.query("BEGIN");

    const publishQuery = `
      UPDATE result_publications
      SET status = 'Published',
          published_at = CURRENT_TIMESTAMP,
          published_by = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::uuid[])
      RETURNING id, department, semester, academic_year;
    `;

    const resPub = await client.query(publishQuery, [adminUid, publication_ids]);

    for (const pub of resPub.rows) {
      await client.query(
        `INSERT INTO result_audit_logs (
          action_type, department, academic_year, semester, performed_by, reason
        ) VALUES ('BULK_PUBLISH', $1, $2, $3, $4, 'Bulk published via admin control panel')`,
        [pub.department, pub.academic_year, pub.semester, adminUid]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Published ${resPub.rows.length} semesters successfully.`,
      data: { publishedSemesters: resPub.rows },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in bulk publishing:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk publish results.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/results/audit-logs
 * Fetch audit logs of result changes and publication actions
 */
router.get("/audit-logs", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const logsQuery = `
      SELECT 
        ral.*,
        u.name AS admin_name,
        u.email AS admin_email
      FROM result_audit_logs ral
      LEFT JOIN users u ON ral.performed_by = u.uid
      ORDER BY ral.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const logsRes = await pool.query(logsQuery, [parseInt(limit, 10), offset]);

    return res.status(200).json({
      success: true,
      data: { logs: logsRes.rows },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs.",
      error: error.message,
    });
  }
});

export default router;
