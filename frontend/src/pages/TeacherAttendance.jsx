
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./teacherattendance.css";

const initialStudents = [
  { id: 1, name: "Arun Kumar", reg: "REC001", section: "A", status: "Present" },
  { id: 2, name: "Bharath S", reg: "REC002", section: "A", status: "Present" },
  { id: 3, name: "Deepak R", reg: "REC003", section: "A", status: "Absent" },
  { id: 4, name: "Harish M", reg: "REC004", section: "A", status: "Present" },
  { id: 5, name: "Karthik V", reg: "REC005", section: "A", status: "Late" },
  { id: 6, name: "Lokesh P", reg: "REC006", section: "A", status: "Present" },
  { id: 7, name: "Manoj K", reg: "REC007", section: "A", status: "OD" },
  { id: 8, name: "Naveen S", reg: "REC008", section: "A", status: "Present" },
  { id: 9, name: "Praveen R", reg: "REC009", section: "A", status: "Absent" },
  { id: 10, name: "Rahul D", reg: "REC010", section: "A", status: "Present" },
];

const statuses = ["Present", "Absent", "Late", "OD"];

export default function TeacherAttendance() {
  const navigate = useNavigate();

  const [students, setStudents] = useState(initialStudents);
  const [course, setCourse] = useState("Machine Learning");
  const [section, setSection] = useState("A");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  const updateStatus = (id, status) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, status } : student
      )
    );
    setSaved(false);
  };

  const markAllPresent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, status: "Present" }))
    );
    setSaved(false);
  };

  const counts = useMemo(() => ({
    Present: students.filter((s) => s.status === "Present").length,
    Absent: students.filter((s) => s.status === "Absent").length,
    Late: students.filter((s) => s.status === "Late").length,
    OD: students.filter((s) => s.status === "OD").length,
  }), [students]);

  const percentage = students.length
    ? Math.round(
        ((counts.Present + counts.Late + counts.OD) / students.length) * 100
      )
    : 0;

  const filtered = students.filter((student) =>
    `${student.name} ${student.reg}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [
      ["Register Number", "Student Name", "Section", "Course", "Date", "Status"],
      ...students.map((s) => [
        s.reg, s.name, s.section, course, date, s.status
      ]),
    ];

    const csv = rows
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveAttendance = () => {
    console.log({
      course,
      section,
      date,
      attendance: students,
    });

    setSaved(true);
  };

  return (
    <div className="attendance-page">
      <aside className="attendance-sidebar">
        <div className="attendance-brand">
          <div className="attendance-logo">S</div>
          <div>
            <h2>SmartCampus</h2>
            <span>Teacher Portal</span>
          </div>
        </div>

        <p className="attendance-nav-label">WORKSPACE</p>

        <nav className="attendance-nav">
          <button onClick={() => navigate("/teacher-dashboard")}>▦ Dashboard</button>
          <button onClick={() => navigate("/teacher/courses")}>▤ My Courses</button>
          <button onClick={() => navigate("/teacher/students")}>♙ Students</button>
          <button onClick={() => navigate("/teacher/assignments")}>▣ Assignments</button>
          <button onClick={() => navigate("/teacher/assessments")}>◷ Assessments</button>
          <button className="active">▦ Attendance</button>
          <button onClick={() => navigate("/teacher/analytics")}>▥ Analytics</button>
          <button onClick={() => navigate("/teacher/ai-tools")}>✦ AI Teaching Tools</button>
        </nav>

        <div className="attendance-sidebar-bottom">
          <button onClick={() => navigate("/teacher/settings")}>⚙ Settings</button>
          <button onClick={() => navigate("/login")}>↪ Logout</button>
        </div>
      </aside>

      <main className="attendance-main">
        <header className="attendance-header">
          <div>
            <span className="attendance-breadcrumb">
              Teacher Portal / Attendance
            </span>
            <h1>Attendance</h1>
            <p>Track and manage student attendance.</p>
          </div>

          <button className="attendance-export" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        </header>

        <section className="attendance-filters">
          <div className="attendance-field">
            <label>Course</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option>Machine Learning</option>
              <option>Artificial Intelligence</option>
              <option>Data Science</option>
              <option>Database Management</option>
              <option>Python Programming</option>
            </select>
          </div>

          <div className="attendance-field">
            <label>Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </div>

          <div className="attendance-field">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </section>

        <section className="attendance-stats">
          <div className="attendance-stat">
            <span className="attendance-stat-icon purple">♙</span>
            <div>
              <p>Total Students</p>
              <h2>{students.length}</h2>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="attendance-stat-icon green">✓</span>
            <div>
              <p>Present</p>
              <h2>{counts.Present}</h2>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="attendance-stat-icon red">×</span>
            <div>
              <p>Absent</p>
              <h2>{counts.Absent}</h2>
            </div>
          </div>

          <div className="attendance-stat">
            <span className="attendance-stat-icon blue">%</span>
            <div>
              <p>Attendance Rate</p>
              <h2>{percentage}%</h2>
            </div>
          </div>
        </section>

        <section className="attendance-card">
          <div className="attendance-card-header">
            <div>
              <h2>Mark Attendance</h2>
              <p>
                {course} · Section {section}
              </p>
            </div>

            <button className="attendance-all" onClick={markAllPresent}>
              ✓ Mark All Present
            </button>
          </div>

          <div className="attendance-toolbar">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name or register number..."
            />

            <span>{filtered.length} students</span>
          </div>

          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>REGISTER NO.</th>
                  <th>STATUS</th>
                  <th>MARK ATTENDANCE</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="attendance-student">
                        <div className="attendance-avatar">
                          {student.name.charAt(0)}
                        </div>
                        <strong>{student.name}</strong>
                      </div>
                    </td>

                    <td>{student.reg}</td>

                    <td>
                      <span
                        className={`attendance-badge ${student.status.toLowerCase()}`}
                      >
                        {student.status}
                      </span>
                    </td>

                    <td>
                      <div className="attendance-options">
                        {statuses.map((status) => (
                          <button
                            key={status}
                            className={
                              student.status === status
                                ? `selected ${status.toLowerCase()}`
                                : ""
                            }
                            onClick={() => updateStatus(student.id, status)}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="attendance-empty">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="attendance-footer">
            <span>
              {saved ? "Attendance saved in this session." : "Unsaved changes"}
            </span>

            <button className="attendance-save" onClick={saveAttendance}>
              ✓ Save Attendance
            </button>
          </div>
        </section>

        <section className="attendance-legend">
          <span><i className="legend-present" /> Present: {counts.Present}</span>
          <span><i className="legend-absent" /> Absent: {counts.Absent}</span>
          <span><i className="legend-late" /> Late: {counts.Late}</span>
          <span><i className="legend-od" /> On Duty: {counts.OD}</span>
        </section>
      </main>
    </div>
  );
}