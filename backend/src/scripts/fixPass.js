import { pool } from "../database/db.js";
import bcrypt from "bcryptjs";

async function run() {
  const hash = await bcrypt.hash("StudentPass123!", 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE role = 'student'", [hash]);
  console.log("✓ All student passwords set to StudentPass123!");
  process.exit(0);
}

run();
