import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "../pages/login.js";

const router = express.Router({ mergeParams: true });

/**
 * Helper to grade objective question types on server
 */
function evaluateObjectiveAnswer(questionType, correctAnswer, studentAnswer, maxMarks, options = []) {
  let awardedMarks = 0;

  if (questionType === "mcq" || questionType === "true_false") {
    if (String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
      awardedMarks = maxMarks;
    }
  } else if (questionType === "multiple_select") {
    const validOptionsSet = new Set(Array.isArray(options) ? options.map(String) : []);
    const rawCorrect = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
    
    // Filter out stale default option text that does not exist in valid question options
    const filteredCorrect = validOptionsSet.size > 0 
      ? rawCorrect.filter((opt) => validOptionsSet.has(opt))
      : rawCorrect;

    const correctArr = Array.from(new Set(filteredCorrect)).sort();
    const studentArr = Array.from(new Set(Array.isArray(studentAnswer) ? studentAnswer.map(String) : [])).sort();

    if (JSON.stringify(correctArr) === JSON.stringify(studentArr)) {
      awardedMarks = maxMarks;
    }
  }

  return awardedMarks;
}

/**
 * GET /api/student/courses/:courseId/quizzes
 * List quizzes for logged in student for an enrolled course
 */
router.get("/courses/:courseId/quizzes", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentUid = req.user.uid;

    // Check course enrollment
    const courseRes = await pool.query(
      `SELECT id, name, code FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);`,
      [courseId]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const course = courseRes.rows[0];

    // Fetch published & closed quizzes for this course
    const quizzesQuery = `
      SELECT 
        q.id,
        q.course_id,
        q.title,
        q.description,
        q.instructions,
        q.duration_minutes,
        q.total_marks,
        q.max_attempts,
        q.start_at,
        q.end_at,
        q.status,
        (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_uid = $1) AS attempts_used
      FROM quizzes q
      WHERE q.course_id = $2 AND q.status IN ('published', 'closed')
      ORDER BY q.created_at DESC;
    `;

    const quizzesRes = await pool.query(quizzesQuery, [studentUid, course.id]);
    const now = new Date();

    const quizzes = quizzesRes.rows.map((q) => {
      const attemptsUsed = parseInt(q.attempts_used, 10) || 0;
      const maxAttempts = parseInt(q.max_attempts, 10) || 1;
      const startAt = q.start_at ? new Date(q.start_at) : null;
      const endAt = q.end_at ? new Date(q.end_at) : null;

      let computedStatus = "Available";
      if (q.status === "closed" || (endAt && now > endAt)) {
        computedStatus = "Closed";
      } else if (startAt && now < startAt) {
        computedStatus = "Upcoming";
      } else if (attemptsUsed >= maxAttempts) {
        computedStatus = "Submitted";
      }

      return {
        id: q.id,
        courseId: q.course_id,
        title: q.title,
        description: q.description,
        instructions: q.instructions,
        durationMinutes: q.duration_minutes,
        totalMarks: parseFloat(q.total_marks),
        maxAttempts,
        attemptsUsed,
        startAt: q.start_at,
        endAt: q.end_at,
        status: computedStatus,
        totalQuestions: parseInt(q.total_questions, 10) || 0,
      };
    });

    res.status(200).json({ success: true, data: quizzes });
  } catch (err) {
    console.error("GET Student Course Quizzes Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch student quizzes." });
  }
});

/**
 * GET /api/student/quizzes/:quizId
 * Get quiz overview before starting attempt
 */
router.get("/quizzes/:quizId", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentUid = req.user.uid;

    const quizRes = await pool.query(
      `SELECT q.*, c.name AS course_name, c.code AS course_code
       FROM quizzes q
       JOIN courses c ON q.course_id = c.id
       WHERE q.id::text = $1 AND q.status IN ('published', 'closed');`,
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found or not published." });
    }

    const quiz = quizRes.rows[0];

    const attemptsRes = await pool.query(
      `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_uid = $2;`,
      [quiz.id, studentUid]
    );
    const attemptsUsed = parseInt(attemptsRes.rows[0].count, 10) || 0;

    const activeAttemptRes = await pool.query(
      `SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_uid = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1;`,
      [quiz.id, studentUid]
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
          attemptsUsed,
          startAt: quiz.start_at,
          endAt: quiz.end_at,
          status: quiz.status,
          randomizeQuestions: quiz.randomize_questions,
          showAnswersAfterSubmission: quiz.show_answers_after_submission,
        },
        activeAttempt: activeAttemptRes.rows.length > 0 ? activeAttemptRes.rows[0] : null,
      },
    });
  } catch (err) {
    console.error("GET Student Quiz Overview Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch quiz overview." });
  }
});

