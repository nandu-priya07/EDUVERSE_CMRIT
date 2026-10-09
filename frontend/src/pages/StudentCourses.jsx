
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./studentcourses.css";
import StudentSidebar from "../components/StudentSidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StudentCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Courses");

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const user = studentInfo || storedUser;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch(`${API_URL}/api/student/courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(result.message || "Unauthorized access. Please login again.");
        }
        throw new Error(result.message || "Failed to fetch enrolled courses.");
      }

      setCourses(result.data || []);
      if (result.student) {
        setStudentInfo(result.student);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      (course.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (course.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (course.instructor || "").toLowerCase().includes(search.toLowerCase()) ||
      (course.category || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All Courses" ||
      (filter === "In Progress" && course.status === "In Progress") ||
      (filter === "Completed" && course.status === "Completed");

    return matchesSearch && matchesFilter;
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const overallProgress =
    courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
      : 0;

  return (
    <div className="courses-layout">
      {/* Common Student Sidebar */}
      <StudentSidebar activeItem="My Courses" />

      {/* Main Content */}
      <main className="courses-main">
        <header className="courses-topbar">
          <div className="breadcrumb">
            <span>Pages</span>
            <span>/</span>
            <strong>My Courses</strong>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything..."
              />
              <kbd>⌘ K</kbd>
            </div>

            <button className="notification-btn">♧</button>

            <div className="topbar-user">
              <div className="user-avatar">
                {(user.name || "Student").charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user.name || "Student"}</strong>
                <small>{user.department || "Student"}</small>
              </div>
            </div>
          </div>
        </header>

        <section className="courses-content">
          {error && (
            <div className="courses-alert error">
              <span>!</span> {error}
            </div>
          )}

          {loading ? (
            <div className="courses-loading-container" style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "120px 20px",
              color: "#9291a5"
            }}>
              <div className="courses-spinner"></div>
              <p style={{ marginTop: "16px", fontSize: "14px", fontWeight: "500" }}>Loading your courses...</p>
            </div>
          ) : (
            <>

          {/* Heading */}
          <div className="courses-heading">
            <div>
              <span className="eyebrow">LEARNING SPACE</span>
              <h1>
                My Courses<span>.</span>
              </h1>
              <p>
                Explore your enrolled courses for{" "}
                <strong>{user.department || "your program"}</strong> and continue your learning journey.
              </p>
            </div>

            <div className="semester-badge">
              <span className="semester-dot"></span>
              {user.semester ? `Semester ${user.semester} · ` : ""}Academic Year 2026–27
            </div>
          </div>

          {/* Stats */}
          <div className="course-stats">
            <div className="course-stat-card">
              <div className="stat-icon purple-icon">▤</div>
              <div>
                <span>Total Courses</span>
                <h2>{courses.length.toString().padStart(2, "0")}</h2>
                <small>Enrolled courses</small>
              </div>
            </div>

            <div className="course-stat-card">
              <div className="stat-icon blue-icon">◷</div>
              <div>
                <span>In Progress</span>
                <h2>
                  {courses
                    .filter((c) => c.status === "In Progress")
                    .length.toString()
                    .padStart(2, "0")}
                </h2>
                <small>Currently learning</small>
              </div>
            </div>

            <div className="course-stat-card">
              <div className="stat-icon green-icon">✓</div>
              <div>
                <span>Completed</span>
                <h2>
                  {courses
                    .filter((c) => c.status === "Completed")
                    .length.toString()
                    .padStart(2, "0")}
                </h2>
                <small>Successfully finished</small>
              </div>
            </div>

            <div className="course-stat-card">
              <div className="stat-icon orange-icon">✦</div>
              <div>
                <span>Overall Progress</span>
                <h2>{overallProgress}%</h2>
                <small>Across all courses</small>
              </div>
            </div>
          </div>

          {/* Course Section */}
          <section className="course-section">
            <div className="course-section-header">
              <div>
                <h2>Your Learning Journey</h2>
                <p>Pick up where you left off.</p>
              </div>

              <div className="course-controls">
                <div className="course-search">
                  <span>⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses..."
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option>All Courses</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>

            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <article className="course-card" key={course.id}>
                  <div className={`course-cover ${course.color || "purple"}`}>
                    <div className="cover-pattern"></div>
                    <div className="cover-code">{course.code}</div>
                    <div className="cover-symbol">{course.icon || "⌘"}</div>
                    <span className="cover-category">{course.category}</span>
                  </div>

                  <div className="course-card-body">
                    <div className="course-title-row">
                      <h3>{course.title}</h3>
                      {course.status === "Completed" && (
                        <span className="completed-check">✓</span>
                      )}
                    </div>

                    <p className="course-instructor">
                      <span>♙</span> {course.instructor}
                    </p>

                    <div className="course-progress-info">
                      <span>Course Progress</span>
                      <strong>{course.progress}%</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className={`progress-fill ${course.color || "purple"}`}
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>

                    <div className="lesson-info">
                      <span>
                        {course.completed} of {course.lessons} lessons
                      </span>
                      <span>
                        {course.status === "Completed"
                          ? "Completed"
                          : `${course.lessons - course.completed} left`}
                      </span>
                    </div>

                    <button
                      className={`continue-btn ${
                        course.status === "Completed" ? "completed-btn" : ""
                      }`}
                      onClick={() => navigate(`/student/courses/${course.code}`)}
                    >

                      {course.status === "Completed"
                        ? "Review Course"
                        : "Continue Learning"}
                      <span>→</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="empty-courses">
                <div>⌕</div>
                <h3>No courses found</h3>
                <p>No enrolled courses match your current search filter.</p>
              </div>
            )}
          </section>

          {/* Bottom Banner */}
          <section className="learning-banner">
            <div className="banner-content">
              <span className="banner-tag">SMART LEARNING</span>
              <h2>Make learning smarter with AI.</h2>
              <p>
                Generate study notes, visual comics, and personalized
                explanations for your subjects.
              </p>
              <button onClick={() => navigate("/student/ai-learning")}>
                Explore AI Learning <span>→</span>
              </button>
            </div>
            <div className="banner-art">
              <div className="art-circle">✦</div>
              <div className="art-orbit orbit-one"></div>
              <div className="art-orbit orbit-two"></div>
            </div>
          </section>
          </>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentCourses;