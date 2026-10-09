import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

/**
 * Format DB date to YYYY-MM-DD string
 */
function formatDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string") return dateVal.split("T")[0];
  if (dateVal instanceof Date) return dateVal.toISOString().split("T")[0];
  return String(dateVal);
}

/**
 * GET /api/student/profile
 * Fetch complete student profile including extended profile & guardians
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const uid = req.user.uid;

    // 1. Fetch user basic info
    const userQuery = `
      SELECT uid, name, email, role, department, register_number, is_active, created_at
      FROM users
      WHERE uid = $1;
    `;
    const userRes = await pool.query(userQuery, [uid]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const u = userRes.rows[0];

    // 2. Fetch extended student profile
    const profileQuery = `
      SELECT name, email, phone, date_of_birth, degree, year, semester, section, profile_image
      FROM student_profiles
      WHERE uid = $1;
    `;
    const profileRes = await pool.query(profileQuery, [uid]);
    const p = profileRes.rows[0] || {};

    // 3. Fetch guardians
    const guardianQuery = `
      SELECT relation, name, phone, email, occupation, address, is_primary
      FROM student_guardians
      WHERE student_uid = $1;
    `;
    const guardianRes = await pool.query(guardianQuery, [uid]);

    const guardians = {};
    guardianRes.rows.forEach((g) => {
      guardians[g.relation] = {
        name: g.name || "",
        phone: g.phone || "",
        email: g.email || "",
        occupation: g.occupation || "",
        address: g.address || "",
        isPrimary: g.is_primary || false,
      };
    });

    const fullProfile = {
      uid: u.uid,
      name: p.name || u.name,
      email: p.email || u.email,
      role: u.role,
      department: u.department || null,
      registerNumber: u.register_number || null,
      phone: p.phone || null,
      dateOfBirth: formatDate(p.date_of_birth),
      degree: p.degree || null,
      year: p.year || null,
      semester: p.semester || null,
      section: p.section || null,
      profileImage: p.profile_image || null,
      father: guardians.father || null,
      mother: guardians.mother || null,
      guardian: guardians.guardian || null,
    };

    return res.status(200).json({
      success: true,
      profile: fullProfile,
    });
  } catch (error) {
    console.error("GET Student Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching student profile.",
    });
  }
});

/**
 * PUT /api/student/profile
 * Update student profile details
 */
router.put("/", authenticate, async (req, res) => {
  const client = await pool.connect();

  try {
    const uid = req.user.uid;
    const userEmail = req.user.email;
    const {
      name,
      phone,
      dateOfBirth,
      degree,
      year,
      semester,
      section,
      fatherName,
      fatherPhone,
      fatherEmail,
      fatherOccupation,
      fatherAddress,
      motherName,
      motherPhone,
      motherEmail,
      motherOccupation,
      motherAddress,
    } = req.body;

    await client.query("BEGIN");

    // 1. Update user name if provided
    if (name) {
      await client.query(
        `UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2`,
        [name, uid]
      );
    }

    // 2. Upsert student_profiles including name and email
    const updatedName = name || req.user.name;
    const profileUpsert = `
      INSERT INTO student_profiles (
        uid, name, email, phone, date_of_birth, degree, year, semester, section, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (uid) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, student_profiles.phone),
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, student_profiles.date_of_birth),
        degree = COALESCE(EXCLUDED.degree, student_profiles.degree),
        year = COALESCE(EXCLUDED.year, student_profiles.year),
        semester = COALESCE(EXCLUDED.semester, student_profiles.semester),
        section = COALESCE(EXCLUDED.section, student_profiles.section),
        updated_at = CURRENT_TIMESTAMP;
    `;

    await client.query(profileUpsert, [
      uid,
      updatedName || null,
      userEmail || null,
      phone || null,
      dateOfBirth || null,
      degree || null,
      year ? parseInt(year, 10) : null,
      semester ? parseInt(semester, 10) : null,
      section || null,
    ]);

    // 3. Upsert Father guardian if provided
    if (fatherName !== undefined) {
      const fatherUpsert = `
        INSERT INTO student_guardians (
          student_uid, relation, name, phone, email, occupation, address, is_primary, updated_at
        )
        VALUES ($1, 'father', $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT (student_uid, relation) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          occupation = EXCLUDED.occupation,
          address = EXCLUDED.address,
          updated_at = CURRENT_TIMESTAMP;
      `;
      await client.query(fatherUpsert, [
        uid,
        fatherName || "",
        fatherPhone || null,
        fatherEmail || null,
        fatherOccupation || null,
        fatherAddress || null,
      ]);
    }

    // 4. Upsert Mother guardian if provided
    if (motherName !== undefined) {
      const motherUpsert = `
        INSERT INTO student_guardians (
          student_uid, relation, name, phone, email, occupation, address, is_primary, updated_at
        )
        VALUES ($1, 'mother', $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP)
        ON CONFLICT (student_uid, relation) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          occupation = EXCLUDED.occupation,
          address = EXCLUDED.address,
          updated_at = CURRENT_TIMESTAMP;
      `;
      await client.query(motherUpsert, [
        uid,
        motherName || "",
        motherPhone || null,
        motherEmail || null,
        motherOccupation || null,
        motherAddress || null,
      ]);
    }

    await client.query("COMMIT");

    // Fetch updated profile to return
    const userQuery = `SELECT uid, name, email, role, department, register_number FROM users WHERE uid = $1`;
    const userRes = await client.query(userQuery, [uid]);
    const profileRes = await client.query(
      `SELECT phone, date_of_birth, degree, year, semester, section FROM student_profiles WHERE uid = $1`,
      [uid]
    );
    const guardianRes = await client.query(
      `SELECT relation, name, phone, email, occupation, address FROM student_guardians WHERE student_uid = $1`,
      [uid]
    );

    const u = userRes.rows[0];
    const p = profileRes.rows[0] || {};
    const guardians = {};
    guardianRes.rows.forEach((g) => {
      guardians[g.relation] = g;
    });

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully.",
      profile: {
        uid: u.uid,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        registerNumber: u.register_number,
        phone: p.phone,
        dateOfBirth: formatDate(p.date_of_birth),
        degree: p.degree,
        year: p.year,
        semester: p.semester,
        section: p.section,
        father: guardians.father || null,
        mother: guardians.mother || null,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT Student Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating student profile.",
    });
  } finally {
    client.release();
  }
});

export default router;
