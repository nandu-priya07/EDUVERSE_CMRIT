import { pool, initDatabase } from "../database/db.js";

async function createAssignmentsTable() {
  await initDatabase();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_teacher_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        teacher_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        academic_year VARCHAR(50) NOT NULL DEFAULT '2026-2027',
        semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
        role VARCHAR(50) DEFAULT 'Primary',
        status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_course_teacher_year_sem_role UNIQUE (course_id, teacher_uid, academic_year, semester, role)
      );
    `);
    console.log("✓ Created course_teacher_assignments table successfully.");
  } catch (err) {
    console.error("Error creating course_teacher_assignments table:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

createAssignmentsTable();
