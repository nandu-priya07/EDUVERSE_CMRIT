import { pool } from '../database/db.js';

async function testTeacherStudents(teacherUid, courseCode) {
  console.log(`\n================ Testing for Teacher: ${teacherUid} and Course: ${courseCode} ================`);
  
  // 1. Get Course
  const courseRes = await pool.query(
    "SELECT c.*, d.code as department_code, d.name as department_name FROM courses c JOIN departments d ON c.department_id = d.id WHERE LOWER(c.code) = LOWER($1) LIMIT 1;",
    [courseCode]
  );
  if (courseRes.rows.length === 0) {
    console.log("Course not found!");
    return;
  }
  const course = courseRes.rows[0];

  // 2. Get Teacher info
  const teacherRes = await pool.query("SELECT uid, name, email FROM users WHERE uid = $1;", [teacherUid]);
  const teacherName = teacherRes.rows[0]?.name || teacherUid;

  // 3. Get Teacher Assignment
  const ctaRes = await pool.query(
    `SELECT section, academic_year, semester 
     FROM course_teacher_assignments 
     WHERE teacher_uid = $1 AND course_id = $2 AND (status = 'Active' OR status IS NULL);`,
    [teacherUid, course.id]
  );

  console.log(`Teacher: ${teacherName} (${teacherUid})`);
  console.log(`Course: ${course.name} (${course.code})`);

  if (ctaRes.rows.length === 0) {
    console.log("❌ NO SECTION ASSIGNED TO THIS TEACHER FOR THIS COURSE.");
    console.log("Returned Students Count: 0");
    return;
  }

  const rawSections = ctaRes.rows.map(r => r.section);
  console.log(`Assigned Section(s) in DB:`, rawSections);

  // Normalize sections for matching (e.g. 'Section A' -> ['A', 'SECTION A'])
  const targetSections = [];
  rawSections.forEach(sec => {
    if (!sec) return;
    const clean = sec.replace(/^Section\s+/i, '').trim().toUpperCase();
    targetSections.push(clean);
    targetSections.push(`SECTION ${clean}`);
  });

  console.log(`Normalized Target Sections:`, targetSections);

  // 4. Query Students matching course & section
  const studentsRes = await pool.query(
    `SELECT DISTINCT ON (u.uid)
       u.uid,
       u.name,
       u.email,
       COALESCE(sp.register_number, u.register_number) AS register_number,
       COALESCE(sp.department, d.code, u.department) AS department,
       sp.section,
       COALESCE(ce.status, 'enrolled') AS status
     FROM users u
     JOIN student_profiles sp ON u.uid = sp.uid
     LEFT JOIN departments d ON (
       u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name)
     )
     LEFT JOIN course_enrollments ce ON u.uid = ce.student_uid AND ce.course_id = $1
     WHERE u.role = 'student'
       AND (
         UPPER(TRIM(sp.section)) = ANY($2::text[])
         OR UPPER(TRIM('SECTION ' || sp.section)) = ANY($2::text[])
         OR UPPER(TRIM(REPLACE(sp.section, 'Section ', ''))) = ANY($2::text[])
       )
     ORDER BY u.uid, u.name ASC;`,
    [course.id, targetSections]
  );

  console.log(`✅ Returned Students Count: ${studentsRes.rows.length}`);
  console.table(studentsRes.rows.map(s => ({
    name: s.name,
    register_number: s.register_number,
    department: s.department,
    section: s.section,
    status: s.status
  })));
}

async function runAllTests() {
  try {
    // Test Dr. K. Anand (usr_teacher_empt1001) for AD23531 -> Assigned Section A
    await testTeacherStudents('usr_teacher_empt1001', 'AD23531');

    // Test Dr. M. Lakshmi (usr_teacher_empt1004) for AD23531 -> Assigned Section B (if assignment updated) or unassigned
    await testTeacherStudents('usr_teacher_empt1004', 'AD23531');

    // Test unassigned teacher
    await testTeacherStudents('usr_teacher_empt1002', 'AD23531');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runAllTests();
