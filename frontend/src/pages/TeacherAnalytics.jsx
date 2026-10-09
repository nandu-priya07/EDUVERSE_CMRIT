
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./teacheranalytics.css";

const courseData = [
  { name: "Machine Learning", students: 68, average: 82, attendance: 91, completion: 78 },
  { name: "Artificial Intelligence", students: 64, average: 76, attendance: 87, completion: 72 },
  { name: "Data Science", students: 70, average: 88, attendance: 94, completion: 86 },
  { name: "Database Management", students: 66, average: 71, attendance: 83, completion: 69 },
];

const gradeData = [
  { grade: "A+", count: 18 },
  { grade: "A", count: 24 },
  { grade: "B", count: 35 },
  { grade: "C", count: 21 },
  { grade: "D", count: 10 },
  { grade: "F", count: 5 },
];

const students = [
  { name: "Arun Kumar", reg: "REC001", course: "Machine Learning", marks: 94, attendance: 96, status: "Excellent" },
  { name: "Bharath S", reg: "REC002", course: "Data Science", marks: 88, attendance: 91, status: "Good" },
  { name: "Deepak R", reg: "REC003", course: "Artificial Intelligence", marks: 52, attendance: 68, status: "At Risk" },
  { name: "Harish M", reg: "REC004", course: "Machine Learning", marks: 81, attendance: 89, status: "Good" },
  { name: "Karthik V", reg: "REC005", course: "Database Management", marks: 43, attendance: 61, status: "At Risk" },
  { name: "Lokesh P", reg: "REC006", course: "Data Science", marks: 91, attendance: 97, status: "Excellent" },
  { name: "Manoj K", reg: "REC007", course: "Artificial Intelligence", marks: 75, attendance: 82, status: "Good" },
];

