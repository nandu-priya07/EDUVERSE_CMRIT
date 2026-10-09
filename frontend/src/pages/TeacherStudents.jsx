
import React, { useMemo, useState } from "react";
import "./teacherstudents.css";

const initialStudents = [
  { id: 1, name: "Arjun Kumar", reg: "AIDS023", email: "arjun.kumar@smartcampus.com", department: "AI & DS", year: 3, section: "A", attendance: 96, score: 92, status: "Active", avatar: "AK", color: "purple" },
  { id: 2, name: "Priya Sharma", reg: "AIDS041", email: "priya.sharma@smartcampus.com", department: "AI & DS", year: 3, section: "A", attendance: 94, score: 89, status: "Active", avatar: "PS", color: "pink" },
  { id: 3, name: "Rahul S", reg: "AIDS018", email: "rahul.s@smartcampus.com", department: "AI & DS", year: 3, section: "A", attendance: 78, score: 76, status: "Active", avatar: "RS", color: "blue" },
  { id: 4, name: "Divya Lakshmi", reg: "AIDS052", email: "divya.l@smartcampus.com", department: "AI & DS", year: 3, section: "B", attendance: 88, score: 85, status: "Active", avatar: "DL", color: "orange" },
  { id: 5, name: "Karthik M", reg: "AIDS009", email: "karthik.m@smartcampus.com", department: "AI & DS", year: 3, section: "A", attendance: 68, score: 61, status: "At Risk", avatar: "KM", color: "green" },
  { id: 6, name: "Sneha R", reg: "AIDS034", email: "sneha.r@smartcampus.com", department: "AI & DS", year: 3, section: "B", attendance: 98, score: 96, status: "Active", avatar: "SR", color: "pink" },
  { id: 7, name: "Vijay Anand", reg: "CSE021", email: "vijay.a@smartcampus.com", department: "CSE", year: 2, section: "A", attendance: 82, score: 79, status: "Active", avatar: "VA", color: "blue" },
  { id: 8, name: "Nithya S", reg: "AIDS063", email: "nithya.s@smartcampus.com", department: "AI & DS", year: 3, section: "A", attendance: 72, score: 68, status: "At Risk", avatar: "NS", color: "purple" },
];

