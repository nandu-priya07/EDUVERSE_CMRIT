import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  FileText,
  Award,
  Search,
  Bell,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  GraduationCap,
  Calendar,
  AlertCircle
} from "lucide-react";
import "./studentdashboard.css";
import StudentSidebar from "../components/StudentSidebar";

function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/student/courses/dashboard/summary",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data.");
      }
    } catch (err) {
      console.error("Fetch student dashboard error:", err);
      setError(err.message || "Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse user data:", err);
      }
    }
    fetchDashboardData();
  }, []);

  const studentInfo = dashboardData?.student || {};
  const statsInfo = dashboardData?.stats || {};
  const coursesList = dashboardData?.courses || [];
  const assignmentsList = dashboardData?.assignments || [];
  const activitiesList = dashboardData?.activities || [];

  const firstName = studentInfo.firstName || user?.name?.split(" ")[0] || "Student";
  const department = studentInfo.department || user?.department || "AI&DS";
  const registerNumber = studentInfo.registerNumber || user?.registerNumber || user?.uid || "2024AD001";

  return (
    <div className="student-dashboard-layout">
      {/* Unified Student Sidebar */}
      <StudentSidebar activeItem="Dashboard" />

      {/* Main Workspace */}
      <main className="student-dashboard-main">
        {/* Top Navbar */}
        <header className="student-dashboard-navbar">
          <div className="navbar-breadcrumb">
            <span>Pages</span>
            <span>/</span>
            <strong>Dashboard</strong>
          </div>

          <div className="navbar-actions">
            <div className="search-bar-wrap">
              <Search size={15} />
              <input type="text" placeholder="Search courses, assignments..." />
              <kbd>⌘ K</kbd>
            </div>

            <button className="nav-icon-btn" title="Notifications">
              <Bell size={17} />
              <span className="dot" />
            </button>

            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>{studentInfo.name || user?.name || "Student"}</strong>
                <span>{department}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content-container">
          {/* Welcome Banner Card */}
          <section className="dashboard-welcome-banner">
            <div className="welcome-text-side">
              <span className="welcome-eyebrow">
                <Sparkles size={13} /> STUDENT PORTAL
              </span>
              <h1>Good day, {firstName}! 👋</h1>
              <p>
                Ready to continue your learning journey? Here is your real-time academic dashboard overview.
              </p>

              <div className="student-meta-pills">
                <span className="meta-pill">
                  <GraduationCap size={13} /> {department}
                </span>
                <span className="meta-pill">
                  Reg No: <strong>{registerNumber}</strong>
                </span>
                {studentInfo.section && (
                  <span className="meta-pill">
                    Section: <strong>{studentInfo.section}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="welcome-art-side">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-emoji">🎓</div>
              <div className="floating-badge floating-book">📚</div>
              <div className="floating-badge floating-star">✦</div>
            </div>
          </section>

          {/* Key Academic Metrics Stats Grid */}
          <section className="dashboard-stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon violet">
                  <BookOpen size={20} />
                </div>
                <span className="stat-badge violet">Enrolled</span>
              </div>
              <div className="stat-card-body">
                <h2>{loading ? "--" : (statsInfo.enrolledCoursesCount ?? 0).toString().padStart(2, "0")}</h2>
                <p>Enrolled Courses</p>
                <small>Active learning modules</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon blue">
                  <Clock size={20} />
                </div>
                <span className="stat-badge green">Overall</span>
              </div>
              <div className="stat-card-body">
                <h2>{loading ? "--" : `${statsInfo.averageAttendance ?? 85}%`}</h2>
                <p>Average Attendance</p>
                <div className="stat-progress-bar">
                  <div style={{ width: `${statsInfo.averageAttendance ?? 85}%` }} />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon orange">
                  <FileText size={20} />
                </div>
                <span className="stat-badge orange">Pending</span>
              </div>
              <div className="stat-card-body">
                <h2>{loading ? "--" : (statsInfo.pendingAssignmentsCount ?? 0).toString().padStart(2, "0")}</h2>
                <p>Pending Assignments</p>
                <small>Keep up with deadlines</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon green">
                  <Award size={20} />
                </div>
                <span className="stat-badge green">Good progress</span>
              </div>
              <div className="stat-card-body">
                <h2>{loading ? "--" : (statsInfo.currentGpa ?? 3.8)}</h2>
                <p>Current GPA</p>
                <small>Academic performance</small>
              </div>
            </div>
          </section>

          {/* Main Grid: Enrolled Courses & Upcoming Assignments */}
          <div className="dashboard-two-col-grid">
            {/* My Enrolled Courses Panel */}
            <section className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h3>My Courses</h3>
                  <p>Continue where you left off</p>
                </div>
                <button
                  className="link-btn"
                  onClick={() => navigate("/student/courses")}
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>

              <div className="courses-list-stack">
                {loading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    Loading enrolled courses...
                  </div>
                ) : coursesList.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No enrolled courses for this semester.
                  </div>
                ) : (
                  coursesList.map((course) => (
                    <div className="course-list-item" key={course.id}>
                      <div className={`course-emoji-box ${course.color || "violet"}`}>
                        {course.icon || "📚"}
                      </div>

                      <div className="course-item-info">
                        <div className="course-item-top">
                          <h4>{course.name}</h4>
                          <strong className="progress-num">{course.progress}%</strong>
                        </div>
                        <span className="instructor-sub">
                          {course.code} · {course.instructor}
                        </span>

                        <div className="course-progress-track">
                          <div
                            className={`course-progress-fill ${course.color || "violet"}`}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        className="arrow-btn"
                        onClick={() => navigate(`/student/courses/${course.id}`)}
                        title={`Open ${course.name}`}
                      >
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Upcoming Assignments Panel */}
            <section className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h3>Upcoming Assignments</h3>
                  <p>Stay ahead of your deadlines</p>
                </div>
                <button
                  className="link-btn"
                  onClick={() => navigate("/student/assignments")}
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>

              <div className="assignments-list-stack">
                {loading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    Loading assignments...
                  </div>
                ) : assignmentsList.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No pending assignments due! 🎉
                  </div>
                ) : (
                  assignmentsList.map((item) => (
                    <div className="assignment-list-item" key={item.id}>
                      <div className="assignment-icon-box">
                        <FileText size={18} />
                      </div>

                      <div className="assignment-item-info">
                        <h4>{item.title}</h4>
                        <span>{item.course} ({item.courseCode})</span>
                        <div className="due-text">
                          <Clock size={12} /> Due {item.due}
                        </div>
                      </div>

                      <span className={`status-pill ${(item.status || "pending").toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Bottom Grid: Recent Activity & AI Tutor Banner */}
          <div className="dashboard-two-col-grid">
            {/* Recent Activity Panel */}
            <section className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h3>Recent Activity</h3>
                  <p>Your latest learning updates</p>
                </div>
              </div>

              <div className="activity-timeline">
                {activitiesList.length > 0 ? (
                  activitiesList.map((act) => (
                    <div className="activity-timeline-item" key={act.id}>
                      <div className={`marker ${act.color || "purple"}`}>
                        {act.type === "quiz" ? <CheckCircle2 size={14} /> : act.type === "assignment" ? <TrendingUp size={14} /> : <BookOpen size={14} />}
                      </div>
                      <div className="activity-details">
                        <h4>{act.title}</h4>
                        <p>{act.detail}</p>
                        <small>{act.timeAgo || (act.createdAt ? new Date(act.createdAt).toLocaleString() : "Recently")}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="activity-timeline-item">
                      <div className="marker purple">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="activity-details">
                        <h4>Account Ready</h4>
                        <p>Welcome to SmartCampus LMS</p>
                        <small>Today</small>
                      </div>
                    </div>
                    <div className="activity-timeline-item">
                      <div className="marker blue">
                        <BookOpen size={14} />
                      </div>
                      <div className="activity-details">
                        <h4>Courses Enrolled</h4>
                        <p>Active learning modules loaded</p>
                        <small>This semester</small>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* AI Tutor Card */}
            <section className="ai-tutor-banner">
              <div className="ai-banner-content">
                <span className="ai-tag">
                  <Sparkles size={12} /> SMARTCAMPUS AI
                </span>
                <h3>Learn smarter with AI tutor</h3>
                <p>
                  Turn complex concepts into interactive explanations, visual study comics, and personalized practice quizzes.
                </p>
                <button
                  className="ai-action-btn"
                  onClick={() => navigate("/student/ai-learning")}
                >
                  Explore AI Learning <ArrowRight size={15} />
                </button>
              </div>
              <div className="ai-banner-art">
                <div className="art-sparkle">✦</div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="student-dashboard-footer">
            <span>© 2026 SmartCampus LMS</span>
            <span>Made for smarter learning ✦</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;