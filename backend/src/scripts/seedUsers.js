import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createUserProfile, getUserByEmail } from "../models/userModel.js";
import { pool } from "../database/db.js";
import dotenv from "dotenv";

dotenv.config();

const SAMPLE_USERS = [
  {
    email: "admin@smartcampus.com",
    password: "AdminPass123!",
    name: "System Administrator",
    role: "admin",
    department: "Administration",
    employeeId: "ADM001",
  },
  // {
  //   email: "hod.aids@smartcampus.com",
  //   password: "HodPass123!",
  //   name: "Dr. Rajesh Kumar",
  //   role: "hod",
  //   department: "AI & DS",
  //   employeeId: "EMP101",
  // },
  // {
  //   email: "faculty.aids@smartcampus.com",
  //   password: "FacultyPass123!",
  //   name: "Prof. Anitha M",
  //   role: "faculty",
  //   department: "AI & DS",
  //   employeeId: "EMP201",
  // },
  // {
  //   email: "student.aids@smartcampus.com",
  //   password: "StudentPass123!",
  //   name: "Vetrichelvan S",
  //   role: "student",
  //   department: "AI & DS",
  //   registerNumber: "REC001",
  // },
];

async function seedSampleUsers() {
  console.log("Starting Supabase PostgreSQL sample users seeding process...\n");

  for (const userData of SAMPLE_USERS) {
    try {
      console.log(`Processing user: ${userData.email} (${userData.role})...`);

      const existing = await getUserByEmail(userData.email);
      if (existing) {
        console.log(`  ! User already exists with UID: ${existing.uid}\n`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);
      const uid = `USR-${crypto.randomUUID()}`;

      const profile = await createUserProfile(uid, {
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        department: userData.department,
        employeeId: userData.employeeId || null,
        registerNumber: userData.registerNumber || null,
        createdBy: "system_seeder",
      });

      console.log(`  ✓ Supabase user profile created for ${profile.email} (UID: ${profile.uid})\n`);
    } catch (error) {
      console.error(`  ✗ Error processing ${userData.email}:`, error.message || error);
    }
  }

  console.log("✓ Sample users seeding completed successfully!");
  await pool.end();
  process.exit(0);
}

seedSampleUsers();
