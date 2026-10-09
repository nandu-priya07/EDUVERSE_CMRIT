import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Users,
  AlertCircle,
  Send,
  Upload,
  RefreshCw,
  UserCheck,
  Calendar,
  Layers,
  HelpCircle,
  Bell,
  Sparkles,
  FileDown,
  Wand2,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import "./coursedetails.css";

function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Unified State for Dynamic Course Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'overview' | 'materials' | 'assignments' | 'quizzes' | 'attendance' | 'announcements'
  const [activeTab, setActiveTab] = useState("overview");

  // Category filters for Quizzes and Assignments ('All', 'Ongoing', 'Upcoming', 'Closed')
  const [quizFilter, setQuizFilter] = useState("All");
  const [assignFilter, setAssignFilter] = useState("All");

  const getQuizCategory = (quiz) => {
    const now = new Date();
    const endAt = quiz.endAt ? new Date(quiz.endAt) : null;
    const startAt = quiz.startAt ? new Date(quiz.startAt) : null;

    if (quiz.status === "Closed" || quiz.status === "closed" || (endAt && !isNaN(endAt.getTime()) && now > endAt)) {
      return "Closed";
    }
    if (startAt && !isNaN(startAt.getTime()) && now < startAt) {
      return "Upcoming";
    }
    return "Ongoing";
  };

  const getAssignmentCategory = (assign) => {
    const now = new Date();
    const dueAt = assign.dueAt ? new Date(assign.dueAt) : null;
    const startAt = assign.startAt ? new Date(assign.startAt) : null;

    if (assign.status === "Closed" || assign.publishedStatus === "closed" || (dueAt && !isNaN(dueAt.getTime()) && now > dueAt)) {
      return "Closed";
    }
    if (startAt && !isNaN(startAt.getTime()) && now < startAt) {
      return "Upcoming";
    }
    return "Ongoing";
  };

  // State for Assignment Submission Modal/Drawer
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [fileUrlInput, setFileUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // State for Material Filter & Comic Notes Modal
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState("all");
  const [viewComicModalData, setViewComicModalData] = useState(null);
  const [comicActiveView, setComicActiveView] = useState("full_image");

  // Fetch complete dynamic course data from backend API
  const fetchCourseDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/student/courses/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch course details.");
      }

      setData(result);
    } catch (err) {
      console.error("Course details fetch error:", err);
      setError(err.message || "An error occurred while loading the course.");
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, fetchCourseDetails]);

  // Handle Submit Assignment Action
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/student/assignments/${selectedAssignment.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionText,
            fileUrl: fileUrlInput,
          }),
        }
      );

      const submitData = await res.json();
      if (!res.ok || !submitData.success) {
        throw new Error(submitData.message || "Failed to submit assignment.");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedAssignment(null);
        setSubmissionText("");
        setFileUrlInput("");
        setSubmitSuccess(false);
        fetchCourseDetails(); // Auto refresh course statistics and status
      }, 1200);
    } catch (err) {
      console.error("Submit assignment error:", err);
      setSubmitError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="cd-layout">
        <StudentSidebar activeItem="My Courses" />
        <div
          className="cd-loading-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            width: "100%",
            color: "#e2e8f0",
          }}
        >
          <div
            className="cd-spinner"
            style={{
              width: "42px",
              height: "42px",
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#a855f7",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "1rem",
            }}
          />
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading course details...</p>
        </div>
      </div>
    );
  }

  // Error / Not Found / Security Check Screen
  if (error || !data || !data.course) {
    return (
      <div className="cd-layout">
        <StudentSidebar activeItem="My Courses" />
        <div
          className="cd-error-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            width: "100%",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "grid",
              placeItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <AlertCircle size={32} />
          </div>
          <h2 style={{ color: "#f8fafc", fontSize: "22px", marginBottom: "0.5rem" }}>
            Unable to Load Course
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "450px", marginBottom: "2rem", lineHeight: "1.6" }}>
            {error || "Course not found or you do not have permission to view it."}
          </p>
          <button
            className="cd-back"
            onClick={() => navigate("/student/courses")}
            style={{
              background: "#302347",
              border: "1px solid #654c9b",
              color: "#d2c1ff",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            ← Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  // Destructure Dynamic Data
  const {
    course,
    student,
    teacher,
    stats = {},
    progress = {},
    attendance,
    assignments = [],
    quizzes = [],
    materials = [],
    announcements = [],
    performance = {},
  } = data;

  const overallPerf = performance?.overall || {};
  const coursePerf = performance?.course || {};

  const teacherName = teacher ? teacher.name : "--";
  const teacherEmail = teacher ? teacher.email : "--";
  const teacherDept = teacher ? teacher.department : "--";
  const teacherDesig = teacher ? teacher.designation : "--";
  const teacherInitials = teacherName !== "--" ? teacherName.charAt(0).toUpperCase() : "--";

  const studentName = student ? student.name : "Student";
  const studentInitials = studentName.charAt(0).toUpperCase();

  return (
    <div className="cd-layout">
      {/* Fixed Common Student Sidebar */}
      <StudentSidebar activeItem="My Courses" />

      {/* Main Container */}
      <main className="cd-main">
        {/* Topbar */}
        <header className="cd-topbar">
          <div className="cd-breadcrumb">
            <span>My Courses</span> / <strong>{course.code}</strong>
          </div>
          <div className="cd-top-user">
            <div className="cd-avatar">{studentInitials}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ color: "#f4f2fa", fontSize: "13px" }}>{studentName}</strong>
              <small style={{ color: "#9291a5", fontSize: "10px" }}>
                Section {student.section || "A"} · Sem {student.semester || 5}
              </small>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="cd-content">
          <button className="cd-back" onClick={() => navigate("/student/courses")}>
            ← Back to My Courses
          </button>

          {/* Dynamic Course Header */}
          <section className="cd-course-header">
            <div className="cd-course-info">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span className="cd-category">{course.category || "Professional Core"}</span>
                <span className="cd-course-code">{course.code}</span>
              </div>
              <h1>{course.name}</h1>
              <p style={{ margin: "8px 0 16px" }}>{course.description || "--"}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "#b5b3c4", fontSize: "12px", marginBottom: "16px" }}>
                <div>
                  <span style={{ color: "#77758b" }}>Department:</span> <strong>{course.department || "--"}</strong>
                </div>
                <div>•</div>
                <div>
                  <span style={{ color: "#77758b" }}>Semester:</span> <strong>Semester {course.semester || "--"}</strong>
                </div>
                <div>•</div>
                <div>
                  <span style={{ color: "#77758b" }}>Credits:</span> <strong>{course.credits || "--"} Credits</strong>
                </div>
                <div>•</div>
                <div>
                  <span style={{ color: "#77758b" }}>Academic Year:</span> <strong>{course.academicYear || "--"}</strong>
                </div>
                <div>•</div>
                <div>
                  <span style={{ color: "#77758b" }}>Your Section:</span> <strong>Section {student.section || "A"}</strong>
                </div>
              </div>

              {/* Section Teacher Details */}
              <div className="cd-instructor">
                <div className="cd-instructor-avatar">
                  {teacherInitials}
                </div>
                <div>
                  <small>Assigned Teacher (Section {student.section || "A"})</small>
                  <strong>{teacherName}</strong>
                </div>
              </div>
            </div>

            {/* Dynamic Progress Circular Card */}
            <div className="cd-progress-card">
              <div
                className="cd-progress-ring"
                style={{
                  background: `conic-gradient(#a182ff ${(progress.percentage || 0) * 3.6}deg, #393344 ${(progress.percentage || 0) * 3.6}deg)`,
                }}
              >
                <div className="cd-ring-inner">
                  <strong>{progress.percentage || 0}%</strong>
                  <small>Completed</small>
                </div>
              </div>
              <h3>Course Progress</h3>
              <p>{progress.completedCount || 0} of {progress.totalCount || 0} activities done</p>
            </div>
          </section>

          {/* Dynamic Statistics Cards Grid */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "#14141e",
                border: "1px solid #292837",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#291f42",
                  color: "#c084fc",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <span style={{ color: "#89879c", fontSize: "11px", fontWeight: "600", display: "block", textTransform: "uppercase" }}>
                  Assignments
                </span>
                <strong style={{ fontSize: "20px", color: "#f8fafc" }}>{stats.assignments || 0}</strong>
              </div>
            </div>

            <div
              style={{
                background: "#14141e",
                border: "1px solid #292837",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#1e303d",
                  color: "#60a5fa",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Award size={20} />
              </div>
              <div>
                <span style={{ color: "#89879c", fontSize: "11px", fontWeight: "600", display: "block", textTransform: "uppercase" }}>
                  Quizzes
                </span>
                <strong style={{ fontSize: "20px", color: "#f8fafc" }}>{stats.quizzes || 0}</strong>
              </div>
            </div>

            <div
              style={{
                background: "#14141e",
                border: "1px solid #292837",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#1c352b",
                  color: "#34d399",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <span style={{ color: "#89879c", fontSize: "11px", fontWeight: "600", display: "block", textTransform: "uppercase" }}>
                  Materials
                </span>
                <strong style={{ fontSize: "20px", color: "#f8fafc" }}>{stats.materials || 0}</strong>
              </div>
            </div>

            <div
              style={{
                background: "#14141e",
                border: "1px solid #292837",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#3b232c",
                  color: "#f472b6",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <span style={{ color: "#89879c", fontSize: "11px", fontWeight: "600", display: "block", textTransform: "uppercase" }}>
                  Enrolled Students
                </span>
                <strong style={{ fontSize: "20px", color: "#f8fafc" }}>{stats.students || 0}</strong>
              </div>
            </div>
          </section>

          {/* Dynamic Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              borderBottom: "1px solid #252536",
              marginBottom: "24px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {[
              { id: "overview", label: "Overview", icon: Layers },
              { id: "performance", label: "Performance & Scores", icon: TrendingUp },
              { id: "materials", label: `Materials (${materials.length})`, icon: BookOpen },
              { id: "assignments", label: `Assignments (${assignments.length})`, icon: FileText },
              { id: "quizzes", label: `Quizzes (${quizzes.length})`, icon: Award },
              { id: "attendance", label: "Attendance", icon: Clock },
              { id: "announcements", label: `Announcements (${announcements.length})`, icon: Bell },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "8px 8px 0 0",
                    border: "none",
                    borderBottom: isActive ? "2px solid #a855f7" : "2px solid transparent",
                    background: isActive ? "#1a1528" : "transparent",
                    color: isActive ? "#c084fc" : "#94a3b8",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                >
                  <IconComp size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT PANELS */}

          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <section className="cd-description-card">
                  <h3 style={{ color: "#f8fafc", fontSize: "16px", marginBottom: "10px" }}>Course Description</h3>
                  <p style={{ color: "#cbd5e1", lineHeight: "1.7", fontSize: "13px" }}>
                    {course.description || "--"}
                  </p>
                </section>

                <section className="cd-description-card">
                  <h3 style={{ color: "#f8fafc", fontSize: "16px", marginBottom: "12px" }}>Learning Objectives</h3>
                  <ul style={{ paddingLeft: "1.2rem", margin: 0, color: "#cbd5e1", lineHeight: "1.7", fontSize: "13px" }}>
                    {course.learningObjectives && course.learningObjectives.length > 0 ? (
                      course.learningObjectives.map((obj, i) => (
                        <li key={i} style={{ marginBottom: "0.5rem" }}>{obj}</li>
                      ))
                    ) : (
                      <li>--</li>
                    )}
                  </ul>
                </section>

                {/* Course Metadata Details */}
                <section className="cd-description-card">
                  <h3 style={{ color: "#f8fafc", fontSize: "16px", marginBottom: "14px" }}>Course Metadata</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>COURSE CATEGORY</span>
                      <strong style={{ color: "#e2e8f0" }}>{course.category || "--"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>CREDITS</span>
                      <strong style={{ color: "#e2e8f0" }}>{course.credits || "--"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>DEPARTMENT</span>
                      <strong style={{ color: "#e2e8f0" }}>{course.department || "--"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>SEMESTER</span>
                      <strong style={{ color: "#e2e8f0" }}>Semester {course.semester || "--"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>ACADEMIC YEAR</span>
                      <strong style={{ color: "#e2e8f0" }}>{course.academicYear || "--"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#89879c", display: "block", fontSize: "11px" }}>PREREQUISITES</span>
                      <strong style={{ color: "#e2e8f0" }}>{course.prerequisites || "--"}</strong>
                    </div>
                  </div>
                </section>
              </div>

              {/* Teacher Card Sidebar */}
              <div>
                <section className="cd-description-card">
                  <h3 style={{ color: "#f8fafc", fontSize: "15px", marginBottom: "14px" }}>Section Teacher Information</h3>
                  {teacher ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            background: "#493765",
                            color: "#d6c3ff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "20px",
                            fontWeight: "700",
                            flexShrink: 0,
                          }}
                        >
                          {teacherInitials}
                        </div>
                        <div>
                          <strong style={{ color: "#f8fafc", fontSize: "15px", display: "block" }}>{teacherName}</strong>
                          <span style={{ color: "#c084fc", fontSize: "12px" }}>{teacherDesig}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid #282736", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                        <div>
                          <span style={{ color: "#89879c" }}>Email: </span>
                          <span style={{ color: "#e2e8f0" }}>{teacherEmail}</span>
                        </div>
                        <div>
                          <span style={{ color: "#89879c" }}>Department: </span>
                          <span style={{ color: "#e2e8f0" }}>{teacherDept}</span>
                        </div>
                        <div>
                          <span style={{ color: "#89879c" }}>Section Assigned: </span>
                          <span style={{ color: "#7ee0b0", fontWeight: "600" }}>{teacher.section || `Section ${student.section}`}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#94a3b8" }}>
                      <UserCheck size={28} style={{ marginBottom: "6px", opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: "13px" }}>Teacher: --</p>
                      <small style={{ color: "#64748b", fontSize: "11px" }}>No faculty assigned yet to Section {student.section || "A"}.</small>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* 1.5 PERFORMANCE & SCORES TAB */}
          {activeTab === "performance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Header Hero Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #181329 0%, #24163b 100%)",
                  border: "1px solid #3c2a5c",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "grid",
                  gridTemplateColumns: "1fr 280px",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span
                      style={{
                        background: "rgba(168, 85, 247, 0.2)",
                        color: "#c084fc",
                        border: "1px solid rgba(168, 85, 247, 0.4)",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Zap size={13} /> STUDENT PERFORMANCE METRICS
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>{course.code}</span>
                  </div>
                  <h2 style={{ color: "#f8fafc", fontSize: "22px", margin: "0 0 8px 0" }}>
                    {studentName}'s Academic Scorecard
                  </h2>
                  <p style={{ color: "#a1a1aa", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
                    Calculated from completed quizzes, assignments, and faculty internal assessment marks.
                  </p>
                </div>

                <div
                  style={{
                    background: "rgba(15, 11, 26, 0.6)",
                    border: "1px solid #4a346e",
                    borderRadius: "14px",
                    padding: "18px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Course Performance Score
                  </span>
                  <div style={{ fontSize: "36px", fontWeight: "800", color: "#a855f7", margin: "4px 0" }}>
                    {coursePerf.performanceScore != null ? coursePerf.performanceScore : "--"}
                    <span style={{ fontSize: "18px", color: "#94a3b8", fontWeight: "500" }}>/100</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                    <span
                      style={{
                        background: "#2e1c4d",
                        color: "#d8b4fe",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      Grade: {coursePerf.grade || "A"}
                    </span>
                    <span
                      style={{
                        background: coursePerf.status === "Needs Support" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                        color: coursePerf.status === "Needs Support" ? "#f87171" : "#4ade80",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {coursePerf.status || "Good Standing"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Overall & Course Key Metric Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {/* 1. Overall CGPA */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>OVERALL CGPA</span>
                    <div style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", padding: "6px", borderRadius: "8px" }}>
                      <Award size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginBottom: "4px" }}>
                    {overallPerf.cgpa != null ? overallPerf.cgpa : "8.50"}
                    <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "400" }}> / 10.0</span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Across all enrolled courses</span>
                </div>

                {/* 2. Overall Pass Status */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>OVERALL STANDING</span>
                    <div style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", padding: "6px", borderRadius: "8px" }}>
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#4ade80", marginBottom: "4px" }}>
                    {overallPerf.passRate || "100%"}
                  </div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>
                    {overallPerf.passedCourses != null ? overallPerf.passedCourses : stats.courses || 1} of {overallPerf.totalCourses != null ? overallPerf.totalCourses : stats.courses || 1} courses passed
                  </span>
                </div>

                {/* 3. Internal Assessment Marks */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>INTERNAL MARKS</span>
                    <div style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", padding: "6px", borderRadius: "8px" }}>
                      <BarChart3 size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginBottom: "4px" }}>
                    {coursePerf.internalMarks != null ? coursePerf.internalMarks : "--"}
                    <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "400" }}> / 50</span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Mid-semester & lab continuous evaluation</span>
                </div>

                {/* 4. External Exam Marks */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>EXTERNAL EXAM MARKS</span>
                    <div style={{ background: "rgba(236, 72, 153, 0.15)", color: "#f472b6", padding: "6px", borderRadius: "8px" }}>
                      <Target size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginBottom: "4px" }}>
                    {coursePerf.externalMarks != null ? coursePerf.externalMarks : "--"}
                    <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "400" }}> / 50</span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>End-semester examination score</span>
                </div>
              </div>

              {/* Assessment Breakdown Section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Quiz Breakdown Card */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", padding: "8px", borderRadius: "10px" }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 style={{ color: "#f8fafc", margin: 0, fontSize: "15px" }}>Quiz Performance</h4>
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>Interactive quiz assessments</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0b0813", padding: "14px 18px", borderRadius: "10px", marginBottom: "12px" }}>
                    <span style={{ color: "#cbd5e1", fontSize: "13px" }}>Average Quiz Percentage</span>
                    <strong style={{ color: "#c084fc", fontSize: "18px" }}>{coursePerf.quizScore != null ? `${coursePerf.quizScore}%` : "0%"}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", padding: "0 4px" }}>
                    <span>Available Quizzes: {quizzes.length}</span>
                    <span>Weightage: 35%</span>
                  </div>
                </div>

                {/* Assignment Breakdown Card */}
                <div
                  style={{
                    background: "#141121",
                    border: "1px solid #29243b",
                    borderRadius: "14px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "8px", borderRadius: "10px" }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 style={{ color: "#f8fafc", margin: 0, fontSize: "15px" }}>Assignment Submissions</h4>
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>Course homework & practical work</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0b0813", padding: "14px 18px", borderRadius: "10px", marginBottom: "12px" }}>
                    <span style={{ color: "#cbd5e1", fontSize: "13px" }}>Average Assignment Score</span>
                    <strong style={{ color: "#60a5fa", fontSize: "18px" }}>{coursePerf.assignmentScore != null ? `${coursePerf.assignmentScore}%` : "0%"}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", padding: "0 4px" }}>
                    <span>Total Assignments: {assignments.length}</span>
                    <span>Weightage: 35%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MATERIALS TAB */}
          {activeTab === "materials" && (
            <section className="cd-description-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", color: "#ffffff", margin: 0 }}>Course Study Materials ({materials.length})</h3>
                  <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
                    Download handouts, lecture slides, and view teacher-uploaded AI Educational Comic notes.
                  </p>
                </div>

                {/* Material Category Sub-Filter Pills */}
                <div style={{ display: "flex", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "10px", border: "1px solid #292938" }}>
                  <button
                    onClick={() => setMaterialCategoryFilter("all")}
                    style={{
                      background: materialCategoryFilter === "all" ? "#7c3aed" : "transparent",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    All ({materials.length})
                  </button>
                  <button
                    onClick={() => setMaterialCategoryFilter("standard")}
                    style={{
                      background: materialCategoryFilter === "standard" ? "#7c3aed" : "transparent",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <FileText size={13} /> Lecture Notes ({materials.filter(m => !m.isComic && m.type !== "AI Educational Comic").length})
                  </button>
                  <button
                    onClick={() => setMaterialCategoryFilter("comic")}
                    style={{
                      background: materialCategoryFilter === "comic" ? "#ec4899" : "transparent",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <Sparkles size={13} /> 🎨 AI Comic Notes ({materials.filter(m => m.isComic || m.type === "AI Educational Comic" || m.comicData).length})
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {materials
                  .filter((mat) => {
                    const isComicMat = mat.isComic || mat.type === "AI Educational Comic" || mat.comicData;
                    if (materialCategoryFilter === "standard") return !isComicMat;
                    if (materialCategoryFilter === "comic") return isComicMat;
                    return true;
                  })
                  .map((mat) => {
                    const isComicMat = mat.isComic || mat.type === "AI Educational Comic" || mat.comicData;

                    return (
                      <div
                        key={mat.id}
                        style={{
                          background: isComicMat ? "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.1))" : "#0b0b12",
                          border: isComicMat ? "1px solid rgba(236, 72, 153, 0.4)" : "1px solid #292938",
                          borderRadius: "12px",
                          padding: "16px 20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "10px",
                              background: isComicMat ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "#332454",
                              color: "#ffffff",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                              boxShadow: isComicMat ? "0 4px 12px rgba(236, 72, 153, 0.3)" : "none"
                            }}
                          >
                            {isComicMat ? <Sparkles size={22} /> : <FileText size={21} />}
                          </div>
                          <div>
                            <strong style={{ color: "#f8fafc", fontSize: "15px", display: "block" }}>{mat.title}</strong>
                            {mat.description && mat.description !== "--" && (
                              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "2px 0 4px" }}>{mat.description}</p>
                            )}
                            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                              <span style={{
                                fontSize: "10px",
                                padding: "2px 8px",
                                background: isComicMat ? "rgba(236, 72, 153, 0.25)" : "#35264e",
                                color: isComicMat ? "#f472b6" : "#c5afff",
                                borderRadius: "10px",
                                border: isComicMat ? "1px solid rgba(236, 72, 153, 0.4)" : "1px solid #4b376d",
                                fontWeight: "600"
                              }}>
                                {mat.type || "PDF Document"}
                              </span>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Uploaded by {mat.uploadedBy || "Teacher"}</span>
                              {mat.fileSize > 0 && (
                                <span style={{ fontSize: "11px", color: "#64748b" }}>({(mat.fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {isComicMat && mat.comicData ? (
                            <>
                              <button
                                onClick={() => {
                                  setViewComicModalData(mat.comicData);
                                  setComicActiveView("full_image");
                                }}
                                style={{
                                  background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                                  color: "#ffffff",
                                  border: "none",
                                  padding: "8px 14px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <Sparkles size={14} /> View Storyboard
                              </button>
                              {mat.comicData.comic_png_url && (
                                <a
                                  href={`http://127.0.0.1:8009${mat.comicData.comic_png_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: "rgba(255, 255, 255, 0.1)",
                                    color: "#ffffff",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                  }}
                                >
                                  <Download size={13} /> PNG
                                </a>
                              )}
                            </>
                          ) : (
                            mat.fileUrl && mat.fileUrl !== "#" ? (
                              <a
                                href={mat.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(168, 85, 247, 0.15)",
                                  border: "1px solid rgba(168, 85, 247, 0.35)",
                                  borderRadius: "8px",
                                  padding: "8px 16px",
                                  color: "#c084fc",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  textDecoration: "none",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Download size={16} /> Download
                              </a>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#64748b" }}>--</span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}

                {materials.length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "2.5rem 1rem", background: "#0b0b12", borderRadius: "10px", border: "1px solid #292938" }}>
                    No course materials uploaded yet.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. ASSIGNMENTS TAB */}
          {activeTab === "assignments" && (() => {
            const ongoingCount = assignments.filter((a) => getAssignmentCategory(a) === "Ongoing").length;
            const upcomingCount = assignments.filter((a) => getAssignmentCategory(a) === "Upcoming").length;
            const closedCount = assignments.filter((a) => getAssignmentCategory(a) === "Closed").length;

            const filteredAssignments = assignments.filter((assign) => {
              if (assignFilter === "All") return true;
              return getAssignmentCategory(assign) === assignFilter;
            });

            return (
              <section className="cd-description-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", color: "#ffffff", margin: 0 }}>Course Assignments ({assignments.length})</h3>
                    <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0 0" }}>
                      Track deadlines, submission statuses, and scores for course assignments.
                    </p>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                  {[
                    { id: "All", label: "All", count: assignments.length },
                    { id: "Ongoing", label: "Ongoing", count: ongoingCount },
                    { id: "Upcoming", label: "Upcoming", count: upcomingCount },
                    { id: "Closed", label: "Closed", count: closedCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAssignFilter(tab.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: assignFilter === tab.id ? "1px solid #a855f7" : "1px solid #292938",
                        background: assignFilter === tab.id ? "rgba(168, 85, 247, 0.2)" : "#0b0b12",
                        color: assignFilter === tab.id ? "#c084fc" : "#94a3b8",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {tab.label}
                      <span style={{
                        background: assignFilter === tab.id ? "#a855f7" : "#1e1e2d",
                        color: assignFilter === tab.id ? "#ffffff" : "#94a3b8",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "10px"
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {filteredAssignments.map((assign) => {
                    const cat = getAssignmentCategory(assign);
                    return (
                      <div
                        key={assign.id}
                        style={{
                          background: "#0b0b12",
                          border: "1px solid #292938",
                          borderRadius: "12px",
                          padding: "18px 20px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                              {/* Category Badge */}
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontWeight: "600",
                                  background:
                                    cat === "Ongoing"
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : cat === "Upcoming"
                                      ? "rgba(96, 165, 250, 0.2)"
                                      : "rgba(100, 116, 139, 0.2)",
                                  color:
                                    cat === "Ongoing"
                                      ? "#34d399"
                                      : cat === "Upcoming"
                                      ? "#60a5fa"
                                      : "#94a3b8",
                                }}
                              >
                                {cat}
                              </span>

                              {/* Status Badge */}
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontWeight: "600",
                                  background:
                                    assign.status === "Graded"
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : assign.status === "Submitted"
                                      ? "rgba(96, 165, 250, 0.2)"
                                      : assign.status === "Overdue"
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(245, 158, 11, 0.2)",
                                  color:
                                    assign.status === "Graded"
                                      ? "#34d399"
                                      : assign.status === "Submitted"
                                      ? "#60a5fa"
                                      : assign.status === "Overdue"
                                      ? "#f87171"
                                      : "#fbbf24",
                                }}
                              >
                                {assign.status}
                              </span>

                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                Due: {assign.dueAt ? new Date(assign.dueAt).toLocaleString() : "No deadline"}
                              </span>
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                Marks: {assign.maxMarks} pts
                              </span>
                            </div>

                            <h4 style={{ fontSize: "16px", color: "#f8fafc", margin: "4px 0" }}>{assign.title}</h4>
                            <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "4px 0 8px" }}>{assign.description}</p>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {assign.status === "Graded" && (
                              <div style={{ textAlign: "right" }}>
                                <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>SCORE</span>
                                <strong style={{ color: "#34d399", fontSize: "16px" }}>{assign.score}</strong>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setSelectedAssignment(assign);
                                setSubmissionText(assign.submission?.submissionText || "");
                                setFileUrlInput(assign.submission?.fileUrl || "");
                                setSubmitError(null);
                                setSubmitSuccess(false);
                              }}
                              disabled={cat === "Upcoming"}
                              style={{
                                padding: "9px 16px",
                                borderRadius: "8px",
                                border: "none",
                                background: cat === "Upcoming" ? "#1e1e2d" : (assign.status === "Submitted" || assign.status === "Graded" ? "#292938" : "#7652d6"),
                                color: cat === "Upcoming" ? "#64748b" : "white",
                                cursor: cat === "Upcoming" ? "not-allowed" : "pointer",
                                fontSize: "13px",
                                fontWeight: "500",
                              }}
                            >
                              {cat === "Upcoming" ? "Not Started Yet" : (assign.status === "Submitted" || assign.status === "Graded" ? "View Submission" : "Submit Work")}
                            </button>
                          </div>
                        </div>

                        {/* Submission Details view */}
                        {assign.submission && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid #1e1e2d",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "12px",
                              color: "#94a3b8",
                            }}
                          >
                            <div>
                              <span>Submitted on: {new Date(assign.submission.submittedAt).toLocaleString()}</span>
                              {assign.submission.feedback && assign.submission.feedback !== "--" && (
                                <div style={{ color: "#c084fc", marginTop: "4px" }}>
                                  Feedback: {assign.submission.feedback}
                                </div>
                              )}
                            </div>
                            {assign.submission.fileUrl && (
                              <a
                                href={assign.submission.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#a78bfa", textDecoration: "underline" }}
                              >
                                Submitted File ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredAssignments.length === 0 && (
                    <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "2.5rem 1rem", background: "#0b0b12", borderRadius: "10px", border: "1px solid #292938" }}>
                      No {assignFilter !== "All" ? assignFilter.toLowerCase() : ""} assignments available.
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* 4. QUIZZES TAB */}
          {activeTab === "quizzes" && (() => {
            const ongoingCount = quizzes.filter((q) => getQuizCategory(q) === "Ongoing").length;
            const upcomingCount = quizzes.filter((q) => getQuizCategory(q) === "Upcoming").length;
            const closedCount = quizzes.filter((q) => getQuizCategory(q) === "Closed").length;

            const filteredQuizzes = quizzes.filter((quiz) => {
              if (quizFilter === "All") return true;
              return getQuizCategory(quiz) === quizFilter;
            });

            return (
              <section className="cd-description-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "17px", color: "#ffffff", margin: 0 }}>Course Quizzes ({quizzes.length})</h3>
                    <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0 0" }}>
                      Attempt published quizzes and view evaluation performance.
                    </p>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                  {[
                    { id: "All", label: "All", count: quizzes.length },
                    { id: "Ongoing", label: "Ongoing", count: ongoingCount },
                    { id: "Upcoming", label: "Upcoming", count: upcomingCount },
                    { id: "Closed", label: "Closed", count: closedCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setQuizFilter(tab.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: quizFilter === tab.id ? "1px solid #a855f7" : "1px solid #292938",
                        background: quizFilter === tab.id ? "rgba(168, 85, 247, 0.2)" : "#0b0b12",
                        color: quizFilter === tab.id ? "#c084fc" : "#94a3b8",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {tab.label}
                      <span style={{
                        background: quizFilter === tab.id ? "#a855f7" : "#1e1e2d",
                        color: quizFilter === tab.id ? "#ffffff" : "#94a3b8",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "10px"
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {filteredQuizzes.map((quiz) => {
                    const cat = getQuizCategory(quiz);
                    return (
                      <div
                        key={quiz.id}
                        style={{
                          background: "#0b0b12",
                          border: "1px solid #292938",
                          borderRadius: "12px",
                          padding: "18px 20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                            {/* Category Badge */}
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontWeight: "600",
                                background:
                                  cat === "Ongoing"
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : cat === "Upcoming"
                                    ? "rgba(96, 165, 250, 0.2)"
                                    : "rgba(100, 116, 139, 0.2)",
                                color:
                                  cat === "Ongoing"
                                    ? "#34d399"
                                    : cat === "Upcoming"
                                    ? "#60a5fa"
                                    : "#94a3b8",
                              }}
                            >
                              {cat}
                            </span>

                            {/* Status Badge */}
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                background:
                                  quiz.status === "Completed"
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : quiz.status === "In Progress"
                                    ? "rgba(96, 165, 250, 0.2)"
                                    : quiz.status === "Closed"
                                    ? "rgba(100, 116, 139, 0.2)"
                                    : "rgba(168, 85, 247, 0.2)",
                                color:
                                  quiz.status === "Completed"
                                    ? "#34d399"
                                    : quiz.status === "In Progress"
                                    ? "#60a5fa"
                                    : quiz.status === "Closed"
                                    ? "#94a3b8"
                                    : "#c084fc",
                                fontWeight: "600",
                              }}
                            >
                              {quiz.status}
                            </span>

                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                              {quiz.durationMinutes} mins · {quiz.totalMarks} pts · {quiz.totalQuestions} Questions
                            </span>
                          </div>

                          <strong style={{ fontSize: "16px", color: "#f8fafc" }}>{quiz.title}</strong>
                          <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0" }}>{quiz.description}</p>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Attempts used: {quiz.attemptsUsed} / {quiz.maxAttempts}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          {quiz.scoreText && quiz.scoreText !== "--" && (
                            <div style={{ textAlign: "right" }}>
                              <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>SCORE</span>
                              <strong style={{ color: "#34d399", fontSize: "16px" }}>{quiz.scoreText}</strong>
                            </div>
                          )}

                          <button
                            onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                            disabled={cat === "Closed" || cat === "Upcoming" || quiz.status === "Closed"}
                            style={{
                              padding: "9px 16px",
                              borderRadius: "8px",
                              border: "none",
                              background: cat === "Closed" || quiz.status === "Closed" ? "#292938" : (cat === "Upcoming" ? "#1e1e2d" : "#7652d6"),
                              color: cat === "Upcoming" ? "#64748b" : "white",
                              cursor: (cat === "Closed" || cat === "Upcoming" || quiz.status === "Closed") ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            {cat === "Upcoming" ? "Upcoming" : (quiz.status === "Completed" ? "View Attempt" : "Start Quiz")}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredQuizzes.length === 0 && (
                    <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "2.5rem 1rem", background: "#0b0b12", borderRadius: "10px", border: "1px solid #292938" }}>
                      No {quizFilter !== "All" ? quizFilter.toLowerCase() : ""} quizzes available.
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* 5. ATTENDANCE TAB */}
          {activeTab === "attendance" && (
            <section className="cd-description-card">
              <h3 style={{ fontSize: "17px", color: "#ffffff", marginBottom: "1rem" }}>Course Attendance</h3>
              {attendance ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                  <div style={{ background: "#0b0b12", border: "1px solid #292938", padding: "16px", borderRadius: "10px" }}>
                    <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>SESSIONS ATTENDED</span>
                    <strong style={{ color: "#34d399", fontSize: "22px" }}>{attendance.present}</strong>
                  </div>
                  <div style={{ background: "#0b0b12", border: "1px solid #292938", padding: "16px", borderRadius: "10px" }}>
                    <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>SESSIONS MISSED</span>
                    <strong style={{ color: "#f87171", fontSize: "22px" }}>{attendance.absent}</strong>
                  </div>
                  <div style={{ background: "#0b0b12", border: "1px solid #292938", padding: "16px", borderRadius: "10px" }}>
                    <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>TOTAL CONDUCTED</span>
                    <strong style={{ color: "#f8fafc", fontSize: "22px" }}>{attendance.total}</strong>
                  </div>
                  <div style={{ background: "#0b0b12", border: "1px solid #292938", padding: "16px", borderRadius: "10px" }}>
                    <span style={{ color: "#89879c", fontSize: "11px", display: "block" }}>ATTENDANCE RATE</span>
                    <strong style={{ color: attendance.percentage >= 75 ? "#34d399" : "#fbbf24", fontSize: "22px" }}>
                      {attendance.percentage}%
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "2.5rem 1rem", background: "#0b0b12", borderRadius: "10px", border: "1px solid #292938" }}>
                  Attendance data not available.
                </div>
              )}
            </section>
          )}

          {/* 6. ANNOUNCEMENTS TAB */}
          {activeTab === "announcements" && (
            <section className="cd-description-card">
              <h3 style={{ fontSize: "17px", color: "#ffffff", marginBottom: "1rem" }}>Course Announcements ({announcements.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    style={{
                      background: "#0b0b12",
                      border: "1px solid #292938",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ color: "#f8fafc", fontSize: "15px" }}>{ann.title}</strong>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "4px 0 8px" }}>{ann.message}</p>
                    <div style={{ fontSize: "11px", color: "#77758b" }}>Posted by {ann.postedBy}</div>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "2.5rem 1rem", background: "#0b0b12", borderRadius: "10px", border: "1px solid #292938" }}>
                    No announcements available.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ASSIGNMENT SUBMISSION MODAL */}
      {selectedAssignment && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#14141e",
              border: "1px solid #292837",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              color: "#f8fafc",
            }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>Submit Assignment</h3>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px" }}>
              {selectedAssignment.title} ({selectedAssignment.maxMarks} Marks)
            </p>

            {submitError && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#f87171", padding: "10px", borderRadius: "8px", fontSize: "12px", marginBottom: "12px" }}>
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", color: "#34d399", padding: "10px", borderRadius: "8px", fontSize: "12px", marginBottom: "12px" }}>
                Assignment submitted successfully!
              </div>
            )}

            <form onSubmit={handleSubmitAssignment}>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Submission Notes / Text:
              </label>
              <textarea
                rows={4}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Type your response or notes here..."
                style={{
                  width: "100%",
                  background: "#0b0b12",
                  border: "1px solid #292938",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  padding: "10px",
                  fontSize: "13px",
                  marginBottom: "14px",
                  outline: "none",
                }}
              />

              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                File / Document Link (URL):
              </label>
              <input
                type="text"
                value={fileUrlInput}
                onChange={(e) => setFileUrlInput(e.target.value)}
                placeholder="https://drive.google.com/... or file URL"
                style={{
                  width: "100%",
                  background: "#0b0b12",
                  border: "1px solid #292938",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  padding: "10px",
                  fontSize: "13px",
                  marginBottom: "20px",
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid #292938",
                    color: "#94a3b8",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#7652d6",
                    border: "none",
                    color: "white",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Comic Storyboard Viewer Modal */}
      {viewComicModalData && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(236, 72, 153, 0.4)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "920px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "24px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
            color: "#ffffff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#ec4899", fontWeight: "700", textTransform: "uppercase" }}>
                  🎨 Teacher AI Comic Note
                </span>
                <h2 style={{ margin: "2px 0 0 0", fontSize: "1.4rem" }}>{viewComicModalData.title || "Educational Comic Storyboard"}</h2>
              </div>
              <button
                onClick={() => setViewComicModalData(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* View switcher tabs */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
              <button
                onClick={() => setComicActiveView("full_image")}
                style={{
                  background: comicActiveView === "full_image" ? "#ec4899" : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Full Comic Page
              </button>
              <button
                onClick={() => setComicActiveView("panels")}
                style={{
                  background: comicActiveView === "panels" ? "#ec4899" : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Individual Panels ({viewComicModalData.panels ? viewComicModalData.panels.length : 0})
              </button>
            </div>

            {comicActiveView === "full_image" ? (
              <div>
                <img
                  src={`http://127.0.0.1:8009${viewComicModalData.comic_png_url}`}
                  alt={viewComicModalData.title}
                  style={{ width: "100%", borderRadius: "12px", marginBottom: "1rem" }}
                />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {viewComicModalData.panels && viewComicModalData.panels.map((p, idx) => (
                  <div key={idx} style={{ background: "#1e293b", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(236,72,153,0.3)" }}>
                    <div style={{ background: "rgba(236,72,153,0.2)", padding: "6px 12px", fontSize: "11px", fontWeight: "700", color: "#ec4899" }}>
                      PANEL {p.panel_number}
                    </div>
                    <img src={`http://127.0.0.1:8009${p.panel_image_url}`} alt={`Panel ${p.panel_number}`} style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                    <div style={{ padding: "12px" }}>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>{p.concept}</h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>{p.detailed_explanation || p.caption || p.concept}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetails;