import { pool } from '../database/db.js';

async function seedAssignments() {
  try {
    const courseId = '263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40'; // AD23531
    const teacherB = 'usr_teacher_empt1004'; // Dr. M. Lakshmi

    const check = await pool.query(
      "SELECT * FROM course_teacher_assignments WHERE course_id = $1 AND teacher_uid = $2;",
      [courseId, teacherB]
    );

    if (check.rows.length === 0) {
      await pool.query(`
        INSERT INTO course_teacher_assignments (id, course_id, teacher_uid, academic_year, semester, role, status, section)
        VALUES (gen_random_uuid(), $1, $2, '2024–2028', 5, 'Primary', 'Active', 'Section B');
      `, [courseId, teacherB]);
      console.log('Added Section B assignment for Dr. M. Lakshmi for course AD23531');
    } else {
      console.log('Section B assignment already exists for Dr. M. Lakshmi');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedAssignments();
