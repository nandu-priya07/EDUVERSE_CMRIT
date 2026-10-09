import { pool } from '../database/db.js';

async function testStrictEnrollment() {
  try {
    const courseId = '263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40'; // AD23531
    const targetSections = ['A', 'SECTION A'];

    const studentsQuery = `
      SELECT DISTINCT ON (u.uid)
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS register_number,
        COALESCE(sp.department, d.code, u.department, 'AI&DS') AS department,
        COALESCE(sp.section, 'A') AS section,
        ce.status AS status
      FROM course_enrollments ce
      JOIN users u ON ce.student_uid = u.uid
      JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name)
      )
      WHERE ce.course_id = $1
        AND LOWER(ce.status) = 'enrolled'
        AND u.role = 'student'
        AND (
          UPPER(TRIM(sp.section)) = ANY($2::text[])
          OR UPPER(TRIM('SECTION ' || sp.section)) = ANY($2::text[])
          OR UPPER(TRIM(REPLACE(sp.section, 'Section ', ''))) = ANY($2::text[])
        )
      ORDER BY u.uid, u.name ASC;
    `;

    const res = await pool.query(studentsQuery, [courseId, targetSections]);
    console.log("--- STRICT ENROLLED STUDENTS FOR SECTION A ---");
    console.table(res.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testStrictEnrollment();