export default function TeacherAnalytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("This Semester");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [search, setSearch] = useState("");

  const visibleCourses =
    courseFilter === "All Courses"
      ? courseData
      : courseData.filter((c) => c.name === courseFilter);

  const visibleStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesCourse =
        courseFilter === "All Courses" || s.course === courseFilter;

      const matchesSearch =
        `${s.name} ${s.reg}`.toLowerCase().includes(search.toLowerCase());

      return matchesCourse && matchesSearch;
    });
  }, [courseFilter, search]);

  const averageMarks = visibleCourses.length
    ? Math.round(
        visibleCourses.reduce((sum, c) => sum + c.average, 0) /
          visibleCourses.length
      )
    : 0;

  const averageAttendance = visibleCourses.length
    ? Math.round(
        visibleCourses.reduce((sum, c) => sum + c.attendance, 0) /
          visibleCourses.length
      )
    : 0;

  const exportCSV = () => {
    const rows = [
      ["Register Number", "Student", "Course", "Marks", "Attendance", "Status"],
      ...visibleStudents.map((s) => [
        s.reg, s.name, s.course, s.marks, s.attendance, s.status
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "teacher-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">
      <aside className="analytics-sidebar">
        <div className="analytics-brand">
          <div className="analytics-logo">S</div>
          <div>
            <h2>SmartCampus</h2>
            <span>Teacher Portal</span>
          </div>
        </div>

        <p className="analytics-nav-label">WORKSPACE</p>

        <nav className="analytics-nav">
          <button onClick={() => navigate("/teacher-dashboard")}>▦ Dashboard</button>
          <button onClick={() => navigate("/teacher/courses")}>▤ My Courses</button>
          <button onClick={() => navigate("/teacher/students")}>♙ Students</button>
          <button onClick={() => navigate("/teacher/assignments")}>▣ Assignments</button>
          <button onClick={() => navigate("/teacher/assessments")}>◷ Assessments</button>
          <button onClick={() => navigate("/teacher/attendance")}>▦ Attendance</button>
          <button className="active">▥ Analytics</button>
          <button onClick={() => navigate("/teacher/ai-tools")}>✦ AI Teaching Tools</button>
        </nav>

        <div className="analytics-sidebar-bottom">
          <button onClick={() => navigate("/teacher/settings")}>⚙ Settings</button>
          <button onClick={() => navigate("/login")}>↪ Logout</button>
        </div>
      </aside>

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <span className="analytics-breadcrumb">Teacher Portal / Analytics</span>
            <h1>Analytics Overview</h1>
            <p>Understand student progress and academic performance.</p>
          </div>

          <button className="analytics-export" onClick={exportCSV}>
            ↓ Export Report
          </button>
        </header>

        <section className="analytics-controls">
          <div className="analytics-control">
            <label>Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>This Semester</option>
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Academic Year</option>
            </select>
          </div>

          <div className="analytics-control">
            <label>Course</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option>All Courses</option>
              {courseData.map((course) => (
                <option key={course.name}>{course.name}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="analytics-kpis">
          <div className="analytics-kpi">
            <div className="analytics-kpi-top">
              <span>Average Performance</span>
              <span className="analytics-kpi-icon purple">◈</span>
            </div>
            <h2>{averageMarks}%</h2>
            <small>Average marks across selected courses</small>
            <div className="analytics-mini-progress">
              <span style={{ width: `${averageMarks}%` }} />
            </div>
          </div>

          <div className="analytics-kpi">
            <div className="analytics-kpi-top">
              <span>Average Attendance</span>
              <span className="analytics-kpi-icon green">✓</span>
            </div>
            <h2>{averageAttendance}%</h2>
            <small>Attendance across selected courses</small>
            <div className="analytics-mini-progress green">
              <span style={{ width: `${averageAttendance}%` }} />
            </div>
          </div>

          <div className="analytics-kpi">
            <div className="analytics-kpi-top">
              <span>Total Students</span>
              <span className="analytics-kpi-icon blue">♙</span>
            </div>
            <h2>
              {visibleCourses.reduce((sum, c) => sum + c.students, 0)}
            </h2>
            <small>Enrollment across selected courses</small>
          </div>

          <div className="analytics-kpi">
            <div className="analytics-kpi-top">
              <span>Course Completion</span>
              <span className="analytics-kpi-icon orange">◷</span>
            </div>
            <h2>
              {visibleCourses.length
                ? Math.round(
                    visibleCourses.reduce((sum, c) => sum + c.completion, 0) /
                      visibleCourses.length
                  )
                : 0}%
            </h2>
            <small>Average learning progress</small>
          </div>
        </section>

        <section className="analytics-charts">
          <div className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Course Performance</h2>
                <p>Average marks by course</p>
              </div>
              <span className="analytics-chart-tag">%</span>
            </div>

            <div className="analytics-bars">
              {visibleCourses.map((course) => (
                <div className="analytics-bar-row" key={course.name}>
                  <div className="analytics-bar-label">
                    <span>{course.name}</span>
                    <strong>{course.average}%</strong>
                  </div>
                  <div className="analytics-bar-track">
                    <div
                      className="analytics-bar-fill"
                      style={{ width: `${course.average}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Grade Distribution</h2>
                <p>Student grade breakdown</p>
              </div>
            </div>

            <div className="analytics-grade-list">
              {gradeData.map((item) => (
                <div className="analytics-grade-row" key={item.grade}>
                  <strong>{item.grade}</strong>
                  <div className="analytics-grade-track">
                    <span
                      style={{
                        width: `${(item.count / 35) * 100}%`,
                      }}
                    />
                  </div>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="analytics-panel analytics-course-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Course Insights</h2>
              <p>Compare attendance and learning progress.</p>
            </div>
          </div>

          <div className="analytics-course-grid">
            {visibleCourses.map((course) => (
              <div className="analytics-course-card" key={course.name}>
                <h3>{course.name}</h3>
                <span>{course.students} Students</span>

                <div className="analytics-course-metric">
                  <label>Attendance</label>
                  <strong>{course.attendance}%</strong>
                </div>
                <div className="analytics-mini-progress green">
                  <span style={{ width: `${course.attendance}%` }} />
                </div>

                <div className="analytics-course-metric">
                  <label>Completion</label>
                  <strong>{course.completion}%</strong>
                </div>
                <div className="analytics-mini-progress">
                  <span style={{ width: `${course.completion}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-panel analytics-students-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Student Performance</h2>
              <p>Identify students who may need additional support.</p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
            />
          </div>

          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>COURSE</th>
                  <th>MARKS</th>
                  <th>ATTENDANCE</th>
                  <th>PERFORMANCE</th>
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.reg}>
                    <td>
                      <strong>{student.name}</strong>
                      <span>{student.reg}</span>
                    </td>
                    <td>{student.course}</td>
                    <td>{student.marks}%</td>
                    <td>{student.attendance}%</td>
                    <td>
                      <span
                        className={`analytics-risk ${student.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {visibleStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="analytics-empty">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}