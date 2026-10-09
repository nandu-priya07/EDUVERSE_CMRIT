import { pool } from '../database/db.js';

async function check() {
  try {
    const cta = await pool.query('SELECT * FROM course_teacher_assignments;');
    console.log('--- course_teacher_assignments ---');
    console.table(cta.rows);

    const sct = await pool.query('SELECT * FROM student_course_teacher;');
    console.log('--- student_course_teacher ---');
    console.table(sct.rows);

    const teachers = await pool.query("SELECT uid, name, email, role FROM users WHERE role = 'teacher';");
    console.log('--- teachers ---');
    console.table(teachers.rows);

    const sp = await pool.query('SELECT uid, name, section, department, register_number FROM student_profiles;');
    console.log('--- student_profiles ---');
    console.table(sp.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
