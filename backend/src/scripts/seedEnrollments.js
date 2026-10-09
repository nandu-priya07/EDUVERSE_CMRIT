import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SAMPLE_STUDENTS = [
  {
    email: "student.aids@smartcampus.com",
    name: "Vetrichelvan S",
    departmentCode: "AIDS",
    departmentName: "Artificial Intelligence and Data Science",
    registerNumber: "REC001",
    year: 3,
    semester: 5,
    section: "A",
  },
  {
    email: "student.aiml@smartcampus.com",
    name: "Kavya R",
    departmentCode: "AIML",
    departmentName: "Artificial Intelligence and Machine Learning",
    registerNumber: "REC002",
    year: 3,
    semester: 5,
    section: "A",
  },
  {
    email: "student.cse@smartcampus.com",
    name: "Arun Kumar",
    departmentCode: "CSE",
    departmentName: "Computer Science and Engineering",
    registerNumber: "REC003",
    year: 3,
    semester: 5,
    section: "B",
  },
  {
    email: "student.ece@smartcampus.com",
    name: "Priya Dharshini",
    departmentCode: "ECE",
    departmentName: "Electronics and Communication Engineering",
    registerNumber: "REC004",
    year: 2,
    semester: 3,
    section: "A",
  },
  {
    email: "student.eee@smartcampus.com",
    name: "Karthik M",
    departmentCode: "EEE",
    departmentName: "Electrical and Electronics Engineering",
    registerNumber: "REC005",
    year: 2,
    semester: 3,
    section: "A",
  },
];

async function seedCourseEnrollments() {
  const client = await pool.connect();

  try {
    console.log("Starting Course Enrollments Seeding...\n");
    await client.query("BEGIN");

    // 1. Fetch departments
    const deptRes = await client.query(`SELECT id, code, name FROM departments;`);
    if (deptRes.rows.length === 0) {
      console.log("No departments found. Please run `npm run seed:courses` first.");
      await client.query("ROLLBACK");
      return;
    }

    const deptMap = {};
    deptRes.rows.forEach((d) => {
      deptMap[d.code] = d.id;
    });

    const defaultPasswordHash = await bcrypt.hash("StudentPass123!", 10);
    let enrollmentsInserted = 0;
    let enrollmentsUpdated = 0;

    for (const studentData of SAMPLE_STUDENTS) {
      const deptId = deptMap[studentData.departmentCode];
      if (!deptId) {
        console.warn(`Department [${studentData.departmentCode}] not found. Skipping ${studentData.email}.`);
        continue;
      }

      // Ensure user exists in `users`
      const userUpsertQuery = `
        INSERT INTO users (
          uid, name, email, password_hash, role, department, register_number, is_active, created_by, updated_at
        )
        VALUES (
          $1, $2, $3, $4, 'student', $5, $6, TRUE, 'system_seeder', CURRENT_TIMESTAMP
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          department = EXCLUDED.department,
          register_number = EXCLUDED.register_number,
          updated_at = CURRENT_TIMESTAMP
        RETURNING uid;
      `;

      const fallbackUid = `USR-STD-${studentData.registerNumber}`;
      const userRes = await client.query(userUpsertQuery, [
        fallbackUid,
        studentData.name,
        studentData.email,
        defaultPasswordHash,
        studentData.departmentName,
        studentData.registerNumber,
      ]);

      const studentUid = userRes.rows[0].uid;

      // Ensure student profile exists in `student_profiles`
      const profileUpsertQuery = `
        INSERT INTO student_profiles (
          uid, name, email, degree, year, semester, section, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          degree = EXCLUDED.degree,
          year = EXCLUDED.year,
          semester = EXCLUDED.semester,
          section = EXCLUDED.section,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await client.query(profileUpsertQuery, [
        studentUid,
        studentData.name,
        studentData.email,
        `B.Tech ${studentData.departmentName}`,
        studentData.year,
        studentData.semester,
        studentData.section,
      ]);

      console.log(`✓ Student verified: ${studentData.name} (${studentData.email}) in ${studentData.departmentCode}`);

      // Fetch all courses for this student's department up to their current semester
      const coursesRes = await client.query(
        `SELECT id, code, name, sem, year FROM courses WHERE department_id = $1 AND sem <= $2 ORDER BY sem;`,
        [deptId, studentData.semester]
      );

      // Fetch semester_courses for this student's department
      const semCoursesRes = await client.query(
        `SELECT id, course_id, sem, year FROM semester_courses WHERE department_id = $1;`,
        [deptId]
      );

      const semCourseMap = {};
      semCoursesRes.rows.forEach((sc) => {
        semCourseMap[sc.course_id] = sc.id;
      });

      const enrollmentUpsertQuery = `
        INSERT INTO course_enrollments (
          student_uid, course_id, enrollment_date, status, updated_at
        )
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (student_uid, course_id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, (xmin = 0) AS is_new;
      `;

      let studentEnrollmentCount = 0;

      for (const course of coursesRes.rows) {
        // If course.sem < studentData.semester -> 'completed'
        // If course.sem === studentData.semester -> 'enrolled'
        const status = course.sem < studentData.semester ? "completed" : "enrolled";

        const enrollRes = await client.query(enrollmentUpsertQuery, [
          studentUid,
          course.id,
          status,
        ]);

        const isNew = enrollRes.rows[0].is_new;
        if (isNew) {
          enrollmentsInserted++;
        } else {
          enrollmentsUpdated++;
        }
        studentEnrollmentCount++;
      }

      console.log(`   └─ Enrolled in ${studentEnrollmentCount} courses (Active Sem ${studentData.semester} & Past Semesters).`);
    }

    await client.query("COMMIT");

    console.log("\n==================================================");
    console.log("  COURSE ENROLLMENT SEEDING SUMMARY");
    console.log("==================================================");
    console.log(`  Students Processed: ${SAMPLE_STUDENTS.length}`);
    console.log(`  Enrollments Inserted: ${enrollmentsInserted}`);
    console.log(`  Enrollments Updated/Existing: ${enrollmentsUpdated}`);
    console.log(`  Total Enrollment Records: ${enrollmentsInserted + enrollmentsUpdated}`);
    console.log("==================================================\n");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("✗ Course enrollment seeding failed:", error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedCourseEnrollments();
