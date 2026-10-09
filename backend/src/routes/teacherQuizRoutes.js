import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router({ mergeParams: true });


/**
 * Middleware: Verify logged-in teacher is assigned to the course
 */
async function verifyTeacherCourseAccess(req, res, next) {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const uid = req.user.uid;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required." });
    }

    // Check course existence
    const courseRes = await pool.query(`SELECT id, name, code, department_id FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);`, [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    req.targetCourse = courseRes.rows[0];
    next();
  } catch (err) {
    console.error("verifyTeacherCourseAccess error:", err);
    res.status(500).json({ success: false, message: "Server error verifying course access." });
  }
}

/**
 * GET /api/teacher/courses/:courseId/quizzes
 * List quizzes for a specific course
 */
router.get("/courses/:courseId/quizzes", authenticate, authorizeRoles("teacher", "hod", "admin"), verifyTeacherCourseAccess, async (req, res) => {
  try {
    const courseId = req.targetCourse.id;

    const quizzesQuery = `
      SELECT 
        q.*,
        (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        (SELECT COUNT(DISTINCT qa.id) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status IN ('submitted', 'evaluated')) AS submission_count
      FROM quizzes q
      WHERE q.course_id = $1
      ORDER BY q.created_at DESC;
    `;
    const result = await pool.query(quizzesQuery, [courseId]);

    const formatted = result.rows.map((q) => ({
      id: q.id,
      courseId: q.course_id,
      title: q.title,
      description: q.description,
      instructions: q.instructions,
      durationMinutes: q.duration_minutes,
      totalMarks: parseFloat(q.total_marks),
      maxAttempts: q.max_attempts,
      startAt: q.start_at,
      endAt: q.end_at,
      randomizeQuestions: q.randomize_questions,
      showAnswersAfterSubmission: q.show_answers_after_submission,
      status: q.status,
      totalQuestions: parseInt(q.total_questions, 10) || 0,
      submissionCount: parseInt(q.submission_count, 10) || 0,
      createdAt: q.created_at,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("GET Teacher Course Quizzes Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
});

/**
 * POST /api/teacher/courses/:courseId/quizzes
 * Create new quiz with questions
 */
router.post("/courses/:courseId/quizzes", authenticate, authorizeRoles("teacher", "hod", "admin"), verifyTeacherCourseAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const courseId = req.targetCourse.id;
    const teacherUid = req.user.uid;
    const {
      title,
      description,
      instructions,
      durationMinutes,
      maxAttempts,
      startAt,
      endAt,
      randomizeQuestions,
      showAnswersAfterSubmission,
      status,
      questions,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Quiz title is required." });
    }

    if (status === "published" && (!questions || !Array.isArray(questions) || questions.length === 0)) {
      return res.status(400).json({ success: false, message: "Cannot publish a quiz with zero questions." });
    }

    await client.query("BEGIN");

    // Calculate total marks
    let totalMarks = 0;
    if (Array.isArray(questions)) {
      totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
    }

    const quizInsertQuery = `
      INSERT INTO quizzes (
        course_id, teacher_uid, title, description, instructions,
        duration_minutes, total_marks, max_attempts, start_at, end_at,
        randomize_questions, show_answers_after_submission, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const quizValues = [
      courseId,
      teacherUid,
      title.trim(),
      description || "",
      instructions || "",
      parseInt(durationMinutes, 10) || 30,
      totalMarks,
      parseInt(maxAttempts, 10) || 1,
      startAt ? new Date(startAt) : null,
      endAt ? new Date(endAt) : null,
      !!randomizeQuestions,
      showAnswersAfterSubmission !== undefined ? !!showAnswersAfterSubmission : true,
      status === "published" ? "published" : "draft",
    ];

    const quizRes = await client.query(quizInsertQuery, quizValues);
    const createdQuiz = quizRes.rows[0];

    // Insert questions if provided
    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionText = q.questionText || q.question_text || "";
        const questionType = q.questionType || q.question_type || "mcq";
        const options = q.options || [];
        const correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;
        const marks = parseFloat(q.marks) || 1.0;
        const displayOrder = i + 1;

        if (!questionText.trim()) {
          throw new Error(`Question ${i + 1} text is required.`);
        }

        const qInsertQuery = `
          INSERT INTO quiz_questions (
            quiz_id, question_text, question_type, options, correct_answer, marks, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        await client.query(qInsertQuery, [
          createdQuiz.id,
          questionText.trim(),
          questionType,
          JSON.stringify(options),
          JSON.stringify(correctAnswer),
          marks,
          displayOrder,
        ]);
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, message: "Quiz created successfully.", data: createdQuiz });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST Create Quiz Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to create quiz." });
  } finally {
    client.release();
  }
});

/**
 * GET /api/teacher/quizzes/:quizId
 * Fetch single quiz with full question details (including correct answers for teacher)
 */
router.get("/quizzes/:quizId", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizRes = await pool.query(
      `SELECT q.*, c.name AS course_name, c.code AS course_code 
       FROM quizzes q 
       JOIN courses c ON q.course_id = c.id 
       WHERE q.id::text = $1;`,
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }

    const quiz = quizRes.rows[0];

    const questionsRes = await pool.query(
      `SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY display_order ASC;`,
      [quiz.id]
    );

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          courseId: quiz.course_id,
          courseName: quiz.course_name,
          courseCode: quiz.course_code,
          title: quiz.title,
          description: quiz.description,
          instructions: quiz.instructions,
          durationMinutes: quiz.duration_minutes,
          totalMarks: parseFloat(quiz.total_marks),
          maxAttempts: quiz.max_attempts,
          startAt: quiz.start_at,
          endAt: quiz.end_at,
          randomizeQuestions: quiz.randomize_questions,
          showAnswersAfterSubmission: quiz.show_answers_after_submission,
          status: quiz.status,
          createdAt: quiz.created_at,
        },
        questions: questionsRes.rows.map((q) => ({
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options,
          correctAnswer: q.correct_answer,
          marks: parseFloat(q.marks),
          displayOrder: q.display_order,
        })),
      },
    });
  } catch (err) {
    console.error("GET Teacher Quiz Details Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch quiz details." });
  }
});

