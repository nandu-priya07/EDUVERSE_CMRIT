import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

/**
 * Helper to format date to YYYY-MM-DD
 */
function formatDate(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "string") return dateVal.split("T")[0];
  if (dateVal instanceof Date) return dateVal.toISOString().split("T")[0];
  return String(dateVal);
}

/**
 * GET /api/teacher/profile
 * Fetch logged-in teacher profile using session / token UID
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("teacher", "hod", "admin"),
  async (req, res) => {

    try {
      const uid = req.user.uid;

      // 1. Query users table for basic info
      const userQuery = `
        SELECT uid, name, email, role, department, employee_id, is_active
        FROM users
        WHERE uid = $1;
      `;
      const userRes = await pool.query(userQuery, [uid]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Teacher account not found in database.",
        });
      }

      const u = userRes.rows[0];

      // 2. Query teacher_profiles table for extended details
      const profileQuery = `
        SELECT
          full_name, phone, alternate_phone, date_of_birth, gender,
          address, city, state, pincode, country,
          employee_id, designation, department, qualification, specialization,
          experience_years, joining_date, employment_type, office_location,
          profile_image, bio,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation
        FROM teacher_profiles
        WHERE uid = $1;
      `;
      const profileRes = await pool.query(profileQuery, [uid]);
      const p = profileRes.rows[0] || {};

      const profileData = {
        uid: u.uid,
        fullName: p.full_name || u.name || "",
        email: u.email || "",
        role: u.role || "",
        employeeId: p.employee_id || u.employee_id || "",
        phone: p.phone || "",
        alternatePhone: p.alternate_phone || "",
        dateOfBirth: formatDate(p.date_of_birth),
        gender: p.gender || "",
        address: p.address || "",
        city: p.city || "",
        state: p.state || "",
        pincode: p.pincode || "",
        country: p.country || "India",
        designation: p.designation || "",
        department: p.department || u.department || "",
        qualification: p.qualification || "",
        specialization: p.specialization || "",
        experienceYears:
          p.experience_years !== null && p.experience_years !== undefined
            ? String(p.experience_years)
            : "",
        joiningDate: formatDate(p.joining_date),
        employmentType: p.employment_type || "",
        officeLocation: p.office_location || "",
        profileImage: p.profile_image || "",
        bio: p.bio || "",
        emergencyContactName: p.emergency_contact_name || "",
        emergencyContactPhone: p.emergency_contact_phone || "",
        emergencyContactRelation: p.emergency_contact_relation || "",
      };

      return res.status(200).json({
        success: true,
        message: "Teacher profile fetched successfully.",
        data: profileData,
      });
    } catch (error) {
      console.error("GET Teacher Profile Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching teacher profile.",
      });
    }
  }
);

/**
 * PUT /api/teacher/profile
 * Update logged-in teacher profile using session / token UID
 */
