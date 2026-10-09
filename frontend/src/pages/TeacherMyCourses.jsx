
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./teachermycourses.css";

export default function TeacherMyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Courses");
  const [sort, setSort] = useState("Recently Added");

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch("http://localhost:5000/api/teacher/courses", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch teacher courses.");
        }

        setCourses(data.data || []);
        if (data.teacher) {
          setTeacher(data.teacher);
        }
      } catch (err) {
        console.error("Fetch teacher courses error:", err);
        setError(err.message || "An error occurred while loading courses.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCourses();
  }, [navigate]);

  const filteredCourses = useMemo(() => {
    let result = courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(search.toLowerCase()) ||
        course.code.toLowerCase().includes(search.toLowerCase()) ||
        (course.department && course.department.toLowerCase().includes(search.toLowerCase()));

      const matchesFilter =
        filter === "All Courses" || course.status === filter;

      return matchesSearch && matchesFilter;
    });

    if (sort === "Most Students") {
      result = [...result].sort((a, b) => b.students - a.students);
    } else if (sort === "Progress") {
      result = [...result].sort((a, b) => b.progress - a.progress);
    }

    return result;
  }, [courses, search, filter, sort]);

  const totalStudents = courses.reduce((sum, course) => sum + (course.students || 0), 0);
  const activeCourses = courses.filter((course) => course.status === "Active").length;
  const teacherName = teacher?.name || "Teacher";
  const teacherInitial = teacherName.charAt(0).toUpperCase();

  return (
    <div className="tmc-layout">
      <aside className="tmc-sidebar">
        <div className="tmc-brand">
          <span className="tmc-brand-icon">✦</span>
          <span>SmartCampus</span>
        </div>

        <div className="tmc-user" onClick={() => navigate("/teacher/profile")} style={{ cursor: "pointer" }}>
          <div className="tmc-avatar">{teacherInitial}</div>
          <div>
            <h4>{teacherName}</h4>
            <p>{teacher?.department || "Faculty"}</p>
          </div>
          <span className="tmc-arrow">→</span>
        </div>

        <div className="tmc-label">WORKSPACE</div>
        <nav className="tmc-nav">
          <a href="/teacher-dashboard"><span>▦</span> Dashboard</a>
          <a className="active" href="/teacher/courses"><span>▤</span> My Courses</a>
          <a href="/teacher/students"><span>♙</span> Students</a>
          <a href="/teacher/assignments"><span>▣</span> Assignments</a>
          <a href="/teacher/assessments"><span>◉</span> Assessments</a>
          <a href="/teacher/attendance"><span>◷</span> Attendance</a>
          <a href="/teacher/analytics"><span>▥</span> Analytics</a>
          <a href="/teacher/ai-tools"><span>✧</span> AI Teaching Tools</a>
        </nav>

        <div className="tmc-label tmc-preferences">PREFERENCES</div>
        <nav className="tmc-nav">
          <a href="/teacher/profile"><span>♙</span> My Profile</a>
          <a href="/teacher/settings"><span>⚙</span> Settings</a>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              navigate("/login");
            }}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.8rem",
              width: "100%",
              textAlign: "left"
            }}
          >
            <span>↪</span> Log Out
          </button>
        </nav>

        <div className="tmc-sidebar-footer">
          <span>?</span>
          <div><strong>Need help?</strong><p>Visit support center</p></div>
        </div>
      </aside>

      <main className="tmc-main">
        <header className="tmc-header">
          <div>
            <p className="tmc-breadcrumb">Workspace / My Courses</p>
            <h2>My Courses</h2>
          </div>
          <div className="tmc-header-actions">
            <button className="tmc-icon-button">♧<i /></button>
            <button className="tmc-icon-button">⌕</button>
            <div className="tmc-profile" onClick={() => navigate("/teacher/profile")} style={{ cursor: "pointer" }}>
              <div className="tmc-avatar small">{teacherInitial}</div>
              <span>{teacherName}</span>
              <span>⌄</span>
            </div>
          </div>
        </header>

        <section className="tmc-heading">
          <div>
            <h1>Manage your courses <span>✦</span></h1>
            <p>Organize your subjects, track progress and manage your students.</p>
          </div>
          <button className="tmc-create-button" onClick={() => alert("Create Course feature available soon!")}>
            ＋ Create Course
          </button>
        </section>

        <section className="tmc-overview">
          <div className="tmc-overview-card">
            <div className="tmc-overview-icon purple">▤</div>
            <div><p>Total Courses</p><h2>{courses.length.toString().padStart(2, "0")}</h2><span>Across your teaching profile</span></div>
          </div>
          <div className="tmc-overview-card">
            <div className="tmc-overview-icon blue">♙</div>
            <div><p>Total Enrollments</p><h2>{totalStudents}</h2><span>Across all assigned courses</span></div>
          </div>
          <div className="tmc-overview-card">
            <div className="tmc-overview-icon green">◉</div>
            <div><p>Active Courses</p><h2>{activeCourses.toString().padStart(2, "0")}</h2><span>Currently in progress</span></div>
          </div>
          <div className="tmc-overview-card">
            <div className="tmc-overview-icon orange">✓</div>
            <div><p>Completed Courses</p><h2>{courses.length - activeCourses}</h2><span>Course syllabus completed</span></div>
          </div>
        </section>

        <section className="tmc-course-section">
          <div className="tmc-section-heading">
            <div><h3>All Assigned Courses</h3><p>View and manage your subjects</p></div>
            <span className="tmc-course-count">{filteredCourses.length} courses</span>
          </div>

          <div className="tmc-toolbar">
            <div className="tmc-search">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search courses, code or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")}>×</button>}
            </div>

            <div className="tmc-filters">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>All Courses</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option>Recently Added</option>
                <option>Most Students</option>
                <option>Progress</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
              <p>Loading your courses...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#f87171" }}>
              <p>{error}</p>
            </div>
          ) : (
            <div className="tmc-course-grid">
              {filteredCourses.map((course) => (
                <article className="tmc-course-card" key={course.id}>
                  <div className={`tmc-course-cover ${course.color}`}>
                    <div className="tmc-cover-top">
                      <span className="tmc-course-code">{course.code}</span>
                      <span className={`tmc-course-status ${course.status.toLowerCase()}`}>{course.status}</span>
                    </div>
                    <div className="tmc-cover-symbol">{course.icon}</div>
                    <div className="tmc-cover-decoration decoration-one" />
                    <div className="tmc-cover-decoration decoration-two" />
                  </div>

                  <div className="tmc-course-body">
                    <div className="tmc-course-meta">
                      <span>{course.department}</span>
                      <span>•</span>
                      <span>{course.semester}</span>
                    </div>
                    <h3>{course.name}</h3>
                    <p className="tmc-description">{course.description}</p>

                    <div className="tmc-course-details">
                      <div><span>♙</span><strong>{course.students}</strong><small>Students</small></div>
                      <div><span>▤</span><strong>{course.lessons}</strong><small>Lessons</small></div>
                      <div><span>✓</span><strong>{course.completed}/{course.lessons}</strong><small>Completed</small></div>
                    </div>

                    <div className="tmc-progress-heading">
                      <span>Course progress</span><strong>{course.progress}%</strong>
                    </div>
                    <div className="tmc-progress-track">
                      <div style={{ width: `${course.progress}%` }} />
                    </div>

                    <div className="tmc-card-actions">
                      <button className="tmc-manage-button" onClick={() => navigate(`/teacher/courses/${course.code}`)}>
                        Manage Course <span>→</span>
                      </button>


                      <button className="tmc-more-button" aria-label={`More options for ${course.name}`}>···</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && filteredCourses.length === 0 && (
            <div className="tmc-empty">
              <span>⌕</span>
              <h3>No courses found</h3>
              <p>Try changing your search or filter.</p>
              <button onClick={() => { setSearch(""); setFilter("All Courses"); }}>Clear filters</button>
            </div>
          )}
        </section>

        <footer className="tmc-footer">
          © 2026 SmartCampus · Teacher Workspace
          <span>Built for smarter learning ✦</span>
        </footer>
      </main>
    </div>
  );
}