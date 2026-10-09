import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

// Apply auth middleware to all admin student endpoints
router.use(authenticate, authorizeRoles("admin", "hod"));

/**
 * GET /api/admin/students
 * Fetch paginated list of students with filters & search
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      year = "",
      status = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = ["u.role = 'student'"];
    const queryParams = [];
    let paramIdx = 1;

    // Search filter (name, email, register_number)
    if (search && search.trim()) {
      whereConditions.push(
        `(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.register_number ILIKE $${paramIdx})`
      );
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // Department filter
    if (department && department.trim()) {
      whereConditions.push(
        `(u.department = $${paramIdx} OR d.id::text = $${paramIdx} OR d.code = $${paramIdx} OR d.name = $${paramIdx})`
      );
      queryParams.push(department.trim());
      paramIdx++;
    }

    // Year filter
    if (year && !isNaN(parseInt(year, 10))) {
      whereConditions.push(`sp.year = $${paramIdx}`);
      queryParams.push(parseInt(year, 10));
      paramIdx++;
    }

    // Status filter
    if (status === "active") {
      whereConditions.push(`u.is_active = true`);
    } else if (status === "inactive") {
      whereConditions.push(`u.is_active = false`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count query for total matching students
    const countQuery = `
      SELECT COUNT(DISTINCT u.uid) AS total
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
      )
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query
    const dataQueryParams = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT 
        u.uid,
        u.name,
        u.email,
        u.register_number,
        u.is_active,
        u.created_at,
        u.department AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        COALESCE(sp.programme, 'B.Tech') AS programme,
        COALESCE(sp.batch_year, '2023-2027') AS batch_year,
        COALESCE(sp.academic_status, 'Active') AS academic_status,
        COALESCE(sp.year, 1) AS year,
        COALESCE(sp.semester, 1) AS semester,
        COALESCE(sp.section, 'A') AS section,
        sp.quota,
        sp.expected_year_of_passing,
        sp.aadhar_number,
        sp.is_hostel,
        sp.date_of_birth,
        sp.degree,
        sp.profile_image,
        sp.phone
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123', 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108', 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING'))
      )
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const studentsResult = await pool.query(dataQuery, dataQueryParams);

    return res.status(200).json({
      success: true,
      data: {
        students: studentsResult.rows,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students list.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/students/:uid
 * Fetch complete student details across profile, guardians, and academic details
 */
