import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  UserRound,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  Award,
  Activity,
  Brain,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Download,
  Sparkles,
  ChevronRight,
  Clock,
  Zap,
  TrendingUp,
  XCircle,
  Menu
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

import AdminSidebar from "../components/AdminSidebar";
import "./AdminAnalytics.css";

const API_BASE = "http://localhost:5000/api/admin/analytics";
const CHART_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Global Filter State
  const [filters, setFilters] = useState({
    department: "all",
    batch: "all",
    academic_year: "all",
    semester: "all",
    year: "all",
    section: "all",
    startDate: "",
    endDate: ""
  });

  // Filter Options
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    batches: [],
    academicYears: [],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    years: [1, 2, 3, 4],
    sections: []
  });

  // Analytics Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overviewData, setOverviewData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [facultyData, setFacultyData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [alertData, setAlertData] = useState(null);

  // Search state for student list table
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  // Fetch Filter Dropdown Options
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/filters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setFilterOptions(json.data);
      }
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  };

  // Build Query String from Filters
  const buildQueryString = (extra = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => {
      if (v && v !== "all") params.append(k, v);
    });
    return params.toString();
  };

  // Fetch Analytics Endpoint
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const q = buildQueryString();

      // Fetch overview, alerts & filter-dependent data in parallel
      const [
        resOverview,
        resStudents,
        resAcademics,
        resEnrollments,
        resFaculty,
        resCourses,
        resAssessments,
        resUsage,
        resAi,
        resResults,
        resAlerts
      ] = await Promise.all([
        fetch(`${API_BASE}/overview?${q}`, { headers }),
        fetch(`${API_BASE}/students?${q}&search=${studentSearch}&page=${studentPage}`, { headers }),
        fetch(`${API_BASE}/academics?${q}`, { headers }),
        fetch(`${API_BASE}/enrollments?${q}`, { headers }),
        fetch(`${API_BASE}/faculty?${q}`, { headers }),
        fetch(`${API_BASE}/courses?${q}`, { headers }),
        fetch(`${API_BASE}/assessments?${q}`, { headers }),
        fetch(`${API_BASE}/usage?${q}`, { headers }),
        fetch(`${API_BASE}/ai?${q}`, { headers }),
        fetch(`${API_BASE}/results?${q}`, { headers }),
        fetch(`${API_BASE}/alerts?${q}`, { headers })
      ]);

      if (!resOverview.ok) {
        throw new Error("Failed to load analytics data. Admin access required.");
      }

      setOverviewData((await resOverview.json()).data);
      setStudentData((await resStudents.json()).data);
      setAcademicData((await resAcademics.json()).data);
      setEnrollmentData((await resEnrollments.json()).data);
      setFacultyData((await resFaculty.json()).data);
      setCourseData((await resCourses.json()).data);
      setAssessmentData((await resAssessments.json()).data);
      setUsageData((await resUsage.json()).data);
      setAiData((await resAi.json()).data);
      setResultData((await resResults.json()).data);
      setAlertData((await resAlerts.json()).data);

    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to connect to analytics service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filters, studentSearch, studentPage]);

  const handleFilterChange = (field, val) => {
    setFilters(prev => ({ ...prev, [field]: val }));
    setStudentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      department: "all",
      batch: "all",
      academic_year: "all",
      semester: "all",
      year: "all",
      section: "all",
      startDate: "",
      endDate: ""
    });
    setStudentSearch("");
    setStudentPage(1);
  };

  const handleExportCSV = (reportType = "students") => {
    const token = localStorage.getItem("token");
    const q = buildQueryString({ reportType });
    window.open(`${API_BASE}/reports/export?${q}&token=${token}`, "_blank");
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Analytics" />

      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div>
              <div className="admin-breadcrumb">
                Administration <ChevronRight size={13} /> Analytics
              </div>
              <h1>Admin Analytics Dashboard</h1>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button className="btn-export-csv" onClick={() => handleExportCSV("overview")}>
              <Download size={16} /> Export CSV Report
            </button>
            <button className="admin-refresh-btn" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw size={16} className={loading ? "admin-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        <div className="admin-content">
          {/* Global Filter Bar */}
          <section className="analytics-filters-bar">
            <div className="filters-header">
              <h3><Filter size={18} /> Global Analytics Filters</h3>
              <div className="filters-actions">
                <button className="btn-reset-filter" onClick={handleResetFilters}>
                  <RefreshCw size={14} /> Reset Filters
                </button>
              </div>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label>Department</label>
                <select value={filters.department} onChange={e => handleFilterChange("department", e.target.value)}>
                  <option value="all">All Departments</option>
                  {filterOptions.departments.map(d => (
                    <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Academic Batch</label>
                <select value={filters.batch} onChange={e => handleFilterChange("batch", e.target.value)}>
                  <option value="all">All Batches</option>
                  {filterOptions.batches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Academic Year</label>
                <select value={filters.academic_year} onChange={e => handleFilterChange("academic_year", e.target.value)}>
                  <option value="all">All Academic Years</option>
                  {filterOptions.academicYears.map(ay => (
                    <option key={ay} value={ay}>{ay}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Semester</label>
                <select value={filters.semester} onChange={e => handleFilterChange("semester", e.target.value)}>
                  <option value="all">All Semesters</option>
                  {filterOptions.semesters.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Degree Year</label>
                <select value={filters.year} onChange={e => handleFilterChange("year", e.target.value)}>
                  <option value="all">All Years</option>
                  {filterOptions.years.map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Section</label>
                <select value={filters.section} onChange={e => handleFilterChange("section", e.target.value)}>
                  <option value="all">All Sections</option>
                  {filterOptions.sections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Start Date</label>
                <input type="date" value={filters.startDate} onChange={e => handleFilterChange("startDate", e.target.value)} />
              </div>

              <div className="filter-group">
                <label>End Date</label>
                <input type="date" value={filters.endDate} onChange={e => handleFilterChange("endDate", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <nav className="analytics-nav-tabs">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "students", label: "Student Analytics", icon: Users },
              { id: "academics", label: "Academic Performance", icon: Award },
              { id: "enrollment", label: "Enrollment Analytics", icon: ClipboardList },
              { id: "faculty", label: "Faculty Analytics", icon: UserRound },
              { id: "courses", label: "Course & Curriculum", icon: BookOpen },
              { id: "assessments", label: "Assessments & Quizzes", icon: Brain },
              { id: "usage", label: "LMS Usage", icon: TrendingUp },
              { id: "ai", label: "AI Features", icon: Sparkles },
              { id: "results", label: "Result Publication", icon: CheckCircle2 },
              { id: "alerts", label: "Alerts & Insights", icon: AlertTriangle },
              { id: "exports", label: "Reports & Exports", icon: FileSpreadsheet }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {error && (
            <div className="admin-error">
              <div>
                <strong>Unable to load analytics</strong>
                <p>{error}</p>
              </div>
              <button onClick={fetchAnalytics}>Retry</button>
            </div>
          )}

          {/* SECTION 1: OVERVIEW DASHBOARD */}
          {(activeTab === "overview" || activeTab === "all") && overviewData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon purple"><Users size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{overviewData.kpis.totalStudents}</span>
                    <span className="kpi-title">Total Students</span>
                    <span className="kpi-sub">{overviewData.kpis.activeStudents} Active / {overviewData.kpis.inactiveStudents} Inactive</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon blue"><UserRound size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{overviewData.kpis.totalFaculty}</span>
                    <span className="kpi-title">Total Faculty</span>
                    <span className="kpi-sub">Across {overviewData.kpis.totalDepartments} Departments</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon green"><BookOpen size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{overviewData.kpis.totalCourses}</span>
                    <span className="kpi-title">Total Courses</span>
                    <span className="kpi-sub">{overviewData.kpis.totalEnrollments} Active Enrollments</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon orange"><ClipboardList size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{overviewData.kpis.pendingEnrollments}</span>
                    <span className="kpi-title">Pending Enrollments</span>
                    <span className="kpi-sub">Unregistered Eligible Students</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon teal"><CheckCircle2 size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{overviewData.kpis.publishedSemesters}</span>
                    <span className="kpi-title">Published Semesters</span>
                    <span className="kpi-sub">{overviewData.kpis.awaitingPublication} Awaiting Publication</span>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="charts-two-col">
                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Students by Department</h3>
                      <p>Department distribution bar chart</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overviewData.charts.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="student_count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Students by Academic Batch</h3>
                      <p>Batch distribution breakdown</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overviewData.charts.byBatch}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="batch_year" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Student Account Status</h3>
                      <p>Active vs Inactive accounts distribution</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewData.charts.accountStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {overviewData.charts.accountStatus.map((entry, idx) => (
                            <Cell key={idx} fill={idx === 0 ? "#10b981" : "#ef4444"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Academic Performance Trend</h3>
                      <p>Historical semester average score trend</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData.charts.performanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="semester" tickFormatter={s => `Sem ${s}`} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="avg_marks" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: STUDENT ANALYTICS */}
          {(activeTab === "students" || activeTab === "all") && studentData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Student Directory Summary & Filters</h3>
                    <p>Searchable student database with real status indicators</p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div className="admin-search" style={{ margin: 0 }}>
                      <Search size={16} />
                      <input
                        placeholder="Search student name, email, reg no..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="analytics-table-container">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Register No</th>
                        <th>Student Name</th>
                        <th>Department</th>
                        <th>Batch</th>
                        <th>Semester</th>
                        <th>Section</th>
                        <th>Hostel Status</th>
                        <th>Account Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.students.map(s => (
                        <tr key={s.uid}>
                          <td><strong>{s.register_number || "—"}</strong></td>
                          <td>{s.name}</td>
                          <td>{s.department_name || s.department}</td>
                          <td>{s.batch_year}</td>
                          <td>Sem {s.semester}</td>
                          <td>Sec {s.section}</td>
                          <td>{s.is_hostel ? "Hosteller" : "Day Scholar"}</td>
                          <td>
                            <span className={`badge ${s.is_active ? "success" : "danger"}`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-bar">
                  <span>Showing page {studentData.page} of {studentData.totalPages} ({studentData.total} total students)</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="pagination-btn" disabled={studentPage <= 1} onClick={() => setStudentPage(p => p - 1)}>Previous</button>
                    <button className="pagination-btn" disabled={studentPage >= studentData.totalPages} onClick={() => setStudentPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: ACADEMIC PERFORMANCE ANALYTICS */}
          {(activeTab === "academics" || activeTab === "all") && academicData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon green"><Award size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{academicData.summary.passPercentage}%</span>
                    <span className="kpi-title">Overall Pass Rate</span>
                    <span className="kpi-sub">{academicData.summary.passCount} Passed Results</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon red"><XCircle size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{academicData.summary.failPercentage}%</span>
                    <span className="kpi-title">Overall Fail Rate</span>
                    <span className="kpi-sub">{academicData.summary.failCount} Failed / Arrear Cases</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon blue"><TrendingUp size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{academicData.summary.avgMarks} / 100</span>
                    <span className="kpi-title">Average Score</span>
                    <span className="kpi-sub">Avg CGPA: {academicData.summary.avgCgpa}</span>
                  </div>
                </div>
              </div>

              <div className="charts-two-col">
                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Subject-Wise Pass Percentage</h3>
                      <p>Detailed course performance comparison</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={academicData.subjectPerformance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="course_code" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="pass_pct" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Students Needing Support / Arrears</h3>
                      <p>Students requiring academic support</p>
                    </div>
                  </div>
                  <div className="analytics-table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No</th>
                          <th>Subject</th>
                          <th>Marks</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {academicData.arrearsList.slice(0, 5).map(a => (
                          <tr key={a.id}>
                            <td>{a.student_name}</td>
                            <td>{a.register_number}</td>
                            <td>{a.course_code}</td>
                            <td>{a.total_marks}</td>
                            <td><span className="badge danger">{a.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: ENROLLMENT ANALYTICS */}
          {(activeTab === "enrollment" || activeTab === "all") && enrollmentData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon blue"><ClipboardList size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{enrollmentData.summary.completionPct}%</span>
                    <span className="kpi-title">Enrollment Completion</span>
                    <span className="kpi-sub">{enrollmentData.summary.totalEnrolled} Enrolled / {enrollmentData.summary.totalEligible} Eligible</span>
                  </div>
                </div>
              </div>

              <div className="analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Pending Student Course Enrollments</h3>
                    <p>Eligible active students who have not registered for current semester courses</p>
                  </div>
                  <button className="alert-btn" onClick={() => navigate("/admin/enrollment")}>
                    Manage Enrollments <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="analytics-table-container">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Register Number</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Batch</th>
                        <th>Semester</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollmentData.pendingStudents.map(p => (
                        <tr key={p.uid}>
                          <td><strong>{p.register_number}</strong></td>
                          <td>{p.name}</td>
                          <td>{p.email}</td>
                          <td>{p.department}</td>
                          <td>{p.batch_year}</td>
                          <td>Sem {p.semester}</td>
                          <td>
                            <button className="pagination-btn" onClick={() => navigate("/admin/enrollment")}>Enroll Student</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: FACULTY ANALYTICS */}
          {(activeTab === "faculty" || activeTab === "all") && facultyData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Faculty Workload & Course Assignment Coverage</h3>
                    <p>Faculty assignment distribution and handled student counts</p>
                  </div>
                </div>
                <div className="analytics-table-container">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Faculty Name</th>
                        <th>Department</th>
                        <th>Assigned Courses</th>
                        <th>Students Handled</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyData.workload.map(f => (
                        <tr key={f.uid}>
                          <td><strong>{f.name}</strong></td>
                          <td>{f.department}</td>
                          <td>{f.assigned_courses} Courses</td>
                          <td>{f.total_students_handled} Students</td>
                          <td><span className="badge success">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 9: AI FEATURES ANALYTICS */}
          {(activeTab === "ai" || activeTab === "all") && aiData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon purple"><Sparkles size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{aiData.summary.total_requests}</span>
                    <span className="kpi-title">Total AI API Requests</span>
                    <span className="kpi-sub">{aiData.summary.successful_requests} Success / {aiData.summary.failed_requests} Failed</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon blue"><Zap size={22} /></div>
                  <div className="kpi-content">
                    <span className="kpi-value">{aiData.summary.avg_latency_ms} ms</span>
                    <span className="kpi-title">Average Latency</span>
                    <span className="kpi-sub">Gemini & Ollama response times</span>
                  </div>
                </div>
              </div>

              <div className="charts-two-col">
                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>AI Requests by Feature</h3>
                      <p>Chatbot vs Quiz vs Lesson Plan vs Comic usage</p>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiData.byFeature}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="feature_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-chart-card">
                  <div className="chart-header">
                    <div>
                      <h3>Model Utilization Breakdown</h3>
                      <p>Local Ollama vs Cloud Gemini Models</p>
                    </div>
                  </div>
                  <div className="analytics-table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Model Name</th>
                          <th>Type</th>
                          <th>Request Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiData.byModel.map((m, idx) => (
                          <tr key={idx}>
                            <td><strong>{m.model_name}</strong></td>
                            <td>{m.is_local_model ? "Local Host" : "Cloud Gemini API"}</td>
                            <td>{m.count} Requests</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 11: ALERTS & INSIGHTS */}
          {(activeTab === "alerts" || activeTab === "all") && alertData && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Automated Campus Alerts & Actionable Insights</h3>
                    <p>Real-time issues requiring administrative attention</p>
                  </div>
                </div>

                <div className="alerts-grid">
                  {alertData.alerts.map(a => (
                    <div key={a.id} className={`alert-item-card ${a.severity}`}>
                      <div className="alert-body">
                        <h4>{a.title}</h4>
                        <p>{a.message}</p>
                      </div>
                      <button className="alert-btn" onClick={() => navigate(a.actionLink)}>
                        {a.actionText} <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 12: REPORTS & EXPORTS */}
          {(activeTab === "exports" || activeTab === "all") && (
            <section style={{ marginBottom: 32 }}>
              <div className="analytics-chart-card">
                <div className="chart-header">
                  <div>
                    <h3>Export Filtered Campus Reports</h3>
                    <p>Download official CSV datasets reflecting your current active filters</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  {[
                    { type: "students", title: "Student Distribution Report", sub: "Complete roster with batch & department" },
                    { type: "enrollments", title: "Course Enrollment Report", sub: "Student registration history" },
                    { type: "academics", title: "Academic Performance Report", sub: "Finalized student marks and grades" },
                    { type: "ai", title: "AI Feature Usage Report", sub: "Log history of AI requests and models" }
                  ].map(item => (
                    <div key={item.type} style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 18, background: "#f8fafc" }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{item.title}</h4>
                      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>{item.sub}</p>
                      <button className="btn-export-csv" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleExportCSV(item.type)}>
                        <Download size={14} /> Download CSV
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
