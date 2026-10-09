import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedSemesters() {
  const client = await pool.connect();

  try {
    console.log("Starting database seeding for Semesters...\n");
    await client.query("BEGIN");

    // Fetch existing departments
    const deptRes = await client.query(`SELECT id, code, name FROM departments ORDER BY code;`);

    if (deptRes.rows.length === 0) {
      console.log("No departments found. Please run `npm run seed:courses` first to populate departments.");
      await client.query("ROLLBACK");
      return;
    }

    const academicYears = [
      {
        yearLabel: "2024-2025",
        statusOdd: "completed",
        statusEven: "completed",
      },
      {
        yearLabel: "2025-2026",
        statusOdd: "active",
        statusEven: "upcoming",
      },
    ];

    const semesterUpsertQuery = `
      INSERT INTO semesters (
        department_id, semester_number, year, academic_year, name, status, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (department_id, academic_year, semester_number) DO UPDATE SET
        year = EXCLUDED.year,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, (xmin = 0) AS is_new;
    `;

    let totalInserted = 0;
    let totalUpdated = 0;

    for (const dept of deptRes.rows) {
      console.log(`Processing semesters for Department: [${dept.code}] ${dept.name}`);

      for (const ay of academicYears) {
        for (let semNum = 1; semNum <= 8; semNum++) {
          const yearNum = Math.ceil(semNum / 2);
          const name = `Semester ${semNum}`;
          const isOdd = semNum % 2 !== 0;
          const status = isOdd ? ay.statusOdd : ay.statusEven;

          const res = await client.query(semesterUpsertQuery, [
            dept.id,
            semNum,
            yearNum,
            ay.yearLabel,
            name,
            status,
          ]);

          const isNew = res.rows[0].is_new;
          if (isNew) {
            totalInserted++;
          } else {
            totalUpdated++;
          }
        }
      }
      console.log(`   └─ 16 semester records (Sem 1–8 for 2024-2025 & 2025-2026) verified.`);
    }

    await client.query("COMMIT");

    console.log("\n==================================================");
    console.log("  SEMESTER SEEDING COMPLETE SUMMARY");
    console.log("==================================================");
    console.log(`  Departments Processed: ${deptRes.rows.length}`);
    console.log(`  Semesters Inserted: ${totalInserted}`);
    console.log(`  Semesters Updated/Existing: ${totalUpdated}`);
    console.log(`  Total Semester Records: ${totalInserted + totalUpdated}`);
    console.log("==================================================\n");

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("✗ Semester seeding failed:", error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSemesters();