/**
 * POST /api/student/quizzes/:quizId/start
 * Start or resume a quiz attempt (does NOT send correct answers to client)
 */
router.post("/quizzes/:quizId/start", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { quizId } = req.params;
    const studentUid = req.user.uid;

    await client.query("BEGIN");

    // Fetch quiz info
    const quizRes = await client.query(
      `SELECT * FROM quizzes WHERE id::text = $1 AND status = 'published';`,
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      throw new Error("Quiz is not available for attempt.");
    }

    const quiz = quizRes.rows[0];
    const now = new Date();

    if (quiz.start_at && now < new Date(quiz.start_at)) {
      throw new Error("Quiz has not started yet.");
    }
    if (quiz.end_at && now > new Date(quiz.end_at)) {
      throw new Error("Quiz deadline has passed.");
    }

    // Check existing in_progress attempt
    const inProgressRes = await client.query(
      `SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_uid = $2 AND status = 'in_progress';`,
      [quiz.id, studentUid]
    );

    let attempt;
    if (inProgressRes.rows.length > 0) {
      attempt = inProgressRes.rows[0];
    } else {
      // Check attempt limit
      const countRes = await client.query(
        `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_uid = $2;`,
        [quiz.id, studentUid]
      );
      const attemptsCount = parseInt(countRes.rows[0].count, 10);
      if (attemptsCount >= quiz.max_attempts) {
        throw new Error("Maximum attempt limit reached for this quiz.");
      }

      const nextAttemptNumber = attemptsCount + 1;
      const createAttemptQuery = `
        INSERT INTO quiz_attempts (quiz_id, student_uid, attempt_number, started_at, status)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'in_progress')
        RETURNING *;
      `;
      const newAttemptRes = await client.query(createAttemptQuery, [quiz.id, studentUid, nextAttemptNumber]);
      attempt = newAttemptRes.rows[0];
    }

    // Fetch questions WITHOUT correct_answer
    let qOrder = quiz.randomize_questions ? "RANDOM()" : "display_order ASC";
    const questionsRes = await client.query(
      `SELECT id, question_text, question_type, options, marks, display_order 
       FROM quiz_questions 
       WHERE quiz_id = $1 
       ORDER BY ${qOrder};`,
      [quiz.id]
    );

    // Fetch existing saved answers for this attempt
    const answersRes = await client.query(
      `SELECT question_id, answer FROM quiz_answers WHERE attempt_id = $1;`,
      [attempt.id]
    );

    const savedAnswersMap = {};
    answersRes.rows.forEach((ans) => {
      savedAnswersMap[ans.question_id] = ans.answer;
    });

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          attemptNumber: attempt.attempt_number,
          startedAt: attempt.started_at,
          durationMinutes: quiz.duration_minutes,
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          instructions: quiz.instructions,
          totalMarks: parseFloat(quiz.total_marks),
        },
        questions: questionsRes.rows.map((q) => ({
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options,
          marks: parseFloat(q.marks),
          displayOrder: q.display_order,
          savedAnswer: savedAnswersMap[q.id] !== undefined ? savedAnswersMap[q.id] : null,
        })),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST Start Quiz Error:", err);
    res.status(400).json({ success: false, message: err.message || "Could not start quiz attempt." });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/student/quiz-attempts/:attemptId/answers
 * Save/update answer draft during active attempt
 */
