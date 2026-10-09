import { pool } from '../database/db.js';
import { readMaterialsJSON } from '../routes/materialRoutes.js';

async function testFetchMaterialsByCode(courseId) {
  try {
    let courseUuid = courseId;
    let courseCode = courseId;

    const courseRes = await pool.query(
      "SELECT id, code FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);",
      [courseId]
    );
    if (courseRes.rows.length > 0) {
      courseUuid = courseRes.rows[0].id;
      courseCode = courseRes.rows[0].code;
    }

    const all = readMaterialsJSON();
    const filtered = all.filter(
      (m) =>
        String(m.course_id).toLowerCase() === String(courseId).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(courseUuid).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(courseCode).toLowerCase()
    );

    console.log(`Query for course identifier: "${courseId}"`);
    console.log(`Resolved UUID: "${courseUuid}" | Code: "${courseCode}"`);
    console.log(`Found Materials Count: ${filtered.length}`);
    console.table(filtered);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testFetchMaterialsByCode('AD23531');
