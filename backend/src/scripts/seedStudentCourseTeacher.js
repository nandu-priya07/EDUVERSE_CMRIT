import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Ensure faculty members exist for all 5 departments for realistic mapping
const SAMPLE_FACULTY = [
  {
    email: "hod.aids@smartcampus.com",
    name: "Dr. Rajesh Kumar",
    role: "hod",
    department: "AI & DS",
    deptCode: "AIDS",
    employeeId: "EMP101",
  },
  {
    email: "faculty.aids@smartcampus.com",
    name: "Prof. Anitha M",
    role: "faculty",
    department: "AI & DS",
    deptCode: "AIDS",
    employeeId: "EMP201",
  },
  {
    email: "faculty.aiml@smartcampus.com",
    name: "Dr. Sanjay Sharma",
    role: "faculty",
    department: "Artificial Intelligence and Machine Learning",
    deptCode: "AIML",
    employeeId: "EMP202",
  },
  {
    email: "faculty.cse@smartcampus.com",
    name: "Dr. Meenakshi S",
    role: "faculty",
    department: "Computer Science and Engineering",
    deptCode: "CSE",
    employeeId: "EMP203",
  },
  {
    email: "faculty.ece@smartcampus.com",
    name: "Prof. Vikram Ramakrishnan",
    role: "faculty",
    department: "Electronics and Communication Engineering",
    deptCode: "ECE",
    employeeId: "EMP204",
  },
  {
    email: "faculty.eee@smartcampus.com",
    name: "Dr. Ramesh Babu",
    role: "faculty",
    department: "Electrical and Electronics Engineering",
    deptCode: "EEE",
    employeeId: "EMP205",
  },
];

