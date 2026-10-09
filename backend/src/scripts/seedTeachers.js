import { pool, initDatabase } from "../database/db.js";
import bcrypt from "bcryptjs";

const teachersToInsert = [
  {
    name: "Dr. K. Anand",
    email: "anand.teacher@smartcampus.edu",
    password: "Password@123",
    employee_id: "EMP-T-1001",
    department: "AI&DS",
    designation: "Professor & Head",
    qualification: "Ph.D. in Computer Science",
    specialization: "Artificial Intelligence & Distributed Systems",
    phone: "9840123451",
    joining_date: "2018-06-15",
    experience_years: 12.5,
    office_location: "Block A - Room 302",
    employment_type: "Full-Time"
  },
  {
    name: "Dr. S. Meenakshi",
    email: "meenakshi.teacher@smartcampus.edu",
    password: "Password@123",
    employee_id: "EMP-T-1002",
    department: "AI&DS",
    designation: "Associate Professor",
    qualification: "Ph.D. in Data Analytics",
    specialization: "Big Data & Machine Learning",
    phone: "9840123452",
    joining_date: "2019-08-20",
    experience_years: 9.0,
    office_location: "Block B - Room 204",
    employment_type: "Full-Time"
  },
  {
    name: "Prof. R. Vignesh",
    email: "vignesh.teacher@smartcampus.edu",
    password: "Password@123",
    employee_id: "EMP-T-1003",
    department: "AI&ML",
    designation: "Assistant Professor",
    qualification: "M.E. in Software Engineering",
    specialization: "Cloud Computing & Cybersecurity",
    phone: "9840123453",
    joining_date: "2021-01-10",
    experience_years: 5.5,
    office_location: "Block A - Room 108",
    employment_type: "Full-Time"
  },
  {
    name: "Dr. M. Lakshmi",
    email: "lakshmi.teacher@smartcampus.edu",
    password: "Password@123",
    employee_id: "EMP-T-1004",
    department: "AI&ML",
    designation: "Professor",
    qualification: "Ph.D. in VLSI Design",
    specialization: "Embedded Systems & Signal Processing",
    phone: "9840123454",
    joining_date: "2017-04-01",
    experience_years: 14.0,
    office_location: "Block C - Room 401",
    employment_type: "Full-Time"
  },
  {
    name: "Prof. G. Suresh",
    email: "suresh.teacher@smartcampus.edu",
    password: "Password@123",
    employee_id: "EMP-T-1005",
    department: "AI&DS",
    designation: "Assistant Professor (Sr. Gr.)",
    qualification: "M.Tech in Power Systems",
    specialization: "Smart Grids & Renewable Energy",
    phone: "9840123455",
    joining_date: "2020-07-15",
    experience_years: 7.0,
    office_location: "Block C - Room 102",
    employment_type: "Full-Time"
  }
];

async function seedTeachers() {
  await initDatabase();
  const client = await pool.connect();

  try {
    console.log("Starting insertion of 5 teacher profiles...");
    const hashedPassword = await bcrypt.hash("Password@123", 10);

    for (const teacher of teachersToInsert) {
      const uid = `usr_teacher_${teacher.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

      // Insert or Update into users table
      await client.query(
        `
        INSERT INTO users (uid, name, email, password_hash, role, department, employee_id, is_active)
        VALUES ($1, $2, $3, $4, 'teacher', $5, $6, TRUE)
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          department = EXCLUDED.department,
          employee_id = EXCLUDED.employee_id,
          updated_at = CURRENT_TIMESTAMP;
        `,
        [uid, teacher.name, teacher.email, hashedPassword, teacher.department, teacher.employee_id]
      );

      // Insert or Update into teacher_profiles table
      await client.query(
        `
        INSERT INTO teacher_profiles (
          uid, name, email, full_name, phone, employee_id, designation,
          department, qualification, specialization, experience_years,
          joining_date, employment_type, office_location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          employee_id = EXCLUDED.employee_id,
          designation = EXCLUDED.designation,
          department = EXCLUDED.department,
          qualification = EXCLUDED.qualification,
          specialization = EXCLUDED.specialization,
          experience_years = EXCLUDED.experience_years,
          joining_date = EXCLUDED.joining_date,
          employment_type = EXCLUDED.employment_type,
          office_location = EXCLUDED.office_location,
          updated_at = CURRENT_TIMESTAMP;
        `,
        [
          uid,
          teacher.name,
          teacher.email,
          teacher.name,
          teacher.phone,
          teacher.employee_id,
          teacher.designation,
          teacher.department,
          teacher.qualification,
          teacher.specialization,
          teacher.experience_years,
          teacher.joining_date,
          teacher.employment_type,
          teacher.office_location
        ]
      );

      console.log(`✓ Inserted teacher profile for: ${teacher.name} (${teacher.employee_id})`);
    }

    console.log("Successfully inserted 5 teacher profiles!");
  } catch (error) {
    console.error("Failed to seed teacher profiles:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedTeachers();
