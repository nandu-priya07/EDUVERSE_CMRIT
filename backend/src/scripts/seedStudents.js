
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: false },
});

// Configuration
const DEPARTMENTS = ["AI&DS", "AI&ML"];
const STUDENTS_PER_SEMESTER = 20;
const BATCH_YEAR = 2023;
const EXPECTED_PASSING_YEAR = 2027;

const FIRST_NAMES = [
  "Arun", "Vetri", "Karthik", "Praveen", "Rahul",
  "Sanjay", "Ajay", "Vignesh", "Harish", "Dinesh",
  "Priya", "Divya", "Kavya", "Sneha", "Nithya",
  "Keerthana", "Monisha", "Anitha", "Swetha", "Pavithra"
];

const LAST_NAMES = [
  "Kumar", "Raj", "Ravi", "Krishnan", "Mohan",
  "Prakash", "Selvan", "Murugan", "Anand", "Balan"
];

const OCCUPATIONS = [
  "Teacher", "Business", "Engineer", "Farmer",
  "Government Employee", "Private Employee",
  "Accountant", "Shop Owner", "Driver", "Doctor"
];

const SCHOOLS = [
  "Government Higher Secondary School",
  "St. Mary's Matriculation School",
  "National Higher Secondary School",
  "Velammal Matriculation School",
  "Sri Ramakrishna Higher Secondary School"
];

const COLLEGES = [
  "Rajalakshmi Engineering College",
  "Anna University Affiliated College",
  "Government Engineering College",
  "Sri Krishna College of Engineering"
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
  return "8" + String(crypto.randomInt(100000000, 999999999));
}

