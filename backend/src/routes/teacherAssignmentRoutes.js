import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router();

/**
 * GET /api/teacher/assignments
 * List all assignments created by or assigned to the logged-in teacher's courses
 */
router.get("/", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const teacherUid = req.user.uid;

    const query = `
      SELECT 
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
        a.status,
        a.created_at,
        (
          SELECT COUNT(DISTINCT sct.student_uid)
          FROM student_course_teacher sct
          WHERE sct.course_id = a.course_id
        ) AS total_enrolled_students,
        (
          SELECT COUNT(DISTINCT sub.id)
          FROM assignment_submissions sub
          WHERE sub.assignment_id = a.id
        ) AS submission_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.teacher_uid = $1
         OR a.course_id IN (
           SELECT sct.course_id FROM student_course_teacher sct WHERE sct.teacher_uid = $1
         )
      ORDER BY a.created_at DESC;
    `;

    const result = await pool.query(query, [teacherUid]);
    const now = new Date();

    const formatted = result.rows.map((row) => {
      const totalEnrolled = parseInt(row.total_enrolled_students, 10) || 0;
      const submissions = parseInt(row.submission_count, 10) || 0;
      const pending = Math.max(0, totalEnrolled - submissions);
      const isOverdue = row.due_at && now > new Date(row.due_at) && row.status !== "closed";

      let status = row.status;
      if (isOverdue) {
        status = "overdue";
      }

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
        allow_late_submission: row.allow_late_submission,
        allowLateSubmission: row.allow_late_submission,
        max_file_size_mb: row.max_file_size_mb,
        maxFileSizeMb: row.max_file_size_mb,
        allowed_file_types: row.allowed_file_types,
        allowedFileTypes: row.allowed_file_types,
        attachment_url: row.attachment_url,
        attachmentUrl: row.attachment_url,
        status,
        created_at: row.created_at,
        createdAt: row.created_at,
        enrolled_students: totalEnrolled,
        totalEnrolled,
        submission_count: submissions,
        submissionCount: submissions,
        pending_count: pending,
        pendingCount: pending,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("GET Teacher Assignments Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch teacher assignments." });
  }
});

/**
 * POST /api/teacher/assignments
 * Create a new assignment
 */
router.post("/", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const teacherUid = req.user.uid;
    const courseId = req.body.courseId || req.body.course_id;
    const title = req.body.title;
    const description = req.body.description;
    const instructions = req.body.instructions;
    const maxMarks = req.body.maxMarks ?? req.body.max_marks ?? 100;
    const startAt = req.body.startAt ?? req.body.start_at;
    const dueAt = req.body.dueAt ?? req.body.due_at;
    const allowLateSubmission = req.body.allowLateSubmission ?? req.body.allow_late_submission;
    const maxFileSizeMb = req.body.maxFileSizeMb ?? req.body.max_file_size_mb ?? 10;
    const allowedFileTypes = req.body.allowedFileTypes ?? req.body.allowed_file_types;
    const attachmentUrl = req.body.attachmentUrl ?? req.body.attachment_url;
    const status = req.body.status;

    if (!courseId || !title || !dueAt) {
      return res.status(400).json({ success: false, message: "courseId, title, and dueAt are required fields." });
    }

    // Verify course exists by UUID or code (e.g., AD102)
    const courseCheck = await pool.query(
      `SELECT id FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);`,
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Selected course not found." });
    }

    const actualCourseId = courseCheck.rows[0].id;
    const startDate = startAt ? new Date(startAt) : new Date();
    const dueDate = new Date(dueAt);

    if (dueDate <= startDate) {
      return res.status(400).json({ success: false, message: "Due date must be later than the start date." });
    }

    const insertQuery = `
      INSERT INTO assignments (
        course_id, teacher_uid, title, description, instructions,
        max_marks, start_at, due_at, allow_late_submission,
        max_file_size_mb, allowed_file_types, attachment_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const parsedAllowedFileTypes = Array.isArray(allowedFileTypes)
      ? allowedFileTypes
      : typeof allowedFileTypes === "string"
      ? allowedFileTypes.split(",").map((t) => t.trim().toLowerCase())
      : ["pdf", "doc", "docx"];

    const values = [
      actualCourseId,
      teacherUid,
      title.trim(),
      description || "",
      instructions || "",
      parseFloat(maxMarks) || 100.0,
      startDate,
      dueDate,
      !!allowLateSubmission,
      parseInt(maxFileSizeMb, 10) || 10,
      parsedAllowedFileTypes,
      attachmentUrl || null,
      status === "published" ? "published" : "draft",
    ];

    const result = await pool.query(insertQuery, values);
    res.status(201).json({ success: true, message: "Assignment created successfully.", data: result.rows[0] });
  } catch (err) {
    console.error("POST Create Assignment Error:", err);
    res.status(500).json({ success: false, message: "Failed to create assignment." });
  }
});

/**
 * GET /api/teacher/assignments/:id
 * Fetch details for a specific assignment
 */
router.get("/:id", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        a.*,
        c.name AS course_name,
        c.code AS course_code,
        u.name AS teacher_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON a.teacher_uid = u.uid
      WHERE a.id::text = $1;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("GET Teacher Assignment Details Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch assignment details." });
  }
});

/**
 * PUT /api/teacher/assignments/:id
 * Update an existing assignment
 */
router.put("/:id", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      instructions,
      maxMarks,
      startAt,
      dueAt,
      allowLateSubmission,
      maxFileSizeMb,
      allowedFileTypes,
      attachmentUrl,
      status,
    } = req.body;

    const updateQuery = `
      UPDATE assignments
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          instructions = COALESCE($3, instructions),
          max_marks = COALESCE($4, max_marks),
          start_at = COALESCE($5, start_at),
          due_at = COALESCE($6, due_at),
          allow_late_submission = COALESCE($7, allow_late_submission),
          max_file_size_mb = COALESCE($8, max_file_size_mb),
          allowed_file_types = COALESCE($9, allowed_file_types),
          attachment_url = COALESCE($10, attachment_url),
          status = COALESCE($11, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $12
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      title,
      description,
      instructions,
      maxMarks ? parseFloat(maxMarks) : null,
      startAt ? new Date(startAt) : null,
      dueAt ? new Date(dueAt) : null,
      allowLateSubmission,
      maxFileSizeMb ? parseInt(maxFileSizeMb, 10) : null,
      allowedFileTypes,
      attachmentUrl,
      status,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    res.status(200).json({ success: true, message: "Assignment updated successfully.", data: result.rows[0] });
  } catch (err) {
    console.error("PUT Update Assignment Error:", err);
    res.status(500).json({ success: false, message: "Failed to update assignment." });
  }
});