async function seedStudentCourseTeacher() {
  const client = await pool.connect();

  try {
    console.log("Starting Seeding for student_course_teacher...\n");

    // 1. Ensure faculty accounts exist in users & teacher_profiles (outside long lock)
    const defaultPassHash = await bcrypt.hash("FacultyPass123!", 10);
    const facultyMap = {}; // deptCode -> array of faculty uids

    for (const fac of SAMPLE_FACULTY) {
      const userUpsert = `
        INSERT INTO users (
          uid, name, email, password_hash, role, department, employee_id, is_active, created_by, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, TRUE, 'system_seeder', CURRENT_TIMESTAMP
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          department = EXCLUDED.department,
          employee_id = EXCLUDED.employee_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING uid;
      `;

      const fallbackUid = `USR-FAC-${fac.employeeId}`;
      const userRes = await client.query(userUpsert, [
        fallbackUid,
        fac.name,
        fac.email,
        defaultPassHash,
        fac.role,
        fac.department,
        fac.employeeId,
      ]);

      const facUid = userRes.rows[0].uid;

      // Upsert teacher_profiles
      const profUpsert = `
        INSERT INTO teacher_profiles (
          uid, name, email, full_name, employee_id, department, updated_at
        )
        VALUES ($1, $2, $3, $2, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          employee_id = EXCLUDED.employee_id,
          department = EXCLUDED.department,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await client.query(profUpsert, [facUid, fac.name, fac.email, fac.employeeId, fac.department]);

      if (!facultyMap[fac.deptCode]) {
        facultyMap[fac.deptCode] = [];
      }
      facultyMap[fac.deptCode].push(facUid);
    }

    // Now start transaction for student_course_teacher enrollments
    await client.query("BEGIN");

    // 2. Fetch active students with profile information
    const studentQuery = `
      SELECT u.uid, u.name, u.email, u.department, sp.degree, sp.year, sp.semester, d.code as dept_code
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON LOWER(u.department) = LOWER(d.name) OR LOWER(u.department) = LOWER(d.code) OR (d.code = 'AIDS' AND u.department = 'AI & DS')
      WHERE u.role = 'student' AND u.is_active = TRUE;
    `;
    const studentRes = await client.query(studentQuery);

    if (studentRes.rows.length === 0) {
      console.warn("! No active students found in database. Please run `npm run seed:enrollments` or `npm run seed-users` first.");
      await client.query("ROLLBACK");
      return;
    }

    // 3. Fetch all courses with department code
    const courseQuery = `
      SELECT c.id as course_id, c.code as course_code, c.name as course_name, c.sem, c.year, d.id as dept_id, d.code as dept_code, d.name as dept_name
      FROM courses c
      JOIN departments d ON c.department_id = d.id;
    `;
    const courseRes = await client.query(courseQuery);

    if (courseRes.rows.length === 0) {
      console.warn("! No courses found in database. Please run `npm run seed:courses` first.");
      await client.query("ROLLBACK");
      return;
    }

    const academicYear = "2026-2027";
    let insertedCount = 0;
    let existingCount = 0;

    const sctUpsertQuery = `
      INSERT INTO student_course_teacher (
        student_uid, course_id, teacher_uid, academic_year, enrollment_status, enrolled_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (student_uid, course_id, academic_year) DO NOTHING
      RETURNING id;
    `;

    // Assign faculty consistently per course ID
    const courseTeacherMap = {};
    for (const c of courseRes.rows) {
      const deptFacultyList = facultyMap[c.dept_code] || facultyMap["AIDS"];
      // Deterministic choice based on course_id character codes
      const charCodeSum = c.course_id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const chosenTeacherUid = deptFacultyList[charCodeSum % deptFacultyList.length];
      courseTeacherMap[c.course_id] = chosenTeacherUid;
    }

    // 4. Enroll students into relevant courses
    for (const student of studentRes.rows) {
      const studentDeptCode = student.dept_code || "AIDS";
      const studentSem = student.semester || 5;

      // Filter courses matching student's department and semester/year
      const matchingCourses = courseRes.rows.filter(
        (c) => c.dept_code === studentDeptCode && c.sem <= studentSem
      );

      for (const course of matchingCourses) {
        const teacherUid = courseTeacherMap[course.course_id];
        const status = course.sem < studentSem ? "completed" : "enrolled";

        const res = await client.query(sctUpsertQuery, [
          student.uid,
          course.course_id,
          teacherUid,
          academicYear,
          status,
        ]);

        if (res.rows.length > 0) {
          insertedCount++;
        } else {
          existingCount++;
        }
      }
    }

    await client.query("COMMIT");
    console.log("✓ Seeding transaction committed successfully.\n");

    // ==================================================
    // 5. VALIDATION REPORT
    // ==================================================
    console.log("==================================================");
    console.log("  STUDENT-COURSE-TEACHER VALIDATION REPORT");
    console.log("==================================================");

    // Total records
    const totalCountRes = await client.query(`SELECT COUNT(*) FROM student_course_teacher;`);
    const totalCount = parseInt(totalCountRes.rows[0].count, 10);
    console.log(`Total Student-Course-Teacher Records: ${totalCount}`);
    console.log(`Inserted in this run: ${insertedCount} | Already existing: ${existingCount}\n`);

    // Grouped by Department
    const deptGroupedRes = await client.query(`
      SELECT d.code AS department, COUNT(sct.id) AS enrollment_count
      FROM student_course_teacher sct
      JOIN courses c ON sct.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      GROUP BY d.code
      ORDER BY d.code;
    `);
    console.log("Enrollment Count Grouped by Department:");
    console.table(deptGroupedRes.rows);

    // Grouped by Course (Top 10)
    const courseGroupedRes = await client.query(`
      SELECT c.code AS course_code, c.name AS course_name, COUNT(sct.id) AS enrollment_count
      FROM student_course_teacher sct
      JOIN courses c ON sct.course_id = c.id
      GROUP BY c.code, c.name
      ORDER BY enrollment_count DESC, c.code
      LIMIT 10;
    `);
    console.log("Enrollment Count Grouped by Course (Top 10):");
    console.table(courseGroupedRes.rows);

    // Grouped by Teacher
    const teacherGroupedRes = await client.query(`
      SELECT u.name AS teacher_name, u.email AS teacher_email, u.department, COUNT(sct.id) AS student_count
      FROM student_course_teacher sct
      JOIN users u ON sct.teacher_uid = u.uid
      GROUP BY u.name, u.email, u.department
      ORDER BY student_count DESC;
    `);
    console.log("Enrollment Count Grouped by Assigned Teacher:");
    console.table(teacherGroupedRes.rows);

    // Grouped by Academic Year
    const ayGroupedRes = await client.query(`
      SELECT academic_year, enrollment_status, COUNT(*) AS total_records
      FROM student_course_teacher
      GROUP BY academic_year, enrollment_status
      ORDER BY academic_year;
    `);
    console.log("Enrollment Count Grouped by Academic Year & Status:");
    console.table(ayGroupedRes.rows);

    // Students without course assignments
    const unassignedStudentsRes = await client.query(`
      SELECT u.uid, u.name, u.email, u.department
      FROM users u
      LEFT JOIN student_course_teacher sct ON u.uid = sct.student_uid
      WHERE u.role = 'student' AND u.is_active = TRUE AND sct.id IS NULL;
    `);

    if (unassignedStudentsRes.rows.length === 0) {
      console.log("✓ All active students have assigned courses!");
    } else {
      console.warn(`! Warning: ${unassignedStudentsRes.rows.length} students have no course assignments.`);
      console.table(unassignedStudentsRes.rows);
    }

    // Invalid Foreign Key Reference Check
    const fkCheckRes = await client.query(`
      SELECT sct.id
      FROM student_course_teacher sct
      LEFT JOIN users s ON sct.student_uid = s.uid
      LEFT JOIN courses c ON sct.course_id = c.id
      LEFT JOIN users t ON sct.teacher_uid = t.uid
      WHERE s.uid IS NULL OR c.id IS NULL OR t.uid IS NULL;
    `);

    if (fkCheckRes.rows.length === 0) {
      console.log("✓ Foreign Key Verification Passed: All student, course, and teacher references are valid.");
    } else {
      console.error(`✗ Foreign Key Verification Failed: ${fkCheckRes.rows.length} invalid references found.`);
    }

    // Duplicate Check
    const duplicateCheckRes = await client.query(`
      SELECT student_uid, course_id, academic_year, COUNT(*)
      FROM student_course_teacher
      GROUP BY student_uid, course_id, academic_year
      HAVING COUNT(*) > 1;
    `);

    if (duplicateCheckRes.rows.length === 0) {
      console.log("✓ Duplicate Check Passed: No duplicate student-course-academic_year enrollments exist.");
    } else {
      console.error(`✗ Duplicate Check Failed: ${duplicateCheckRes.rows.length} duplicate entries found.`);
    }

    console.log("\n==================================================\n");

  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("✗ Seeding student_course_teacher failed:", error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedStudentCourseTeacher();
