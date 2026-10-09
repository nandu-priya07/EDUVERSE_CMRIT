import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./src/pages/login.js";
import userRoutes from "./src/routes/userRoutes.js";
import homeRoutes from "./src/pages/home.js";
import studentProfileRoutes from "./src/pages/StudentProfile.js";
import studentCoursesRoutes from "./src/pages/StudentCourses.js";
import teacherProfileRoutes from "./src/pages/TeacherProfile.js";
import teacherCoursesRoutes from "./src/pages/TeacherCourses.js";
import teacherQuizRoutes from "./src/routes/teacherQuizRoutes.js";
import studentQuizRoutes from "./src/routes/studentQuizRoutes.js";
import teacherAssignmentRoutes from "./src/routes/teacherAssignmentRoutes.js";
import studentAssignmentRoutes from "./src/routes/studentAssignmentRoutes.js";
import studentEnrollmentRoutes from "./src/pages/StudentEnrollment.js";
import adminStudentsRoutes from "./src/pages/AdminStudents.js";
import adminDepartmentsRoutes from "./src/pages/AdminDepartments.js";
import adminTeachersRoutes from "./src/pages/AdminTeachers.js";
import adminCoursesRoutes from "./src/pages/AdminCourses.js";
import adminDashboardRoutes from "./src/pages/AdminDashboard.js";
import adminCourseAssignmentsRoutes from "./src/pages/AdminCourseAssignments.js";
import adminEnrollmentRoutes from "./src/pages/AdminEnrollment.js";
import adminResultsRoutes from "./src/pages/AdminResults.js";
import studentResultsApiRoutes from "./src/pages/StudentResultsApi.js";
import materialRoutes from "./src/routes/materialRoutes.js";
import aiLearningRoutes from "./src/routes/aiLearningRoutes.js";
import adminAnalyticsRoutes from "./src/routes/adminAnalyticsRoutes.js";

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/student/profile", studentProfileRoutes);
app.use("/api/student/courses", studentCoursesRoutes);
app.use("/api/student/enrollment", studentEnrollmentRoutes);
app.use("/api/student/assignments", studentAssignmentRoutes);
app.use("/api/student/results", studentResultsApiRoutes);
app.use("/api/student/ai-learning", aiLearningRoutes);
app.use("/api/student", studentQuizRoutes);
app.use("/api/teacher/profile", teacherProfileRoutes);
app.use("/api/teacher/courses", teacherCoursesRoutes);
app.use("/api/teacher/assignments", teacherAssignmentRoutes);
app.use("/api/teacher", teacherQuizRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/students", adminStudentsRoutes);
app.use("/api/admin/departments", adminDepartmentsRoutes);
app.use("/api/admin/teachers", adminTeachersRoutes);
app.use("/api/admin/courses", adminCoursesRoutes);
app.use("/api/admin/course-assignments", adminCourseAssignmentsRoutes);
app.use("/api/admin/enrollment-settings", adminEnrollmentRoutes);
app.use("/api/admin/enrollment", adminEnrollmentRoutes);
app.use("/api/admin/results", adminResultsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);




// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "SmartCampus LMS Backend is running smoothly.",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SmartCampus Backend server running on http://localhost:${PORT}`);
});

export default app;