import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createUserProfile, getUserByEmail } from "../models/userModel.js";
import { pool } from "../database/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * CLI Script to safely seed/bootstrap the initial Admin user in Supabase PostgreSQL.
 * Usage:
 *   node src/scripts/createAdmin.js <email> <password> <name> [department] [employeeId]
 */
async function createAdminAccount() {
  const args = process.argv.slice(2);

  const email = args[0] || process.env.ADMIN_EMAIL || "admin@smartcampus.com";
  const password = args[1] || process.env.ADMIN_PASSWORD || "AdminPass123!";
  const name = args[2] || process.env.ADMIN_NAME || "System Administrator";
  const department = args[3] || process.env.ADMIN_DEPT || "Administration";
  const employeeId = args[4] || process.env.ADMIN_EMP_ID || "ADM001";

  if (!email || !password) {
    console.error("Usage: node src/scripts/createAdmin.js <email> <password> [name] [department] [employeeId]");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("Error: Admin password must be at least 6 characters.");
    process.exit(1);
  }

  try {
    console.log(`Creating Admin user account in Supabase PostgreSQL for: ${email}...`);

    // Check existing user
    const existing = await getUserByEmail(email);
    if (existing) {
      console.log(`✓ Admin user already exists (UID: ${existing.uid}, Role: ${existing.role}).`);
      await pool.end();
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `ADM-${crypto.randomUUID()}`;

    // Create Admin User Profile in Supabase
    const profile = await createUserProfile(uid, {
      name,
      email,
      passwordHash,
      role: "admin",
      department,
      employeeId,
      createdBy: "system_bootstrap",
    });

    console.log("\n✓ Admin profile created in Supabase PostgreSQL successfully!");
    console.log("------------------------------------------------");
    console.log("UID:", profile.uid);
    console.log("Email:", profile.email);
    console.log("Role:", profile.role);
    console.log("Name:", profile.name);
    console.log("------------------------------------------------\n");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin account:", error.message || error);
    await pool.end();
    process.exit(1);
  }
}

createAdminAccount();
