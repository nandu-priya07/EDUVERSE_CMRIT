import { pool } from "./src/database/db.js";

async function test() {
  const courseRes = await pool.query("SELECT id, code, name FROM courses WHERE LOWER(code) = 'ad23531' OR id::text = 'ad23531';");
  console.log("Course:", courseRes.rows);

  if (courseRes.rows.length > 0) {
    const cid = courseRes.rows[0].id;
    const studentsRes = await pool.query(`
      SELECT DISTINCT ON (u.uid)
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS register_number,
        COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
        COALESCE(sp.section, 'A') AS section,
        COALESCE(
          (
            SELECT u_staff.name
            FROM course_teacher_assignments cta_staff
            JOIN users u_staff ON cta_staff.teacher_uid = u_staff.uid
            WHERE cta_staff.course_id = $1
              AND (cta_staff.section = 'All Sections' OR UPPER(cta_staff.section) = UPPER(sp.section) OR UPPER(cta_staff.section) = UPPER('Section ' || sp.section))
              AND (cta_staff.status = 'Active' OR cta_staff.status IS NULL)
            LIMIT 1
          ),
          'Faculty Member'
        ) AS assigned_staff
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
      LEFT JOIN student_course_teacher sct ON u.uid = sct.student_uid
      LEFT JOIN course_enrollments ce ON u.uid = ce.student_uid
      WHERE sct.course_id = $1 OR ce.course_id = $1 OR (u.role = 'student')
      LIMIT 10;
    `, [cid]);

    console.log("Enrolled Students count:", studentsRes.rows.length);
    console.log("Sample Students:", studentsRes.rows.map(s => ({
      name: s.name,
      reg: s.register_number,
      dept: s.department,
      section: s.section,
      staff: s.assigned_staff
    })));
  }

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
