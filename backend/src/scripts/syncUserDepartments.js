import { pool } from "../database/db.js";

async function syncDepartments() {
  try {
    const aidsRes = await pool.query("SELECT id FROM departments WHERE UPPER(code) IN ('AIDS', 'AD123') OR UPPER(name) LIKE '%DATA SCIENCE%' LIMIT 1");
    const aimlRes = await pool.query("SELECT id FROM departments WHERE UPPER(code) IN ('AIML', 'AIML108') OR UPPER(name) LIKE '%MACHINE LEARNING%' LIMIT 1");

    if (aidsRes.rows.length > 0) {
      const aidsId = aidsRes.rows[0].id;
      const res1 = await pool.query("UPDATE users SET department = $1 WHERE UPPER(department) IN ('AI&DS', 'AIDS', 'AD123')", [aidsId]);
      console.log(`✓ Updated ${res1.rowCount} AI&DS users to department ID ${aidsId}`);
    }

    if (aimlRes.rows.length > 0) {
      const aimlId = aimlRes.rows[0].id;
      const res2 = await pool.query("UPDATE users SET department = $1 WHERE UPPER(department) IN ('AI&ML', 'AIML', 'AIML108')", [aimlId]);
      console.log(`✓ Updated ${res2.rowCount} AI&ML users to department ID ${aimlId}`);
    }

    // Verify count in backend query logic
    const testQuery = `
      SELECT 
        d.id,
        d.name,
        d.code,
        (
          SELECT COUNT(*)::int
          FROM users u
          WHERE u.role = 'student' 
            AND (
              u.department = d.id::text 
              OR UPPER(u.department) = UPPER(d.code) 
              OR UPPER(u.department) = UPPER(d.name)
              OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
              OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108'))
            )
        ) AS student_count
      FROM departments d
      WHERE d.code IN ('AIDS', 'AIML', 'AD123', 'AIML108')
      ORDER BY d.name ASC;
    `;
    const checkRes = await pool.query(testQuery);
    console.log("📊 Verification Department Student Counts:", checkRes.rows);

  } catch (error) {
    console.error("Sync error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

syncDepartments();
