
import React from "react";
import { useNavigate } from "react-router-dom";
import "./teacherdashboard.css";

const weeklyData = [
  { day: "Mon", value: 65 },
  { day: "Tue", value: 82 },
  { day: "Wed", value: 54 },
  { day: "Thu", value: 95 },
  { day: "Fri", value: 72 },
  { day: "Sat", value: 42 },
  { day: "Sun", value: 25 },
];

const courses = [
  { name: "Artificial Intelligence", code: "AI301", students: 68, progress: 82, color: "#805cff" },
  { name: "Machine Learning", code: "ML302", students: 54, progress: 65, color: "#a78bfa" },
  { name: "Data Science", code: "DS303", students: 72, progress: 91, color: "#c084fc" },
];

const assignments = [
  { title: "Neural Network Implementation", course: "Artificial Intelligence", submitted: 48, total: 68, due: "Today", status: "Pending" },
  { title: "Regression Analysis", course: "Machine Learning", submitted: 42, total: 54, due: "Tomorrow", status: "Active" },
  { title: "Data Visualization", course: "Data Science", submitted: 72, total: 72, due: "Completed", status: "Completed" },
];

const students = [
  { name: "Arjun Kumar", reg: "AIDS023", score: 96, avatar: "AK" },
  { name: "Priya Sharma", reg: "AIDS041", score: 93, avatar: "PS" },
  { name: "Rahul S", reg: "AIDS018", score: 89, avatar: "RS" },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();

  return (
    <div className="teacher-dashboard">
      <aside className="td-sidebar">
        <div className="td-brand">
          <span className="td-brand-icon">✦</span>
          <span>SmartCampus</span>
        </div>

        <div className="td-user">
          <div className="td-avatar">V</div>
          <div>
            <h4>Vetrichelvan</h4>
            <p>Teacher</p>
          </div>
          <span className="td-user-arrow">→</span>
        </div>

        <div className="td-nav-label">WORKSPACE</div>

        <nav className="td-nav">
          <a className="active" href="/teacher-dashboard"><span>▦</span> Dashboard</a>
          <a href="/teacher/courses"><span>▤</span> My Courses</a>
          <a href="/teacher/students"><span>♙</span> Students</a>
          <a href="/teacher/assignments"><span>▣</span> Assignments</a>
          <a href="/teacher/assessments"><span>◉</span> Assessments</a>
          <a href="/teacher/attendance"><span>◷</span> Attendance</a>
          <a href="/teacher/analytics"><span>▥</span> Analytics</a>
          <a href="/teacher/ai-tools"><span>✧</span> AI Teaching Tools</a>
        </nav>

        <div className="td-nav-label td-bottom-label">PREFERENCES</div>
        <nav className="td-nav">
          <a href="/teacher/settings"><span>⚙</span> Settings</a>
          <a href="/login"><span>↪</span> Log Out</a>
        </nav>

        <div className="td-sidebar-footer">
          <div className="td-help-icon">?</div>
          <div>
            <strong>Need help?</strong>
            <p>Visit our support center</p>
          </div>
        </div>
      </aside>

      <main className="td-main">
        <header className="td-topbar">
          <div>
            <p className="td-breadcrumb">Workspace / Dashboard</p>
            <h2>Teacher Dashboard</h2>
          </div>

          <div className="td-top-actions">
            <button className="td-icon-btn" aria-label="Notifications">♧<i /></button>
            <button className="td-icon-btn" aria-label="Search">⌕</button>
            <div className="td-top-profile">
              <div className="td-avatar small">V</div>
              <span>Vetrichelvan</span>
              <span>⌄</span>
            </div>
          </div>
        </header>

        <section className="td-welcome">
          <div>
            <p className="td-eyebrow">MONDAY, OCTOBER 5, 2026</p>
            <h1>Good morning, Vetrichelvan <span>✦</span></h1>
            <p>Here's what's happening with your classes today.</p>
          </div>
          <button className="td-primary-btn" onClick={() => navigate("/teacher/assignments/create")}>
            ＋ Create Assignment
          </button>
        </section>

        <section className="td-stats-grid">
          <div className="td-stat-card">
            <div className="td-stat-top"><span>Total Students</span><span className="td-stat-icon purple">♙</span></div>
            <h2>194</h2>
            <p className="td-positive">↗ 12.5% <span>vs last month</span></p>
            <div className="td-mini-bars">
              {[35, 55, 42, 70, 50, 78, 65, 90, 72, 100].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}
            </div>
          </div>

          <div className="td-stat-card">
            <div className="td-stat-top"><span>Active Courses</span><span className="td-stat-icon blue">▤</span></div>
            <h2>06</h2>
            <p className="td-muted">Across 3 semesters</p>
            <div className="td-stat-bottom"><span>Course coverage</span><strong>85%</strong></div>
            <div className="td-progress"><i style={{ width: "85%" }} /></div>
          </div>

          <div className="td-stat-card">
            <div className="td-stat-top"><span>Pending Reviews</span><span className="td-stat-icon orange">▣</span></div>
            <h2>24</h2>
            <p className="td-orange-text">Needs your attention</p>
            <div className="td-stat-bottom"><span>Reviewed this week</span><strong>76%</strong></div>
            <div className="td-progress orange-progress"><i style={{ width: "76%" }} /></div>
          </div>

          <div className="td-stat-card">
            <div className="td-stat-top"><span>Average Attendance</span><span className="td-stat-icon green">◷</span></div>
            <h2>92.4%</h2>
            <p className="td-positive">↗ 3.2% <span>vs last month</span></p>
            <div className="td-stat-bottom"><span>Target</span><strong>90%</strong></div>
            <div className="td-progress green-progress"><i style={{ width: "92.4%" }} /></div>
          </div>
        </section>

        <section className="td-middle-grid">
          <div className="td-card td-activity-card">
            <div className="td-card-heading">
              <div><h3>Teaching Activity</h3><p>Your weekly teaching overview</p></div>
              <select defaultValue="week"><option value="week">This week</option><option value="month">This month</option></select>
            </div>
            <div className="td-chart-summary"><strong>32.5 hrs</strong><span className="td-positive">↗ 8.4%</span></div>
            <div className="td-bar-chart">
              {weeklyData.map((item) => (
                <div className="td-bar-column" key={item.day}>
                  <div className="td-bar-track"><div className="td-bar" style={{ height: `${item.value}%` }} /></div>
                  <span>{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="td-card td-performance-card">
            <div className="td-card-heading">
              <div><h3>Student Performance</h3><p>Overall class progress</p></div>
              <button className="td-more">···</button>
            </div>
            <div className="td-performance-content">
              <div className="td-donut"><div><strong>78%</strong><span>Average score</span></div></div>
              <div className="td-legend">
                <p><i className="legend-purple" /> Excellent <strong>42%</strong></p>
                <p><i className="legend-lavender" /> Good <strong>36%</strong></p>
                <p><i className="legend-light" /> Needs Support <strong>22%</strong></p>
              </div>
            </div>
            <div className="td-performance-footer"><span>Compared to previous month</span><strong className="td-positive">+6.8%</strong></div>
          </div>
        </section>

        <section className="td-lower-grid">
          <div className="td-card td-courses-card">
            <div className="td-card-heading">
              <div><h3>My Courses</h3><p>Course-wise progress</p></div>
              <a href="/teacher/courses">View all →</a>
            </div>
            <div className="td-course-list">
              {courses.map((course) => (
                <div className="td-course-row" key={course.code}>
                  <div className="td-course-icon" style={{ background: `${course.color}20`, color: course.color }}>▤</div>
                  <div className="td-course-info">
                    <div className="td-course-title"><strong>{course.name}</strong><span>{course.code}</span></div>
                    <p>{course.students} students</p>
                    <div className="td-progress"><i style={{ width: `${course.progress}%`, background: course.color }} /></div>
                  </div>
                  <strong className="td-course-percent">{course.progress}%</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="td-card td-top-students">
            <div className="td-card-heading">
              <div><h3>Top Students</h3><p>Based on assessment scores</p></div>
              <a href="/teacher/students">View all →</a>
            </div>
            {students.map((student, i) => (
              <div className="td-student-row" key={student.reg}>
                <span className="td-rank">{String(i + 1).padStart(2, "0")}</span>
                <div className={`td-student-avatar avatar-${i}`}>{student.avatar}</div>
                <div className="td-student-info"><strong>{student.name}</strong><span>{student.reg}</span></div>
                <strong className="td-score">{student.score}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="td-card td-assignment-card">
          <div className="td-card-heading">
            <div><h3>Recent Assignments</h3><p>Track submissions and reviews</p></div>
            <a href="/teacher/assignments">View all →</a>
          </div>
          <div className="td-table-wrap">
            <table className="td-table">
              <thead><tr><th>Assignment</th><th>Course</th><th>Submissions</th><th>Due date</th><th>Status</th></tr></thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.title}>
                    <td><strong>{item.title}</strong></td>
                    <td>{item.course}</td>
                    <td><div className="td-submission"><span>{item.submitted}/{item.total}</span><div className="td-progress"><i style={{ width: `${item.submitted / item.total * 100}%` }} /></div></div></td>
                    <td>{item.due}</td>
                    <td><span className={`td-status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="td-footer">© 2026 SmartCampus · Teacher Workspace <span>Built for smarter learning ✦</span></footer>
      </main>
    </div>
  );
}