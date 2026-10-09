
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./teacherassessments.css";

const initialAssessments = [
  {
    id: 1,
    title: "Machine Learning Mid-Term",
    course: "Machine Learning",
    type: "Mid-Term",
    date: "2026-10-12",
    duration: 90,
    marks: 100,
    submissions: 54,
    students: 68,
    status: "Published",
  },
  {
    id: 2,
    title: "Python Programming Quiz",
    course: "Programming",
    type: "Quiz",
    date: "2026-10-08",
    duration: 30,
    marks: 30,
    submissions: 61,
    students: 68,
    status: "Published",
  },
  {
    id: 3,
    title: "Data Science Internal Assessment",
    course: "Data Science",
    type: "Internal",
    date: "2026-10-18",
    duration: 120,
    marks: 100,
    submissions: 0,
    students: 68,
    status: "Draft",
  },
  {
    id: 4,
    title: "Database Management Test",
    course: "DBMS",
    type: "Unit Test",
    date: "2026-09-20",
    duration: 60,
    marks: 50,
    submissions: 65,
    students: 68,
    status: "Completed",
  },
  {
    id: 5,
    title: "AI Fundamentals Quiz",
    course: "Artificial Intelligence",
    type: "Quiz",
    date: "2026-10-22",
    duration: 45,
    marks: 40,
    submissions: 0,
    students: 68,
    status: "Draft",
  },
];

export default function TeacherAssessments() {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState(initialAssessments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = assessments.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.course.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || item.status === filter;

    return matchesSearch && matchesFilter;
  });

  const published = assessments.filter(
    (a) => a.status === "Published"
  ).length;

  const completed = assessments.filter(
    (a) => a.status === "Completed"
  ).length;

  const totalSubmissions = assessments.reduce(
    (sum, a) => sum + a.submissions,
    0
  );

  const deleteAssessment = (id) => {
    if (window.confirm("Delete this assessment?")) {
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      setSelected(null);
    }
  };

  const publishAssessment = (id) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Published" } : a
      )
    );
    setSelected(null);
  };

  const formatDate = (date) =>
    new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="ta-page">
      <aside className="ta-sidebar">
        <div className="ta-brand">
          <div className="ta-logo">S</div>
          <div>
            <h2>SmartCampus</h2>
            <span>Teacher Portal</span>
          </div>
        </div>

        <div className="ta-nav-label">WORKSPACE</div>

        <nav className="ta-nav">
          <button onClick={() => navigate("/teacher-dashboard")}>
            <span>▦</span> Dashboard
          </button>
          <button onClick={() => navigate("/teacher/courses")}>
            <span>▤</span> My Courses
          </button>
          <button onClick={() => navigate("/teacher/students")}>
            <span>♙</span> Students
          </button>
          <button onClick={() => navigate("/teacher/assignments")}>
            <span>▣</span> Assignments
          </button>
          <button className="active">
            <span>◷</span> Assessments
          </button>
          <button onClick={() => navigate("/teacher/attendance")}>
            <span>▦</span> Attendance
          </button>
          <button onClick={() => navigate("/teacher/analytics")}>
            <span>▥</span> Analytics
          </button>
          <button onClick={() => navigate("/teacher/ai-tools")}>
            <span>✦</span> AI Teaching Tools
          </button>
        </nav>

        <div className="ta-sidebar-bottom">
          <button onClick={() => navigate("/teacher/settings")}>
            ⚙ Settings
          </button>
          <button onClick={() => navigate("/login")}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="ta-main">
        <header className="ta-topbar">
          <div>
            <span className="ta-breadcrumb">
              Teacher Portal / Assessments
            </span>
            <h1>Assessments</h1>
            <p>Create, schedule and manage student examinations.</p>
          </div>

          <button
            className="ta-create"
            onClick={() => navigate("/teacher/assessments/create")}
          >
            + Create Assessment
          </button>
        </header>

        <section className="ta-stats">
          <div className="ta-stat">
            <div className="ta-stat-icon purple">▤</div>
            <div>
              <span>Total Assessments</span>
              <h2>{assessments.length}</h2>
              <small>Across all courses</small>
            </div>
          </div>

          <div className="ta-stat">
            <div className="ta-stat-icon green">✓</div>
            <div>
              <span>Published</span>
              <h2>{published}</h2>
              <small>Available to students</small>
            </div>
          </div>

          <div className="ta-stat">
            <div className="ta-stat-icon blue">◷</div>
            <div>
              <span>Completed</span>
              <h2>{completed}</h2>
              <small>Assessment finished</small>
            </div>
          </div>

          <div className="ta-stat">
            <div className="ta-stat-icon orange">☷</div>
            <div>
              <span>Total Submissions</span>
              <h2>{totalSubmissions}</h2>
              <small>Across assessments</small>
            </div>
          </div>
        </section>

        <section className="ta-content">
          <div className="ta-content-header">
            <div>
              <h2>All Assessments</h2>
              <p>Manage your examinations and quizzes.</p>
            </div>

            <div className="ta-filters">
              <div className="ta-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assessments..."
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>All</option>
                <option>Published</option>
                <option>Draft</option>
                <option>Completed</option>
              </select>
            </div>
          </div>

          <div className="ta-table-wrap">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>ASSESSMENT</th>
                  <th>TYPE</th>
                  <th>DATE</th>
                  <th>DURATION</th>
                  <th>MARKS</th>
                  <th>SUBMISSIONS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="ta-assessment-name">
                        <div className="ta-file-icon">▤</div>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.course}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.type}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.duration} min</td>
                    <td>{item.marks}</td>
                    <td>
                      <div className="ta-submission">
                        <strong>
                          {item.submissions}/{item.students}
                        </strong>
                        <div className="ta-progress">
                          <span
                            style={{
                              width: `${(item.submissions / item.students) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`ta-status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="ta-view"
                        onClick={() => setSelected(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="ta-empty">
                      No assessments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <div
            className="ta-modal-overlay"
            onClick={() => setSelected(null)}
          >
            <div
              className="ta-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ta-modal-header">
                <div>
                  <span>ASSESSMENT DETAILS</span>
                  <h2>{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className="ta-modal-grid">
                <div>
                  <span>Course</span>
                  <strong>{selected.course}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{selected.type}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{formatDate(selected.date)}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{selected.duration} minutes</strong>
                </div>
                <div>
                  <span>Total Marks</span>
                  <strong>{selected.marks}</strong>
                </div>
                <div>
                  <span>Submissions</span>
                  <strong>
                    {selected.submissions}/{selected.students}
                  </strong>
                </div>
              </div>

              <div className="ta-modal-actions">
                {selected.status === "Draft" && (
                  <button
                    className="ta-create"
                    onClick={() => publishAssessment(selected.id)}
                  >
                    Publish
                  </button>
                )}

                <button
                  className="ta-delete"
                  onClick={() => deleteAssessment(selected.id)}
                >
                  Delete
                </button>

                <button
                  className="ta-close"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}