import { pool } from '../database/db.js';

async function checkQuizAttempt() {
  try {
    const attemptId = '77638fc0-4643-4399-9b11-2d9f53cb47cb';
    const attemptRes = await pool.query("SELECT * FROM quiz_attempts WHERE id::text = $1;", [attemptId]);
    console.log("--- QUIZ ATTEMPT ---");
    console.log(attemptRes.rows);

    if (attemptRes.rows.length > 0) {
      const quizId = attemptRes.rows[0].quiz_id;
      const questionsRes = await pool.query("SELECT * FROM quiz_questions WHERE quiz_id = $1;", [quizId]);
      console.log("--- QUIZ QUESTIONS ---");
      console.log(questionsRes.rows);

      const answersRes = await pool.query("SELECT * FROM quiz_answers WHERE attempt_id::text = $1;", [attemptId]);
      console.log("--- QUIZ ANSWERS SUBMITTED ---");
      console.log(answersRes.rows);
    } else {
      console.log("Attempt ID not found directly, showing all recent attempts & questions...");
      const attempts = await pool.query("SELECT * FROM quiz_attempts ORDER BY started_at DESC LIMIT 5;");
      console.log("--- RECENT ATTEMPTS ---", attempts.rows);

      const questions = await pool.query("SELECT * FROM quiz_questions ORDER BY created_at DESC LIMIT 10;");
      console.log("--- RECENT QUESTIONS ---", questions.rows);

      const answers = await pool.query("SELECT * FROM quiz_answers ORDER BY updated_at DESC LIMIT 10;");
      console.log("--- RECENT ANSWERS ---", answers.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkQuizAttempt();
