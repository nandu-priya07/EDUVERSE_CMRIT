import { pool } from '../database/db.js';

async function check() {
  try {
    const courseId = '263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40';
    const students = await pool.query(`
      SELECT sp.uid, sp.name, sp.section, ce.status as enrollment_status
      FROM student_profiles sp
      LEFT JOIN course_enrollments ce ON sp.uid = ce.student_uid AND ce.course_id = $1;
    `, [courseId]);
    console.log('--- Students & Enrollments for AD23531 ---');
    console.table(students.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
