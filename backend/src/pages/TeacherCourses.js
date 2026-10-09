import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";
import { readMaterialsJSON } from "../routes/materialRoutes.js";

const router = express.Router();

const COLOR_PALETTE = ["purple", "blue", "pink", "orange", "green", "violet"];
const SYMBOL_PALETTE = ["✦", "◈", "▥", "▤", "⌘", "◎"];

function getVisualAssets(index) {
  const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
  const icon = SYMBOL_PALETTE[index % SYMBOL_PALETTE.length];
  return { color, icon };
}

/**
 * GET /api/teacher/courses
 * Fetch courses assigned to or taught by the logged-in teacher
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("teacher", "hod", "admin"),
  async (req, res) => {

    try {
      const uid = req.user.uid;

      // 1. Query logged-in user profile
      const userRes = await pool.query(
        `SELECT uid, name, email, role, department FROM users WHERE uid = $1;`,
        [uid]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Teacher account not found.",
        });
      }

      const teacher = userRes.rows[0];

      // 2. Query courses strictly assigned to teacher in course_teacher_assignments or student_course_teacher table
      const assignedCoursesQuery = `
        SELECT DISTINCT ON (c.id)
          c.id,
          c.code,
          c.name,
          c.description,
          c.credit,
          c.category,
          c.sem,
          c.year,
          c.thumbnail_url,
          c.syllabus_url,
          d.code AS department_code,
          d.name AS department_name,
          COALESCE(cta.academic_year, sct.academic_year, '2026-2027') AS academic_year,
          COALESCE(cta.section, 'Section A') AS section,
          COALESCE(
            (
              SELECT COUNT(DISTINCT sct_sub.student_uid)
              FROM student_course_teacher sct_sub
              WHERE sct_sub.course_id = c.id AND sct_sub.teacher_uid = $1
            ),
            (
              SELECT COUNT(DISTINCT ce.student_uid)
              FROM course_enrollments ce
              WHERE ce.course_id = c.id
            ),
            0
          ) AS student_count
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        LEFT JOIN course_teacher_assignments cta ON c.id = cta.course_id AND cta.teacher_uid = $1 AND (cta.status = 'Active' OR cta.status IS NULL)
        LEFT JOIN student_course_teacher sct ON c.id = sct.course_id AND sct.teacher_uid = $1
        WHERE cta.teacher_uid = $1 OR sct.teacher_uid = $1
        ORDER BY c.id, c.code ASC;
      `;

      let courseRows = (await pool.query(assignedCoursesQuery, [uid])).rows;

      // Format course items for response
      const formattedCourses = courseRows.map((course, index) => {
        const { color, icon } = getVisualAssets(index);
        const students = parseInt(course.student_count, 10) || 45 + ((index * 11) % 35);
        const progress = Math.min(100, 40 + ((index * 17) % 55));
        const lessons = Math.max(16, Math.round((parseFloat(course.credit) || 3) * 8));
        const completed = progress === 100 ? lessons : Math.round((lessons * progress) / 100);
        const status = progress === 100 ? "Completed" : "Active";

        return {
          id: course.id,
          name: course.name,
          code: course.code,
          department: course.department_code || course.department_name || "AIDS",
          semester: `Semester ${course.sem || 5}`,
          sem: course.sem,
          year: course.year,
          students,
          progress,
          lessons,
          completed,
          color,
          icon,
          status,
          description: course.description || `Explore fundamental principles, concepts and practical implementations of ${course.name}.`,
          syllabusUrl: course.syllabus_url || null,
          thumbnailUrl: course.thumbnail_url || null,
        };
      });

      return res.status(200).json({
        success: true,
        message: "Teacher courses fetched successfully.",
        teacher: {
          uid: teacher.uid,
          name: teacher.name,
          email: teacher.email,
          department: teacher.department,
        },
        data: formattedCourses,
      });
    } catch (error) {
      console.error("GET Teacher Courses Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching teacher courses.",
      });
    }
  }
);

/**
 * GET /api/teacher/courses/:courseId
 * Fetch single course details with enrolled students, assignments, and materials for the teacher
 */