router.put(
  "/",
  authenticate,
  authorizeRoles("faculty", "teacher", "hod", "admin"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const uid = req.user.uid;
      const {
        fullName,
        phone,
        alternatePhone,
        dateOfBirth,
        gender,
        address,
        city,
        state,
        pincode,
        country,
        employeeId,
        designation,
        department,
        qualification,
        specialization,
        experienceYears,
        joiningDate,
        employmentType,
        officeLocation,
        profileImage,
        bio,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
      } = req.body;

      await client.query("BEGIN");

      // 1. Update user name, department, employee_id in users table if provided
      if (
        fullName !== undefined ||
        department !== undefined ||
        employeeId !== undefined
      ) {
        const userUpdates = [];
        const userValues = [];
        let idx = 1;

        if (fullName !== undefined) {
          userUpdates.push(`name = $${idx++}`);
          userValues.push(fullName);
        }
        if (department !== undefined) {
          userUpdates.push(`department = $${idx++}`);
          userValues.push(department);
        }
        if (employeeId !== undefined) {
          userUpdates.push(`employee_id = $${idx++}`);
          userValues.push(employeeId);
        }
        userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
        userValues.push(uid);

        await client.query(
          `UPDATE users SET ${userUpdates.join(", ")} WHERE uid = $${idx}`,
          userValues
        );
      }

      // 2. Upsert into teacher_profiles table
      const updatedName = fullName || req.user.name;
      const userEmail = req.user.email;

      const profileUpsert = `
        INSERT INTO teacher_profiles (
          uid, name, email, full_name, phone, alternate_phone, date_of_birth, gender,
          address, city, state, pincode, country,
          employee_id, designation, department, qualification, specialization,
          experience_years, joining_date, employment_type, office_location,
          profile_image, bio,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24,
          $25, $26, $27,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          alternate_phone = EXCLUDED.alternate_phone,
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          country = EXCLUDED.country,
          employee_id = EXCLUDED.employee_id,
          designation = EXCLUDED.designation,
          department = EXCLUDED.department,
          qualification = EXCLUDED.qualification,
          specialization = EXCLUDED.specialization,
          experience_years = EXCLUDED.experience_years,
          joining_date = EXCLUDED.joining_date,
          employment_type = EXCLUDED.employment_type,
          office_location = EXCLUDED.office_location,
          profile_image = EXCLUDED.profile_image,
          bio = EXCLUDED.bio,
          emergency_contact_name = EXCLUDED.emergency_contact_name,
          emergency_contact_phone = EXCLUDED.emergency_contact_phone,
          emergency_contact_relation = EXCLUDED.emergency_contact_relation,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await client.query(profileUpsert, [
        uid,
        updatedName || null,
        userEmail || null,
        fullName || null,
        phone || null,
        alternatePhone || null,
        dateOfBirth || null,
        gender || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        country || "India",
        employeeId || null,
        designation || null,
        department || null,
        qualification || null,
        specialization || null,
        experienceYears !== undefined &&
        experienceYears !== "" &&
        !isNaN(experienceYears)
          ? parseFloat(experienceYears)
          : null,
        joiningDate || null,
        employmentType || null,
        officeLocation || null,
        profileImage || null,
        bio || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
        emergencyContactRelation || null,
      ]);

      await client.query("COMMIT");

      // Fetch updated info
      const userRes = await client.query(
        `SELECT uid, name, email, role, department, employee_id FROM users WHERE uid = $1`,
        [uid]
      );
      const profileRes = await client.query(
        `SELECT * FROM teacher_profiles WHERE uid = $1`,
        [uid]
      );

      const u = userRes.rows[0];
      const p = profileRes.rows[0] || {};

      const updatedData = {
        uid: u.uid,
        fullName: p.full_name || u.name || "",
        email: u.email || "",
        role: u.role || "",
        employeeId: p.employee_id || u.employee_id || "",
        phone: p.phone || "",
        alternatePhone: p.alternate_phone || "",
        dateOfBirth: formatDate(p.date_of_birth),
        gender: p.gender || "",
        address: p.address || "",
        city: p.city || "",
        state: p.state || "",
        pincode: p.pincode || "",
        country: p.country || "India",
        designation: p.designation || "",
        department: p.department || u.department || "",
        qualification: p.qualification || "",
        specialization: p.specialization || "",
        experienceYears:
          p.experience_years !== null && p.experience_years !== undefined
            ? String(p.experience_years)
            : "",
        joiningDate: formatDate(p.joining_date),
        employmentType: p.employment_type || "",
        officeLocation: p.office_location || "",
        profileImage: p.profile_image || "",
        bio: p.bio || "",
        emergencyContactName: p.emergency_contact_name || "",
        emergencyContactPhone: p.emergency_contact_phone || "",
        emergencyContactRelation: p.emergency_contact_relation || "",
      };

      return res.status(200).json({
        success: true,
        message: "Teacher profile updated successfully.",
        data: updatedData,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("PUT Teacher Profile Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while updating teacher profile.",
      });
    } finally {
      client.release();
    }
  }
);

export default router;