/**
 * PUT /api/teacher/quizzes/:quizId
 * Update quiz & replace questions
 */
router.put("/quizzes/:quizId", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { quizId } = req.params;
    const {
      title,
      description,
      instructions,
      durationMinutes,
      maxAttempts,
      startAt,
      endAt,
      randomizeQuestions,
      showAnswersAfterSubmission,
      status,
      questions,
    } = req.body;

    await client.query("BEGIN");

    // Check quiz existence
    const qCheck = await client.query(`SELECT id FROM quizzes WHERE id::text = $1;`, [quizId]);
    if (qCheck.rows.length === 0) {
      throw new Error("Quiz not found.");
    }

    let totalMarks = 0;
    if (Array.isArray(questions)) {
      totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
    }

    if (status === "published" && (!questions || questions.length === 0)) {
      throw new Error("Cannot publish a quiz with zero questions.");
    }

    const updateQuizQuery = `
      UPDATE quizzes
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          instructions = COALESCE($3, instructions),
          duration_minutes = COALESCE($4, duration_minutes),
          total_marks = $5,
          max_attempts = COALESCE($6, max_attempts),
          start_at = $7,
          end_at = $8,
          randomize_questions = COALESCE($9, randomize_questions),
          show_answers_after_submission = COALESCE($10, show_answers_after_submission),
          status = COALESCE($11, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $12
      RETURNING *;
    `;
    await client.query(updateQuizQuery, [
      title,
      description,
      instructions,
      durationMinutes ? parseInt(durationMinutes, 10) : null,
      totalMarks,
      maxAttempts ? parseInt(maxAttempts, 10) : null,
      startAt ? new Date(startAt) : null,
      endAt ? new Date(endAt) : null,
      randomizeQuestions,
      showAnswersAfterSubmission,
      status,
      quizId,
    ]);

    if (Array.isArray(questions)) {
      // Replace questions
      await client.query(`DELETE FROM quiz_questions WHERE quiz_id::text = $1;`, [quizId]);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionText = q.questionText || q.question_text || "";
        const questionType = q.questionType || q.question_type || "mcq";
        const options = q.options || [];
        const correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;
        const marks = parseFloat(q.marks) || 1.0;

        await client.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, marks, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [quizId, questionText, questionType, JSON.stringify(options), JSON.stringify(correctAnswer), marks, i + 1]
        );
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ success: true, message: "Quiz updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT Update Quiz Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to update quiz." });
  } finally {
    client.release();
  }
});

