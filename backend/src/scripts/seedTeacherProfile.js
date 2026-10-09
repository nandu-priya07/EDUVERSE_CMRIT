import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedTeacherProfile() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Finding existing teacher/faculty users in database...");

    // 1. Fetch existing faculty / teacher / hod users from `users` table
    const userResult = await client.query(
      `SELECT uid, name, email, role, department, employee_id
       FROM users
       WHERE role IN ('faculty', 'teacher', 'hod')`
    );

    if (userResult.rows.length === 0) {
      console.log("No existing teacher user found in `users` table. Inserting default faculty user...");
      
      const insertUserQuery = `
        INSERT INTO users (
          uid, name, email, password_hash, role, department, employee_id, is_active, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name
        RETURNING uid, name, email, role, department, employee_id;
      `;

      const newUserRes = await client.query(insertUserQuery, [
        "USR-FACULTY-001",
        "Prof. Anitha M",
        "faculty.aids@smartcampus.com",
        "$2a$10$wT0oA54Vd8p.D7zK1kE9o.J3eF.1e6H1Q.3Qv.1e6H1Q.3Qv.1e6", // Sample hash
        "faculty",
        "AI & DS",
        "EMP201",
        true,
        "system_seeder"
      ]);

      userResult.rows.push(newUserRes.rows[0]);
    }

    const teacherQuery = `
      INSERT INTO teacher_profiles (
        uid,
        full_name,
        phone,
        alternate_phone,
        date_of_birth,
        gender,
        address,
        city,
        state,
        pincode,
        country,
        employee_id,
        designation,
        department,
        qualification,
        specialization,
        experience_years,
        joining_date,
        employment_type,
        office_location,
        profile_image,
        bio,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)

      ON CONFLICT (uid)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        alternate_phone = EXCLUDED.alternate_phone,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        country = EXCLUDED.country,
        employee_id = EXCLUDED.employee_id,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        qualification = EXCLUDED.qualification,
        specialization = EXCLUDED.specialization,
        experience_years = EXCLUDED.experience_years,
        joining_date = EXCLUDED.joining_date,
        employment_type = EXCLUDED.employment_type,
        office_location = EXCLUDED.office_location,
        profile_image = EXCLUDED.profile_image,
        bio = EXCLUDED.bio,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        emergency_contact_relation = EXCLUDED.emergency_contact_relation,
        updated_at = CURRENT_TIMESTAMP;
    `;

    for (const teacher of userResult.rows) {
      console.log(`Seeding profile for teacher: ${teacher.name} (${teacher.email}, UID: ${teacher.uid})`);

      const empId = teacher.employee_id || (teacher.role === "hod" ? "EMP101" : "EMP201");
      const designation = teacher.role === "hod" ? "Head of Department" : "Assistant Professor";

      await client.query(teacherQuery, [
        teacher.uid,
        teacher.name,
        "9876543220",
        "9876543221",
        "1988-04-12",
        "Female",
        "123 Academic Block, Campus View Road",
        "Chennai",
        "Tamil Nadu",
        "600028",
        "India",
        empId,
        designation,
        teacher.department || "AI & DS",
        "Ph.D. in Computer Science & Engineering",
        "Machine Learning, Artificial Intelligence, Deep Learning",
        8.5,
        "2018-07-15",
        "Full-Time",
        "Room 304, IT Block, SmartCampus",
        null,
        "Passionate educator and researcher with 8+ years of experience in Artificial Intelligence and Data Science.",
        "Dr. Ramesh M",
        "9876543229",
        "Spouse",
      ]);

      console.log(`✓ Teacher profile sample details added for ${teacher.name}`);
    }

    await client.query("COMMIT");
    console.log("\n✓ All sample teacher profile details seeded successfully.");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("✗ Seeding teacher profile failed:", error.message || error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTeacherProfile();
