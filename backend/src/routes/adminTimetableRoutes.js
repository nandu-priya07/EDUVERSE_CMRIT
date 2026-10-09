import express from "express";
import { pool } from "../database/db.js";

const router = express.Router();

/**
 * GET /api/admin/timetable/meta
 * Fetch metadata for timetable creation (departments, teachers, courses)
 */
router.get("/meta", async (req, res) => {
  try {
    // 1. Fetch departments
    let departments = [];
    try {
      const deptRes = await pool.query(
        `SELECT DISTINCT name, code FROM departments ORDER BY name ASC;`
      );
      departments = deptRes.rows;
    } catch {
      departments = [
        { name: "Artificial Intelligence and Data Science", code: "AI&DS" },
        { name: "Computer Science and Engineering", code: "CSE" },
        { name: "Electronics and Communication Engineering", code: "ECE" },
        { name: "Electrical and Electronics Engineering", code: "EEE" },
        { name: "Mechanical Engineering", code: "MECH" },
        { name: "Civil Engineering", code: "CIVIL" },
      ];
    }

    // 2. Fetch all active faculty members (teachers)
    const teachersRes = await pool.query(
      `SELECT 
         u.uid,
         u.name,
         u.email,
         u.department,
         u.employee_id,
         COALESCE(tp.designation, 'Faculty Member') AS designation
       FROM users u
       LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
       WHERE u.role IN ('teacher', 'hod')
       ORDER BY u.name ASC;`
    );

    // 3. Fetch all active courses
    const coursesRes = await pool.query(
      `SELECT 
         c.id,
         c.code,
         c.name AS title,
         c.name,
         c.credit,
         c.category,
         c.sem,
         COALESCE(d.name, 'Department') AS department_name
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       ORDER BY c.code ASC;`
    );

    return res.status(200).json({
      success: true,
      departments,
      teachers: teachersRes.rows,
      courses: coursesRes.rows,
    });
  } catch (error) {
    console.error("GET Timetable Meta Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch timetable metadata.",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/timetable
 * Fetch timetable records with optional filtering
 */
router.get("/", async (req, res) => {
  try {
    const { department, semester, section, teacherUid, dayOfWeek } = req.query;

    let query = `
      SELECT 
        t.id,
        t.course_id,
        t.teacher_uid,
        t.department,
        t.semester,
        t.section,
        t.academic_year,
        t.day_of_week,
        t.start_time,
        t.end_time,
        t.slot_number,
        t.room_number,
        t.created_at,
        t.updated_at,
        c.code AS course_code,
        c.name AS course_title,
        c.credit AS course_credit,
        u.name AS teacher_name,
        u.email AS teacher_email,
        u.department AS teacher_department
      FROM timetables t
      LEFT JOIN courses c ON t.course_id = c.id
      LEFT JOIN users u ON t.teacher_uid = u.uid
      WHERE 1=1
    `;

    const params = [];

    if (department && department !== "All") {
      params.push(department);
      query += ` AND LOWER(t.department) = LOWER($${params.length})`;
    }

    if (semester && semester !== "All") {
      params.push(parseInt(semester, 10));
      query += ` AND t.semester = $${params.length}`;
    }

    if (section && section !== "All") {
      params.push(section);
      query += ` AND LOWER(t.section) = LOWER($${params.length})`;
    }

    if (teacherUid && teacherUid !== "All") {
      params.push(teacherUid);
      query += ` AND t.teacher_uid = $${params.length}`;
    }

    if (dayOfWeek && dayOfWeek !== "All") {
      params.push(dayOfWeek);
      query += ` AND LOWER(t.day_of_week) = LOWER($${params.length})`;
    }

    query += ` ORDER BY t.slot_number ASC, t.start_time ASC;`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      timetable: result.rows,
    });
  } catch (error) {
    console.error("GET Timetable Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch timetable assignments.",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/timetable
 * Assign new timetable timing for a staff member / section
 */
router.post("/", async (req, res) => {
  try {
    const {
      courseId,
      teacherUid,
      department,
      semester,
      section,
      academicYear = "2026-2027",
      dayOfWeek,
      startTime,
      endTime,
      slotNumber = 1,
      roomNumber = "Classroom 101",
    } = req.body;

    if (!courseId || !teacherUid || !department || !semester || !section || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required timetable parameters (Course, Faculty, Department, Semester, Section, Day, Start/End Time).",
      });
    }

    const numericSlot = parseInt(slotNumber, 10) || 1;
    const numericSem = parseInt(semester, 10) || 1;

    // CONFLICT CHECK 1: Is this Faculty member already assigned to another class in this time slot?
    const staffConflict = await pool.query(
      `SELECT t.*, u.name AS teacher_name, c.code AS course_code, t.section AS conflict_section
       FROM timetables t
       JOIN users u ON t.teacher_uid = u.uid
       JOIN courses c ON t.course_id = c.id
       WHERE t.teacher_uid = $1 AND LOWER(t.day_of_week) = LOWER($2) AND t.slot_number = $3
       LIMIT 1;`,
      [teacherUid, dayOfWeek, numericSlot]
    );

    if (staffConflict.rows.length > 0) {
      const c = staffConflict.rows[0];
      return res.status(400).json({
        success: false,
        conflictType: "STAFF_BUSY",
        message: `Schedule Conflict: Faculty "${c.teacher_name}" is already assigned to teach ${c.course_code} (${c.conflict_section}) during Period ${numericSlot} on ${dayOfWeek}.`,
      });
    }

    // CONFLICT CHECK 2: Is this Section already having another class in this time slot?
    const sectionConflict = await pool.query(
      `SELECT t.*, c.code AS course_code
       FROM timetables t
       JOIN courses c ON t.course_id = c.id
       WHERE LOWER(t.department) = LOWER($1) AND t.semester = $2 AND LOWER(t.section) = LOWER($3) AND LOWER(t.day_of_week) = LOWER($4) AND t.slot_number = $5
       LIMIT 1;`,
      [department, numericSem, section, dayOfWeek, numericSlot]
    );

    if (sectionConflict.rows.length > 0) {
      const c = sectionConflict.rows[0];
      return res.status(400).json({
        success: false,
        conflictType: "SECTION_OCCUPIED",
        message: `Section Conflict: ${section} (Semester ${numericSem}, ${department}) already has course ${c.course_code} scheduled during Period ${numericSlot} on ${dayOfWeek}.`,
      });
    }

    // CONFLICT CHECK 3: Is the room number already occupied?
    if (roomNumber && roomNumber.trim()) {
      const roomConflict = await pool.query(
        `SELECT t.*, c.code AS course_code, t.section AS conflict_section
         FROM timetables t
         JOIN courses c ON t.course_id = c.id
         WHERE LOWER(t.room_number) = LOWER($1) AND LOWER(t.day_of_week) = LOWER($2) AND t.slot_number = $3
         LIMIT 1;`,
        [roomNumber.trim(), dayOfWeek, numericSlot]
      );

      if (roomConflict.rows.length > 0) {
        const c = roomConflict.rows[0];
        return res.status(400).json({
          success: false,
          conflictType: "ROOM_OCCUPIED",
          message: `Room Conflict: "${roomNumber}" is already booked for ${c.course_code} (${c.conflict_section}) during Period ${numericSlot} on ${dayOfWeek}.`,
        });
      }
    }

    // Insert Timetable Assignment
    const insertRes = await pool.query(
      `INSERT INTO timetables (
         course_id,
         teacher_uid,
         department,
         semester,
         section,
         academic_year,
         day_of_week,
         start_time,
         end_time,
         slot_number,
         room_number
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *;`,
      [
        courseId,
        teacherUid,
        department,
        numericSem,
        section,
        academicYear,
        dayOfWeek,
        startTime,
        endTime,
        numericSlot,
        roomNumber || "Classroom 101",
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Timetable slot assigned successfully for Period ${numericSlot} (${dayOfWeek}).`,
      timetable: insertRes.rows[0],
    });
  } catch (error) {
    console.error("POST Timetable Assignment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign timetable timing.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/admin/timetable/:id
 * Update an existing timetable slot entry
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      courseId,
      teacherUid,
      department,
      semester,
      section,
      academicYear = "2026-2027",
      dayOfWeek,
      startTime,
      endTime,
      slotNumber = 1,
      roomNumber = "Classroom 101",
    } = req.body;

    const numericSlot = parseInt(slotNumber, 10) || 1;
    const numericSem = parseInt(semester, 10) || 1;

    // CONFLICT CHECK 1: Faculty busy in another class
    const staffConflict = await pool.query(
      `SELECT t.*, u.name AS teacher_name, c.code AS course_code
       FROM timetables t
       JOIN users u ON t.teacher_uid = u.uid
       JOIN courses c ON t.course_id = c.id
       WHERE t.teacher_uid = $1 AND LOWER(t.day_of_week) = LOWER($2) AND t.slot_number = $3 AND t.id != $4
       LIMIT 1;`,
      [teacherUid, dayOfWeek, numericSlot, id]
    );

    if (staffConflict.rows.length > 0) {
      const c = staffConflict.rows[0];
      return res.status(400).json({
        success: false,
        message: `Schedule Conflict: Faculty "${c.teacher_name}" is already assigned to teach ${c.course_code} during Period ${numericSlot} on ${dayOfWeek}.`,
      });
    }

    const updateRes = await pool.query(
      `UPDATE timetables
       SET 
         course_id = $1,
         teacher_uid = $2,
         department = $3,
         semester = $4,
         section = $5,
         academic_year = $6,
         day_of_week = $7,
         start_time = $8,
         end_time = $9,
         slot_number = $10,
         room_number = $11,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *;`,
      [
        courseId,
        teacherUid,
        department,
        numericSem,
        section,
        academicYear,
        dayOfWeek,
        startTime,
        endTime,
        numericSlot,
        roomNumber,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Timetable slot not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Timetable slot updated successfully.",
      timetable: updateRes.rows[0],
    });
  } catch (error) {
    console.error("PUT Timetable Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update timetable slot.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/timetable/:id
 * Remove a timetable slot entry
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRes = await pool.query(
      `DELETE FROM timetables WHERE id = $1 RETURNING *;`,
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Timetable slot not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Timetable slot deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE Timetable Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete timetable slot.",
      error: error.message,
    });
  }
});

export default router;