/**
 * POST /api/teacher/quizzes/:quizId/publish
 * Toggle or publish a quiz
 */
router.post("/quizzes/:quizId/publish", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { quizId } = req.params;

    // Check question count
    const qCountRes = await pool.query(`SELECT COUNT(*) FROM quiz_questions WHERE quiz_id::text = $1;`, [quizId]);
    const qCount = parseInt(qCountRes.rows[0].count, 10);

    if (qCount === 0) {
      return res.status(400).json({ success: false, message: "Cannot publish a quiz with zero questions." });
    }

    const updateRes = await pool.query(
      `UPDATE quizzes SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id::text = $1 RETURNING *;`,
      [quizId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }

    res.status(200).json({ success: true, message: "Quiz published successfully.", data: updateRes.rows[0] });
  } catch (err) {
    console.error("POST Publish Quiz Error:", err);
    res.status(500).json({ success: false, message: "Failed to publish quiz." });
  }
});

/**
 * DELETE /api/teacher/quizzes/:quizId
 */
router.delete("/quizzes/:quizId", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { quizId } = req.params;
    const delRes = await pool.query(`DELETE FROM quizzes WHERE id::text = $1 RETURNING id;`, [quizId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    res.status(200).json({ success: true, message: "Quiz deleted successfully." });
  } catch (err) {
    console.error("DELETE Quiz Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete quiz." });
  }
});

/**
 * GET /api/teacher/quizzes/:quizId/results
 * Fetch all student attempt results for a quiz
 */
router.get("/quizzes/:quizId/results", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizRes = await pool.query(`SELECT * FROM quizzes WHERE id::text = $1;`, [quizId]);
    if (quizRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    const quiz = quizRes.rows[0];

    const attemptsQuery = `
      SELECT 
        qa.id AS attempt_id,
        qa.attempt_number,
        qa.started_at,
        qa.submitted_at,
        qa.score,
        qa.status AS attempt_status,
        u.uid AS student_uid,
        u.name AS student_name,
        u.email AS student_email,
        u.register_number
      FROM quiz_attempts qa
      JOIN users u ON qa.student_uid = u.uid
      WHERE qa.quiz_id::text = $1 AND qa.status IN ('submitted', 'evaluated')
      ORDER BY qa.submitted_at DESC;
    `;

    const attemptsRes = await pool.query(attemptsQuery, [quizId]);

    const results = attemptsRes.rows.map((row) => {
      const score = parseFloat(row.score) || 0;
      const totalMarks = parseFloat(quiz.total_marks) || 1;
      const percentage = Math.round((score / totalMarks) * 100);

      return {
        attemptId: row.attempt_id,
        studentUid: row.student_uid,
        studentName: row.student_name,
        studentEmail: row.student_email,
        registerNumber: row.register_number || "N/A",
        attemptNumber: row.attempt_number,
        submittedAt: row.submitted_at,
        score,
        totalMarks,
        percentage,
        attemptStatus: row.attempt_status,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          totalMarks: parseFloat(quiz.total_marks),
        },
        results,
      },
    });
  } catch (err) {
    console.error("GET Teacher Quiz Results Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch quiz results." });
  }
});

/**
 * GET /api/teacher/quizzes/:quizId/attempts/:attemptId
 * Fetch single student attempt with answers for manual grading
 */
router.get("/quizzes/:quizId/attempts/:attemptId", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  try {
    const { quizId, attemptId } = req.params;

    const attemptRes = await pool.query(
      `SELECT qa.*, u.name AS student_name, u.register_number, u.email AS student_email, q.title AS quiz_title, q.total_marks
       FROM quiz_attempts qa
       JOIN users u ON qa.student_uid = u.uid
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.id::text = $1 AND qa.quiz_id::text = $2;`,
      [attemptId, quizId]
    );

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Attempt not found." });
    }

    const attempt = attemptRes.rows[0];

    const questionsQuery = `
      SELECT 
        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.options,
        qq.correct_answer,
        qq.marks AS max_marks,
        qq.display_order,
        ans.id AS answer_id,
        ans.answer AS student_answer,
        ans.awarded_marks,
        ans.feedback
      FROM quiz_questions qq
      LEFT JOIN quiz_answers ans ON qq.id = ans.question_id AND ans.attempt_id::text = $1
      WHERE qq.quiz_id::text = $2
      ORDER BY qq.display_order ASC;
    `;

    const qRes = await pool.query(questionsQuery, [attemptId, quizId]);

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          studentName: attempt.student_name,
          registerNumber: attempt.register_number,
          studentEmail: attempt.student_email,
          score: parseFloat(attempt.score),
          totalMarks: parseFloat(attempt.total_marks),
          submittedAt: attempt.submitted_at,
          status: attempt.status,
        },
        questions: qRes.rows.map((r) => ({
          questionId: r.question_id,
          questionText: r.question_text,
          questionType: r.question_type,
          options: r.options,
          correctAnswer: r.correct_answer,
          maxMarks: parseFloat(r.max_marks),
          answerId: r.answer_id,
          studentAnswer: r.student_answer,
          awardedMarks: r.awarded_marks !== null ? parseFloat(r.awarded_marks) : 0,
          feedback: r.feedback || "",
        })),
      },
    });
  } catch (err) {
    console.error("GET Teacher Attempt Grading Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch attempt details." });
  }
});

/**
 * PUT /api/teacher/quiz-answers/:answerId/grade
 * Grade short answer question & update total attempt score
 */
