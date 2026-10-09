import { pool } from "../database/db.js";

async function updateFacultyRoleToTeacher() {
  try {
    // 1. Drop existing constraint if it exists
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);

    // 2. Update existing records
    const res = await pool.query(
      `UPDATE users SET role = 'teacher' WHERE role = 'faculty' RETURNING uid, name, email, role;`
    );
    console.log(`Successfully updated ${res.rowCount} users from 'faculty' to 'teacher' role.`);

    // 3. Add updated constraint
    await pool.query(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'hod', 'admin'));`
    );
    console.log("Database CHECK constraint users_role_check updated successfully.");
  } catch (err) {
    console.error("Error updating user roles in database:", err.message);
  } finally {
    process.exit(0);
  }
}

updateFacultyRoleToTeacher();
