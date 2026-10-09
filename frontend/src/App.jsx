import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import StudentDashboard from "./pages/studentdashboard";
import StudentProfile from "./pages/StudentProfile";
import StudentCourses from "./pages/StudentCourses";
import CourseDetails from "./pages/CourseDetails";
import StudentAssignments from "./pages/StudentAssignments";
import StudentAttendance from "./pages/StudentAttendance";
import StudentResults from "./pages/StudentResults";
import StudentAILearning from "./pages/StudentAILearning";
import StudentSettings from "./pages/StudentSettings";
import CourseEnrollment from "./pages/CourseEnrollment";
import TeacherMyCourses from "./pages/TeacherMyCourses";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherAssignments from "./pages/TeacherAssignments";
import CreateAssignment from "./pages/CreateAssignment";
import TeacherAssessments from "./pages/TeacherAssessments";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import TeacherAITools from "./pages/TeacherAITools";
import TeacherProfile from "./pages/TeacherProfile";
import TeacherCourseDetails from "./pages/TeacherCourseDetails";
import CreateQuiz from "./pages/CreateQuiz";
import TeacherQuizResults from "./pages/TeacherQuizResults";
import StudentQuizAttempt from "./pages/StudentQuizAttempt";
import StudentQuizResult from "./pages/StudentQuizResult";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStudents from "./pages/AdminStudents";
import AdminTeachers from "./pages/AdminTeachers";
import AdminDepartments from "./pages/AdminDepartments";
import AdminCourses from "./pages/AdminCourses";
import AdminSettings from "./pages/AdminSettings";
import AdminCourseAssignment from "./pages/AdminCourseAssignment";
import AdminEnrollment from "./pages/AdminEnrollment";
import AdminResults from "./pages/AdminResults";
import AdminAnalytics from "./pages/AdminAnalytics";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/studentdashboard" element={<StudentDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />

          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/courses" element={<StudentCourses />} />
          <Route path="/student/courses/:courseId" element={<CourseDetails />} />
          <Route path="/student/quizzes/:quizId" element={<StudentQuizAttempt />} />
          <Route path="/student/quiz-attempts/:attemptId/result" element={<StudentQuizResult />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/results" element={<StudentResults />} />
          <Route path="/student/ai-learning" element={<StudentAILearning />} />
          <Route path="/student/settings" element={<StudentSettings />} />
          <Route path="/student/course-enrollment" element={<CourseEnrollment />} />  

          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/courses" element={<TeacherMyCourses />} />
          <Route path="/teacher/courses/:courseId" element={<TeacherCourseDetails />} />
          <Route path="/teacher/courses/:courseId/quizzes/create" element={<CreateQuiz />} />
          <Route path="/teacher/quizzes/:quizId/results" element={<TeacherQuizResults />} />
          <Route path="/teacher/students" element={<TeacherStudents />} />  
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/assignments/create" element={<CreateAssignment />} />
          <Route path="/teacher/assessments" element={<TeacherAssessments />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          <Route path="/teacher/ai-tools" element={<TeacherAITools />} />
          <Route path="/teacher/profile" element={<TeacherProfile />} />

          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students"element={<AdminStudents />}/>
          <Route path="/admin/teachers" element={<AdminTeachers />} />
          <Route path="/admin/departments" element={<AdminDepartments />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/course-assignments" element={<AdminCourseAssignment />} />
          <Route path="/admin/enrollment" element={<AdminEnrollment />} />
          <Route path="/admin/results" element={<AdminResults />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}


export default App;