export default function TeacherStudents() {
  const [students] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [year, setYear] = useState("All Years");
  const [status, setStatus] = useState("All Students");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = search.toLowerCase();

      return (
        (student.name.toLowerCase().includes(query) ||
          student.reg.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query)) &&
        (department === "All Departments" || student.department === department) &&
        (year === "All Years" || student.year === Number(year)) &&
        (status === "All Students" || student.status === status)
      );
    });
  }, [students, search, department, year, status]);

  const averageAttendance = students.reduce((sum, s) => sum + s.attendance, 0) / students.length;
  const averageScore = students.reduce((sum, s) => sum + s.score, 0) / students.length;
  const atRisk = students.filter((s) => s.status === "At Risk").length;

  return (
    <div className="ts-layout">
      <aside className="ts-sidebar">
        <div className="ts-brand"><span>✦</span> SmartCampus</div>

        <div className="ts-user">
          <div className="ts-avatar">V</div>
          <div><h4>Vetrichelvan</h4><p>Teacher</p></div>
          <span className="ts-arrow">→</span>
        </div>

        <div className="ts-label">WORKSPACE</div>
        <nav className="ts-nav">
          <a href="/teacher-dashboard"><span>▦</span> Dashboard</a>
          <a href="/teacher/courses"><span>▤</span> My Courses</a>
          <a className="active" href="/teacher/students"><span>♙</span> Students</a>
          <a href="/teacher/assignments"><span>▣</span> Assignments</a>
          <a href="/teacher/assessments"><span>◉</span> Assessments</a>
          <a href="/teacher/attendance"><span>◷</span> Attendance</a>
          <a href="/teacher/analytics"><span>▥</span> Analytics</a>
          <a href="/teacher/ai-tools"><span>✧</span> AI Teaching Tools</a>
        </nav>

        <div className="ts-label ts-pref">PREFERENCES</div>
        <nav className="ts-nav">
          <a href="/teacher/settings"><span>⚙</span> Settings</a>
          <a href="/login"><span>↪</span> Log Out</a>
        </nav>

        <div className="ts-help"><span>?</span><div><strong>Need help?</strong><p>Visit support center</p></div></div>
      </aside>

      <main className="ts-main">
        <header className="ts-header">
          <div><p>Workspace / Students</p><h2>Students</h2></div>
          <div className="ts-header-right">
            <button className="ts-icon-btn">♧</button>
            <button className="ts-icon-btn">⌕</button>
            <div className="ts-profile"><div className="ts-avatar small">V</div><span>Vetrichelvan</span><span>⌄</span></div>
          </div>
        </header>

        <section className="ts-title-row">
          <div><h1>Student Management <span>✦</span></h1><p>Monitor student profiles, attendance and academic performance.</p></div>
          <button className="ts-export" onClick={() => {
            const csv = [
              ["Name", "Register Number", "Email", "Department", "Year", "Attendance", "Score", "Status"],
              ...filteredStudents.map(s => [s.name, s.reg, s.email, s.department, s.year, s.attendance, s.score, s.status])
            ].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "smartcampus-students.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}>↓ Export CSV</button>
        </section>

        <section className="ts-stats">
          <div className="ts-stat"><div className="ts-stat-icon purple">♙</div><p>Total Students</p><h2>{students.length.toString().padStart(2, "0")}</h2><span>In your teaching groups</span></div>
          <div className="ts-stat"><div className="ts-stat-icon green">◷</div><p>Average Attendance</p><h2>{averageAttendance.toFixed(1)}%</h2><span className="ts-green">Class attendance average</span></div>
          <div className="ts-stat"><div className="ts-stat-icon blue">▥</div><p>Average Score</p><h2>{averageScore.toFixed(1)}%</h2><span>Assessment performance</span></div>
          <div className="ts-stat"><div className="ts-stat-icon orange">⚠</div><p>Students At Risk</p><h2>{atRisk.toString().padStart(2, "0")}</h2><span className="ts-orange">Requires attention</span></div>
        </section>

        <section className="ts-table-card">
          <div className="ts-table-heading">
            <div><h3>All Students</h3><p>View and manage students enrolled in your courses.</p></div>
            <span className="ts-count">{filteredStudents.length} students</span>
          </div>

          <div className="ts-toolbar">
            <div className="ts-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, register number or email..." />{search && <button onClick={() => setSearch("")}>×</button>}</div>
            <div className="ts-filters">
              <select value={department} onChange={e => setDepartment(e.target.value)}>
                <option>All Departments</option><option>AI & DS</option><option>CSE</option>
              </select>
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option>All Years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
              </select>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option>All Students</option><option>Active</option><option>At Risk</option>
              </select>
            </div>
          </div>

          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead><tr><th>STUDENT</th><th>REGISTER NO.</th><th>DEPARTMENT</th><th>YEAR</th><th>ATTENDANCE</th><th>PERFORMANCE</th><th>STATUS</th><th>ACTION</th></tr></thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td><div className="ts-student-cell"><div className={`ts-student-avatar ${student.color}`}>{student.avatar}</div><div><strong>{student.name}</strong><span>{student.email}</span></div></div></td>
                    <td>{student.reg}</td>
                    <td>{student.department}</td>
                    <td>Year {student.year} · {student.section}</td>
                    <td><div className="ts-metric"><strong>{student.attendance}%</strong><div className="ts-progress"><i className={student.attendance < 75 ? "low" : ""} style={{ width: `${student.attendance}%` }} /></div></div></td>
                    <td><strong className={student.score >= 85 ? "ts-score-good" : student.score < 70 ? "ts-score-low" : ""}>{student.score}%</strong></td>
                    <td><span className={`ts-status ${student.status === "At Risk" ? "risk" : "active"}`}>{student.status}</span></td>
                    <td><button className="ts-view-btn" onClick={() => setSelectedStudent(student)}>View →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && <div className="ts-empty"><h3>No students found</h3><p>Try changing your search or filters.</p><button onClick={() => {setSearch("");setDepartment("All Departments");setYear("All Years");setStatus("All Students");}}>Clear filters</button></div>}
          </div>
        </section>

        <footer className="ts-footer">© 2026 SmartCampus · Teacher Workspace <span>Built for smarter learning ✦</span></footer>
      </main>

      {selectedStudent && (
        <div className="ts-modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="ts-modal" onClick={e => e.stopPropagation()}>
            <button className="ts-modal-close" onClick={() => setSelectedStudent(null)}>×</button>
            <div className={`ts-modal-avatar ${selectedStudent.color}`}>{selectedStudent.avatar}</div>
            <h2>{selectedStudent.name}</h2>
            <p className="ts-modal-reg">{selectedStudent.reg}</p>
            <div className="ts-modal-info">
              <div><span>Email</span><strong>{selectedStudent.email}</strong></div>
              <div><span>Department</span><strong>{selectedStudent.department}</strong></div>
              <div><span>Academic Year</span><strong>Year {selectedStudent.year} · Section {selectedStudent.section}</strong></div>
              <div><span>Attendance</span><strong>{selectedStudent.attendance}%</strong></div>
              <div><span>Performance</span><strong>{selectedStudent.score}%</strong></div>
              <div><span>Status</span><strong>{selectedStudent.status}</strong></div>
            </div>
            <button className="ts-modal-done" onClick={() => setSelectedStudent(null)}>Close Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}