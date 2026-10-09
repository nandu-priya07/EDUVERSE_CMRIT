import { pool } from '../database/db.js';

async function testBackendEndpoint() {
  try {
    const teacherUid = 'usr_teacher_empt1001'; // Dr. K. Anand
    const courseCode = 'AD23531';

    const courseRes = await pool.query("SELECT * FROM courses WHERE LOWER(code) = LOWER($1);", [courseCode]);
    const course = courseRes.rows[0];

    const ctaRes = await pool.query(
      "SELECT section FROM course_teacher_assignments WHERE teacher_uid = $1 AND course_id = $2 AND (status = 'Active' OR status IS NULL);",
      [teacherUid, course.id]
    );

    const rawSections = ctaRes.rows.map((r) => r.section).filter(Boolean);
    const targetSections = [];
    rawSections.forEach((sec) => {
      const clean = sec.replace(/^Section\s+/i, "").trim().toUpperCase();
      targetSections.push(clean);
      targetSections.push(`SECTION ${clean}`);
    });

    const studentsQuery = `
      SELECT DISTINCT ON (u.uid)
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS register_number,
        COALESCE(sp.department, d.code, u.department, 'AI&DS') AS department,
        COALESCE(sp.section, 'A') AS section,
        COALESCE(ce.status, 'Enrolled') AS status
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

    const studentsRes = await pool.query(studentsQuery, [course.id, targetSections]);

    console.log("Teacher:", teacherUid);
    console.log("Assigned Section:", rawSections);
    console.log("Returned Students Count:", studentsRes.rows.length);
    console.table(studentsRes.rows.map(s => ({ name: s.name, email: s.email, section: s.section, status: s.status })));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testBackendEndpoint();
