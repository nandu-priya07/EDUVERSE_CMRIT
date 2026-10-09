
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to backend root directory
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Pool } = pg;

// Initialize PostgreSQL Connection Pool for Supabase
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.SUPABASE_HOST,
      port: process.env.SUPABASE_PORT
        ? parseInt(process.env.SUPABASE_PORT, 10)
        : 6543,
      database: process.env.SUPABASE_DB || "postgres",
      user: process.env.SUPABASE_USER,
      password: process.env.SUPABASE_PASSWORD,
      ssl: { rejectUnauthorized: false },
    };

export const pool = new Pool(poolConfig);

let initPromise = null;

/**
 * Initialize database tables
 */
export async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {

  // USERS TABLE
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,

      role VARCHAR(50) NOT NULL
        CHECK (role IN ('student', 'teacher', 'hod', 'admin')),


      department VARCHAR(255),
      register_number VARCHAR(255),
      employee_id VARCHAR(255),

      is_active BOOLEAN DEFAULT TRUE,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      created_by VARCHAR(255)
    );
  `;

  // STUDENT PROFILES TABLE
  const createStudentProfilesTableQuery = `
    CREATE TABLE IF NOT EXISTS student_profiles (
      uid VARCHAR(255) PRIMARY KEY,

      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(20),
      register_number VARCHAR(100),
      programme VARCHAR(100),
      department VARCHAR(255),
      batch_year VARCHAR(50),
      academic_status VARCHAR(50) DEFAULT 'Active',
      year INTEGER CHECK (year BETWEEN 1 AND 4),
      semester INTEGER CHECK (semester BETWEEN 1 AND 8),
      quota VARCHAR(50),
      expected_year_of_passing INTEGER,
      section VARCHAR(20),
      aadhar_number VARCHAR(30),
      is_hostel BOOLEAN DEFAULT FALSE,

      date_of_birth DATE,
      degree VARCHAR(100),
      profile_image TEXT,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_student_profile_user
        FOREIGN KEY (uid)
        REFERENCES users(uid)
        ON DELETE CASCADE
    );
  `;

  // STUDENT GUARDIANS TABLE
  const createStudentGuardiansTableQuery = `
    CREATE TABLE IF NOT EXISTS student_guardians (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

      student_uid VARCHAR(255) NOT NULL,

      relation VARCHAR(30) NOT NULL
        CHECK (relation IN ('father', 'mother', 'guardian')),

      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      occupation VARCHAR(100),
      annual_income VARCHAR(50),
      aadhar_number VARCHAR(30),
      address TEXT,

      is_primary BOOLEAN DEFAULT FALSE,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_guardian_student
        FOREIGN KEY (student_uid)
        REFERENCES users(uid)
        ON DELETE CASCADE,

      CONSTRAINT unique_student_guardian
        UNIQUE (student_uid, relation)
    );
  `;

  // STUDENT ACADEMIC DETAILS TABLE
  const createStudentAcademicDetailsTableQuery = `
    CREATE TABLE IF NOT EXISTS student_academic_details (
      student_uid VARCHAR(255) PRIMARY KEY,

      -- 10th Standard Academic Details
      tenth_marks VARCHAR(50),
      tenth_percentage NUMERIC(5,2),
      tenth_year_of_passing INTEGER,
      tenth_medium VARCHAR(50),
      tenth_board VARCHAR(100),
      tenth_school_name VARCHAR(255),

      -- 12th Standard Academic Details
      twelfth_marks VARCHAR(50),
      twelfth_percentage NUMERIC(5,2),
      twelfth_year_of_passing INTEGER,
      twelfth_medium VARCHAR(50),
      twelfth_board VARCHAR(100),
      twelfth_school_name VARCHAR(255),

      -- Diploma Academic Details
      diploma_marks VARCHAR(50),
      diploma_percentage NUMERIC(5,2),
      diploma_year_of_passing INTEGER,
      diploma_institute_name VARCHAR(255),

      -- Under Graduate (UG) Academic Details
      ug_marks VARCHAR(50),
      ug_programme VARCHAR(100),
      ug_cgpa NUMERIC(4,2),
      ug_percentage NUMERIC(5,2),
      ug_year_of_passing INTEGER,
      ug_college_name VARCHAR(255),

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_academic_details_student
        FOREIGN KEY (student_uid)
        REFERENCES users(uid)
        ON DELETE CASCADE
    );
  `;

  // FACULTY PROFILES TABLE
  const createTeacherProfilesTableQuery = `
    CREATE TABLE IF NOT EXISTS teacher_profiles (
      uid VARCHAR(255) PRIMARY KEY,

      -- Personal Details
      name VARCHAR(255),
      email VARCHAR(255),
      full_name VARCHAR(255),
      phone VARCHAR(20),
      alternate_phone VARCHAR(20),
      date_of_birth DATE,
      gender VARCHAR(30),

      -- Address Details
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',

      -- Professional Details
      employee_id VARCHAR(100) UNIQUE,
      designation VARCHAR(150),
      department VARCHAR(255),
      qualification VARCHAR(255),
      specialization VARCHAR(255),
      experience_years NUMERIC(4,1) DEFAULT 0,

      -- Employment Details
      joining_date DATE,
      employment_type VARCHAR(50),
      office_location VARCHAR(255),

      -- Additional Details
      profile_image TEXT,
      bio TEXT,

      -- Emergency Contact
      emergency_contact_name VARCHAR(255),
      emergency_contact_phone VARCHAR(20),
      emergency_contact_relation VARCHAR(50),

      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_teacher_profile_user
        FOREIGN KEY (uid)
        REFERENCES users(uid)
        ON DELETE CASCADE
    );
  `;
  // SEMESTER COURSES TABLE
  const createSemesterCoursesTableQuery = `
    CREATE TABLE IF NOT EXISTS semester_courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      department_id UUID NOT NULL,
      course_id UUID NOT NULL,

      year SMALLINT NOT NULL
        CHECK (year BETWEEN 1 AND 4),

      sem SMALLINT NOT NULL
        CHECK (sem BETWEEN 1 AND 8),

      academic_year VARCHAR(20) NOT NULL,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_semester_course_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

      CONSTRAINT fk_semester_course_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

      CONSTRAINT unique_semester_course
        UNIQUE (department_id, course_id, year, sem, academic_year)
    );
  `;

  // DEPARTMENTS TABLE
  const createDepartmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      name VARCHAR(150) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      description TEXT,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // COURSES TABLE
  const createCoursesTableQuery = `
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      name VARCHAR(150) NOT NULL,
      code VARCHAR(30) NOT NULL,
      description TEXT,

      department_id UUID NOT NULL,

      credit NUMERIC(3,1) NOT NULL
        CHECK (credit >= 0),

      category VARCHAR(50),

      sem SMALLINT NOT NULL
        CHECK (sem BETWEEN 1 AND 8),

      year SMALLINT NOT NULL
        CHECK (year BETWEEN 1 AND 4),

      academic_year VARCHAR(50) DEFAULT '2024-2025',

      thumbnail_url TEXT,
      syllabus_url TEXT,
      learning_objectives TEXT,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_course_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT,

      CONSTRAINT unique_course_department_sem_year
        UNIQUE (code, department_id, sem, year)
    );

    ALTER TABLE courses ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '2024-2025';
  `;


  const createCourseEnrollmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      student_uid VARCHAR(255) NOT NULL,
      course_id UUID NOT NULL,

      enrollment_date TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

      status VARCHAR(30) NOT NULL DEFAULT 'enrolled'
        CHECK (status IN ('enrolled', 'completed', 'dropped')),

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_enrollment_student
        FOREIGN KEY (student_uid)
        REFERENCES users(uid)
        ON DELETE CASCADE,

      CONSTRAINT fk_enrollment_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

      CONSTRAINT unique_student_course
        UNIQUE (student_uid, course_id)
    );

    ALTER TABLE course_enrollments DROP COLUMN IF EXISTS semester_id;
  `;

  const createStudentCourseTeacherTableQuery = `
    CREATE TABLE IF NOT EXISTS student_course_teacher (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      student_uid VARCHAR(255) NOT NULL,
      course_id UUID NOT NULL,
      teacher_uid VARCHAR(255) NOT NULL,

      academic_year VARCHAR(20) NOT NULL,
      enrollment_status VARCHAR(20) DEFAULT 'enrolled'
        CHECK (enrollment_status IN ('enrolled', 'completed', 'dropped')),

      enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_sct_student
        FOREIGN KEY (student_uid)
        REFERENCES users(uid)
        ON DELETE CASCADE,

      CONSTRAINT fk_sct_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_sct_teacher
        FOREIGN KEY (teacher_uid)
        REFERENCES users(uid)
        ON DELETE RESTRICT,

      CONSTRAINT unique_student_course
        UNIQUE (student_uid, course_id, academic_year)
    );
  `;

  // INDEXES
  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_users_role
      ON users(role);

    CREATE INDEX IF NOT EXISTS idx_users_department
      ON users(department);

    CREATE INDEX IF NOT EXISTS idx_courses_department
      ON courses(department_id);

    CREATE INDEX IF NOT EXISTS idx_courses_sem_year
      ON courses(sem, year);

    CREATE INDEX IF NOT EXISTS idx_semester_courses_dept_sem
      ON semester_courses(department_id, sem, year);

    CREATE INDEX IF NOT EXISTS idx_sct_student
      ON student_course_teacher(student_uid);

    CREATE INDEX IF NOT EXISTS idx_sct_teacher
      ON student_course_teacher(teacher_uid);

    CREATE INDEX IF NOT EXISTS idx_sct_course
      ON student_course_teacher(course_id);
  `;

  let client;

  try {
    client = await pool.connect();

    // Create tables in dependency order
    await client.query(createUsersTableQuery);
    await client.query(createStudentProfilesTableQuery);
    await client.query(createStudentGuardiansTableQuery);
    await client.query(createStudentAcademicDetailsTableQuery);
    await client.query(createTeacherProfilesTableQuery);

    // Alter table migrations to add student_profiles columns if missing
    const alterQueries = [
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS register_number VARCHAR(100);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS programme VARCHAR(100);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS department VARCHAR(255);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS batch_year VARCHAR(50);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_status VARCHAR(50) DEFAULT 'Active';`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS quota VARCHAR(50);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS expected_year_of_passing INTEGER;`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(30);`,
      `ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_hostel BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS annual_income VARCHAR(50);`,
      `ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(30);`,
      `ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
      `ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);`
    ];

    for (const q of alterQueries) {
      try { await client.query(q); } catch (err) { /* column exists or minor timeout */ }
    }

    // Sync name and email from users table for existing records
    try {
      await client.query(`
        UPDATE student_profiles sp
        SET name = u.name,
            email = u.email,
            updated_at = CURRENT_TIMESTAMP
        FROM users u
        WHERE sp.uid = u.uid
          AND (sp.name IS NULL OR sp.email IS NULL OR sp.name IS DISTINCT FROM u.name OR sp.email IS DISTINCT FROM u.email);
      `);
    } catch (e) {}

    try {
      await client.query(`
        UPDATE teacher_profiles tp
        SET name = u.name,
            full_name = COALESCE(tp.full_name, u.name),
            email = u.email,
            updated_at = CURRENT_TIMESTAMP
        FROM users u
        WHERE tp.uid = u.uid
          AND (tp.name IS NULL OR tp.email IS NULL OR tp.name IS DISTINCT FROM u.name OR tp.email IS DISTINCT FROM u.email);
      `);
    } catch (e) {}

    // Department must exist before courses
    await client.query(createDepartmentsTableQuery);
    await client.query(createCoursesTableQuery);

    // Drop old FK on course_enrollments if it referenced semesters
    try {
      await client.query(`ALTER TABLE IF EXISTS course_enrollments DROP CONSTRAINT IF EXISTS fk_enrollment_semester;`);
      await client.query(`DROP TABLE IF EXISTS semesters CASCADE;`);
    } catch (e) {}

    const createCourseTeacherAssignmentsTableQuery = `
      CREATE TABLE IF NOT EXISTS course_teacher_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        teacher_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        academic_year VARCHAR(50) NOT NULL DEFAULT '2026-2027',
        semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
        section VARCHAR(50) DEFAULT 'Section A',
        role VARCHAR(50) DEFAULT 'Primary',
        status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_course_teacher_year_sem_role_sec UNIQUE (course_id, teacher_uid, academic_year, semester, section, role)
      );
    `;

    const createEnrollmentSettingsTableQuery = `
      CREATE TABLE IF NOT EXISTS enrollment_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        academic_year VARCHAR(50) NOT NULL,
        semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
        is_enabled BOOLEAN DEFAULT TRUE,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_academic_year_semester UNIQUE (academic_year, semester)
      );
    `;

    // Create remaining tables
    await client.query(createSemesterCoursesTableQuery);
    await client.query(createCourseEnrollmentsTableQuery);
    await client.query(createStudentCourseTeacherTableQuery);
    await client.query(createCourseTeacherAssignmentsTableQuery);
    await client.query(createEnrollmentSettingsTableQuery);

    try {
      await client.query(`ALTER TABLE course_teacher_assignments ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'Section A';`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cta_unique ON course_teacher_assignments(course_id, teacher_uid, academic_year, semester, section, role);`);
      
      await client.query(`ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '2026-2027';`);
      await client.query(`ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS semester SMALLINT DEFAULT 5;`);
      await client.query(`ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS enrolled_by VARCHAR(255);`);
      await client.query(`ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS enrollment_type VARCHAR(50) DEFAULT 'student';`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_course_year ON course_enrollments(student_uid, course_id, academic_year);`);
    } catch (e) {}

    // Seed default enrollment settings if empty
    try {
      const checkSettings = await client.query(`SELECT COUNT(*) FROM enrollment_settings;`);
      if (parseInt(checkSettings.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO enrollment_settings (academic_year, semester, is_enabled, start_date, end_date)
          VALUES 
            ('2026-2027', 5, true, NOW() - INTERVAL '7 days', NOW() + INTERVAL '14 days'),
            ('2026-2027', 6, true, NOW(), NOW() + INTERVAL '20 days'),
            ('2027-2028', 7, false, NULL, NULL)
          ON CONFLICT (academic_year, semester) DO NOTHING;
        `);
      }
    } catch (e) {}

    const createQuizzesTableQuery = `
      CREATE TABLE IF NOT EXISTS quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        teacher_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
        total_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00,
        max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        randomize_questions BOOLEAN DEFAULT FALSE,
        show_answers_after_submission BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createQuizQuestionsTableQuery = `
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('mcq', 'multiple_select', 'true_false', 'short_answer')),
        options JSONB,
        correct_answer JSONB,
        marks NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (marks >= 0),
        display_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createQuizAttemptsTableQuery = `
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        student_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMPTZ,
        score NUMERIC(6,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_quiz_student_attempt UNIQUE (quiz_id, student_uid, attempt_number)
      );
    `;

    const createQuizAnswersTableQuery = `
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
        answer JSONB,
        awarded_marks NUMERIC(5,2) DEFAULT 0.00,
        feedback TEXT,
        evaluated_by VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
        evaluated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
      );
    `;

    const createAssignmentsTableQuery = `
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        teacher_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
        start_at TIMESTAMPTZ,
        due_at TIMESTAMPTZ NOT NULL,
        allow_late_submission BOOLEAN DEFAULT FALSE,
        max_file_size_mb INTEGER DEFAULT 10,
        allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx'],
        attachment_url TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createAssignmentSubmissionsTableQuery = `
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        student_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        submission_text TEXT,
        file_url TEXT,
        submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'graded', 'returned')),
        marks_obtained NUMERIC(6,2),
        feedback TEXT,
        graded_by VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
        graded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_assignment_student_submission UNIQUE (assignment_id, student_uid)
      );
    `;

    const createStudentResultsTableQuery = `
      CREATE TABLE IF NOT EXISTS student_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
        course_code VARCHAR(50) NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        batch_year VARCHAR(50) NOT NULL,
        academic_year VARCHAR(50) NOT NULL,
        semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
        section VARCHAR(20) DEFAULT 'A',
        internal_marks NUMERIC(5,2) DEFAULT 0,
        internal_max_marks NUMERIC(5,2) DEFAULT 50,
        external_marks NUMERIC(5,2) DEFAULT 0,
        external_max_marks NUMERIC(5,2) DEFAULT 50,
        total_marks NUMERIC(5,2) DEFAULT 0,
        max_marks NUMERIC(5,2) DEFAULT 100,
        grade VARCHAR(10) DEFAULT 'F',
        grade_points NUMERIC(4,2) DEFAULT 0,
        credits NUMERIC(4,2) DEFAULT 3,
        status VARCHAR(20) DEFAULT 'Pass' CHECK (status IN ('Pass', 'Fail', 'Absent', 'Withheld')),
        is_draft BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        CONSTRAINT unique_student_course_sem_year UNIQUE (student_uid, course_code, semester, academic_year)
      );
    `;

    const createResultPublicationsTableQuery = `
      CREATE TABLE IF NOT EXISTS result_publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department VARCHAR(255) NOT NULL,
        batch_year VARCHAR(50) NOT NULL,
        academic_year VARCHAR(50) NOT NULL,
        semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
        section VARCHAR(20) DEFAULT 'All',
        status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ready to Publish', 'Published', 'Unpublished')),
        published_at TIMESTAMPTZ,
        published_by VARCHAR(255),
        unpublished_at TIMESTAMPTZ,
        unpublished_by VARCHAR(255),
        unpublish_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_publication_dept_batch_year_sem_sec UNIQUE (department, batch_year, academic_year, semester, section)
      );
    `;

    const createResultAuditLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS result_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(50) NOT NULL,
        student_result_id UUID REFERENCES student_results(id) ON DELETE SET NULL,
        student_uid VARCHAR(255),
        course_code VARCHAR(50),
        department VARCHAR(255),
        academic_year VARCHAR(50),
        semester SMALLINT,
        section VARCHAR(20),
        old_value JSONB,
        new_value JSONB,
        performed_by VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createAIRequestLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS ai_request_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_name VARCHAR(100) NOT NULL,
        user_uid VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
        user_role VARCHAR(50),
        department VARCHAR(255),
        course_code VARCHAR(50),
        prompt_summary TEXT,
        model_name VARCHAR(100) DEFAULT 'gemini-3.5-flash',
        is_local_model BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
        error_message TEXT,
        latency_ms INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createLMSActivityLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS lms_activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_type VARCHAR(100) NOT NULL,
        user_uid VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
        user_role VARCHAR(50),
        department VARCHAR(255),
        course_id UUID,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createTimetablesTableQuery = `
      CREATE TABLE IF NOT EXISTS timetables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        teacher_uid VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
        department VARCHAR(255) NOT NULL,
        semester INTEGER NOT NULL,
        section VARCHAR(50) NOT NULL,
        academic_year VARCHAR(50) DEFAULT '2026-2027',
        day_of_week VARCHAR(20) NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        slot_number INTEGER DEFAULT 1,
        room_number VARCHAR(100) DEFAULT 'Classroom 101',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createQuizzesTableQuery);
    await client.query(createQuizQuestionsTableQuery);
    await client.query(createQuizAttemptsTableQuery);
    await client.query(createQuizAnswersTableQuery);
    await client.query(createAssignmentsTableQuery);
    await client.query(createAssignmentSubmissionsTableQuery);

    await client.query(createStudentResultsTableQuery);
    await client.query(createResultPublicationsTableQuery);
    await client.query(createResultAuditLogsTableQuery);
    await client.query(createAIRequestLogsTableQuery);
    await client.query(createLMSActivityLogsTableQuery);
    await client.query(createTimetablesTableQuery);

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_results_student ON student_results(student_uid);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_results_dept_sem ON student_results(department, semester, academic_year, batch_year);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_result_publications_lookup ON result_publications(department, batch_year, academic_year, semester, section);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_request_logs_feature ON ai_request_logs(feature_name);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created ON ai_request_logs(created_at);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_lms_activity_user ON lms_activity_logs(user_uid, activity_type);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_timetables_dept_sem_sec ON timetables(department, semester, section);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON timetables(teacher_uid, day_of_week);`);
    } catch (e) {}

    try { await client.query(createIndexesQuery); } catch (e) {}

    console.log("✓ Database tables initialized successfully.");

  } catch (error) {
    console.error(
      "✗ Database initialization error:",
      error.message || error
    );
    throw error;
  } finally {
    client?.release();
  }
  })();

  return initPromise;
}

// Auto-initialize database
initDatabase().catch((error) => {
  console.error("Database startup failed:", error.message);
});