/**
 * DELETE /api/teacher/assignments/:id
 */
router.delete("/:id", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM assignments WHERE id::text = $1 RETURNING id;`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    res.status(200).json({ success: true, message: "Assignment deleted successfully." });
  } catch (err) {
    console.error("DELETE Assignment Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete assignment." });
  }
});

/**
 * GET /api/teacher/assignments/:id/submissions
 * Get list of student submissions for an assignment
 */
router.get("/:id/submissions", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sub.id AS submission_id,
        sub.assignment_id,
        sub.student_uid,
        u.name AS student_name,
        u.email AS student_email,
        u.register_number,
        sub.submission_text,
        sub.file_url,
        sub.submitted_at,
        sub.status,
        sub.marks_obtained,
        sub.feedback,
        sub.graded_at
      FROM assignment_submissions sub
      JOIN users u ON sub.student_uid = u.uid
      WHERE sub.assignment_id::text = $1
      ORDER BY sub.submitted_at DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map((row) => ({
      id: row.submission_id,
      submission_id: row.submission_id,
      submissionId: row.submission_id,
      assignment_id: row.assignment_id,
      assignmentId: row.assignment_id,
      student_uid: row.student_uid,
      studentUid: row.student_uid,
      student_name: row.student_name,
      studentName: row.student_name,
      student_email: row.student_email,
      studentEmail: row.student_email,
      register_number: row.register_number,
      registerNumber: row.register_number,
      submission_text: row.submission_text || "",
      submissionText: row.submission_text || "",
      file_url: row.file_url || null,
      fileUrl: row.file_url || null,
      submitted_at: row.submitted_at,
      submittedAt: row.submitted_at,
      status: row.status,
      marks_obtained: row.marks_obtained !== null ? parseFloat(row.marks_obtained) : null,
      marksObtained: row.marks_obtained !== null ? parseFloat(row.marks_obtained) : null,
      feedback: row.feedback || "",
      graded_at: row.graded_at,
      gradedAt: row.graded_at,
    }));

    res.status(200).json({ success: true, data: formatted, submissions: formatted });
  } catch (err) {
    console.error("GET Assignment Submissions Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch assignment submissions." });
  }
});

/**
 * PUT /api/teacher/assignments/:id/submissions/:submissionId/grade
 * Grade or give feedback on a submission
 */
router.put("/:id/submissions/:submissionId/grade", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marksObtained, feedback } = req.body;
    const teacherUid = req.user.uid;

    const updateQuery = `
      UPDATE assignment_submissions
      SET marks_obtained = $1,
          feedback = $2,
          status = 'graded',
          graded_by = $3,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $4
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      parseFloat(marksObtained) || 0,
      feedback || "",
      teacherUid,
      submissionId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Submission record not found." });
    }

    res.status(200).json({ success: true, message: "Submission graded successfully.", data: result.rows[0] });
  } catch (err) {
    console.error("PUT Grade Submission Error:", err);
    res.status(500).json({ success: false, message: "Failed to grade submission." });
  }
});

export default router;
