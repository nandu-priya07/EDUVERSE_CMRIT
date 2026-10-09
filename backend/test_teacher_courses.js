import { pool } from "./src/database/db.js";

async function test() {
  const uid1 = "usr_teacher_empt1001";
  const assignedCoursesQuery = `
    SELECT DISTINCT ON (c.id)
      c.id,
      c.code,
      c.name,
      c.description,
      c.credit,
      c.category,
      c.sem,
      c.year,
      c.thumbnail_url,
      c.syllabus_url,
      d.code AS department_code,
      d.name AS department_name,
      COALESCE(cta.academic_year, sct.academic_year, '2026-2027') AS academic_year,
      COALESCE(cta.section, 'Section A') AS section,
      COALESCE(
        (
          SELECT COUNT(DISTINCT sct_sub.student_uid)
          FROM student_course_teacher sct_sub
          WHERE sct_sub.course_id = c.id AND sct_sub.teacher_uid = $1
        ),
        (
          SELECT COUNT(DISTINCT ce.student_uid)
          FROM course_enrollments ce
          WHERE ce.course_id = c.id
        ),
        0
      ) AS student_count
    FROM courses c
    JOIN departments d ON c.department_id = d.id
    LEFT JOIN course_teacher_assignments cta ON c.id = cta.course_id AND cta.teacher_uid = $1 AND (cta.status = 'Active' OR cta.status IS NULL)
    LEFT JOIN student_course_teacher sct ON c.id = sct.course_id AND sct.teacher_uid = $1
    WHERE cta.teacher_uid = $1 OR sct.teacher_uid = $1
    ORDER BY c.id, c.code ASC;
  `;

  const res1 = await pool.query(assignedCoursesQuery, [uid1]);
  console.log("Teacher 1 (empt1001) assigned courses count:", res1.rows.length);
  console.log("Teacher 1 assigned courses:", res1.rows.map(r => ({ code: r.code, name: r.name, section: r.section })));

  const uid2 = "usr_teacher_empt1002";
  const res2 = await pool.query(assignedCoursesQuery, [uid2]);
  console.log("Teacher 2 (empt1002) assigned courses count:", res2.rows.length);
  console.log("Teacher 2 assigned courses:", res2.rows.map(r => ({ code: r.code, name: r.name, section: r.section })));

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
