import { pool } from '../database/db.js';
import bcrypt from 'bcryptjs';

async function checkArjunPassword() {
  try {
    const res = await pool.query("SELECT uid, name, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1);", ['arjun001@example.test']);
    if (res.rows.length === 0) {
      console.log("User arjun001@example.test NOT found!");
      process.exit(0);
    }

    const user = res.rows[0];
    console.log("Found user:", user);

    const candidates = [
      "12345678",
      "password123",
      "Password123!",
      "student123",
      "StudentPass123!",
      "Arjun123",
      "ArjunPass123!",
      "password",
      "123456"
    ];

    for (const cand of candidates) {
      const match = await bcrypt.compare(cand, user.password_hash);
      if (match) {
        console.log(`\n✅ MATCH FOUND! Password for ${user.email} is: "${cand}"`);
        process.exit(0);
      }
    }

    console.log("❌ None of the standard candidates matched.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkArjunPassword();
