import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Enforce student role authentication
router.use(authenticate, authorizeRoles("student", "admin"));

/**
 * GET /api/student/results
 * Fetch published examination results for the authenticated student
 */
router.get("/", async (req, res) => {
  try {
    const studentUid = req.user.uid;

    // 1. Fetch student's profile & department info
    const userRes = await pool.query(
      `SELECT u.uid, u.name, u.email, u.register_number, u.department,
              sp.batch_year, sp.programme, sp.semester AS current_semester, sp.section
       FROM users u
       LEFT JOIN student_profiles sp ON u.uid = sp.uid
       WHERE u.uid = $1`,
      [studentUid]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    const student = userRes.rows[0];
    const dept = student.department || "";
    const batchYear = student.batch_year || "2023-2027";

    // 2. Query published semesters for student's department and batch
    const pubQuery = `
      SELECT DISTINCT semester, academic_year, published_at
      FROM result_publications
      WHERE UPPER(department) = UPPER($1)
        AND (batch_year = $2 OR batch_year IS NULL OR batch_year = '')
        AND status = 'Published'
      ORDER BY semester ASC
    `;
    const pubRes = await pool.query(pubQuery, [dept, batchYear]);

    const publishedSemestersList = pubRes.rows.map((p) => p.semester);

    if (publishedSemestersList.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Results have not been published yet.",
        data: {
          student: {
            name: student.name,
            registerNumber: student.register_number,
            department: student.department,
            batchYear: student.batch_year,
          },
          cgpa: 0,
          totalCreditsEarned: 0,
          publishedSemesters: [],
        },
      });
    }

    // 3. Fetch results for ONLY published semesters for THIS student
    // Ensure draft and withheld results are filtered out according to security rules
    const resultsQuery = `
      SELECT 
        sr.id,
        sr.course_code,
        sr.course_name,
        sr.semester,
        sr.academic_year,
        sr.internal_marks,
        sr.internal_max_marks,
        sr.external_marks,
        sr.external_max_marks,
        sr.total_marks,
        sr.max_marks,
        sr.grade,
        sr.grade_points,
        sr.credits,
        sr.status
      FROM student_results sr
      WHERE sr.student_uid = $1
        AND sr.semester = ANY($2::int[])
        AND sr.is_draft = FALSE
        AND sr.status != 'Withheld'
      ORDER BY sr.semester ASC, sr.course_code ASC
    `;

    const resultsRes = await pool.query(resultsQuery, [studentUid, publishedSemestersList]);

    // Group subjects by semester
    const semesterMap = {};

    resultsRes.rows.forEach((row) => {
      const semKey = `Semester ${row.semester}`;
      if (!semesterMap[semKey]) {
        semesterMap[semKey] = {
          semesterNumber: row.semester,
          semesterName: semKey,
          academicYear: row.academic_year,
          subjects: [],
          totalCredits: 0,
          totalPointsEarned: 0,
          sgpa: 0,
          status: "Passed",
        };
      }

      const credits = Number(row.credits) || 3;
      const points = Number(row.grade_points) || 0;

      semesterMap[semKey].subjects.push({
        code: row.course_code,
        name: row.course_name,
        internal: Number(row.internal_marks),
        internalMax: Number(row.internal_max_marks),
        external: Number(row.external_marks),
        externalMax: Number(row.external_max_marks),
        total: Number(row.total_marks),
        totalMax: Number(row.max_marks),
        grade: row.grade,
        points,
        credits,
        status: row.status,
      });

      semesterMap[semKey].totalCredits += credits;
      semesterMap[semKey].totalPointsEarned += points * credits;

      if (row.status === "Fail") {
        semesterMap[semKey].status = "Reappear";
      }
    });

    // Calculate SGPA per semester
    const semestersOutput = Object.values(semesterMap).map((sem) => {
      const sgpa = sem.totalCredits > 0 ? (sem.totalPointsEarned / sem.totalCredits).toFixed(2) : "0.00";
      return {
        semester: sem.semesterName,
        semesterNumber: sem.semesterNumber,
        academicYear: sem.academicYear,
        sgpa: parseFloat(sgpa),
        credits: sem.totalCredits,
        status: sem.status,
        subjects: sem.subjects,
      };
    });

    // Sort descending by semester number (newest first)
    semestersOutput.sort((a, b) => b.semesterNumber - a.semesterNumber);

    // Calculate overall CGPA across published semesters
    const overallCredits = semestersOutput.reduce((acc, s) => acc + s.credits, 0);
    const overallPoints = semestersOutput.reduce((acc, s) => acc + s.sgpa * s.credits, 0);
    const cgpa = overallCredits > 0 ? (overallPoints / overallCredits).toFixed(2) : "0.00";

    return res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.name,
          registerNumber: student.register_number,
          department: student.department,
          batchYear: student.batch_year,
        },
        cgpa: parseFloat(cgpa),
        totalCreditsEarned: overallCredits,
        publishedSemesters: semestersOutput,
      },
    });
  } catch (error) {
    console.error("Error fetching student results:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student results.",
      error: error.message,
    });
  }
});

export default router;
