import { pool } from "../database/db.js";

/**
 * Format DB row (snake_case) to camelCase user profile object
 */
export function formatUserRow(row) {
  if (!row) return null;
  return {
    uid: row.uid,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    department: row.department || null,
    registerNumber: row.register_number || null,
    employeeId: row.employee_id || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || null,
  };
}

/**
 * Insert a new user profile record
 */
export async function createUserProfile(uid, userData) {
  const query = `
    INSERT INTO users (
      uid, name, email, password_hash, role, department,
      register_number, employee_id, is_active, created_at, updated_at, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $10)
    RETURNING *;
  `;

  const values = [
    uid,
    userData.name,
    userData.email.toLowerCase().trim(),
    userData.passwordHash,
    userData.role,
    userData.department || null,
    userData.role === "student" ? (userData.registerNumber || null) : null,
    (userData.role === "teacher" || userData.role === "hod" || userData.role === "admin") ? (userData.employeeId || null) : null,

    userData.isActive !== undefined ? userData.isActive : true,
    userData.createdBy || "system",
  ];

  const result = await pool.query(query, values);
  return formatUserRow(result.rows[0]);
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid) {
  const query = `SELECT * FROM users WHERE uid = $1;`;
  const result = await pool.query(query, [uid]);
  return formatUserRow(result.rows[0]);
}

/**
 * Get user profile by Email
 */
export async function getUserByEmail(email) {
  const query = `SELECT * FROM users WHERE LOWER(email) = LOWER($1);`;
  const result = await pool.query(query, [email.trim()]);
  return formatUserRow(result.rows[0]);
}

/**
 * Get all user profiles
 */
export async function getAllUserProfiles() {
  const query = `SELECT * FROM users ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows.map(formatUserRow);
}

/**
 * Update user profile fields
 */
export async function updateUserProfile(uid, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email.toLowerCase().trim());
  }
  if (updates.passwordHash !== undefined) {
    fields.push(`password_hash = $${paramIndex++}`);
    values.push(updates.passwordHash);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.department !== undefined) {
    fields.push(`department = $${paramIndex++}`);
    values.push(updates.department);
  }
  if (updates.registerNumber !== undefined) {
    fields.push(`register_number = $${paramIndex++}`);
    values.push(updates.registerNumber);
  }
  if (updates.employeeId !== undefined) {
    fields.push(`employee_id = $${paramIndex++}`);
    values.push(updates.employeeId);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(uid);

  const query = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE uid = $${paramIndex}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return formatUserRow(result.rows[0]);
}

/**
 * Delete user profile
 */
export async function deleteUserProfile(uid) {
  const query = `DELETE FROM users WHERE uid = $1 RETURNING uid;`;
  const result = await pool.query(query, [uid]);
  return { success: result.rowCount > 0 };
}

// Backward compatibility exports
export const createUser = createUserProfile;
export const getUser = getUserProfile;
export const getAllUsers = getAllUserProfiles;
export const updateUser = updateUserProfile;
export const deleteUser = deleteUserProfile;
