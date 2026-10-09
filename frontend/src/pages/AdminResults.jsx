import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminResults.css";
import {
  Award,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Send,
  Lock,
  Unlock,
  Edit2,
  Save,
  X,
  Upload,
  Layers,
  History,
  CheckSquare
} from "lucide-react";

export default function AdminResults() {
  const navigate = useNavigate();

  // Active Tab: 'dashboard' | 'entry' | 'publications' | 'review' | 'audit'
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filter States
  const [department, setDepartment] = useState("All");
  const [batchYear, setBatchYear] = useState("All");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semester, setSemester] = useState("All");
  const [section, setSection] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Options Data
  const [options, setOptions] = useState({
    departments: [],
    batchYears: ["2021-2025", "2022-2026", "2023-2027", "2024-2028"],
    academicYears: ["2024-2025", "2025-2026", "2026-2027"],
    sections: ["A", "B", "C", "All"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
  });

  // Dashboard & Publications Data
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalStudentsWithResults: 0,
      totalResultsEntered: 0,
      resultsAwaitingPublication: 0,
      publishedSemesters: 0,
      pendingEntrySemesters: 0,
    },
    publications: [],
  });

  // Entry Mode States
  const [entryMode, setEntryMode] = useState("class"); // 'individual' | 'class'
  const [entryDepartment, setEntryDepartment] = useState("");
  const [entryBatchYear, setEntryBatchYear] = useState("2023-2027");
  const [entryAcademicYear, setEntryAcademicYear] = useState("2026-2027");
  const [entrySemester, setEntrySemester] = useState(5);
  const [entrySection, setEntrySection] = useState("A");

  // Mode A Student Search
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearchResults, setStudentSearchResults] = useState([]);

  // Mode B Class Entry Data
  const [semesterCourses, setSemesterCourses] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [classMarksMatrix, setClassMarksMatrix] = useState({}); // { [studentUid_courseCode]: { internal, external, status } }

  // Review & Audit Data
  const [reviewResults, setReviewResults] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Loading & UI States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals
  const [unpublishModal, setUnpublishModal] = useState({ open: false, pub: null, reason: "" });
  const [publishConfirmModal, setPublishConfirmModal] = useState({ open: false, pub: null });
  const [editMarkModal, setEditMarkModal] = useState({ open: false, item: null, internal: 0, external: 0, status: "Pass", reason: "" });
  const [selectedPubsForBulk, setSelectedPubsForBulk] = useState([]);

  // Fetch Options
  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/results/options", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setOptions(json.data);
        if (json.data.departments.length > 0 && !entryDepartment) {
          setEntryDepartment(json.data.departments[0].code || json.data.departments[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  };

  // Fetch Dashboard Data
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams({
        department,
        batch_year: batchYear,
        academic_year: academicYear,
        semester,
        section,
        status: statusFilter,
      });

      const res = await fetch(`http://localhost:5000/api/admin/results/dashboard?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Semester Courses & Eligible Students for Result Entry
  const fetchEntryClassData = async () => {
    if (!entryDepartment || !entrySemester) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // 1. Fetch Courses for Semester
      const cRes = await fetch(
        `http://localhost:5000/api/admin/results/semester-courses?department=${encodeURIComponent(
          entryDepartment
        )}&semester=${entrySemester}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cJson = await cRes.json();
      const courses = cJson.data?.courses || [];
      setSemesterCourses(courses);

      // 2. Fetch Eligible Students
      const sQuery = new URLSearchParams({
        department: entryDepartment,
        batch_year: entryBatchYear,
        academic_year: entryAcademicYear,
        semester: entrySemester,
        section: entrySection,
      });
      const sRes = await fetch(`http://localhost:5000/api/admin/results/eligible-students?${sQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sJson = await sRes.json();
      const students = sJson.data?.students || [];
      const existingMap = sJson.data?.existingResults || {};

      setEligibleStudents(students);

      // Populate classMarksMatrix with existing or default values
      const initialMatrix = {};
      students.forEach((st) => {
        courses.forEach((c) => {
          const key = `${st.uid}_${c.course_code}`;
          const existing = existingMap[st.uid]?.[c.course_code];

          initialMatrix[key] = {
            student_uid: st.uid,
            course_code: c.course_code,
            course_name: c.course_name,
            course_id: c.course_id,
            credits: c.credits,
            internal_marks: existing ? existing.internal_marks : 0,
            external_marks: existing ? existing.external_marks : 0,
            status: existing ? existing.status : "Pass",
          };
        });
      });

      setClassMarksMatrix(initialMatrix);
    } catch (err) {
      console.error("Failed to load class entry data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Review Data
  const fetchReviewResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams({
        department,
        batch_year: batchYear,
        academic_year: academicYear,
        semester,
        section,
        search: searchQuery,
        status: statusFilter,
      });

      const res = await fetch(`http://localhost:5000/api/admin/results/review?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setReviewResults(json.data.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch review results:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/results/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "publications") {
      fetchDashboard();
    } else if (activeTab === "entry") {
      fetchEntryClassData();
    } else if (activeTab === "review") {
      fetchReviewResults();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, department, batchYear, academicYear, semester, section, statusFilter]);

  // Handle Mark Input Changes in Class Matrix
  const handleMatrixChange = (studentUid, courseCode, field, value) => {
    const key = `${studentUid}_${courseCode}`;
    setClassMarksMatrix((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // Save Class Results (Bulk or Draft)
  const handleSaveClassResults = async (isDraft = false) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payloadResults = Object.values(classMarksMatrix);

      const res = await fetch("http://localhost:5000/api/admin/results/entry", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: entryDepartment,
          batch_year: entryBatchYear,
          academic_year: entryAcademicYear,
          semester: entrySemester,
          section: entrySection,
          is_draft: isDraft,
          results: payloadResults,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(
          "success",
          isDraft ? "Results saved as draft successfully." : "Results saved & finalized for publication review!"
        );
        fetchDashboard();
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      showNotification("error", err.message || "Failed to save results.");
    } finally {
      setSaving(false);
    }
  };

  // Handle CSV/Excel File Upload for Result Entry
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length < 2) return;

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const newMatrix = { ...classMarksMatrix };

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const regNoOrUid = cols[headers.indexOf("register_number")] || cols[headers.indexOf("student_uid")];
          const code = cols[headers.indexOf("course_code")];
          const internal = parseFloat(cols[headers.indexOf("internal_marks")] || 0);
          const external = parseFloat(cols[headers.indexOf("external_marks")] || 0);

          // Find student matching regNo
          const matchedStudent = eligibleStudents.find(
            (s) => s.register_number === regNoOrUid || s.uid === regNoOrUid
          );

          if (matchedStudent && code) {
            const key = `${matchedStudent.uid}_${code}`;
            if (newMatrix[key]) {
              newMatrix[key].internal_marks = internal;
              newMatrix[key].external_marks = external;
            }
          }
        }

        setClassMarksMatrix(newMatrix);
        showNotification("success", "Successfully parsed marks from CSV file into matrix!");
      } catch (err) {
        showNotification("error", "Failed to parse CSV file format.");
      }
    };
    reader.readAsText(file);
  };

  // Change Publication Status
  const handleUpdatePublicationStatus = async (pub, targetStatus, reason = "") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/results/publication-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: pub.department,
          batch_year: pub.batch_year,
          academic_year: pub.academic_year,
          semester: pub.semester,
          section: pub.section || "All",
          status: targetStatus,
          unpublish_reason: reason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification("success", `Semester publication status updated to '${targetStatus}'.`);
        fetchDashboard();
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      showNotification("error", err.message || "Failed to update publication status.");
    }
  };

  // Update Single Mark (with audit)
  const handleUpdateSingleMark = async () => {
    if (!editMarkModal.item) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/results/update-single", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editMarkModal.item.id,
          internal_marks: editMarkModal.internal,
          external_marks: editMarkModal.external,
          status: editMarkModal.status,
          reason: editMarkModal.reason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification("success", "Student result updated successfully.");
        setEditMarkModal({ open: false, item: null, internal: 0, external: 0, status: "Pass", reason: "" });
        fetchReviewResults();
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      showNotification("error", err.message || "Failed to update result.");
    }
  };

  // Bulk Publish
  const handleBulkPublish = async () => {
    if (selectedPubsForBulk.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/admin/results/publish-bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publication_ids: selectedPubsForBulk }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification("success", `Bulk published ${json.data.publishedSemesters.length} semesters.`);
        setSelectedPubsForBulk([]);
        fetchDashboard();
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      showNotification("error", err.message || "Bulk publish failed.");
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Results" />

      <main className="admin-results-main">
        {/* Top Header */}
        <div className="results-header-container">
          <div className="results-title-group">
            <p className="results-eyebrow">ADMINISTRATION / EXAMINATIONS</p>
            <h1>Admin Results Management</h1>
            <p className="results-subtitle">
              Enter, verify, review, and control publication of student semester examination results.
            </p>
          </div>

          <div className="results-action-bar">
            <button className="btn-primary" onClick={() => setActiveTab("entry")}>
              <Plus size={18} /> Add Results
            </button>
            <button className="btn-secondary" onClick={() => setActiveTab("publications")}>
              <Send size={18} /> Publication Control
            </button>
            <button className="btn-secondary" onClick={fetchDashboard}>
              <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              background: notification.type === "success" ? "#064e3b" : "#7f1d1d",
              color: notification.type === "success" ? "#34d399" : "#fca5a5",
              border: `1px solid ${notification.type === "success" ? "#10b981" : "#ef4444"}`,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {notification.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {notification.message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="results-tabs">
          <button
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Award size={18} /> Dashboard Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "entry" ? "active" : ""}`}
            onClick={() => setActiveTab("entry")}
          >
            <Plus size={18} /> Result Entry & Import
          </button>
          <button
            className={`tab-btn ${activeTab === "publications" ? "active" : ""}`}
            onClick={() => setActiveTab("publications")}
          >
            <Send size={18} /> Publication Control
          </button>
          <button
            className={`tab-btn ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            <Eye size={18} /> Review & Edit Results
          </button>
          <button
            className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <History size={18} /> Audit History
          </button>
        </div>

        {/* Global Filter Bar */}
        {(activeTab === "dashboard" || activeTab === "publications" || activeTab === "review") && (
          <div className="filter-card">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Department</label>
                <select
                  className="filter-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {options.departments.map((d) => (
                    <option key={d.id} value={d.code || d.name}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Batch Year</label>
                <select
                  className="filter-select"
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  {options.batchYears.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Academic Year</label>
                <select
                  className="filter-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                >
                  <option value="All">All Academic Years</option>
                  {options.academicYears.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Semester</label>
                <select
                  className="filter-select"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  <option value="All">All Semesters</option>
                  {options.semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Section</label>
                <select
                  className="filter-select"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                >
                  <option value="All">All Sections</option>
                  {options.sections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab !== "publications" && (
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Ready to Publish">Ready to Publish</option>
                    <option value="Published">Published</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <>
            {/* Metric Summary Cards */}
            <div className="dashboard-cards-grid">
              <div className="summary-card">
                <div className="card-icon-wrap indigo">
                  <Users size={24} />
                </div>
                <div className="card-info">
                  <h3>{dashboardData.summary.totalStudentsWithResults}</h3>
                  <p>Students with Results</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon-wrap blue">
                  <BookOpen size={24} />
                </div>
                <div className="card-info">
                  <h3>{dashboardData.summary.totalResultsEntered}</h3>
                  <p>Total Results Entered</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon-wrap yellow">
                  <Clock size={24} />
                </div>
                <div className="card-info">
                  <h3>{dashboardData.summary.resultsAwaitingPublication}</h3>
                  <p>Awaiting Publication</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon-wrap green">
                  <CheckCircle size={24} />
                </div>
                <div className="card-info">
                  <h3>{dashboardData.summary.publishedSemesters}</h3>
                  <p>Published Semesters</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-icon-wrap purple">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="card-info">
                  <h3>{dashboardData.summary.pendingEntrySemesters}</h3>
                  <p>Pending Result Entry</p>
                </div>
              </div>
            </div>

            {/* Publication Overview Table */}
            <div className="table-container">
              <div style={{ padding: "1.25rem", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Semester Results Publication Summary</h3>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Showing active semester result batches</span>
              </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Batch</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Section</th>
                    <th>Eligible Students</th>
                    <th>Results Entered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.publications.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                        No semester results matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    dashboardData.publications.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.department}</strong></td>
                        <td>{p.batch_year}</td>
                        <td>{p.academic_year}</td>
                        <td>Sem {p.semester}</td>
                        <td>{p.section}</td>
                        <td>{p.eligible_students}</td>
                        <td>{p.results_entered}</td>
                        <td>
                          <span className={`status-badge ${p.status.toLowerCase().replace(/\s+/g, "")}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            onClick={() => {
                              setDepartment(p.department);
                              setBatchYear(p.batch_year);
                              setAcademicYear(p.academic_year);
                              setSemester(p.semester);
                              setActiveTab("review");
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2: RESULT ENTRY & IMPORT */}
        {activeTab === "entry" && (
          <div>
            {/* Entry Selector Card */}
            <div className="filter-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Result Entry Setup</h3>
                <div style={{ display: "flex", gap: "0.5rem", background: "#1e293b", padding: "0.25rem", borderRadius: "8px" }}>
                  <button
                    className={`tab-btn ${entryMode === "class" ? "active" : ""}`}
                    style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem", borderRadius: "6px" }}
                    onClick={() => setEntryMode("class")}
                  >
                    Mode B: Entire Class Grid
                  </button>
                </div>
              </div>

              <div className="filter-grid">
                <div className="filter-group">
                  <label>Department</label>
                  <select
                    className="filter-select"
                    value={entryDepartment}
                    onChange={(e) => setEntryDepartment(e.target.value)}
                  >
                    {options.departments.map((d) => (
                      <option key={d.id} value={d.code || d.name}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Batch Year</label>
                  <select
                    className="filter-select"
                    value={entryBatchYear}
                    onChange={(e) => setEntryBatchYear(e.target.value)}
                  >
                    {options.batchYears.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Academic Year</label>
                  <select
                    className="filter-select"
                    value={entryAcademicYear}
                    onChange={(e) => setEntryAcademicYear(e.target.value)}
                  >
                    {options.academicYears.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Semester</label>
                  <select
                    className="filter-select"
                    value={entrySemester}
                    onChange={(e) => setEntrySemester(parseInt(e.target.value, 10))}
                  >
                    {options.semesters.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Section</label>
                  <select
                    className="filter-select"
                    value={entrySection}
                    onChange={(e) => setEntrySection(e.target.value)}
                  >
                    {options.sections.filter((s) => s !== "All").map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label className="btn-secondary" style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                    <Upload size={16} /> Import Marks CSV
                    <input type="file" accept=".csv,.txt" onChange={handleCSVImport} style={{ display: "none" }} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-secondary" onClick={() => handleSaveClassResults(true)} disabled={saving}>
                    Save Draft
                  </button>
                  <button className="btn-success" onClick={() => handleSaveClassResults(false)} disabled={saving}>
                    <Save size={16} /> Save & Finalize Class Results
                  </button>
                </div>
              </div>
            </div>

            {/* Class Matrix Table */}
            <div className="table-container" style={{ overflowX: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "160px" }}>Student Reg No</th>
                    <th style={{ minWidth: "180px" }}>Student Name</th>
                    {semesterCourses.map((c) => (
                      <th key={c.course_code} style={{ minWidth: "180px", textAlign: "center" }}>
                        <div>{c.course_code}</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "none" }}>
                          {c.course_name.substring(0, 20)}... (Int/Ext)
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eligibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={2 + semesterCourses.length} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        No eligible students found for the selected department, batch, and section.
                      </td>
                    </tr>
                  ) : (
                    eligibleStudents.map((st) => (
                      <tr key={st.uid}>
                        <td><strong>{st.register_number}</strong></td>
                        <td>{st.name}</td>
                        {semesterCourses.map((c) => {
                          const key = `${st.uid}_${c.course_code}`;
                          const cell = classMarksMatrix[key] || { internal_marks: 0, external_marks: 0, status: "Pass" };

                          return (
                            <td key={c.course_code} style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", alignItems: "center" }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  className="mark-input"
                                  value={cell.internal_marks}
                                  title="Internal Marks (max 50)"
                                  onChange={(e) => handleMatrixChange(st.uid, c.course_code, "internal_marks", parseFloat(e.target.value) || 0)}
                                />
                                <span style={{ color: "#64748b" }}>/</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  className="mark-input"
                                  value={cell.external_marks}
                                  title="External Marks (max 50)"
                                  onChange={(e) => handleMatrixChange(st.uid, c.course_code, "external_marks", parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PUBLICATION CONTROL */}
        {activeTab === "publications" && (
          <div>
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Publication Control Center</h3>
              {selectedPubsForBulk.length > 0 && (
                <button className="btn-success" onClick={handleBulkPublish}>
                  <Send size={16} /> Publish Selected ({selectedPubsForBulk.length})
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPubsForBulk(dashboardData.publications.map((p) => p.id));
                          } else {
                            setSelectedPubsForBulk([]);
                          }
                        }}
                      />
                    </th>
                    <th>Department</th>
                    <th>Batch Year</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Section</th>
                    <th>Eligible Students</th>
                    <th>Results Entered</th>
                    <th>Status</th>
                    <th>Published At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.publications.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        No semester publication records found.
                      </td>
                    </tr>
                  ) : (
                    dashboardData.publications.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedPubsForBulk.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPubsForBulk([...selectedPubsForBulk, p.id]);
                              } else {
                                setSelectedPubsForBulk(selectedPubsForBulk.filter((id) => id !== p.id));
                              }
                            }}
                          />
                        </td>
                        <td><strong>{p.department}</strong></td>
                        <td>{p.batch_year}</td>
                        <td>{p.academic_year}</td>
                        <td>Sem {p.semester}</td>
                        <td>{p.section}</td>
                        <td>{p.eligible_students}</td>
                        <td>{p.results_entered}</td>
                        <td>
                          <span className={`status-badge ${p.status.toLowerCase().replace(/\s+/g, "")}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>{p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {p.status !== "Published" ? (
                              <button
                                className="btn-success"
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => setPublishConfirmModal({ open: true, pub: p })}
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                className="btn-danger"
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => setUnpublishModal({ open: true, pub: p, reason: "" })}
                              >
                                Unpublish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEW & EDIT RESULTS */}
        {activeTab === "review" && (
          <div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>Student Name</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Internal (/50)</th>
                    <th>External (/50)</th>
                    <th>Total (/100)</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewResults.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        No results match the current search filters.
                      </td>
                    </tr>
                  ) : (
                    reviewResults.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.register_number}</strong></td>
                        <td>{r.student_name}</td>
                        <td><code>{r.course_code}</code></td>
                        <td>{r.course_name}</td>
                        <td>{r.internal_marks}</td>
                        <td>{r.external_marks}</td>
                        <td><strong>{r.total_marks}</strong></td>
                        <td>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                              background: r.grade === "F" ? "#ef444422" : "#10b98122",
                              color: r.grade === "F" ? "#f87171" : "#34d399",
                            }}
                          >
                            {r.grade}
                          </span>
                        </td>
                        <td>{r.status}</td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            onClick={() =>
                              setEditMarkModal({
                                open: true,
                                item: r,
                                internal: r.internal_marks,
                                external: r.external_marks,
                                status: r.status,
                                reason: "",
                              })
                            }
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG HISTORY */}
        {activeTab === "audit" && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Department</th>
                  <th>Academic Year / Sem</th>
                  <th>Course Code</th>
                  <th>Performed By</th>
                  <th>Reason / Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      No audit history logs recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>
                        <span className="status-badge ready">{log.action_type}</span>
                      </td>
                      <td>{log.department || "—"}</td>
                      <td>{log.academic_year ? `${log.academic_year} (Sem ${log.semester})` : "—"}</td>
                      <td><code>{log.course_code || "—"}</code></td>
                      <td>{log.admin_name || log.performed_by}</td>
                      <td style={{ color: "#cbd5e1" }}>{log.reason || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* CONFIRMATION PUBLISH MODAL */}
      {publishConfirmModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Publish Semester Results</h2>
              <button className="close-btn" onClick={() => setPublishConfirmModal({ open: false, pub: null })}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: "#cbd5e1", lineHeight: "1.6" }}>
              Are you sure you want to publish examination results for:
            </p>
            <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", margin: "1rem 0" }}>
              <p style={{ margin: "0.25rem 0" }}>Department: <strong>{publishConfirmModal.pub?.department}</strong></p>
              <p style={{ margin: "0.25rem 0" }}>Batch: <strong>{publishConfirmModal.pub?.batch_year}</strong></p>
              <p style={{ margin: "0.25rem 0" }}>Academic Year: <strong>{publishConfirmModal.pub?.academic_year}</strong> (Sem {publishConfirmModal.pub?.semester})</p>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Publishing will make these grades immediately visible to all students on their student portal.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="btn-secondary" onClick={() => setPublishConfirmModal({ open: false, pub: null })}>
                Cancel
              </button>
              <button
                className="btn-success"
                onClick={() => {
                  handleUpdatePublicationStatus(publishConfirmModal.pub, "Published");
                  setPublishConfirmModal({ open: false, pub: null });
                }}
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNPUBLISH MODAL (REASON REQUIRED) */}
      {unpublishModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Unpublish Semester Results</h2>
              <button className="close-btn" onClick={() => setUnpublishModal({ open: false, pub: null, reason: "" })}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: "#cbd5e1" }}>
              Unpublishing will immediately hide results from the student portal. Please specify a mandatory reason:
            </p>
            <textarea
              className="filter-input"
              rows={3}
              placeholder="Reason for unpublishing (e.g., Mark revision, calculation correction)..."
              value={unpublishModal.reason}
              onChange={(e) => setUnpublishModal({ ...unpublishModal, reason: e.target.value })}
              style={{ width: "100%", margin: "1rem 0" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn-secondary" onClick={() => setUnpublishModal({ open: false, pub: null, reason: "" })}>
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={!unpublishModal.reason.trim()}
                onClick={() => {
                  handleUpdatePublicationStatus(unpublishModal.pub, "Unpublished", unpublishModal.reason);
                  setUnpublishModal({ open: false, pub: null, reason: "" });
                }}
              >
                Confirm Unpublish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MARK MODAL */}
      {editMarkModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Student Mark</h2>
              <button
                className="close-btn"
                onClick={() =>
                  setEditMarkModal({ open: false, item: null, internal: 0, external: 0, status: "Pass", reason: "" })
                }
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
              <p style={{ margin: "0.25rem 0" }}>Student: <strong>{editMarkModal.item?.student_name}</strong> ({editMarkModal.item?.register_number})</p>
              <p style={{ margin: "0.25rem 0" }}>Course: <strong>{editMarkModal.item?.course_name}</strong> ({editMarkModal.item?.course_code})</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="filter-group">
                <label>Internal Marks (max 50)</label>
                <input
                  type="number"
                  className="filter-input"
                  value={editMarkModal.internal}
                  onChange={(e) => setEditMarkModal({ ...editMarkModal, internal: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="filter-group">
                <label>External Marks (max 50)</label>
                <input
                  type="number"
                  className="filter-input"
                  value={editMarkModal.external}
                  onChange={(e) => setEditMarkModal({ ...editMarkModal, external: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="filter-group" style={{ marginBottom: "1rem" }}>
              <label>Result Status</label>
              <select
                className="filter-select"
                value={editMarkModal.status}
                onChange={(e) => setEditMarkModal({ ...editMarkModal, status: e.target.value })}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Absent">Absent</option>
                <option value="Withheld">Withheld</option>
              </select>
            </div>

            <div className="filter-group" style={{ marginBottom: "1.5rem" }}>
              <label>Justification Reason</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Reason for mark change..."
                value={editMarkModal.reason}
                onChange={(e) => setEditMarkModal({ ...editMarkModal, reason: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="btn-secondary"
                onClick={() =>
                  setEditMarkModal({ open: false, item: null, internal: 0, external: 0, status: "Pass", reason: "" })
                }
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateSingleMark}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