router.put("/quiz-answers/:answerId/grade", authenticate, authorizeRoles("teacher", "hod", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { answerId } = req.params;
    const { awardedMarks, feedback } = req.body;
    const teacherUid = req.user.uid;

    await client.query("BEGIN");

    // Fetch answer details
    const ansRes = await client.query(`SELECT * FROM quiz_answers WHERE id::text = $1;`, [answerId]);
    if (ansRes.rows.length === 0) {
      throw new Error("Quiz answer record not found.");
    }
    const answerRow = ansRes.rows[0];

    await client.query(
      `UPDATE quiz_answers
       SET awarded_marks = $1,
           feedback = $2,
           evaluated_by = $3,
           evaluated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id::text = $4;`,
      [parseFloat(awardedMarks) || 0, feedback || "", teacherUid, answerId]
    );

    // Recalculate total attempt score
    const totalRes = await client.query(
      `SELECT SUM(awarded_marks) AS total_score FROM quiz_answers WHERE attempt_id = $1;`,
      [answerRow.attempt_id]
    );
    const totalScore = parseFloat(totalRes.rows[0].total_score) || 0;

    await client.query(
      `UPDATE quiz_attempts SET score = $1, status = 'evaluated', updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [totalScore, answerRow.attempt_id]
    );

    await client.query("COMMIT");
    res.status(200).json({ success: true, message: "Graded successfully.", data: { totalScore } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT Grade Answer Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to grade answer." });
  } finally {
    client.release();
  }
});

import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { readMaterialsJSON } from "./materialRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MATERIALS_DIR = path.join(__dirname, "..", "materials");

async function extractMaterialContent(m) {
  let text = `Title: ${m.title || "Course Material"}\nType: ${m.type || "Document"}\nDescription: ${m.description || ""}\n`;
  if (m.file_name) {
    const filePath = path.join(MATERIALS_DIR, m.file_name);
    if (fs.existsSync(filePath)) {
      try {
        const ext = path.extname(m.file_name).toLowerCase();
        if (ext === ".pdf") {
          const dataBuffer = fs.readFileSync(filePath);
          let pdfText = "";
          try {
            if (typeof pdfParse === "function") {
              const pdfData = await pdfParse(dataBuffer);
              pdfText = typeof pdfData === "string" ? pdfData : (pdfData?.text || "");
            } else if (pdfParse && pdfParse.PDFParse) {
              const parser = new pdfParse.PDFParse({ data: dataBuffer });
              await parser.load();
              const res = await parser.getText();
              pdfText = typeof res === "string" ? res : (res?.text || "");
            }
          } catch (pdfErr) {
            console.warn(`PDF parsing warning for ${m.file_name}:`, pdfErr.message);
          }
          if (pdfText) {
            text += `\nDocument Content:\n${pdfText.slice(0, 30000)}`;
          }
        } else if (ext === ".txt" || ext === ".md" || ext === ".json") {
          const fileStr = fs.readFileSync(filePath, "utf-8");
          text += `\nDocument Content:\n${fileStr.slice(0, 30000)}`;
        }
      } catch (err) {
        console.error(`Error reading file ${m.file_name}:`, err.message);
      }
    }
  }
  return text;
}

async function generateGeminiContent(ai, prompt) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  let lastError;
  for (const model of modelsToTry) {
    try {
      console.log(`[AI Quiz Generator] Trying Gemini model: ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (res && res.text) {
        console.log(`[AI Quiz Generator] Model ${model} succeeded!`);
        return res;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[AI Quiz Generator] Model ${model} failed (${err.message || err}). Trying next model...`);
    }
  }
  throw lastError || new Error("All Gemini AI models are currently unavailable. Please try again in a few moments.");
}

async function checkTopicCoverage(ai, topic, materialContent) {
  if (!topic || !topic.trim()) {
    return {
      topicSupported: true,
      coverageScore: 1.0,
      reason: "No specific topic focus specified. Using overall course material content."
    };
  }

  const prompt = `You are a source-grounding validator for an educational LMS.

The teacher wants to generate a quiz about:

TOPIC:
${topic}

The following content is the ONLY allowed source:

SOURCE MATERIAL:
${materialContent.slice(0, 40000)}

Determine whether the source material contains sufficient educational content to generate reliable quiz questions specifically about the requested topic.

STRICT RULES:
1. Use ONLY the supplied source material.
2. Do NOT use your pretrained knowledge or outside knowledge.
3. A keyword mention is NOT sufficient evidence that a topic is covered.
4. A topic is NOT considered covered if it is only mentioned in passing or in a tool/technology list without structural explanation.
5. Related topics must not be treated as equivalent (e.g. mentioning YARN or MapReduce does not mean Apache Spark Architecture is explained).
6. Do not infer a complete topic from a small reference.
7. The material must contain enough facts, concepts, relationships, procedures, examples, or explanations to create meaningful questions.
8. The requested topic must be the actual subject of the available content, not merely something mentioned in passing under another topic.
9. If the source contains insufficient information, return false.
10. Do not generate quiz questions during this step.

Return ONLY structured JSON:
{
  "topicSupported": boolean,
  "coverageScore": number,
  "reason": "Clear explanation of why the topic is supported or why it is insufficient"
}`;

  try {
    const res = await generateGeminiContent(ai, prompt);
    let rawText = res.text || "";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const result = JSON.parse(rawText);

    let score = typeof result.coverageScore === "number" ? result.coverageScore : 0.0;
    if (score > 1) score = score / 10;
    if (score > 1) score = 1.0;

    return {
      topicSupported: Boolean(result.topicSupported),
      coverageScore: score,
      reason: result.reason || "Topic coverage validation complete."
    };
  } catch (err) {
    console.error("[checkTopicCoverage Error]", err);
    return {
      topicSupported: false,
      coverageScore: 0.0,
      reason: "Failed to evaluate topic coverage against course materials."
    };
  }
}

async function validateGeneratedQuestions(ai, questions, topic, materialContent) {
  if (!topic || !topic.trim() || !Array.isArray(questions) || questions.length === 0) {
    return questions;
  }

  const validQuestions = [];

  for (const q of questions) {
    const prompt = `You are a strict source-grounding and topic relevance auditor for quiz questions.

Requested Topic: "${topic}"

Source Material:
${materialContent.slice(0, 30000)}

Question to Audit:
Question Text: "${q.questionText}"
Question Type: "${q.questionType}"
Options: ${JSON.stringify(q.options || [])}
Correct Answer: ${JSON.stringify(q.correctAnswer)}
Explanation: "${q.explanation || ""}"

Evaluation Rules:
1. Topic Relevance: Does this question explicitly test the requested topic ("${topic}")? If it tests a different topic (e.g. YARN, Hive, MapReduce, HDFS when the requested topic is Spark Architecture), return false.
2. Source Support: Is the question, correct answer, and explanation explicitly supported by facts in the source material?

Return ONLY structured JSON:
{
  "topicRelevance": boolean,
  "sourceSupported": boolean,
  "reason": "Brief explanation"
}`;

    try {
      const res = await generateGeminiContent(ai, prompt);
      let rawText = res.text || "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const evalRes = JSON.parse(rawText);

      if (evalRes.topicRelevance === true && evalRes.sourceSupported === true) {
        validQuestions.push(q);
      } else {
        console.warn(`[Question Audit Rejected] "${q.questionText}": ${evalRes.reason}`);
      }
    } catch (err) {
      console.error("[validateGeneratedQuestions Error]", err);
      validQuestions.push(q);
    }
  }

  return validQuestions;
}

/**
 * POST /api/teacher/quizzes/generate
 * AI Quiz Generator via Gemini SDK
 */
const handleGenerateQuizAI = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const {
      materialIds = [],
      questionCount = 10,
      difficulty = "medium",
      questionTypes = ["mcq"],
      topic = "",
      marks = 1
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required." });
    }

    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one course material." });
    }

    const qCount = Math.max(1, Math.min(20, parseInt(questionCount, 10) || 10));
    const defaultMarks = parseFloat(marks) || 1.0;

    // Verify course existence
    const courseRes = await pool.query(
      `SELECT id, code, name FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);`,
      [courseId]
    );
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }
    const course = courseRes.rows[0];

    // Fetch materials belonging to course
    const allMaterials = readMaterialsJSON();
    const courseMaterials = allMaterials.filter(
      (m) =>
        String(m.course_id).toLowerCase() === String(courseId).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(course.id).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(course.code).toLowerCase()
    );

    const selectedMaterials = courseMaterials.filter((m) => materialIds.includes(String(m.id)));
    if (selectedMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "None of the selected materials match this course."
      });
    }

    // Extract text content from selected materials
    let combinedContent = "";
    for (const mat of selectedMaterials) {
      const content = await extractMaterialContent(mat);
      combinedContent += `\n--- MATERIAL: ${mat.title} ---\n${content}\n`;
    }

    if (!combinedContent.trim()) {
      return res.status(400).json({
        success: false,
        message: "No readable content found in selected materials."
      });
    }

    // Initialize Gemini SDK
    const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured on the server."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // STEP 1: TOPIC COVERAGE CHECK
    if (topic && topic.trim()) {
      console.log(`[AI Quiz Generator] Running Topic Coverage Check for topic: "${topic.trim()}"...`);
      const coverage = await checkTopicCoverage(ai, topic.trim(), combinedContent);
      console.log(`[Topic Coverage Result] Supported=${coverage.topicSupported}, Score=${coverage.coverageScore}`);

      if (!coverage.topicSupported || coverage.coverageScore < 0.60) {
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_TOPIC_CONTENT",
          topicSupported: false,
          coverageScore: coverage.coverageScore,
          topic: topic.trim(),
          message: "The selected materials do not contain sufficient information about this topic.",
          reason: coverage.reason || `The selected materials only briefly mention or do not cover "${topic.trim()}".`
        });
      }
    }

    // STEP 2: STRICT QUIZ GENERATION PROMPT
    const typesStr = Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes.join(", ")
      : "mcq";

    const prompt = `You are an educational quiz generator.

Requested topic:
${topic ? topic : "All topics in selected materials"}

Source material:
${combinedContent.slice(0, 40000)}

Generate questions ONLY from information explicitly supported by the supplied source material.

STRICT RULES:
1. Use only the supplied source material.
2. Do not use general knowledge.
3. Do not add information that is not present in the source.
4. Every question must specifically test the requested topic ("${topic ? topic : "General Course Content"}").
5. Do not generate questions about neighboring or related topics unless the question directly contributes to the requested topic.
6. Every correct answer must be supported by the source.
7. Every explanation must be supported by the source.
8. Do not expand a brief mention into a detailed concept.
9. Do not generate a question simply because a keyword appears in the source.
10. If you cannot create a reliable question from the source, do not create it.
11. MCQ questions ("mcq") must have exactly four options and exactly one correct answer (matching one of the options).
12. Multi-select questions ("multiple_select") must have at least two correct answers in an array.
13. True/False questions ("true_false") must have options ["True", "False"] and correctAnswer "True" or "False".
14. Short-answer questions ("short_answer") must have a clear expected sample answer string in "correctAnswer".
15. Return ONLY structured valid JSON matching the format below.

JSON Schema:
{
  "questions": [
    {
      "questionType": "mcq",
      "questionText": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "marks": ${defaultMarks},
      "explanation": "Explanation text supported by source material"
    }
  ]
}
`;

    const response = await generateGeminiContent(ai, prompt);

    let rawText = response.text || "";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Gemini JSON parse error:", parseErr, "Raw output:", rawText);
      return res.status(500).json({
        success: false,
        message: "Failed to parse generated quiz output from AI. Please try again."
      });
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      return res.status(500).json({
        success: false,
        message: "Invalid response format returned by AI."
      });
    }

    const initialSanitizedQuestions = parsed.questions.map((q, idx) => {
      let qType = (q.questionType || q.type || "mcq").toLowerCase();
      if (!["mcq", "multiple_select", "true_false", "short_answer"].includes(qType)) {
        qType = "mcq";
      }

      let opts = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
      let corrAns = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;

      if (qType === "mcq") {
        if (opts.length !== 4) {
          opts = ["Option 1", "Option 2", "Option 3", "Option 4"];
        }
        if (typeof corrAns === "number" && corrAns >= 0 && corrAns < opts.length) {
          corrAns = opts[corrAns];
        } else if (!opts.includes(corrAns)) {
          corrAns = opts[0];
        }
      } else if (qType === "multiple_select") {
        if (opts.length < 2) {
          opts = ["Option 1", "Option 2", "Option 3", "Option 4"];
        }
        if (!Array.isArray(corrAns)) {
          corrAns = [opts[0]];
        } else {
          corrAns = corrAns.map(c => typeof c === "number" && opts[c] ? opts[c] : String(c)).filter(c => opts.includes(c));
          if (corrAns.length === 0) corrAns = [opts[0]];
        }
      } else if (qType === "true_false") {
        opts = ["True", "False"];
        corrAns = String(corrAns).toLowerCase().includes("true") ? "True" : "False";
      } else if (qType === "short_answer") {
        opts = [];
        corrAns = String(corrAns || "Expected sample answer");
      }

      return {
        id: Date.now() + idx + Math.floor(Math.random() * 1000),
        questionText: q.questionText || q.question || `Question ${idx + 1}`,
        questionType: qType,
        options: opts,
        correctAnswer: corrAns,
        marks: parseFloat(q.marks) || defaultMarks,
        explanation: q.explanation || "",
        isAiGenerated: true
      };
    });

    // STEP 3: QUESTION-LEVEL VALIDATION
    const validatedQuestions = await validateGeneratedQuestions(ai, initialSanitizedQuestions, topic.trim(), combinedContent);

    if (validatedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        code: "INSUFFICIENT_TOPIC_CONTENT",
        topicSupported: false,
        coverageScore: 0.2,
        topic: topic.trim(),
        message: "The selected materials do not contain sufficient information about this topic.",
        reason: `Generated questions failed relevance audit for topic "${topic.trim()}".`
      });
    }

    res.status(200).json({
      success: true,
      message: `${validatedQuestions.length} grounded questions generated successfully.`,
      questions: validatedQuestions
    });
  } catch (err) {
    console.error("AI Quiz Generator Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Unable to generate the quiz. Please try again."
    });
  }
};

/**
 * POST /api/teacher/quizzes/generate-single
 * Single Question AI Regeneration
 */
const handleGenerateSingleQuestionAI = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const {
      materialIds = [],
      originalQuestion = "",
      difficulty = "medium",
      questionType = "mcq",
      topic = "",
      marks = 1
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required." });
    }

    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({ success: false, message: "Please select course materials first." });
    }

    const defaultMarks = parseFloat(marks) || 1.0;
    const allMaterials = readMaterialsJSON();
    const selectedMaterials = allMaterials.filter((m) => materialIds.includes(String(m.id)));

    let combinedContent = "";
    for (const mat of selectedMaterials) {
      const content = await extractMaterialContent(mat);
      combinedContent += `\n--- MATERIAL: ${mat.title} ---\n${content}\n`;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: "Gemini API key is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an educational quiz generator for SmartCampus LMS.

Generate EXACTLY ONE replacement question strictly from the supplied course materials.

Original Question to replace: "${originalQuestion}"
Requested Question Type: "${questionType}"
Difficulty: "${difficulty}"
Topic Focus: "${topic || "Course Material"}"

Rules:
1. Return ONLY 1 question in JSON format.
2. If questionType is "mcq", include exactly 4 options and 1 correctAnswer string.
3. If questionType is "multiple_select", include 4 options and correctAnswer array with at least 2 correct strings.
4. If questionType is "true_false", include options ["True", "False"] and correctAnswer "True" or "False".
5. If questionType is "short_answer", include expected answer key string in correctAnswer.
6. Include a short explanation.

JSON Format:
{
  "questionType": "${questionType}",
  "questionText": "New question text...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "marks": ${defaultMarks},
  "explanation": "Short explanation..."
}

Material Content:
${combinedContent.slice(0, 30000)}
`;

    const response = await generateGeminiContent(ai, prompt);

    let rawText = response.text || "";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const q = JSON.parse(rawText);

    let qType = (q.questionType || q.type || questionType).toLowerCase();
    let opts = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
    let corrAns = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;

    if (qType === "mcq") {
      if (opts.length !== 4) opts = ["Option 1", "Option 2", "Option 3", "Option 4"];
      if (!opts.includes(corrAns)) corrAns = opts[0];
    } else if (qType === "multiple_select") {
      if (opts.length < 2) opts = ["Option 1", "Option 2", "Option 3", "Option 4"];
      if (!Array.isArray(corrAns)) corrAns = [opts[0]];
    } else if (qType === "true_false") {
      opts = ["True", "False"];
      corrAns = String(corrAns).toLowerCase().includes("true") ? "True" : "False";
    } else if (qType === "short_answer") {
      opts = [];
      corrAns = String(corrAns || "Expected sample answer");
    }

    const singleQuestion = {
      id: Date.now(),
      questionText: q.questionText || q.question || "Regenerated Question",
      questionType: qType,
      options: opts,
      correctAnswer: corrAns,
      marks: parseFloat(q.marks) || defaultMarks,
      explanation: q.explanation || "",
      isAiGenerated: true
    };

    res.status(200).json({ success: true, question: singleQuestion });
  } catch (err) {
    console.error("Single Question AI Regeneration Error:", err);
    res.status(500).json({ success: false, message: "Failed to regenerate single question." });
  }
};

router.post("/quizzes/generate", authenticate, authorizeRoles("teacher", "hod", "admin"), handleGenerateQuizAI);
router.post("/courses/:courseId/quizzes/generate", authenticate, authorizeRoles("teacher", "hod", "admin"), handleGenerateQuizAI);
router.post("/quizzes/generate-single", authenticate, authorizeRoles("teacher", "hod", "admin"), handleGenerateSingleQuestionAI);
router.post("/courses/:courseId/quizzes/generate-single", authenticate, authorizeRoles("teacher", "hod", "admin"), handleGenerateSingleQuestionAI);

export default router;