router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const userRes = await pool.query(
      `SELECT u.*, d.name AS department_name, d.code AS department_code 
       FROM users u 
       LEFT JOIN departments d ON (u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name))
       WHERE u.uid = $1 AND u.role = 'student'`,
      [uid]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const studentUser = userRes.rows[0];

    const profileRes = await pool.query(
      "SELECT * FROM student_profiles WHERE uid = $1",
      [uid]
    );

    const guardiansRes = await pool.query(
      "SELECT * FROM student_guardians WHERE student_uid = $1 ORDER BY is_primary DESC, id ASC",
      [uid]
    );

    const academicRes = await pool.query(
      "SELECT * FROM student_academic_details WHERE student_uid = $1",
      [uid]
    );

    return res.status(200).json({
      success: true,
      data: {
        user: studentUser,
        profile: profileRes.rows[0] || null,
        guardians: guardiansRes.rows || [],
        academic: academicRes.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student details.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/students
 * Create a new student with full profile, guardian, and academic info
 */
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      // Basic & Account Info
      name,
      email,
      password,
      register_number,
      department,
      phone = "",
      programme = "B.Tech",
      batch_year = "2023-2027",
      academic_status = "Active",
      year = 1,
      semester = 1,
      quota = "Counselling",
      expected_year_of_passing,
      section = "A",
      aadhar_number = "",
      is_hostel = false,
      date_of_birth,
      degree = "Bachelor of Technology",
      profile_image = "",

      // Guardians (Father, Mother, Guardian)
      father = {},
      mother = {},
      guardian = {},

      // Academic Info (10th, 12th, Diploma, UG)
      academic = {},
    } = req.body;

    if (!name || !email || !password || !register_number || !department) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, register number, and department are required.",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      "SELECT uid FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Check existing register_number
    const existingReg = await pool.query(
      "SELECT uid FROM users WHERE LOWER(register_number) = LOWER($1)",
      [register_number.trim()]
    );
    if (existingReg.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Student with this register number already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = crypto.randomUUID();

    await client.query("BEGIN");

    // 1. Insert into users
    const insertUserQuery = `
      INSERT INTO users (
        uid, name, email, password_hash, role, department, register_number, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'student', $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING uid, name, email, register_number, department, is_active, created_at
    `;
    const userRes = await client.query(insertUserQuery, [
      uid,
      name.trim(),
      email.trim(),
      passwordHash,
      department.trim(),
      register_number.trim(),
    ]);

    // 2. Insert into student_profiles
    const insertProfileQuery = `
      INSERT INTO student_profiles (
        uid, name, email, phone, register_number, programme, department, batch_year,
        academic_status, year, semester, quota, expected_year_of_passing, section,
        aadhar_number, is_hostel, date_of_birth, degree, profile_image, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    await client.query(insertProfileQuery, [
      uid,
      name.trim(),
      email.trim(),
      phone.trim(),
      register_number.trim(),
      programme,
      department.trim(),
      batch_year,
      academic_status,
      parseInt(year, 10) || 1,
      parseInt(semester, 10) || 1,
      quota,
      expected_year_of_passing ? parseInt(expected_year_of_passing, 10) : null,
      section,
      aadhar_number ? aadhar_number.trim() : null,
      Boolean(is_hostel),
      date_of_birth || null,
      degree,
      profile_image || null,
    ]);

    // 3. Insert into student_guardians (Father, Mother, Guardian)
    const guardianItems = [
      { relation: "father", is_primary: true, ...father },
      { relation: "mother", is_primary: false, ...mother },
      { relation: "guardian", is_primary: false, ...guardian },
    ];

    for (const g of guardianItems) {
      if (g.name && g.name.trim()) {
        await client.query(
          `INSERT INTO student_guardians (
            student_uid, relation, name, phone, email, occupation, annual_income, aadhar_number, address, is_primary, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (student_uid, relation) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            occupation = EXCLUDED.occupation,
            annual_income = EXCLUDED.annual_income,
            aadhar_number = EXCLUDED.aadhar_number,
            address = EXCLUDED.address,
            updated_at = CURRENT_TIMESTAMP`,
          [
            uid,
            g.relation,
            g.name.trim(),
            g.phone ? g.phone.trim() : null,
            g.email ? g.email.trim() : null,
            g.occupation ? g.occupation.trim() : null,
            g.annual_income ? g.annual_income.trim() : null,
            g.aadhar_number ? g.aadhar_number.trim() : null,
            g.address ? g.address.trim() : null,
            g.is_primary,
          ]
        );
      }
    }

    // 4. Insert into student_academic_details
    await client.query(
      `INSERT INTO student_academic_details (
        student_uid,
        tenth_marks, tenth_percentage, tenth_year_of_passing, tenth_medium, tenth_board, tenth_school_name,
        twelfth_marks, twelfth_percentage, twelfth_year_of_passing, twelfth_medium, twelfth_board, twelfth_school_name,
        diploma_marks, diploma_percentage, diploma_year_of_passing, diploma_institute_name,
        ug_marks, ug_programme, ug_cgpa, ug_percentage, ug_year_of_passing, ug_college_name,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        uid,
        academic.tenth_marks || null,
        academic.tenth_percentage ? parseFloat(academic.tenth_percentage) : null,
        academic.tenth_year_of_passing ? parseInt(academic.tenth_year_of_passing, 10) : null,
        academic.tenth_medium || null,
        academic.tenth_board || null,
        academic.tenth_school_name || null,

        academic.twelfth_marks || null,
        academic.twelfth_percentage ? parseFloat(academic.twelfth_percentage) : null,
        academic.twelfth_year_of_passing ? parseInt(academic.twelfth_year_of_passing, 10) : null,
        academic.twelfth_medium || null,
        academic.twelfth_board || null,
        academic.twelfth_school_name || null,

        academic.diploma_marks || null,
        academic.diploma_percentage ? parseFloat(academic.diploma_percentage) : null,
        academic.diploma_year_of_passing ? parseInt(academic.diploma_year_of_passing, 10) : null,
        academic.diploma_institute_name || null,

        academic.ug_marks || null,
        academic.ug_programme || null,
        academic.ug_cgpa ? parseFloat(academic.ug_cgpa) : null,
        academic.ug_percentage ? parseFloat(academic.ug_percentage) : null,
        academic.ug_year_of_passing ? parseInt(academic.ug_year_of_passing, 10) : null,
        academic.ug_college_name || null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: {
        student: userRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating student:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create student account.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/students/:uid
 * Update student account, profile, guardians, and academic details
 */
router.put("/:uid", async (req, res) => {
  const client = await pool.connect();
  try {
    const { uid } = req.params;
    const {
      name,
      email,
      register_number,
      department,
      phone,
      programme,
      batch_year,
      academic_status,
      year,
      semester,
      quota,
      expected_year_of_passing,
      section,
      aadhar_number,
      is_hostel,
      date_of_birth,
      degree,
      profile_image,

      father,
      mother,
      guardian,

      academic,
    } = req.body;

    // Check user exists
    const userCheck = await pool.query(
      "SELECT uid FROM users WHERE uid = $1 AND role = 'student'",
      [uid]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    await client.query("BEGIN");

    // 1. Update users table
    const updateUserQuery = `
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          register_number = COALESCE($3, register_number),
          department = COALESCE($4, department),
          updated_at = CURRENT_TIMESTAMP
      WHERE uid = $5 AND role = 'student'
    `;
    await client.query(updateUserQuery, [
      name ? name.trim() : null,
      email ? email.trim() : null,
      register_number ? register_number.trim() : null,
      department ? department.trim() : null,
      uid,
    ]);

    // 2. Upsert student_profiles
    const upsertProfileQuery = `
      INSERT INTO student_profiles (
        uid, name, email, phone, register_number, programme, department, batch_year,
        academic_status, year, semester, quota, expected_year_of_passing, section,
        aadhar_number, is_hostel, date_of_birth, degree, profile_image, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
      ON CONFLICT (uid) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, student_profiles.name),
        email = COALESCE(EXCLUDED.email, student_profiles.email),
        phone = COALESCE(EXCLUDED.phone, student_profiles.phone),
        register_number = COALESCE(EXCLUDED.register_number, student_profiles.register_number),
        programme = COALESCE(EXCLUDED.programme, student_profiles.programme),
        department = COALESCE(EXCLUDED.department, student_profiles.department),
        batch_year = COALESCE(EXCLUDED.batch_year, student_profiles.batch_year),
        academic_status = COALESCE(EXCLUDED.academic_status, student_profiles.academic_status),
        year = COALESCE(EXCLUDED.year, student_profiles.year),
        semester = COALESCE(EXCLUDED.semester, student_profiles.semester),
        quota = COALESCE(EXCLUDED.quota, student_profiles.quota),
        expected_year_of_passing = COALESCE(EXCLUDED.expected_year_of_passing, student_profiles.expected_year_of_passing),
        section = COALESCE(EXCLUDED.section, student_profiles.section),
        aadhar_number = COALESCE(EXCLUDED.aadhar_number, student_profiles.aadhar_number),
        is_hostel = COALESCE(EXCLUDED.is_hostel, student_profiles.is_hostel),
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, student_profiles.date_of_birth),
        degree = COALESCE(EXCLUDED.degree, student_profiles.degree),
        profile_image = COALESCE(EXCLUDED.profile_image, student_profiles.profile_image),
        updated_at = CURRENT_TIMESTAMP
    `;
    await client.query(upsertProfileQuery, [
      uid,
      name ? name.trim() : null,
      email ? email.trim() : null,
      phone !== undefined ? phone.trim() : null,
      register_number ? register_number.trim() : null,
      programme || null,
      department ? department.trim() : null,
      batch_year || null,
      academic_status || null,
      year ? parseInt(year, 10) : null,
      semester ? parseInt(semester, 10) : null,
      quota || null,
      expected_year_of_passing ? parseInt(expected_year_of_passing, 10) : null,
      section || null,
      aadhar_number || null,
      is_hostel !== undefined ? Boolean(is_hostel) : null,
      date_of_birth || null,
      degree || null,
      profile_image || null,
    ]);

    // 3. Upsert student_guardians if provided
    if (father || mother || guardian) {
      const guardianItems = [
        { relation: "father", is_primary: true, ...father },
        { relation: "mother", is_primary: false, ...mother },
        { relation: "guardian", is_primary: false, ...guardian },
      ];

      for (const g of guardianItems) {
        if (g.name && g.name.trim()) {
          await client.query(
            `INSERT INTO student_guardians (
              student_uid, relation, name, phone, email, occupation, annual_income, aadhar_number, address, is_primary, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             ON CONFLICT (student_uid, relation) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              occupation = EXCLUDED.occupation,
              annual_income = EXCLUDED.annual_income,
              aadhar_number = EXCLUDED.aadhar_number,
              address = EXCLUDED.address,
              updated_at = CURRENT_TIMESTAMP`,
            [
              uid,
              g.relation,
              g.name.trim(),
              g.phone ? g.phone.trim() : null,
              g.email ? g.email.trim() : null,
              g.occupation ? g.occupation.trim() : null,
              g.annual_income ? g.annual_income.trim() : null,
              g.aadhar_number ? g.aadhar_number.trim() : null,
              g.address ? g.address.trim() : null,
              g.is_primary,
            ]
          );
        }
      }
    }

    // 4. Upsert student_academic_details if provided
    if (academic) {
      await client.query(
        `INSERT INTO student_academic_details (
          student_uid,
          tenth_marks, tenth_percentage, tenth_year_of_passing, tenth_medium, tenth_board, tenth_school_name,
          twelfth_marks, twelfth_percentage, twelfth_year_of_passing, twelfth_medium, twelfth_board, twelfth_school_name,
          diploma_marks, diploma_percentage, diploma_year_of_passing, diploma_institute_name,
          ug_marks, ug_programme, ug_cgpa, ug_percentage, ug_year_of_passing, ug_college_name,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
         ON CONFLICT (student_uid) DO UPDATE SET
          tenth_marks = EXCLUDED.tenth_marks,
          tenth_percentage = EXCLUDED.tenth_percentage,
          tenth_year_of_passing = EXCLUDED.tenth_year_of_passing,
          tenth_medium = EXCLUDED.tenth_medium,
          tenth_board = EXCLUDED.tenth_board,
          tenth_school_name = EXCLUDED.tenth_school_name,

          twelfth_marks = EXCLUDED.twelfth_marks,
          twelfth_percentage = EXCLUDED.twelfth_percentage,
          twelfth_year_of_passing = EXCLUDED.twelfth_year_of_passing,
          twelfth_medium = EXCLUDED.twelfth_medium,
          twelfth_board = EXCLUDED.twelfth_board,
          twelfth_school_name = EXCLUDED.twelfth_school_name,

          diploma_marks = EXCLUDED.diploma_marks,
          diploma_percentage = EXCLUDED.diploma_percentage,
          diploma_year_of_passing = EXCLUDED.diploma_year_of_passing,
          diploma_institute_name = EXCLUDED.diploma_institute_name,

          ug_marks = EXCLUDED.ug_marks,
          ug_programme = EXCLUDED.ug_programme,
          ug_cgpa = EXCLUDED.ug_cgpa,
          ug_percentage = EXCLUDED.ug_percentage,
          ug_year_of_passing = EXCLUDED.ug_year_of_passing,
          ug_college_name = EXCLUDED.ug_college_name,
          updated_at = CURRENT_TIMESTAMP`,
        [
          uid,
          academic.tenth_marks || null,
          academic.tenth_percentage ? parseFloat(academic.tenth_percentage) : null,
          academic.tenth_year_of_passing ? parseInt(academic.tenth_year_of_passing, 10) : null,
          academic.tenth_medium || null,
          academic.tenth_board || null,
          academic.tenth_school_name || null,

          academic.twelfth_marks || null,
          academic.twelfth_percentage ? parseFloat(academic.twelfth_percentage) : null,
          academic.twelfth_year_of_passing ? parseInt(academic.twelfth_year_of_passing, 10) : null,
          academic.twelfth_medium || null,
          academic.twelfth_board || null,
          academic.twelfth_school_name || null,

          academic.diploma_marks || null,
          academic.diploma_percentage ? parseFloat(academic.diploma_percentage) : null,
          academic.diploma_year_of_passing ? parseInt(academic.diploma_year_of_passing, 10) : null,
          academic.diploma_institute_name || null,

          academic.ug_marks || null,
          academic.ug_programme || null,
          academic.ug_cgpa ? parseFloat(academic.ug_cgpa) : null,
          academic.ug_percentage ? parseFloat(academic.ug_percentage) : null,
          academic.ug_year_of_passing ? parseInt(academic.ug_year_of_passing, 10) : null,
          academic.ug_college_name || null,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Student record updated successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating student:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student record.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/admin/students/:uid/status
 * Toggle active/inactive status
 */
router.patch("/:uid/status", async (req, res) => {
  try {
    const { uid } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "'is_active' boolean status is required.",
      });
    }

    const updateRes = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2 AND role = 'student' RETURNING uid, is_active`,
      [is_active, uid]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Student status changed to ${is_active ? "active" : "inactive"}.`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error updating student status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student status.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/students/bulk-import
 * Bulk import students from JSON array parsed from Excel/CSV
 */
router.post("/bulk-import", async (req, res) => {
  const client = await pool.connect();
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No student records provided for bulk import.",
      });
    }

    await client.query("BEGIN");

    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowNum = i + 1;

      // Extract fields matching the sample format
      const regNo = (row["Student Reg No"] || row["register_number"] || "").toString().trim();
      const name = (row["Student Full Name"] || row["name"] || "").toString().trim();
      const email = (row["Student Email"] || row["email"] || "").toString().trim();
      const dept = (row["Dept"] || row["department"] || "").toString().trim();
      const programme = (row["Programme"] || row["programme"] || "B.Tech").toString().trim();
      const degree = (row["Degree Name"] || row["degree"] || "B.Tech").toString().trim();
      const batchYear = (row["Batch Year"] || row["batch_year"] || "").toString().trim();
      const currentYear = parseInt(row["Current Year"] || row["year"] || 1, 10);
      const currentSem = parseInt(row["Current Sem"] || row["semester"] || 1, 10);
      const section = (row["Section"] || row["section"] || "A").toString().trim();
      const quota = (row["Admission Quota"] || row["quota"] || "").toString().trim();
      const academicStatus = (row["Academic Status"] || row["academic_status"] || "Active").toString().trim();
      const expectedPassingYear = parseInt(row["Expected Passing Year"] || row["expected_year_of_passing"] || 0, 10) || null;
      const phone = (row["Student Phone Number"] || row["phone"] || "").toString().trim();
      const aadhar = (row["Aadhar Number"] || row["aadhar_number"] || "").toString().trim();
      const dobRaw = row["DOB"] || row["date_of_birth"] || null;
      const isHostelRaw = row["Is Hosteler"] || row["is_hostel"];
      const isHostel = String(isHostelRaw).toLowerCase() === "true" || String(isHostelRaw).toLowerCase() === "yes" || isHostelRaw === true;
      const profileImg = (row["Profile Img URL"] || row["profile_image"] || "").toString().trim();
      const password = (row["Password"] || row["password"] || "Student@123").toString().trim();

      // Parents & Guardian
      const fatherName = (row["Father Name"] || "").toString().trim();
      const fatherPhone = (row["Father Mobile Number"] || "").toString().trim();
      const fatherEmail = (row["Father Email"] || "").toString().trim();
      const fatherOcc = (row["Father Occupation"] || "").toString().trim();
      const fatherIncome = (row["Father Annual Income"] || "").toString().trim();
      const address = (row["Address"] || "").toString().trim();
      const fatherAadhar = (row["Father Aadhar Number"] || "").toString().trim();

      const motherName = (row["Mother Name"] || "").toString().trim();
      const motherPhone = (row["Mother Phone Number"] || "").toString().trim();
      const motherEmail = (row["Mother Email"] || "").toString().trim();
      const motherOcc = (row["Mother Occupation"] || "").toString().trim();
      const motherIncome = (row["Mother Annual Income"] || "").toString().trim();
      const motherAadhar = (row["Mother Aadhar Number"] || "").toString().trim();

      const guardianName = (row["Local Guardian Name"] || "").toString().trim();
      const guardianPhone = (row["Guardian Number"] || "").toString().trim();
      const guardianOcc = (row["Guardian Occupation"] || "").toString().trim();
      const guardianAddress = (row["Guardian Address"] || "").toString().trim();

      if (!name || !email || !regNo) {
        skippedCount++;
        errors.push(`Row ${rowNum}: Missing mandatory fields (Full Name, Email, or Reg No).`);
        continue;
      }

      // Check existing email or register number
      const existing = await client.query(
        `SELECT uid FROM users WHERE email = $1 OR register_number = $2`,
        [email, regNo]
      );

      let uid;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      if (existing.rows.length > 0) {
        uid = existing.rows[0].uid;
        // Update user
        await client.query(
          `UPDATE users SET name = $1, email = $2, register_number = $3, department = $4, updated_at = CURRENT_TIMESTAMP WHERE uid = $5`,
          [name, email, regNo, dept, uid]
        );
      } else {
        uid = crypto.randomUUID();
        await client.query(
          `INSERT INTO users (uid, email, password_hash, role, name, register_number, department, is_active)
           VALUES ($1, $2, $3, 'student', $4, $5, $6, true)`,
          [uid, email, hashedPassword, name, regNo, dept]
        );
      }

      // Upsert profile
      let dobVal = null;
      if (dobRaw) {
        const parsedDate = new Date(dobRaw);
        if (!isNaN(parsedDate.getTime())) {
          dobVal = parsedDate.toISOString().split("T")[0];
        }
      }

      await client.query(
        `INSERT INTO student_profiles (
          uid, name, email, phone, register_number, programme, department, batch_year, academic_status,
          year, semester, quota, expected_year_of_passing, section, aadhar_number, is_hostel, date_of_birth, degree, profile_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (uid) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          register_number = EXCLUDED.register_number,
          programme = EXCLUDED.programme,
          department = EXCLUDED.department,
          batch_year = EXCLUDED.batch_year,
          academic_status = EXCLUDED.academic_status,
          year = EXCLUDED.year,
          semester = EXCLUDED.semester,
          quota = EXCLUDED.quota,
          expected_year_of_passing = EXCLUDED.expected_year_of_passing,
          section = EXCLUDED.section,
          aadhar_number = EXCLUDED.aadhar_number,
          is_hostel = EXCLUDED.is_hostel,
          date_of_birth = EXCLUDED.date_of_birth,
          degree = EXCLUDED.degree,
          profile_image = EXCLUDED.profile_image,
          updated_at = CURRENT_TIMESTAMP`,
        [
          uid, name, email, phone, regNo, programme, dept, batchYear, academicStatus,
          currentYear, currentSem, quota, expectedPassingYear, section, aadhar, isHostel, dobVal, degree, profileImg
        ]
      );

      // Upsert guardians (father, mother, local guardian)
      const guardianItems = [
        {
          relation: "father",
          name: fatherName,
          phone: fatherPhone,
          email: fatherEmail,
          occupation: fatherOcc,
          annual_income: fatherIncome,
          aadhar_number: fatherAadhar,
          address: address,
          is_primary: true,
        },
        {
          relation: "mother",
          name: motherName,
          phone: motherPhone,
          email: motherEmail,
          occupation: motherOcc,
          annual_income: motherIncome,
          aadhar_number: motherAadhar,
          address: address,
          is_primary: false,
        },
        {
          relation: "guardian",
          name: guardianName,
          phone: guardianPhone,
          email: "",
          occupation: guardianOcc,
          annual_income: "",
          aadhar_number: "",
          address: guardianAddress,
          is_primary: false,
        },
      ];

      for (const g of guardianItems) {
        if (g.name && g.name.trim()) {
          await client.query(
            `INSERT INTO student_guardians (
              student_uid, relation, name, phone, email, occupation, annual_income, aadhar_number, address, is_primary, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             ON CONFLICT (student_uid, relation) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              occupation = EXCLUDED.occupation,
              annual_income = EXCLUDED.annual_income,
              aadhar_number = EXCLUDED.aadhar_number,
              address = EXCLUDED.address,
              is_primary = EXCLUDED.is_primary,
              updated_at = CURRENT_TIMESTAMP`,
            [
              uid,
              g.relation,
              g.name.trim(),
              g.phone ? g.phone.trim() : null,
              g.email ? g.email.trim() : null,
              g.occupation ? g.occupation.trim() : null,
              g.annual_income ? g.annual_income.trim() : null,
              g.aadhar_number ? g.aadhar_number.trim() : null,
              g.address ? g.address.trim() : null,
              g.is_primary,
            ]
          );
        }
      }

      successCount++;
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${successCount} student(s). ${skippedCount > 0 ? `${skippedCount} skipped.` : ""}`,
      data: {
        total: students.length,
        imported: successCount,
        skipped: skippedCount,
        errors,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error bulk importing students:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process bulk student import.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

export default router;

