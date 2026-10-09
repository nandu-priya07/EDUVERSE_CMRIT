import { pool } from '../database/db.js';

async function checkEnrollments() {
  try {
    const courseId = '263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40'; // AD23531
    const res = await pool.query(`
      SELECT ce.*, u.name, u.email, sp.section, sp.register_number
      FROM course_enrollments ce
      JOIN users u ON ce.student_uid = u.uid
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      WHERE ce.course_id = $1;
    `, [courseId]);

    console.log("--- EXACT ENROLLMENTS IN DATABASE FOR AD23531 ---");
    console.table(res.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEnrollments();
