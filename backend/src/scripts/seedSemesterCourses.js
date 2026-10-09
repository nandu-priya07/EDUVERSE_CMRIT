import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedSemesterCourses() {
  const client = await pool.connect();

  try {
    console.log("Starting Seeding for semester_courses...\n");
    await client.query("BEGIN");

    // 1. Fetch departments
    const deptRes = await client.query(`SELECT id, code, name FROM departments;`);
    if (deptRes.rows.length === 0) {
      console.error("No departments found. Please run `npm run seed:courses` first.");
      await client.query("ROLLBACK");
      return;
    }

    const deptMap = {};
    deptRes.rows.forEach((d) => {
      deptMap[d.code] = d.id;
    });

    // 2. Fetch all courses
    const coursesRes = await client.query(
      `SELECT id, code, name, department_id, sem, year FROM courses;`
    );

    if (coursesRes.rows.length === 0) {
      console.error("No courses found. Please run `npm run seed:courses` first.");
      await client.query("ROLLBACK");
      return;
    }

    const academicYear = "2026-2027";
    let insertedCount = 0;
    let existingCount = 0;

    const upsertQuery = `
      INSERT INTO semester_courses (
        department_id, course_id, year, sem, academic_year, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (department_id, course_id, year, sem, academic_year) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, (xmin = 0) AS is_new;
    `;

    // Map each course to its primary department and semester
    for (const course of coursesRes.rows) {
      const res = await client.query(upsertQuery, [
        course.department_id,
        course.id,
        course.year,
        course.sem,
        academicYear,
      ]);

      if (res.rows[0].is_new) {
        insertedCount++;
      } else {
        existingCount++;
      }
    }

    // Additional inter-departmental foundation course assignments
    // 1. Assign CS101 (C Programming) to AIML and AIDS for Sem 1
    const cs101Course = coursesRes.rows.find((c) => c.code === "CS101");
    if (cs101Course) {
      const targetDepts = ["AIML", "AIDS"];
      for (const deptCode of targetDepts) {
        const targetDeptId = deptMap[deptCode];
        if (targetDeptId) {
          const res = await client.query(upsertQuery, [
            targetDeptId,
            cs101Course.id,
            1, // Year 1
            1, // Sem 1
            academicYear,
          ]);
          if (res.rows[0].is_new) insertedCount++;
          else existingCount++;
        }
      }
    }

    // 2. Assign CS102 (OOP in C++) to AIML for Sem 2
    const cs102Course = coursesRes.rows.find((c) => c.code === "CS102");
    if (cs102Course && deptMap["AIML"]) {
      const res = await client.query(upsertQuery, [
        deptMap["AIML"],
        cs102Course.id,
        1, // Year 1
        2, // Sem 2
        academicYear,
      ]);
      if (res.rows[0].is_new) insertedCount++;
      else existingCount++;
    }

    await client.query("COMMIT");

    console.log("✓ Seeding transaction committed successfully.\n");

    // ==================================================
    // 5. VALIDATION & REPORTING
    // ==================================================
    console.log("==================================================");
    console.log("  SEMESTER-COURSES VALIDATION REPORT");
    console.log("==================================================");

    // Total mappings
    const totalMappingsRes = await client.query(`SELECT COUNT(*) FROM semester_courses;`);
    const totalMappings = parseInt(totalMappingsRes.rows[0].count, 10);
    console.log(`Total Semester-Course Mappings: ${totalMappings}`);
    console.log(`Inserted in this run: ${insertedCount} | Existing/Updated: ${existingCount}\n`);

    // Mappings grouped by department, year, semester
    const groupedRes = await client.query(`
      SELECT d.code AS department, sc.year, sc.sem, COUNT(sc.id) AS course_count
      FROM semester_courses sc
      JOIN departments d ON sc.department_id = d.id
      GROUP BY d.code, sc.year, sc.sem
      ORDER BY d.code, sc.year, sc.sem;
    `);

    console.log("Course Counts Grouped by Department, Year & Semester:");
    console.table(groupedRes.rows);

    // Verify foreign key integrity
    const fkCheckRes = await client.query(`
      SELECT sc.id
      FROM semester_courses sc
      LEFT JOIN departments d ON sc.department_id = d.id
      LEFT JOIN courses c ON sc.course_id = c.id
      WHERE d.id IS NULL OR c.id IS NULL;
    `);

    if (fkCheckRes.rows.length === 0) {
      console.log("✓ Foreign Key Verification Passed: All foreign keys reference valid departments and courses.");
    } else {
      console.error(`✗ Foreign Key Verification Failed: ${fkCheckRes.rows.length} invalid foreign keys found.`);
    }

    // Verify no duplicate mappings exist
    const duplicateCheckRes = await client.query(`
      SELECT department_id, course_id, year, sem, academic_year, COUNT(*)
      FROM semester_courses
      GROUP BY department_id, course_id, year, sem, academic_year
      HAVING COUNT(*) > 1;
    `);

    if (duplicateCheckRes.rows.length === 0) {
      console.log("✓ Duplicate Mapping Verification Passed: No duplicate semester-course mappings found.");
    } else {
      console.error(`✗ Duplicate Mapping Verification Failed: ${duplicateCheckRes.rows.length} duplicate entries found.`);
    }

    // Report departments or semesters with no assigned courses
    console.log("\nChecking for Empty Semesters across Departments (Semesters 1 - 8):");
    let missingFound = false;

    for (const d of deptRes.rows) {
      for (let sem = 1; sem <= 8; sem++) {
        const found = groupedRes.rows.find(
          (r) => r.department === d.code && parseInt(r.sem, 10) === sem
        );
        if (!found) {
          console.warn(`  ! Department [${d.code}] has no assigned courses for Semester ${sem}.`);
          missingFound = true;
        }
      }
    }

    if (!missingFound) {
      console.log("✓ All semesters (1–8) across all departments have assigned courses!");
    }

    console.log("\n==================================================\n");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("✗ Seeding semester_courses failed:", error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSemesterCourses();
