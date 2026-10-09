import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router();

/**
 * GET /api/student/assignments
 * List assignments for courses where the student is enrolled
 */
router.get("/", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const studentUid = req.user.uid;

    const query = `
      SELECT DISTINCT ON (a.id)
        a.id,
        a.course_id,
        c.name AS course_name,
        c.code AS course_code,
        a.title,
        a.description,
        a.instructions,
        a.max_marks,
        a.start_at,
        a.due_at,
        a.allow_late_submission,
        a.max_file_size_mb,
        a.allowed_file_types,
        a.attachment_url,
        a.status AS assignment_status,
        sub.id AS submission_id,
        sub.submitted_at,
        sub.status AS submission_status,
        sub.marks_obtained,
        sub.feedback
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN student_course_teacher sct ON a.course_id = sct.course_id AND sct.student_uid = $1
      LEFT JOIN course_enrollments ce ON a.course_id = ce.course_id AND ce.student_uid = $1
      LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_uid = $1
      WHERE (sct.student_uid = $1 OR ce.student_uid = $1)
        AND a.status IN ('published', 'closed')
      ORDER BY a.id, a.due_at ASC;
    `;

    const result = await pool.query(query, [studentUid]);
    const now = new Date();

    const formatted = result.rows.map((row) => {
      const isOverdue = row.due_at && now > new Date(row.due_at) && !row.submission_id;
      let status = "Pending";

      if (row.submission_status === "graded") {
        status = "Graded";
      } else if (row.submission_id) {
        status = "Submitted";
      } else if (isOverdue) {
        status = "Overdue";
      }

      const dueAtVal = row.due_at || null;
      const dueAtDate = dueAtVal ? new Date(dueAtVal) : null;
      const formattedDueDate = dueAtDate && !isNaN(dueAtDate.getTime()) ? dueAtDate.toLocaleString() : "No deadline";

      return {
        id: row.id,
        course_id: row.course_id,
        courseId: row.course_id,
        course_name: row.course_name,
        courseName: row.course_name,
        course_code: row.course_code,
        courseCode: row.course_code,
        title: row.title,
        description: row.description,
        instructions: row.instructions,
        max_marks: parseFloat(row.max_marks) || 100,
        maxMarks: parseFloat(row.max_marks) || 100,
        start_at: row.start_at,
        startAt: row.start_at,
        due_at: row.due_at,
        dueAt: row.due_at,
        due_date: formattedDueDate,
        allow_late_submission: row.allow_late_submission,
        allowLateSubmission: row.allow_late_submission,
        max_file_size_mb: row.max_file_size_mb,
        maxFileSizeMb: row.max_file_size_mb,
        allowed_file_types: row.allowed_file_types,
        allowedFileTypes: row.allowed_file_types,
        attachment_url: row.attachment_url,
        attachmentUrl: row.attachment_url,
        submission_status: row.submission_status || (row.submission_id ? "submitted" : "pending"),
        status,
        is_overdue: isOverdue,
        submission: row.submission_id
          ? {
              id: row.submission_id,
              submitted_at: row.submitted_at,
              submittedAt: row.submitted_at,
              status: row.submission_status,
              marks_obtained: row.marks_obtained !== null ? parseFloat(row.marks_obtained) : null,
              marksObtained: row.marks_obtained !== null ? parseFloat(row.marks_obtained) : null,
              feedback: row.feedback,
            }
          : null,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("GET Student Assignments Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch student assignments." });
  }
});

/**
 * GET /api/student/assignments/:id
 */
router.get("/:id", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const studentUid = req.user.uid;

    const query = `
      SELECT 
        a.*,
        c.name AS course_name,
        c.code AS course_code,
        sub.id AS submission_id,
        sub.submission_text,
        sub.file_url,
        sub.submitted_at,
        sub.status AS submission_status,
        sub.marks_obtained,
        sub.feedback
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_uid = $2
      WHERE a.id::text = $1;
    `;

    const result = await pool.query(query, [id, studentUid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("GET Student Assignment Details Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch assignment details." });
  }
});

/**
 * POST /api/student/assignments/:id/submit
 * Submit work for an assignment
 */
router.post("/:id/submit", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const submissionText = req.body.submissionText ?? req.body.submission_text ?? "";
    const fileUrl = req.body.fileUrl ?? req.body.file_url ?? null;
    const studentUid = req.user.uid;

    // Verify assignment existence & deadline
    const assignmentRes = await pool.query(`SELECT * FROM assignments WHERE id::text = $1;`, [id]);
    if (assignmentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    const assignment = assignmentRes.rows[0];
    const now = new Date();

    if (assignment.due_at && now > new Date(assignment.due_at) && !assignment.allow_late_submission) {
      return res.status(400).json({ success: false, message: "Assignment submission deadline has passed." });
    }

    const isLate = assignment.due_at && now > new Date(assignment.due_at);
    const submissionStatus = isLate ? "late" : "submitted";

    const submitQuery = `
      INSERT INTO assignment_submissions (
        assignment_id, student_uid, submission_text, file_url, status, submitted_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (assignment_id, student_uid)
      DO UPDATE SET 
        submission_text = EXCLUDED.submission_text,
        file_url = EXCLUDED.file_url,
        status = EXCLUDED.status,
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(submitQuery, [
      assignment.id,
      studentUid,
      submissionText || "",
      fileUrl || null,
      submissionStatus,
    ]);

    res.status(200).json({ success: true, message: "Assignment submitted successfully.", data: result.rows[0] });
  } catch (err) {
    console.error("POST Submit Assignment Error:", err);
    res.status(500).json({ success: false, message: "Failed to submit assignment." });
  }
});

export default router;
