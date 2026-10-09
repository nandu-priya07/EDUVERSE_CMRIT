
import dotenv from "dotenv";
import { pool } from "../database/db.js";

dotenv.config();

async function seedStudentProfile() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Existing student details
    const email = "student.aids@smartcampus.com";

    // 1. Find existing student
    const userResult = await client.query(
      `SELECT uid, name, email, role, department, register_number
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new Error("Student not found. Create the student first.");
    }

    const student = userResult.rows[0];

    if (student.role !== "student") {
      throw new Error("The given account is not a student.");
    }

    const uid = student.uid;

    console.log("Student found:", student.name);
    console.log("Student UID:", uid);

    // 2. Insert or update student profile
    const profileQuery = `
      INSERT INTO student_profiles (
        uid,
        phone,
        date_of_birth,
        degree,
        year,
        semester,
        section,
        profile_image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

      ON CONFLICT (uid)
      DO UPDATE SET
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        degree = EXCLUDED.degree,
        year = EXCLUDED.year,
        semester = EXCLUDED.semester,
        section = EXCLUDED.section,
        profile_image = EXCLUDED.profile_image,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await client.query(profileQuery, [
      uid,
      "9876543210",
      "2005-06-15",
      "B.Tech Artificial Intelligence and Data Science",
      3,
      5,
      "A",
      null,
    ]);

    // 3. Insert or update Father details
    const fatherQuery = `
      INSERT INTO student_guardians (
        student_uid,
        relation,
        name,
        phone,
        email,
        occupation,
        address,
        is_primary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

      ON CONFLICT (student_uid, relation)
      DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        occupation = EXCLUDED.occupation,
        address = EXCLUDED.address,
        is_primary = EXCLUDED.is_primary,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await client.query(fatherQuery, [
      uid,
      "father",
      "Sample Father Name",
      "9876543211",
      "father@example.com",
      "Business",
      "Chennai, Tamil Nadu",
      true,
    ]);

    // 4. Insert or update Mother details
    await client.query(fatherQuery, [
      uid,
      "mother",
      "Sample Mother Name",
      "9876543212",
      "mother@example.com",
      "Teacher",
      "Chennai, Tamil Nadu",
      false,
    ]);

    await client.query("COMMIT");

    console.log("✓ Student profile added successfully.");
    console.log("✓ Father details added successfully.");
    console.log("✓ Mother details added successfully.");

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("✗ Seeding failed:", error.message);

  } finally {
    client.release();
    await pool.end();
  }
}

seedStudentProfile();