function makeName() {
  return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

function getYear(semester) {
  return Math.ceil(semester / 2);
}

function getDepartmentCode(department) {
  return department === "AI&DS" ? "ADS" : "AIML";
}

function getRegisterNumber(department, serial) {
  return `${getDepartmentCode(department)}${BATCH_YEAR}${String(serial).padStart(4, "0")}`;
}

async function seedStudents() {
  const client = await pool.connect();

  try {
    console.log("Starting SmartCampus student seeding...");

    // Hash password once and reuse the same secure hash.
    const passwordHash = await bcrypt.hash("12345678", 12);

    await client.query("BEGIN");

    let totalStudents = 0;

    for (const department of DEPARTMENTS) {
      for (let semester = 1; semester <= 8; semester++) {
        const year = getYear(semester);

        for (let i = 1; i <= STUDENTS_PER_SEMESTER; i++) {
          const serial = (semester - 1) * 20 + i;

          const uid = `seed_${getDepartmentCode(department).toLowerCase()}_${BATCH_YEAR}_${String(serial).padStart(4, "0")}`;

          const registerNumber = getRegisterNumber(department, serial);

          const name = makeName();

          const email = `${uid}@smartcampus.test`;

          const phone = randomPhone();

          const gender = i % 2 === 0 ? "Female" : "Male";

          const dobYear = 2004 + (i % 3);
          const dobMonth = String((i % 12) + 1).padStart(2, "0");
          const dobDay = String((i % 27) + 1).padStart(2, "0");

          const dateOfBirth = `${dobYear}-${dobMonth}-${dobDay}`;

          const quota = i % 2 === 0 ? "Management" : "Counselling";

          const section = i <= 10 ? "A" : "B";

          const isHostel = i % 2 === 0;

          // 1. USERS TABLE
          await client.query(
            `INSERT INTO users (
              uid, name, email, password_hash, role,
              department, register_number, is_active
            )
            VALUES ($1,$2,$3,$4,'student',$5,$6,TRUE)
            ON CONFLICT (uid) DO NOTHING`,
            [
              uid,
              name,
              email,
              passwordHash,
              department,
              registerNumber
            ]
          );

          // 2. STUDENT PROFILES TABLE
          await client.query(
            `INSERT INTO student_profiles (
              uid, name, email, phone, register_number,
              programme, department, batch_year,
              academic_status, year, semester, quota,
              expected_year_of_passing, section,
              aadhar_number, is_hostel,
              date_of_birth, degree, profile_image
            )
            VALUES (
              $1,$2,$3,$4,$5,
              'B.Tech',$6,$7,
              'Active',$8,$9,$10,
              $11,$12,
              NULL,$13,
              $14,'Bachelor of Technology',NULL
            )
            ON CONFLICT (uid) DO NOTHING`,
            [
              uid,
              name,
              email,
              phone,
              registerNumber,
              department,
              String(BATCH_YEAR),
              year,
              semester,
              quota,
              EXPECTED_PASSING_YEAR,
              section,
              isHostel,
              dateOfBirth
            ]
          );

          // 3. STUDENT GUARDIANS TABLE
          const fatherName = makeName();
          const motherName = makeName();
          const guardianName = makeName();

          const guardianRecords = [
            {
              relation: "father",
              name: fatherName,
              phone: randomPhone(),
              email: `${uid}.father@smartcampus.test`,
              occupation: randomItem(OCCUPATIONS),
              income: "500000",
              primary: true
            },
            {
              relation: "mother",
              name: motherName,
              phone: randomPhone(),
              email: `${uid}.mother@smartcampus.test`,
              occupation: randomItem(OCCUPATIONS),
              income: "300000",
              primary: false
            },
            {
              relation: "guardian",
              name: guardianName,
              phone: randomPhone(),
              email: `${uid}.guardian@smartcampus.test`,
              occupation: randomItem(OCCUPATIONS),
              income: "400000",
              primary: false
            }
          ];

          for (const guardian of guardianRecords) {
            await client.query(
              `INSERT INTO student_guardians (
                student_uid, relation, name, phone, email,
                occupation, annual_income, aadhar_number,
                address, is_primary
              )
              VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,NULL,$8,$9
              )
              ON CONFLICT (student_uid, relation) DO NOTHING`,
              [
                uid,
                guardian.relation,
                guardian.name,
                guardian.phone,
                guardian.email,
                guardian.occupation,
                guardian.income,
                "Chennai, Tamil Nadu, India",
                guardian.primary
              ]
            );
          }

          // 4. STUDENT ACADEMIC DETAILS TABLE
          await client.query(
            `INSERT INTO student_academic_details (
              student_uid,
              tenth_marks,
              tenth_percentage,
              tenth_year_of_passing,
              tenth_medium,
              tenth_board,
              tenth_school_name,

              twelfth_marks,
              twelfth_percentage,
              twelfth_year_of_passing,
              twelfth_medium,
              twelfth_board,
              twelfth_school_name,

              diploma_marks,
              diploma_percentage,
              diploma_year_of_passing,
              diploma_institute_name,

              ug_marks,
              ug_programme,
              ug_cgpa,
              ug_percentage,
              ug_year_of_passing,
              ug_college_name
            )
            VALUES (
              $1,
              '450/500',90.00,2020,'English','State Board',$2,
              '540/600',90.00,2022,'English','State Board',$2,
              NULL,NULL,NULL,NULL,
              NULL,'B.Tech',NULL,NULL,NULL,$3
            )
            ON CONFLICT (student_uid) DO NOTHING`,
            [
              uid,
              randomItem(SCHOOLS),
              randomItem(COLLEGES)
            ]
          );

          totalStudents++;
        }

        console.log(
          `${department} | Semester ${semester} | Year ${year} | 20 students processed`
        );
      }
    }

    await client.query("COMMIT");

    console.log("\nStudent seeding completed!");
    console.log(`Total students processed: ${totalStudents}`);
    console.log("Users: 320");
    console.log("Student profiles: 320");
    console.log("Guardian records: 960");
    console.log("Academic details: 320");
    console.log("Default login password: 12345678");

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Seeding failed:", error);

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedStudents();