router.put("/quiz-attempts/:attemptId/answers", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer } = req.body;
    const studentUid = req.user.uid;

    const attemptRes = await pool.query(
      `SELECT * FROM quiz_attempts WHERE id::text = $1 AND student_uid = $2 AND status = 'in_progress';`,
      [attemptId, studentUid]
    );

    if (attemptRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Active attempt not found or already submitted." });
    }

    const saveAnswerQuery = `
      INSERT INTO quiz_answers (attempt_id, question_id, answer, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (attempt_id, question_id) 
      DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    await pool.query(saveAnswerQuery, [attemptId, questionId, JSON.stringify(answer)]);

    res.status(200).json({ success: true, message: "Answer saved." });
  } catch (err) {
    console.error("PUT Save Answer Error:", err);
    res.status(500).json({ success: false, message: "Failed to save answer." });
  }
});

/**
 * POST /api/student/quiz-attempts/:attemptId/submit
 * Submit attempt & perform automatic grading
 */
router.post("/quiz-attempts/:attemptId/submit", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { attemptId } = req.params;
    const { answers } = req.body; // Map of questionId -> answer
    const studentUid = req.user.uid;

    await client.query("BEGIN");

    const attemptRes = await client.query(
      `SELECT qa.*, q.duration_minutes, q.end_at
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.id::text = $1 AND qa.student_uid = $2 AND qa.status = 'in_progress';`,
      [attemptId, studentUid]
    );

    if (attemptRes.rows.length === 0) {
      throw new Error("Active attempt not found or already submitted.");
    }

    const attempt = attemptRes.rows[0];

    // Fetch all quiz questions with correct answers for backend grading
    const qRes = await client.query(
      `SELECT * FROM quiz_questions WHERE quiz_id = $1;`,
      [attempt.quiz_id]
    );

    let totalScore = 0;
    let hasShortAnswer = false;

    // Process each question
    for (const question of qRes.rows) {
      const qId = question.id;
      const submittedAnswer = answers && answers[qId] !== undefined ? answers[qId] : null;
      let awardedMarks = 0;

      if (question.question_type === "short_answer") {
        hasShortAnswer = true;
        awardedMarks = 0; // Requires manual teacher evaluation
      } else {
        awardedMarks = evaluateObjectiveAnswer(
          question.question_type,
          question.correct_answer,
          submittedAnswer,
          parseFloat(question.marks),
          question.options
        );
      }

      totalScore += awardedMarks;

      await client.query(
        `INSERT INTO quiz_answers (attempt_id, question_id, answer, awarded_marks, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (attempt_id, question_id)
         DO UPDATE SET answer = EXCLUDED.answer, awarded_marks = EXCLUDED.awarded_marks, updated_at = CURRENT_TIMESTAMP;`,
        [attemptId, qId, JSON.stringify(submittedAnswer), awardedMarks]
      );
    }

    const finalStatus = hasShortAnswer ? "submitted" : "evaluated";

    await client.query(
      `UPDATE quiz_attempts 
       SET submitted_at = CURRENT_TIMESTAMP, score = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id::text = $3;`,
      [totalScore, finalStatus, attemptId]
    );

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully.",
      data: {
        score: totalScore,
        status: finalStatus,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST Submit Quiz Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to submit quiz." });
  } finally {
    client.release();
  }
});

/**
 * GET /api/student/quiz-attempts/:attemptId/result
 * Get attempt result summary & review
 */
router.get("/quiz-attempts/:attemptId/result", authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentUid = req.user.uid;

    const attemptRes = await pool.query(
      `SELECT qa.*, q.title AS quiz_title, q.total_marks, q.show_answers_after_submission, c.name AS course_name
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       JOIN courses c ON q.course_id = c.id
       WHERE qa.id::text = $1 AND qa.student_uid = $2;`,
      [attemptId, studentUid]
    );

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Attempt result not found." });
    }

    const attempt = attemptRes.rows[0];
    const showAnswers = attempt.show_answers_after_submission;

    // Fetch questions & answers
    const reviewQuery = `
      SELECT 
        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.options,
        qq.marks AS max_marks,
        qq.correct_answer,
        ans.answer AS student_answer,
        ans.awarded_marks,
        ans.feedback
      FROM quiz_questions qq
      LEFT JOIN quiz_answers ans ON qq.id = ans.question_id AND ans.attempt_id::text = $1
      WHERE qq.quiz_id = $2
      ORDER BY qq.display_order ASC;
    `;

    const reviewRes = await pool.query(reviewQuery, [attemptId, attempt.quiz_id]);

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          quizTitle: attempt.quiz_title,
          courseName: attempt.course_name,
          attemptNumber: attempt.attempt_number,
          submittedAt: attempt.submitted_at,
          score: parseFloat(attempt.score),
          totalMarks: parseFloat(attempt.total_marks),
          percentage: Math.round((parseFloat(attempt.score) / parseFloat(attempt.total_marks)) * 100),
          status: attempt.status,
        },
        questions: reviewRes.rows.map((r) => ({
          questionId: r.question_id,
          questionText: r.question_text,
          questionType: r.question_type,
          options: r.options,
          maxMarks: parseFloat(r.max_marks),
          studentAnswer: r.student_answer,
          awardedMarks: r.awarded_marks !== null ? parseFloat(r.awarded_marks) : 0,
          feedback: r.feedback || "",
          correctAnswer: showAnswers ? r.correct_answer : undefined,
        })),
      },
    });
  } catch (err) {
    console.error("GET Student Quiz Result Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch attempt result." });
  }
});

export default router;
