import express from "express";
import { pool } from "../database/db.js";
import { authenticate, authorizeRoles } from "./login.js";

const router = express.Router();

const COLOR_PALETTE = ["purple", "blue", "orange", "green", "pink", "cyan"];
const SYMBOL_PALETTE = ["⌘", "◈", "▤", "✦"];

/**
 * Helper to assign color and symbol based on index or course id
 */
function getVisualAssets(index) {
  const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
  const icon = SYMBOL_PALETTE[index % SYMBOL_PALETTE.length];
  return { color, icon };
}

/**
 * GET /api/student/enrollment (and /api/student/courses/enrollment)
 * Fetch student profile, enrollment setting status, available courses filtered by student's department/semester/academic_year, and section-matched teacher assignment.
 */
router.get(["/enrollment", "/courses/enrollment"], authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const uid = req.user.uid;

    // 1. Fetch student's dynamic profile
    const studentQuery = `
      SELECT 
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS "registerNumber",
        COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
        d.id AS department_id,
        d.name AS department_name,
        COALESCE(sp.batch_year, '2024') AS batch,
        COALESCE(sp.academic_year, '2026-2027') AS "academicYear",
        COALESCE(sp.year, 3) AS year,
        COALESCE(sp.semester, 5) AS semester,
        COALESCE(sp.section, 'A') AS section
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
        OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
        OR (UPPER(d.code) IN ('AIML', 'AIML108') AND UPPER(u.department) IN ('AI&ML', 'AIML', 'AIML108'))
      )
      WHERE u.uid = $1;
    `;

    const studentRes = await pool.query(studentQuery, [uid]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const student = studentRes.rows[0];

    // 2. Check enrollment_settings table for student's academic year & semester
    const settingsQuery = `
      SELECT id, academic_year, semester, is_enabled, start_date, end_date
      FROM enrollment_settings
      WHERE (academic_year = $1 OR academic_year = '2026-2027') AND semester = $2
      ORDER BY (academic_year = $1) DESC
      LIMIT 1;
    `;

    const settingsRes = await pool.query(settingsQuery, [student.academicYear, student.semester]);
    const settingRow = settingsRes.rows[0] || null;

    const now = new Date();
    let isEnabled = false;
    let isWindowOpen = false;
    let startDate = null;
    let endDate = null;

    if (settingRow) {
      isEnabled = Boolean(settingRow.is_enabled);
      startDate = settingRow.start_date;
      endDate = settingRow.end_date;

      const afterStart = !startDate || now >= new Date(startDate);
      const beforeEnd = !endDate || now <= new Date(endDate);
      isWindowOpen = isEnabled && afterStart && beforeEnd;
    }

    // 3. Fetch courses matching ONLY student's semester & department
    const coursesQuery = `
      SELECT 
        c.id AS "courseId",
        c.code AS "courseCode",
        c.name AS "courseName",
        c.credit AS credits,
        c.category,
        c.sem AS semester,
        c.description,
        c.learning_objectives AS "learningObjectives",
        d.code AS department_code,
        d.name AS department_name,
        COALESCE(c.academic_year, $3) AS "academicYear"
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.sem = $1 
        AND (
          d.id = $2
          OR UPPER(d.code) = UPPER($4)
          OR UPPER(d.name) = UPPER($4)
          OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER($4) IN ('AI&DS', 'AIDS', 'AD123'))
        )
      ORDER BY c.code ASC;
    `;

    const coursesRes = await pool.query(coursesQuery, [
      student.semester,
      student.department_id || null,
      student.academicYear,
      student.department,
    ]);

    const availableCourses = coursesRes.rows;

    // 4. Fetch existing enrollments for this student
    const enrollmentsRes = await pool.query(
      `SELECT course_id FROM course_enrollments WHERE student_uid = $1`,
      [uid]
    );
    const enrolledCourseIds = new Set(enrollmentsRes.rows.map((r) => String(r.course_id)));

    // 5. Fetch teacher assignments for each course matching student's section
    const studentSection = String(student.section).trim();

    const formattedCourses = await Promise.all(
      availableCourses.map(async (course) => {
        const teacherQuery = `
          SELECT 
            u.uid AS teacher_uid,
            u.name AS teacher_name,
            u.email AS teacher_email,
            cta.section,
            cta.role
          FROM course_teacher_assignments cta
          JOIN users u ON cta.teacher_uid = u.uid
          WHERE cta.course_id = $1
            AND (cta.semester = $2 OR cta.semester IS NULL)
            AND cta.status = 'Active'
            AND (
              cta.section = 'All Sections'
              OR UPPER(cta.section) = UPPER($3)
              OR UPPER(cta.section) = UPPER('Section ' || $3)
              OR UPPER(REPLACE(cta.section, 'Section ', '')) = UPPER(REPLACE($3, 'Section ', ''))
            )
          LIMIT 1;
        `;

        const teacherRes = await pool.query(teacherQuery, [
          course.courseId,
          student.semester,
          studentSection,
        ]);

        const teacherInfo = teacherRes.rows.length > 0 ? { name: teacherRes.rows[0].teacher_name } : null;
        const isEnrolled = enrolledCourseIds.has(String(course.courseId));

        return {
          ...course,
          department: student.department,
          teacher: teacherInfo,
          status: isEnrolled ? "enrolled" : "available",
        };
      })
    );

    return res.status(200).json({
      success: true,
      student,
      enrollment: {
        isEnabled,
        isWindowOpen,
        startDate,
        endDate,
        message: isWindowOpen
          ? "Enrollment Open"
          : isEnabled
          ? "Enrollment window is currently closed."
          : `Course Enrollment is currently not available for Semester ${student.semester}.`,
      },
      courses: formattedCourses,
    });
  } catch (error) {
    console.error("Error in GET student enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student enrollment data.",
      error: error.message,
    });
  }
});

