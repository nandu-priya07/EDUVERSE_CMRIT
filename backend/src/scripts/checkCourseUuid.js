import { pool } from "../database/db.js";

async function checkCourse() {
  try {
    const res = await pool.query(
      `SELECT id, code, name FROM courses WHERE id::text = '72a6dfe0-3ad5-43cc-8e1e-beac52ad3647';`
    );
    console.log("Course query result:", res.rows);
  } catch (err) {
    console.error("Query error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkCourse();