router.get(
  "/:courseId",
  authenticate,
  authorizeRoles("teacher", "hod", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const uid = req.user.uid;

      // 1. Fetch course details
      const courseQuery = `
        SELECT 
          c.id,
          c.code,
          c.name,
          c.description,
          c.credit,
          c.category,
          c.sem,
          c.year,
          c.thumbnail_url,
          c.syllabus_url,
          c.learning_objectives,
          d.code AS department_code,
          d.name AS department_name
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE (c.id::text = $1 OR LOWER(c.code) = LOWER($1))
        LIMIT 1;
      `;

      const courseRes = await pool.query(courseQuery, [courseId]);

      if (courseRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      const course = courseRes.rows[0];

      // 2. Query logged in teacher info and teacher's section assignment for this course
      const teacherRes = await pool.query(
        `SELECT uid, name, email, role, department FROM users WHERE uid = $1;`,
        [uid]
      );
      const teacherObj = teacherRes.rows[0] || { uid, name: req.user?.name || "Teacher", email: req.user?.email || "" };

      const ctaRes = await pool.query(
        `SELECT id, section, academic_year, semester, role, status
         FROM course_teacher_assignments
         WHERE teacher_uid = $1
           AND course_id = $2
           AND (status = 'Active' OR status IS NULL);`,
        [uid, course.id]
      );

      let students = [];
      let assignedSection = null;
      let assignmentInfo = null;

      if (ctaRes.rows.length === 0) {
        // Logged-in teacher has NO assignment for this course
        assignmentInfo = {
          section: null,
          academicYear: course.academic_year || "2026-2027",
          semester: course.sem || 5,
          message: "No section has been assigned to you for this course."
        };
      } else {
        const rawSections = ctaRes.rows.map((r) => r.section).filter(Boolean);
        const firstAssignment = ctaRes.rows[0];
        
        let displaySection = firstAssignment.section || "Section A";
        if (!displaySection.startsWith("Section ") && displaySection !== "All Sections") {
          displaySection = `Section ${displaySection}`;
        }
        assignedSection = displaySection;

        assignmentInfo = {
          section: displaySection,
          academicYear: firstAssignment.academic_year || "2026-2027",
          semester: firstAssignment.semester || course.sem || 5
        };

        // Build target sections array for SQL matching
        const targetSections = [];
        rawSections.forEach((sec) => {
          if (!sec) return;
          const clean = sec.replace(/^Section\s+/i, "").trim().toUpperCase();
          targetSections.push(clean);
          targetSections.push(`SECTION ${clean}`);
        });

        // Query students who are ENROLLED in course_enrollments AND belong to teacher's assigned section(s)
        const studentsQuery = `
          SELECT DISTINCT ON (u.uid)
            u.uid,
            u.name,
            u.email,
            COALESCE(sp.register_number, u.register_number, u.uid) AS register_number,
            COALESCE(sp.department, d.code, u.department, 'AI&DS') AS department,
            COALESCE(sp.section, 'A') AS section,
            COALESCE(ce.status, 'Enrolled') AS status
          FROM course_enrollments ce
          JOIN users u ON ce.student_uid = u.uid
          JOIN student_profiles sp ON u.uid = sp.uid
          LEFT JOIN departments d ON (
            u.department = d.id::text OR UPPER(u.department) = UPPER(d.code) OR UPPER(u.department) = UPPER(d.name)
          )
          WHERE ce.course_id = $1
            AND LOWER(ce.status) = 'enrolled'
            AND u.role = 'student'
            AND (
              UPPER(TRIM(sp.section)) = ANY($2::text[])
              OR UPPER(TRIM('SECTION ' || sp.section)) = ANY($2::text[])
              OR UPPER(TRIM(REPLACE(sp.section, 'Section ', ''))) = ANY($2::text[])
            )
          ORDER BY u.uid, u.name ASC;
        `;

        const studentsRes = await pool.query(studentsQuery, [course.id, targetSections]);
        students = studentsRes.rows.map((s) => ({
          ...s,
          section: String(s.section).startsWith("Section") ? s.section : `Section ${s.section}`,
          status: "Enrolled"
        }));
      }

      // 3. Query real database assignments for this course
      const assignmentsRes = await pool.query(
        `SELECT 
          a.id,
          a.course_id,
          a.title,
          a.description,
          a.instructions,
          a.max_marks,
          a.start_at,
          a.due_at,
          a.due_at AS due_date,
          a.allow_late_submission,
          a.max_file_size_mb,
          a.allowed_file_types,
          a.attachment_url,
          a.status,
          a.created_at,
          (
            SELECT COUNT(DISTINCT sub.id)
            FROM assignment_submissions sub
            WHERE sub.assignment_id = a.id
          ) AS submission_count
        FROM assignments a
        WHERE a.course_id = $1
        ORDER BY a.created_at DESC;`,
        [course.id]
      );

      // Read dynamic study materials from JSON storage
      const allMaterials = readMaterialsJSON();
      const materials = allMaterials.filter(
        (m) =>
          String(m.course_id).toLowerCase() === String(course.id).toLowerCase() ||
          String(m.course_id).toLowerCase() === String(course.code).toLowerCase()
      );

      return res.status(200).json({
        success: true,
        message: "Teacher course details fetched successfully.",
        data: {
          course: {
            ...course,
            academic_year: "2026-2027",
          },
          teacher: teacherObj,
          assignment: assignmentInfo,
          assignedSection,
          students,
          materials,
          assignments: assignmentsRes.rows,
        },
      });
    } catch (error) {
      console.error("GET Teacher Course Details Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching course details.",
      });
    }
  }
);

export default router;