/**
 * POST /api/student/enrollment (and /api/student/courses/enrollment)
 * Enroll student in selected courses with server-side validation
 */
router.post(["/enrollment", "/courses/enrollment"], authenticate, authorizeRoles("student"), async (req, res) => {
  try {
    const uid = req.user.uid;
    const { courses: courseIds = [] } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one course to enroll.",
      });
    }

    // 1. Fetch student's verified profile from DB
    const studentQuery = `
      SELECT 
        u.uid,
        COALESCE(sp.academic_year, '2026-2027') AS "academicYear",
        COALESCE(sp.semester, 5) AS semester,
        COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
        d.id AS department_id
      FROM users u
      LEFT JOIN student_profiles sp ON u.uid = sp.uid
      LEFT JOIN departments d ON (
        u.department = d.id::text 
        OR UPPER(u.department) = UPPER(d.code) 
        OR UPPER(u.department) = UPPER(d.name)
      )
      WHERE u.uid = $1 AND u.is_active = true;
    `;

    const studentRes = await pool.query(studentQuery, [uid]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const student = studentRes.rows[0];

    // 2. Validate enrollment_settings for student's academic year and semester
    const settingsRes = await pool.query(
      `SELECT is_enabled, start_date, end_date FROM enrollment_settings WHERE (academic_year = $1 OR academic_year = '2026-2027') AND semester = $2 LIMIT 1`,
      [student.academicYear, student.semester]
    );

    const setting = settingsRes.rows[0];
    if (!setting || !setting.is_enabled) {
      return res.status(403).json({
        success: false,
        message: `Course Enrollment is currently closed for Semester ${student.semester}.`,
      });
    }

    const now = new Date();
    if (setting.start_date && now < new Date(setting.start_date)) {
      return res.status(403).json({
        success: false,
        message: "Enrollment window has not started yet.",
      });
    }
    if (setting.end_date && now > new Date(setting.end_date)) {
      return res.status(403).json({
        success: false,
        message: "Enrollment window has expired.",
      });
    }

    // 3. Verify that all requested courses belong to student's semester
    const validCoursesRes = await pool.query(
      `SELECT id FROM courses WHERE id::text = ANY($1::text[]) AND sem = $2`,
      [courseIds.map(String), student.semester]
    );

    const validCourseIds = validCoursesRes.rows.map((r) => r.id);
    if (validCourseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected courses are invalid or not available for your semester.",
      });
    }

    // 4. Perform insertions in course_enrollments with conflict handling
    const insertQuery = `
      INSERT INTO course_enrollments (student_uid, course_id, academic_year, semester, enrolled_by, enrollment_type, status)
      VALUES ($1, $2, $3, $4, $5, 'student', 'enrolled')
      ON CONFLICT (student_uid, course_id, academic_year) DO UPDATE SET
        status = 'enrolled',
        semester = EXCLUDED.semester,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, course_id;
    `;

    const enrolledList = [];
    for (const cId of validCourseIds) {
      const inserted = await pool.query(insertQuery, [
        uid,
        cId,
        student.academicYear,
        student.semester,
        uid,
      ]);
      enrolledList.push(inserted.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${enrolledList.length} course(s)!`,
      count: enrolledList.length,
    });
  } catch (error) {
    console.error("Error in student enrollment POST:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete course enrollment.",
      error: error.message,
    });
  }
});

/**
 * GET /api/student/courses
 * Fetch enrolled or departmental courses for the logged-in student
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("student", "teacher", "admin"),
  async (req, res) => {


    try {
      const uid = req.user.uid;

      // 1. Fetch user & student profile details
      const userRes = await pool.query(
        `SELECT u.uid, u.name, u.email, u.role, u.department, sp.degree, sp.year, sp.semester, sp.section
         FROM users u
         LEFT JOIN student_profiles sp ON u.uid = sp.uid
         WHERE u.uid = $1;`,
        [uid]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student account not found.",
        });
      }

      const student = userRes.rows[0];

      // 2. Fetch courses from student_course_teacher & course_enrollments
      const enrolledQuery = `
        SELECT DISTINCT ON (c.id)
          c.id,
          c.code,
          c.name AS title,
          c.description,
          c.credit,
          c.category,
          c.sem,
          c.year,
          c.thumbnail_url,
          c.syllabus_url,
          c.learning_objectives,
          d.code AS department_code,
          d.name AS department_name,
          COALESCE(t.name, 'Faculty Member') AS instructor,
          COALESCE(sct.academic_year, '2026-2027') AS academic_year,
          COALESCE(sct.enrollment_status, ce.status, 'enrolled') AS raw_status
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        LEFT JOIN student_course_teacher sct ON c.id = sct.course_id AND sct.student_uid = $1
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_uid = $1
        LEFT JOIN users t ON sct.teacher_uid = t.uid
        WHERE sct.student_uid = $1 OR ce.student_uid = $1
        ORDER BY c.id, c.sem DESC, c.code ASC;
      `;

      let courseRows = (await pool.query(enrolledQuery, [uid])).rows;

      // 3. Fallback: If no enrollments exist yet, query departmental courses
      if (courseRows.length === 0) {
        const fallbackQuery = `
          SELECT
            c.id,
            c.code,
            c.name AS title,
            c.description,
            c.credit,
            c.category,
            c.sem,
            c.year,
            c.thumbnail_url,
            c.syllabus_url,
            c.learning_objectives,
            d.code AS department_code,
            d.name AS department_name,
            'Faculty Member' AS instructor,
            '2026-2027' AS academic_year,
            CASE WHEN c.sem < COALESCE($2, 5) THEN 'completed' ELSE 'enrolled' END AS raw_status
          FROM courses c
          JOIN departments d ON c.department_id = d.id
          WHERE (
            LOWER(d.name) = LOWER($1) OR
            LOWER(d.code) = LOWER($1) OR
            (d.code = 'AIDS' AND $1 = 'AI & DS')
          )
          AND c.sem <= COALESCE($2, 8)
          ORDER BY c.sem DESC, c.code ASC;
        `;

        courseRows = (
          await pool.query(fallbackQuery, [
            student.department || "AIDS",
            student.semester || 8,
          ])
        ).rows;
      }

      // Format response data for frontend
      const formattedCourses = courseRows.map((course, index) => {
        const { color, icon } = getVisualAssets(index);

        const isCompleted = course.raw_status === "completed";
        const status = isCompleted ? "Completed" : "In Progress";
        const progress = isCompleted ? 100 : Math.min(85, 40 + (index * 15) % 50);

        const lessons = Math.max(12, Math.round((parseFloat(course.credit) || 3) * 6));
        const completedLessons = isCompleted ? lessons : Math.round((lessons * progress) / 100);

        return {
          id: course.id,
          code: course.code,
          title: course.title,
          description: course.description || "Course syllabus and learning objectives.",
          category: course.category || course.department_name || "General",
          instructor: course.instructor,
          credit: parseFloat(course.credit) || 3.0,
          sem: course.sem,
          year: course.year,
          academicYear: course.academic_year,
          status,
          progress,
          lessons,
          completed: completedLessons,
          color,
          icon,
          thumbnailUrl: course.thumbnail_url || null,
          syllabusUrl: course.syllabus_url || null,
          learningObjectives: course.learning_objectives || null,
        };
      });

      return res.status(200).json({
        success: true,
        message: "Student courses fetched successfully.",
        student: {
          uid: student.uid,
          name: student.name,
          email: student.email,
          department: student.department,
          degree: student.degree,
          year: student.year,
          semester: student.semester,
          section: student.section,
        },
        data: formattedCourses,
      });
    } catch (error) {
      console.error("GET Student Courses Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching student courses.",
      });
    }
  }
);

/**
 * GET /api/student/courses/:courseId
 * Fetch complete dynamic course details for the logged-in student (database-driven)
 */
router.get(
  "/:courseId",
  authenticate,
  authorizeRoles("student", "teacher", "hod", "admin"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const uid = req.user.uid;

      // 1. Fetch student's profile information
      const studentQuery = `
        SELECT 
          u.uid,
          u.name,
          u.email,
          COALESCE(sp.register_number, u.register_number, u.uid) AS "registerNumber",
          COALESCE(d.code, u.department, sp.department, 'AIDS') AS department,
          d.id AS department_id,
          d.name AS department_name,
          COALESCE(sp.degree, 'B.Tech') AS degree,
          COALESCE(sp.year, 3) AS year,
          COALESCE(sp.semester, 5) AS semester,
          COALESCE(sp.section, 'A') AS section,
          '2026-2027' AS "academicYear"
        FROM users u
        LEFT JOIN student_profiles sp ON u.uid = sp.uid
        LEFT JOIN departments d ON (
          u.department = d.id::text 
          OR UPPER(u.department) = UPPER(d.code) 
          OR UPPER(u.department) = UPPER(d.name)
          OR (UPPER(d.code) IN ('AIDS', 'AD123') AND UPPER(u.department) IN ('AI&DS', 'AIDS', 'AD123'))
        )
        WHERE u.uid = $1;
      `;

      const studentRes = await pool.query(studentQuery, [uid]);
      const studentProfile = studentRes.rows[0] || {
        uid,
        name: req.user.name || "Student",
        email: req.user.email || "",
        department: "AI&DS",
        section: "A",
        semester: 5,
        academicYear: "2026-2027",
      };

      const studentSection = String(studentProfile.section || "A").trim();

      // 2. Fetch course details with department info
      const courseQuery = `
        SELECT 
          c.id,
          c.code,
          c.name AS title,
          c.description,
          c.credit,
          c.category,
          c.sem,
          c.year,
          c.thumbnail_url,
          c.syllabus_url,
          c.learning_objectives,
          COALESCE(c.academic_year, $2) AS academic_year,
          d.code AS department_code,
          d.name AS department_name
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE (c.id::text = $1 OR LOWER(c.code) = LOWER($1))
        LIMIT 1;
      `;

      const courseRes = await pool.query(courseQuery, [courseId, studentProfile.academicYear]);

      if (courseRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      const course = courseRes.rows[0];

      // 3. Security Check: Verify student enrollment
      const enrollmentRes = await pool.query(
        `SELECT id, status, created_at FROM course_enrollments WHERE student_uid = $1 AND course_id = $2 LIMIT 1`,
        [uid, course.id]
      );

      const sctRes = await pool.query(
        `SELECT id FROM student_course_teacher WHERE student_uid = $1 AND course_id = $2 LIMIT 1`,
        [uid, course.id]
      );

      const isEnrolled = enrollmentRes.rows.length > 0 || sctRes.rows.length > 0 || String(req.user.role).toLowerCase() !== "student";

      if (!isEnrolled && String(req.user.role).toLowerCase() === "student") {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course.",
        });
      }

      // 4. Resolve Teacher assigned specifically to student's section
      const teacherQuery = `
        SELECT 
          u.uid AS teacher_uid,
          u.name AS teacher_name,
          u.email AS teacher_email,
          u.department AS teacher_department,
          COALESCE(tp.designation, u.role, 'Faculty Member') AS designation,
          COALESCE(tp.profile_image, null) AS profile_image,
          cta.section,
          cta.role
        FROM course_teacher_assignments cta
        JOIN users u ON cta.teacher_uid = u.uid
        LEFT JOIN teacher_profiles tp ON u.uid = tp.uid
        WHERE cta.course_id = $1
          AND (cta.semester = $2 OR cta.semester IS NULL)
          AND (cta.status IS NULL OR cta.status = 'Active')
          AND (
            cta.section = 'All Sections'
            OR UPPER(cta.section) = UPPER($3)
            OR UPPER(cta.section) = UPPER('Section ' || $3)
            OR UPPER(REPLACE(cta.section, 'Section ', '')) = UPPER(REPLACE($3, 'Section ', ''))
          )
        LIMIT 1;
      `;

      const teacherRes = await pool.query(teacherQuery, [
        course.id,
        course.sem || studentProfile.semester,
        studentSection,
      ]);

      let teacher = null;
      if (teacherRes.rows.length > 0) {
        const tRow = teacherRes.rows[0];
        teacher = {
          uid: tRow.teacher_uid,
          name: tRow.teacher_name,
          email: tRow.teacher_email,
          department: tRow.teacher_department || course.department_name,
          designation: tRow.designation || "Faculty Member",
          profileImage: tRow.profile_image || null,
          section: tRow.section,
        };
      }

      // 5. Query Enrolled Students Count for course & student section
      const studentsCountRes = await pool.query(
        `SELECT COUNT(DISTINCT ce.student_uid) AS count
         FROM course_enrollments ce
         JOIN student_profiles sp ON ce.student_uid = sp.uid
         WHERE ce.course_id = $1 
           AND (
             UPPER(sp.section) = UPPER($2)
             OR UPPER(sp.section) = UPPER('Section ' || $2)
             OR UPPER(REPLACE(sp.section, 'Section ', '')) = UPPER(REPLACE($2, 'Section ', ''))
           );`,
        [course.id, studentSection]
      );

      let enrolledStudentsCount = parseInt(studentsCountRes.rows[0]?.count, 10) || 0;
      if (enrolledStudentsCount === 0) {
        const fallbackCountRes = await pool.query(
          `SELECT COUNT(DISTINCT student_uid) AS count FROM course_enrollments WHERE course_id = $1;`,
          [course.id]
        );
        enrolledStudentsCount = parseInt(fallbackCountRes.rows[0]?.count, 10) || 0;
      }

      // 6. Query Real Assignments for this Course & Student Submissions
      const assignmentsQuery = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.instructions,
          a.max_marks,
          a.start_at,
          a.due_at,
          a.allow_late_submission,
          a.attachment_url,
          a.status AS assignment_status,
          sub.id AS submission_id,
          sub.submitted_at,
          sub.status AS submission_status,
          sub.marks_obtained,
          sub.feedback,
          sub.submission_text,
          sub.file_url
        FROM assignments a
        LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_uid = $1
        WHERE a.course_id = $2 AND a.status IN ('published', 'closed')
        ORDER BY a.due_at ASC, a.created_at DESC;
      `;

      const assignmentsRes = await pool.query(assignmentsQuery, [uid, course.id]);
      const now = new Date();

      const assignments = assignmentsRes.rows.map((a) => {
        const isSubmitted = Boolean(a.submission_id);
        const isGraded = a.submission_status === "graded";
        const isOverdue = a.due_at && now > new Date(a.due_at) && !isSubmitted;

        let statusText = "Not Submitted";
        if (isGraded) {
          statusText = "Graded";
        } else if (isSubmitted) {
          statusText = "Submitted";
        } else if (isOverdue) {
          statusText = "Overdue";
        }

        return {
          id: a.id,
          title: a.title,
          description: a.description || "--",
          instructions: a.instructions || "",
          dueAt: a.due_at,
          maxMarks: parseFloat(a.max_marks) || 100,
          status: statusText,
          publishedStatus: a.assignment_status,
          score: a.marks_obtained !== null ? `${parseFloat(a.marks_obtained)}/${parseFloat(a.max_marks)}` : "--",
          attachmentUrl: a.attachment_url || null,
          submission: isSubmitted
            ? {
                id: a.submission_id,
                submittedAt: a.submitted_at,
                status: a.submission_status,
                marksObtained: a.marks_obtained !== null ? parseFloat(a.marks_obtained) : null,
                feedback: a.feedback || "--",
                submissionText: a.submission_text || "",
                fileUrl: a.file_url || null,
              }
            : null,
        };
      });

      // 7. Query Real Quizzes for this Course & Student Attempts
      const quizzesQuery = `
        SELECT 
          q.id,
          q.title,
          q.description,
          q.instructions,
          q.duration_minutes,
          q.total_marks,
          q.max_attempts,
          q.start_at,
          q.end_at,
          q.status,
          (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
          (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_uid = $1) AS attempts_used,
          (SELECT qa.score FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_uid = $1 ORDER BY qa.score DESC LIMIT 1) AS best_score,
          (SELECT qa.status FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_uid = $1 ORDER BY qa.created_at DESC LIMIT 1) AS latest_attempt_status,
          (SELECT qa.id FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_uid = $1 ORDER BY qa.created_at DESC LIMIT 1) AS latest_attempt_id
        FROM quizzes q
        WHERE q.course_id = $2 AND q.status IN ('published', 'closed')
        ORDER BY q.created_at DESC;
      `;

      const quizzesRes = await pool.query(quizzesQuery, [uid, course.id]);

      const quizzes = quizzesRes.rows.map((q) => {
        const attemptsUsed = parseInt(q.attempts_used, 10) || 0;
        const maxAttempts = parseInt(q.max_attempts, 10) || 1;
        const startAt = q.start_at ? new Date(q.start_at) : null;
        const endAt = q.end_at ? new Date(q.end_at) : null;

        let computedStatus = "Not Attempted";
        if (q.status === "closed" || (endAt && now > endAt)) {
          computedStatus = "Closed";
        } else if (startAt && now < startAt) {
          computedStatus = "Upcoming";
        } else if (attemptsUsed > 0) {
          computedStatus = attemptsUsed >= maxAttempts ? "Completed" : "In Progress";
        }

        return {
          id: q.id,
          title: q.title,
          description: q.description || "--",
          instructions: q.instructions || "",
          durationMinutes: q.duration_minutes || 30,
          totalMarks: parseFloat(q.total_marks) || 100,
          maxAttempts,
          attemptsUsed,
          startAt: q.start_at,
          endAt: q.end_at,
          status: computedStatus,
          totalQuestions: parseInt(q.total_questions, 10) || 0,
          bestScore: q.best_score !== null && q.best_score !== undefined ? parseFloat(q.best_score) : null,
          scoreText: q.best_score !== null && q.best_score !== undefined ? `${parseFloat(q.best_score)}/${parseFloat(q.total_marks)}` : "--",
          latestAttemptId: q.latest_attempt_id || null,
        };
      });

      // 8. Fetch Uploaded Course Materials from materials.json
      let materials = [];
      try {
        const { readMaterialsJSON } = await import("../routes/materialRoutes.js");
        const allMaterials = readMaterialsJSON();
        materials = allMaterials.filter(
          (m) =>
            String(m.course_id).toLowerCase() === String(course.id).toLowerCase() ||
            String(m.course_id).toLowerCase() === String(course.code).toLowerCase() ||
            String(m.course_id).toLowerCase() === String(courseId).toLowerCase()
        ).map(m => ({
          id: m.id,
          title: m.title || "--",
          description: m.description || "--",
          type: m.type || "PDF Document",
          uploadedAt: m.uploaded_at || m.created_at || new Date().toISOString(),
          uploadedBy: m.uploaded_by || (teacher ? teacher.name : "Faculty"),
          fileName: m.file_name || null,
          fileSize: m.file_size || 0,
          fileUrl: m.file_url && m.file_url !== "#" ? m.file_url : (m.file_name ? `http://localhost:5000/api/materials/download/${m.file_name}` : "#"),
          comicData: m.comic_data || null,
          isComic: m.type === "AI Educational Comic" || !!m.comic_data
        }));
      } catch (matErr) {
        console.error("Error loading course materials in endpoint:", matErr);
      }

      // 9. Fetch Course Announcements (Query course_announcements if table exists or return empty list)
      let announcements = [];
      try {
        const annRes = await pool.query(
          `SELECT 
             a.id,
             a.title,
             a.message,
             a.created_at,
             a.priority,
             COALESCE(u.name, 'Teacher') AS posted_by
           FROM course_announcements a
           LEFT JOIN users u ON a.teacher_uid = u.uid
           WHERE a.course_id = $1
           ORDER BY a.created_at DESC;`,
          [course.id]
        );
        announcements = annRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          createdAt: row.created_at,
          postedBy: row.posted_by,
          priority: row.priority || "normal",
        }));
      } catch {
        // Table may not exist yet; fallback gracefully
        announcements = [];
      }

      // 10. Fetch Student Attendance for this Course
      let attendanceData = null;
      try {
        const attRes = await pool.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'Present') AS present,
             COUNT(*) FILTER (WHERE status = 'Absent') AS absent,
             COUNT(*) AS total
           FROM attendance
           WHERE student_uid = $1 AND course_id = $2;`,
          [uid, course.id]
        );

        if (attRes.rows.length > 0 && parseInt(attRes.rows[0].total, 10) > 0) {
          const present = parseInt(attRes.rows[0].present, 10) || 0;
          const absent = parseInt(attRes.rows[0].absent, 10) || 0;
          const total = parseInt(attRes.rows[0].total, 10) || 0;
          const percentage = Math.round((present / total) * 100);
          attendanceData = { present, absent, total, percentage };
        }
      } catch {
        attendanceData = null;
      }

      // 11. Calculate Dynamic Student Progress %
      const submittedAssignmentsCount = assignments.filter(a => a.status === "Submitted" || a.status === "Graded").length;
      const completedQuizzesCount = quizzes.filter(q => q.status === "Completed").length;

      const totalActivities = assignments.length + quizzes.length + materials.length;
      const completedActivities = submittedAssignmentsCount + completedQuizzesCount;

      const progressPercentage = totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

      // 12. Format Objectives & Course Modules
      let objectives = [];
      if (course.learning_objectives) {
        if (Array.isArray(course.learning_objectives)) {
          objectives = course.learning_objectives;
        } else if (typeof course.learning_objectives === "string") {
          try {
            objectives = JSON.parse(course.learning_objectives);
          } catch {
            objectives = course.learning_objectives.split(";").map((s) => s.trim()).filter(Boolean);
          }
        }
      }

      if (objectives.length === 0) {
        objectives = [
          `Master fundamental principles and techniques of ${course.title}`,
          `Understand real-world industry standard applications for ${course.code}`,
          `Apply modern algorithms and tools to practical scenarios`,
        ];
      }

      // 13. Construct Complete Dynamic Response matching Specification
      return res.status(200).json({
        success: true,
        message: "Course details fetched successfully.",
        course: {
          id: course.id,
          code: course.code,
          name: course.title,
          description: course.description || `--`,
          department: course.department_name || studentProfile.department || "--",
          departmentCode: course.department_code || studentProfile.department || "--",
          semester: course.sem || studentProfile.semester || 5,
          academicYear: course.academic_year || studentProfile.academicYear || "2026-2027",
          credits: parseFloat(course.credit) || 3.0,
          category: course.category || "Professional Core",
          syllabusUrl: course.syllabus_url || null,
          thumbnailUrl: course.thumbnail_url || null,
          learningObjectives: objectives,
          prerequisites: course.prerequisites || "--",
        },
        student: {
          uid: studentProfile.uid,
          name: studentProfile.name,
          email: studentProfile.email,
          section: studentSection,
          department: studentProfile.department,
          semester: studentProfile.semester,
          registerNumber: studentProfile.registerNumber,
        },
        teacher: teacher ? {
          id: teacher.uid,
          uid: teacher.uid,
          name: teacher.name,
          email: teacher.email || "--",
          department: teacher.department || "--",
          designation: teacher.designation || "Faculty Member",
          profileImage: teacher.profileImage || null,
          section: teacher.section,
        } : null,
        enrollment: {
          status: isEnrolled ? "enrolled" : "available",
          enrolledAt: enrollmentRes.rows[0]?.created_at || new Date().toISOString(),
        },
        stats: {
          assignments: assignments.length,
          quizzes: quizzes.length,
          materials: materials.length,
          students: enrolledStudentsCount,
        },
        progress: {
          percentage: progressPercentage,
          completedCount: completedActivities,
          totalCount: totalActivities,
        },
        attendance: attendanceData,
        assignments,
        quizzes,
        materials,
        announcements,
      });
    } catch (error) {
      console.error("GET Student Course Details Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching course details.",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/student/courses/dashboard/summary
 * (and /api/student/dashboard/summary)
 * Fetch dynamic summary data for Student Dashboard (stats, courses, assignments, activity)
 */
router.get(["/dashboard/summary", "/dashboard"], authenticate, authorizeRoles("student", "admin"), async (req, res) => {
  try {
    const uid = req.user.uid;

    // 1. Fetch Student Profile info
    const userRes = await pool.query(
      `SELECT 
        u.uid,
        u.name,
        u.email,
        COALESCE(sp.register_number, u.register_number, u.uid) AS "registerNumber",
        COALESCE(d.code, u.department, sp.department, 'AI&DS') AS department,
        d.name AS department_name,
        COALESCE(sp.degree, 'B.Tech') AS degree,
        COALESCE(sp.year, 3) AS year,
        COALESCE(sp.semester, 5) AS semester,
        COALESCE(sp.section, 'A') AS section
       FROM users u
       LEFT JOIN student_profiles sp ON u.uid = sp.uid
       LEFT JOIN departments d ON (
         u.department = d.id::text 
         OR UPPER(u.department) = UPPER(d.code) 
         OR UPPER(u.department) = UPPER(d.name)
       )
       WHERE u.uid = $1;`,
      [uid]
    );

    const studentProfile = userRes.rows[0] || {};
    const studentSection = studentProfile.section || 'A';

    // 2. Fetch Enrolled Courses for this student
    const enrolledQuery = `
      SELECT DISTINCT ON (c.id)
        c.id,
        c.code,
        c.name AS title,
        c.description,
        c.credit,
        c.category,
        c.sem,
        c.year,
        tu.name AS teacher_name,
        tu.email AS teacher_email,
        sct.academic_year AS assigned_section
      FROM courses c
      LEFT JOIN student_course_teacher sct ON c.id = sct.course_id AND sct.student_uid = $1
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_uid = $1
      LEFT JOIN users tu ON sct.teacher_uid = tu.uid
      WHERE sct.student_uid = $1 OR ce.student_uid = $1
      ORDER BY c.id, c.code;
    `;
    const enrolledRes = await pool.query(enrolledQuery, [uid]);

    // Compute progress and details for each enrolled course
    const coursesList = await Promise.all(
      enrolledRes.rows.map(async (course, index) => {
        // Count quizzes and attempts
        const quizRes = await pool.query(
          `SELECT 
            COUNT(q.id) AS total_quizzes,
            (SELECT COUNT(*) FROM quiz_attempts qa JOIN quizzes qz ON qa.quiz_id = qz.id WHERE qz.course_id = $1 AND qa.student_uid = $2) AS completed_quizzes
           FROM quizzes q WHERE q.course_id = $1 AND q.status IN ('published', 'closed');`,
          [course.id, uid]
        );

        // Count assignments and submissions
        const assignRes = await pool.query(
          `SELECT 
            COUNT(a.id) AS total_assignments,
            (SELECT COUNT(*) FROM assignment_submissions sub JOIN assignments asg ON sub.assignment_id = asg.id WHERE asg.course_id = $1 AND sub.student_uid = $2) AS completed_assignments
           FROM assignments a WHERE a.course_id = $1 AND a.status IN ('published', 'closed');`,
          [course.id, uid]
        );

        const totalQuizzes = parseInt(quizRes.rows[0]?.total_quizzes, 10) || 0;
        const completedQuizzes = parseInt(quizRes.rows[0]?.completed_quizzes, 10) || 0;
        const totalAssignments = parseInt(assignRes.rows[0]?.total_assignments, 10) || 0;
        const completedAssignments = parseInt(assignRes.rows[0]?.completed_assignments, 10) || 0;

        const totalActivities = totalQuizzes + totalAssignments;
        const completedActivities = completedQuizzes + completedAssignments;
        const progressPercentage = totalActivities > 0 ? Math.min(100, Math.round((completedActivities / totalActivities) * 100)) : 0;

        const assets = getVisualAssets(index);

        return {
          id: course.id,
          code: course.code,
          name: course.title,
          instructor: course.teacher_name || "Faculty Member",
          progress: progressPercentage,
          color: assets.color,
          icon: index % 4 === 0 ? "🤖" : index % 4 === 1 ? "🗄️" : index % 4 === 2 ? "🧠" : "💻",
        };
      })
    );

    // 3. Overall Attendance Calculation
    let averageAttendance = 85; // Default fallback
    try {
      const attRes = await pool.query(
        `SELECT 
          COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present_count,
          COUNT(*) AS total_count
         FROM attendance WHERE student_uid = $1;`,
        [uid]
      );
      const totalAtt = parseInt(attRes.rows[0]?.total_count, 10) || 0;
      const presentAtt = parseInt(attRes.rows[0]?.present_count, 10) || 0;
      if (totalAtt > 0) {
        averageAttendance = Math.round((presentAtt / totalAtt) * 100);
      }
    } catch (attErr) {
      console.error("Dashboard attendance query error:", attErr);
    }

    // 4. Fetch Pending Assignments
    const now = new Date();
    const pendingAssignRes = await pool.query(
      `SELECT DISTINCT ON (a.id)
        a.id,
        a.title,
        c.name AS course_name,
        c.code AS course_code,
        a.due_at,
        sub.id AS submission_id
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       LEFT JOIN student_course_teacher sct ON a.course_id = sct.course_id AND sct.student_uid = $1
       LEFT JOIN course_enrollments ce ON a.course_id = ce.course_id AND ce.student_uid = $1
       LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_uid = $1
       WHERE (sct.student_uid = $1 OR ce.student_uid = $1)
         AND a.status IN ('published', 'closed')
         AND sub.id IS NULL
       ORDER BY a.id, a.due_at ASC;`,
      [uid]
    );

    const pendingAssignmentsList = pendingAssignRes.rows.map((row) => {
      const dueAtDate = row.due_at ? new Date(row.due_at) : null;
      const hoursLeft = dueAtDate ? (dueAtDate.getTime() - now.getTime()) / (1000 * 60 * 60) : 999;
      let statusStr = "Pending";
      if (hoursLeft <= 24 && hoursLeft > 0) {
        statusStr = "Urgent";
      } else if (hoursLeft < 0) {
        statusStr = "Overdue";
      }

      let dueFormatted = "No deadline";
      if (dueAtDate && !isNaN(dueAtDate.getTime())) {
        dueFormatted = dueAtDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      return {
        id: row.id,
        title: row.title,
        course: row.course_name,
        courseCode: row.course_code,
        due: dueFormatted,
        status: statusStr,
      };
    });

    // 5. Calculate GPA / Grade Performance
    let currentGpa = 3.8;
    try {
      const gpaRes = await pool.query(
        `SELECT 
          AVG(qa.score * 100.0 / NULLIF(q.total_marks, 0)) AS avg_pct
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id = q.id
         WHERE qa.student_uid = $1;`,
        [uid]
      );
      if (gpaRes.rows[0]?.avg_pct) {
        const pct = parseFloat(gpaRes.rows[0].avg_pct);
        currentGpa = parseFloat(((pct / 100) * 4.0).toFixed(1));
        if (currentGpa > 4.0) currentGpa = 4.0;
        if (currentGpa < 2.0) currentGpa = 3.2;
      }
    } catch (gpaErr) {
      console.error("GPA calculation error:", gpaErr);
    }

    // 6. Fetch Recent Activity Timeline
    const activities = [];

    // Recent Quiz attempts
    const recentQuizRes = await pool.query(
      `SELECT qa.id, qa.score, qa.created_at, q.title AS quiz_title, q.total_marks, c.name AS course_name
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       JOIN courses c ON q.course_id = c.id
       WHERE qa.student_uid = $1
       ORDER BY qa.created_at DESC LIMIT 3;`,
      [uid]
    );

    recentQuizRes.rows.forEach((q) => {
      activities.push({
        id: `quiz_${q.id}`,
        type: "quiz",
        title: "Quiz completed",
        detail: `${q.course_name} · Score: ${q.score}/${q.total_marks}`,
        createdAt: q.created_at,
        timeAgo: "Recently",
        color: "purple",
      });
    });

    // Recent Assignment Submissions
    const recentSubRes = await pool.query(
      `SELECT sub.id, sub.submitted_at, a.title AS assign_title, c.name AS course_name
       FROM assignment_submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE sub.student_uid = $1
       ORDER BY sub.submitted_at DESC LIMIT 3;`,
      [uid]
    );

    recentSubRes.rows.forEach((s) => {
      activities.push({
        id: `sub_${s.id}`,
        type: "assignment",
        title: "Assignment submitted",
        detail: `${s.course_name} · ${s.assign_title}`,
        createdAt: s.submitted_at,
        timeAgo: "Recently",
        color: "green",
      });
    });

    // Sort combined activities by date descending
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const topActivities = activities.slice(0, 4);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          uid: studentProfile.uid,
          name: studentProfile.name,
          firstName: studentProfile.name ? studentProfile.name.split(" ")[0] : "Student",
          email: studentProfile.email,
          department: studentProfile.department || "AI&DS",
          departmentName: studentProfile.department_name || studentProfile.department || "Artificial Intelligence & Data Science",
          registerNumber: studentProfile.registerNumber,
          semester: studentProfile.semester,
          section: studentSection,
          degree: studentProfile.degree,
        },
        stats: {
          enrolledCoursesCount: coursesList.length,
          averageAttendance,
          pendingAssignmentsCount: pendingAssignmentsList.length,
          currentGpa,
        },
        courses: coursesList,
        assignments: pendingAssignmentsList.slice(0, 4),
        activities: topActivities,
      },
    });
  } catch (error) {
    console.error("GET Student Dashboard Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load student dashboard summary.",
      error: error.message,
    });
  }
});

export default router;

