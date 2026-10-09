import { pool } from '../database/db.js';

function evaluateObjectiveAnswer(questionType, correctAnswer, studentAnswer, maxMarks, options = []) {
  let awardedMarks = 0;

  if (questionType === "mcq" || questionType === "true_false") {
    if (String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
      awardedMarks = maxMarks;
    }
  } else if (questionType === "multiple_select") {
    const validOptionsSet = new Set(Array.isArray(options) ? options.map(String) : []);
    const rawCorrect = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
    
    // Filter out invalid/stale option strings not in question.options (like 'Option 1')
    const filteredCorrect = validOptionsSet.size > 0 
      ? rawCorrect.filter(opt => validOptionsSet.has(opt))
      : rawCorrect;

    const correctArr = Array.from(new Set(filteredCorrect)).sort();
    const studentArr = Array.from(new Set(Array.isArray(studentAnswer) ? studentAnswer.map(String) : [])).sort();

    if (JSON.stringify(correctArr) === JSON.stringify(studentArr)) {
      awardedMarks = maxMarks;
    }
  }

  return awardedMarks;
}

async function fixQuizEvaluation() {
  const client = await pool.connect();
  try {
    const attemptId = '77638fc0-4643-4399-9b11-2d9f53cb47cb';

    console.log("Re-evaluating quiz attempt:", attemptId);
    
    const attemptRes = await client.query("SELECT * FROM quiz_attempts WHERE id::text = $1;", [attemptId]);
    if (attemptRes.rows.length === 0) {
      console.log("Attempt not found");
      process.exit(0);
    }
    const attempt = attemptRes.rows[0];

    const qRes = await client.query("SELECT * FROM quiz_questions WHERE quiz_id = $1;", [attempt.quiz_id]);
    const ansRes = await client.query("SELECT * FROM quiz_answers WHERE attempt_id = $1;", [attemptId]);

    const answersMap = {};
    ansRes.rows.forEach(ans => {
      answersMap[ans.question_id] = ans.answer;
    });

    let totalScore = 0;

    for (const question of qRes.rows) {
      const qId = question.id;
      const submittedAnswer = answersMap[qId];
      const awardedMarks = evaluateObjectiveAnswer(
        question.question_type,
        question.correct_answer,
        submittedAnswer,
        parseFloat(question.marks),
        question.options
      );

      console.log(`Q: "${question.question_text}" (${question.question_type})`);
      console.log(`  Submitted:`, submittedAnswer);
      console.log(`  Raw Correct:`, question.correct_answer);
      console.log(`  Marks Awarded: ${awardedMarks} / ${question.marks}`);

      totalScore += awardedMarks;

      await client.query(
        "UPDATE quiz_answers SET awarded_marks = $1 WHERE attempt_id = $2 AND question_id = $3;",
        [awardedMarks, attemptId, qId]
      );
    }

    await client.query(
      "UPDATE quiz_attempts SET score = $1, status = 'evaluated', updated_at = CURRENT_TIMESTAMP WHERE id::text = $2;",
      [totalScore, attemptId]
    );

    console.log(`\n✅ Attempt re-evaluated! New total score: ${totalScore}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixQuizEvaluation();
