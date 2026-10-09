import { pool } from '../database/db.js';

async function check() {
  try {
    const courseRes = await pool.query("SELECT * FROM courses WHERE LOWER(code) = 'ad23531';");
    console.log('--- AD23531 course ---', courseRes.rows);

    if (courseRes.rows.length > 0) {
      const courseId = courseRes.rows[0].id;
      const ctaRes = await pool.query("SELECT cta.*, u.name as teacher_name FROM course_teacher_assignments cta JOIN users u ON cta.teacher_uid = u.uid WHERE cta.course_id = $1;", [courseId]);
      console.log('--- assignments for AD23531 ---', ctaRes.rows);

      const ceRes = await pool.query("SELECT ce.*, u.name, sp.section FROM course_enrollments ce JOIN users u ON ce.student_uid = u.uid LEFT JOIN student_profiles sp ON u.uid = sp.uid WHERE ce.course_id = $1;", [courseId]);
      console.log('--- enrollments for AD23531 ---', ceRes.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
