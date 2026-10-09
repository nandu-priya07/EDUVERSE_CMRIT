import React, { useEffect, useMemo, useState } from "react";
import "./AdminEnrollment.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const DEFAULT_ACADEMIC_YEARS = ["2026-2027", "2025-2026", "2024-2025"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const DEPARTMENTS = ["All", "AIDS", "AIML", "CSE", "ECE", "EEE"];
const SECTIONS = ["All", "A", "B", "C", "D"];
const BATCHES = ["All", "2023", "2024", "2025", "2026"];

export default function AdminEnrollment() {
  const [activeTab, setActiveTab] = useState("settings");

  // Notification state
  const [notification, setNotification] = useState({ type: "", message: "" });

  // Dynamic Academic Years from DB
  const [academicYears, setAcademicYears] = useState([]);

  // Settings State
  const [settings, setSettings] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsFilterYear, setSettingsFilterYear] = useState("All");
  const [settingsFilterSem, setSettingsFilterSem] = useState("All");
  const [settingsFilterStatus, setSettingsFilterStatus] = useState("All");

  const [settingForm, setSettingForm] = useState({
    id: null,
    academicYear: "",
    semester: "5",
    isEnabled: true,
    startDate: "",
    endDate: "",
  });

  // Students & Enrollment List State
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("5");
  const [department, setDepartment] = useState("All");
  const [section, setSection] = useState("All");
  const [batch, setBatch] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Manual Enrollment State
  const [manualStudentSearch, setManualStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualYear, setManualYear] = useState("");
  const [manualSem, setManualSem] = useState("5");
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Bulk Enrollment State
  const [bulkCourseIds, setBulkCourseIds] = useState([]);
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Roster / History State
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterYear, setRosterYear] = useState("All");
  const [rosterSem, setRosterSem] = useState("All");
  const [rosterSearch, setRosterSearch] = useState("");

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: "", message: "" });
    }, 4000);
  };

  // 0. Fetch Academic Years from DB
  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/enrollment/academic-years`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        const yearsList = data.data;
        setAcademicYears(yearsList);
        const firstYear = yearsList[0];
        setAcademicYear((prev) => (prev && yearsList.includes(prev) ? prev : firstYear));
        setManualYear((prev) => (prev && yearsList.includes(prev) ? prev : firstYear));
        setSettingForm((prev) => ({
          ...prev,
          academicYear: prev.academicYear && yearsList.includes(prev.academicYear) ? prev.academicYear : firstYear,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch academic years from DB:", err);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // 1. Fetch Enrollment Settings
  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/admin/enrollment-settings?academicYear=${settingsFilterYear}&semester=${settingsFilterSem}&status=${settingsFilterStatus}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // 2. Fetch Students List with computed status
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/admin/enrollment/students?academicYear=${academicYear}&semester=${semester}&department=${department}&section=${section}&batch=${batch}&search=${encodeURIComponent(search)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch students list:", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // 3. Fetch Available Courses for Manual & Bulk
  const fetchAvailableCourses = async (semNum) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const filtered = (data.data || []).filter(
          (c) => parseInt(c.sem, 10) === parseInt(semNum, 10)
        );
        setAvailableCourses(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  // 4. Fetch Roster
  const fetchRoster = async () => {
    try {
      setRosterLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/admin/enrollment/roster?academicYear=${rosterYear}&semester=${rosterSem}&search=${encodeURIComponent(rosterSearch)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setRoster(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch roster:", err);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [settingsFilterYear, settingsFilterSem, settingsFilterStatus]);

  useEffect(() => {
    fetchStudents();
  }, [academicYear, semester, department, section, batch, search]);

  useEffect(() => {
    fetchAvailableCourses(manualSem);
  }, [manualSem]);

  useEffect(() => {
    if (activeTab === "roster") {
      fetchRoster();
    }
  }, [activeTab, rosterYear, rosterSem, rosterSearch]);

  // Handle Save Enrollment Settings
  const handleSaveSetting = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const url = settingForm.id
        ? `${API_URL}/admin/enrollment-settings/${settingForm.id}`
        : `${API_URL}/admin/enrollment-settings`;
      const method = settingForm.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save enrollment period setting.");
      }

      showNotification("success", data.message || "Enrollment setting saved!");
      setSettingForm({
        id: null,
        academicYear: "2026-2027",
        semester: "5",
        isEnabled: true,
        startDate: "",
        endDate: "",
      });
      fetchSettings();
    } catch (err) {
      showNotification("error", err.message);
    }
  };

  // Toggle Enrollment Setting Status
  const handleToggleSetting = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/enrollment-settings/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle status.");
      }

      showNotification("success", data.message);
      fetchSettings();
    } catch (err) {
      showNotification("error", err.message);
    }
  };

  // Handle Manual Enrollment
  const handleManualEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      showNotification("error", "Please select a student to enroll.");
      return;
    }
    if (selectedCourseIds.length === 0) {
      showNotification("error", "Please select at least one course.");
      return;
    }

    try {
      setManualSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/enrollment/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentUid: selectedStudent.id,
          academicYear: manualYear,
          semester: manualSem,
          courseIds: selectedCourseIds,
          enrollmentType: "admin",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to enroll student.");
      }

      showNotification("success", data.message);
      setSelectedStudent(null);
      setManualStudentSearch("");
      setSelectedCourseIds([]);
      fetchStudents();
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  // Handle Bulk Enrollment
  const handleBulkEnroll = async (e) => {
    e.preventDefault();
    if (bulkSelectedStudentIds.length === 0) {
      showNotification("error", "Please select at least one student from the list.");
      return;
    }
    if (bulkCourseIds.length === 0) {
      showNotification("error", "Please select at least one course for bulk enrollment.");
      return;
    }

    try {
      setBulkSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/enrollment/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentUids: bulkSelectedStudentIds,
          academicYear,
          semester,
          courseIds: bulkCourseIds,
          enrollmentType: "bulk_admin",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to perform bulk enrollment.");
      }

      showNotification("success", data.message);
      setBulkSelectedStudentIds([]);
      setBulkCourseIds([]);
      fetchStudents();
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Handle Delete Enrollment Record
  const handleRemoveEnrollment = async (id) => {
    if (!window.confirm("Are you sure you want to remove this course enrollment?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/enrollment/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove enrollment.");
      }

      showNotification("success", "Enrollment record removed.");
      fetchRoster();
      fetchStudents();
    } catch (err) {
      showNotification("error", err.message);
    }
  };

  // Search suggestions for Manual Enrollment
  const studentSearchSuggestions = useMemo(() => {
    if (!manualStudentSearch.trim()) return [];
    const q = manualStudentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.registerNumber && s.registerNumber.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [students, manualStudentSearch]);

  // Filtered Students for Not Enrolled tab
  const filteredStudentsForTab = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === "Not Enrolled") return s.enrollmentStatus === "Not Enrolled";
      if (statusFilter === "Partially Enrolled") return s.enrollmentStatus === "Partially Enrolled";
      if (statusFilter === "Fully Enrolled") return s.enrollmentStatus === "Fully Enrolled";
      return true;
    });
  }, [students, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const fully = students.filter((s) => s.enrollmentStatus === "Fully Enrolled").length;
    const partial = students.filter((s) => s.enrollmentStatus === "Partially Enrolled").length;
    const notEnrolled = students.filter((s) => s.enrollmentStatus === "Not Enrolled").length;
    return { total, fully, partial, notEnrolled };
  }, [students]);

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Enrollments" />
      <div className="enrollment-page">
        <div className="enrollment-header">
          <div>
            <span className="eyebrow">ADMINISTRATION / ACADEMIC MANAGEMENT</span>
            <h1>Course Enrollment Management</h1>
            <p>Manage dynamic semester enrollment windows, manual registrations, and bulk student course allocations.</p>
          </div>

          <div className="tab-group">
            <button
              className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Settings <span className="tab-count">{settings.length}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "manual" ? "active" : ""}`}
              onClick={() => setActiveTab("manual")}
            >
              👤 Manual
            </button>
            <button
              className={`tab-btn ${activeTab === "bulk" ? "active" : ""}`}
              onClick={() => setActiveTab("bulk")}
            >
              👥 Bulk
            </button>
            <button
              className={`tab-btn ${activeTab === "not_enrolled" ? "active" : ""}`}
              onClick={() => setActiveTab("not_enrolled")}
            >
              ⚠️ Not Enrolled <span className="tab-count">{stats.notEnrolled + stats.partial}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "roster" ? "active" : ""}`}
              onClick={() => setActiveTab("roster")}
            >
              📋 History
            </button>
          </div>
        </div>

        {notification.message && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "13px",
              fontWeight: 500,
              background: notification.type === "success" ? "#1e3b31" : "#3b1e24",
              border: `1px solid ${notification.type === "success" ? "#2e5c4d" : "#572932"}`,
              color: notification.type === "success" ? "#6ee0ac" : "#ff8585",
            }}
          >
            {notification.type === "success" ? "✓ " : "✗ "}
            {notification.message}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 1: ENROLLMENT SETTINGS */}
        {/* ==================================================================== */}
        {activeTab === "settings" && (
          <>
            <section className="enroll-control">
              <div className="section-heading">
                <div>
                  <h2>{settingForm.id ? "Edit Enrollment Period" : "Configure Enrollment Window"}</h2>
                  <p>Control course enrollment availability independently for any academic year and semester.</p>
                </div>
                <span className="config-icon">⚙</span>
              </div>

              <form onSubmit={handleSaveSetting} style={{ marginTop: "18px" }}>
                <div className="config-grid">
                  <div className="field">
                    <label>Academic Year</label>
                    <select
                      value={settingForm.academicYear}
                      onChange={(e) => setSettingForm((p) => ({ ...p, academicYear: e.target.value }))}
                    >
                      {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Semester</label>
                    <select
                      value={settingForm.semester}
                      onChange={(e) => setSettingForm((p) => ({ ...p, semester: e.target.value }))}
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s} value={String(s)}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="config-action">
                    <label>Enrollment Access</label>
                    <button
                      type="button"
                      className={`toggle-button ${settingForm.isEnabled ? "on" : ""}`}
                      onClick={() => setSettingForm((p) => ({ ...p, isEnabled: !p.isEnabled }))}
                    >
                      <span className="toggle-circle" />
                      {settingForm.isEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  <div className="field">
                    <label>Start Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={settingForm.startDate}
                      onChange={(e) => setSettingForm((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label>End Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={settingForm.endDate}
                      onChange={(e) => setSettingForm((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                    <button type="submit" className="primary-button" style={{ height: "42px", flex: 1 }}>
                      {settingForm.id ? "Update Setting" : "Save Enrollment Setting"}
                    </button>
                    {settingForm.id && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ height: "42px" }}
                        onClick={() =>
                          setSettingForm({
                            id: null,
                            academicYear: "2026-2027",
                            semester: "5",
                            isEnabled: true,
                            startDate: "",
                            endDate: "",
                          })
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </section>

            <section className="enrollment-panel">
              <div className="panel-heading">
                <div>
                  <h2>Configured Enrollment Periods Dashboard</h2>
                  <p>Independent enrollment status table across academic years and semesters.</p>
                </div>
                <span className="count-badge">{settings.length} Configured Periods</span>
              </div>

              <div className="filter-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <select
                  value={settingsFilterYear}
                  onChange={(e) => setSettingsFilterYear(e.target.value)}
                >
                  <option value="All">All Academic Years</option>
                  {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={settingsFilterSem}
                  onChange={(e) => setSettingsFilterSem(e.target.value)}
                >
                  <option value="All">All Semesters</option>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={String(s)}>
                      Semester {s}
                    </option>
                  ))}
                </select>

                <select
                  value={settingsFilterStatus}
                  onChange={(e) => setSettingsFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Enabled">Enabled Only</option>
                  <option value="Disabled">Disabled Only</option>
                </select>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ACADEMIC YEAR</th>
                      <th>SEMESTER</th>
                      <th>STATUS</th>
                      <th>START DATE & TIME</th>
                      <th>END DATE & TIME</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsLoading ? (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          Loading enrollment periods...
                        </td>
                      </tr>
                    ) : settings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No enrollment periods configured for this filter.
                        </td>
                      </tr>
                    ) : (
                      settings.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.academicYear}</strong>
                          </td>
                          <td>Sem {item.semester}</td>
                          <td>
                            <span className={item.isEnabled ? "enrolled-pill" : "pending-pill"}>
                              {item.isEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td>{item.startDate ? new Date(item.startDate).toLocaleString() : "—"}</td>
                          <td>{item.endDate ? new Date(item.endDate).toLocaleString() : "—"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                className="row-enroll"
                                onClick={() => handleToggleSetting(item.id)}
                              >
                                {item.isEnabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                className="secondary-button"
                                style={{ padding: "6px 12px", fontSize: "11px" }}
                                onClick={() =>
                                  setSettingForm({
                                    id: item.id,
                                    academicYear: item.academicYear,
                                    semester: String(item.semester),
                                    isEnabled: item.isEnabled,
                                    startDate: item.startDate
                                      ? new Date(item.startDate).toISOString().slice(0, 16)
                                      : "",
                                    endDate: item.endDate
                                      ? new Date(item.endDate).toISOString().slice(0, 16)
                                      : "",
                                  })
                                }
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: MANUAL ENROLLMENT */}
        {/* ==================================================================== */}
        {activeTab === "manual" && (
          <section className="enrollment-panel">
            <div className="panel-heading">
              <div>
                <h2>Manual Student Course Enrollment</h2>
                <p>Manually enroll an individual student into specific courses (Admin Permission Override).</p>
              </div>
              <span className="count-badge">Manual Override</span>
            </div>

            <form onSubmit={handleManualEnroll} style={{ marginTop: "20px" }}>
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <label style={{ fontSize: "11px", color: "#9692a9", display: "block", marginBottom: "6px" }}>
                  Search & Select Student (Register No, Name, or Email)
                </label>
                <input
                  type="text"
                  placeholder="Type student name or register number..."
                  value={manualStudentSearch}
                  onChange={(e) => {
                    setManualStudentSearch(e.target.value);
                    if (selectedStudent) setSelectedStudent(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#242230",
                    border: "1px solid #3a3748",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />

                {manualStudentSearch && !selectedStudent && studentSearchSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#1c1a28",
                      border: "1px solid #3d3950",
                      borderRadius: "8px",
                      zIndex: 50,
                      maxHeight: "220px",
                      overflowY: "auto",
                      boxShadow: "0 10px 30px #0008",
                    }}
                  >
                    {studentSearchSuggestions.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          borderBottom: "1px solid #292638",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onClick={() => {
                          setSelectedStudent(s);
                          setManualStudentSearch(`${s.name} (${s.registerNumber || s.id})`);
                        }}
                      >
                        <div>
                          <strong style={{ color: "#f4f2fa", fontSize: "13px" }}>{s.name}</strong>
                          <span style={{ color: "#9692a9", fontSize: "11px", marginLeft: "10px" }}>
                            {s.registerNumber} · {s.department} · Year {s.year}
                          </span>
                        </div>
                        <span className="row-enroll" style={{ padding: "4px 8px" }}>Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(137, 92, 246, 0.1)",
                    border: "1px solid rgba(137, 92, 246, 0.3)",
                    borderRadius: "10px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "#c4adff", fontSize: "14px" }}>{selectedStudent.name}</strong>
                    <span style={{ color: "#9692a9", fontSize: "12px", marginLeft: "12px" }}>
                      Reg: {selectedStudent.registerNumber} · Dept: {selectedStudent.department} · Sec: {selectedStudent.section}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setManualStudentSearch("");
                    }}
                  >
                    Change Student
                  </button>
                </div>
              )}

              <div className="filter-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="field">
                  <label>Academic Year</label>
                  <select value={manualYear} onChange={(e) => setManualYear(e.target.value)}>
                    {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Semester</label>
                  <select
                    value={manualSem}
                    onChange={(e) => setManualSem(e.target.value)}
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#d5d2e2" }}>
                    Available Courses for Semester {manualSem} ({availableCourses.length})
                  </label>

                  <div>
                    <button
                      type="button"
                      className="text-button"
                      style={{ marginRight: "14px" }}
                      onClick={() => setSelectedCourseIds(availableCourses.map((c) => c.id))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setSelectedCourseIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {availableCourses.length === 0 ? (
                  <p style={{ color: "#9692a9", fontStyle: "italic", fontSize: "12px" }}>
                    No courses configured for Semester {manualSem}.
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                    {availableCourses.map((c) => {
                      const isChecked = selectedCourseIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          style={{
                            padding: "12px 14px",
                            background: isChecked ? "#281e3d" : "#1e1c2a",
                            border: `1px solid ${isChecked ? "#895cf6" : "#2b2938"}`,
                            borderRadius: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedCourseIds((prev) => prev.filter((id) => id !== c.id));
                            } else {
                              setSelectedCourseIds((prev) => [...prev, c.id]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div onClick
                          />
                          <div>
                            <strong style={{ color: "#f4f2fa", fontSize: "13px", display: "block" }}>
                              {c.code} — {c.name}
                            </strong>
                            <span style={{ color: "#9692a9", fontSize: "11px" }}>
                              Credits: {c.credit || "3.0"} · {c.category || "Core"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={manualSubmitting || !selectedStudent || selectedCourseIds.length === 0}
                style={{ padding: "12px 24px", fontSize: "13px" }}
              >
                {manualSubmitting ? "Enrolling..." : "[ Enroll Student ]"}
              </button>
            </form>
          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: BULK ENROLLMENT */}
        {/* ==================================================================== */}
        {activeTab === "bulk" && (
          <section className="enrollment-panel">
            <div className="panel-heading">
              <div>
                <h2>Bulk Student Course Enrollment</h2>
                <p>Select multiple students and courses to perform batch enrollment instantly.</p>
              </div>
              <span className="count-badge">Bulk Allocation</span>
            </div>

            <div className="filter-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginTop: "18px" }}>
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {SEMESTERS.map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s}
                  </option>
                ))}
              </select>

              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Departments" : d}
                  </option>
                ))}
              </select>

              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === "All" ? "All Sections" : `Section ${sec}`}
                  </option>
                ))}
              </select>

              <select value={batch} onChange={(e) => setBatch(e.target.value)}>
                {BATCHES.map((b) => (
                  <option key={b} value={b}>
                    {b === "All" ? "All Batches" : `Batch ${b}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Courses Selection for Bulk */}
            <div style={{ margin: "20px 0", background: "#1e1c2a", padding: "16px", borderRadius: "12px", border: "1px solid #2b2938" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <strong style={{ color: "#d5d2e2", fontSize: "13px" }}>
                  Select Target Courses for Bulk Enrollment ({availableCourses.length} available)
                </strong>
                <div>
                  <button
                    type="button"
                    className="text-button"
                    style={{ marginRight: "12px" }}
                    onClick={() => setBulkCourseIds(availableCourses.map((c) => c.id))}
                  >
                    Select All Courses
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setBulkCourseIds([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {availableCourses.map((c) => {
                  const isChecked = bulkCourseIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: isChecked ? "#2e2148" : "#242230",
                        border: `1px solid ${isChecked ? "#895cf6" : "#3a3748"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#f4f2fa",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkCourseIds((prev) => [...prev, c.id]);
                          } else {
                            setBulkCourseIds((prev) => prev.filter((id) => id !== c.id));
                          }
                        }}
                      />
                      <span>{c.code} — {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bulk-toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <button
                  className="secondary-button"
                  onClick={() => setBulkSelectedStudentIds(students.map((s) => s.id))}
                  style={{ marginRight: "10px" }}
                >
                  [ Select All Students ]
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setBulkSelectedStudentIds([])}
                >
                  [ Deselect All ]
                </button>
              </div>

              <div>
                <span style={{ marginRight: "16px", color: "#c4adff", fontWeight: 600 }}>
                  {bulkSelectedStudentIds.length} Student(s) Selected · {bulkCourseIds.length} Course(s) Selected
                </span>
                <button
                  className="primary-button"
                  disabled={bulkSubmitting || bulkSelectedStudentIds.length === 0 || bulkCourseIds.length === 0}
                  onClick={handleBulkEnroll}
                >
                  {bulkSubmitting ? "Enrolling..." : "[ Enroll Selected Students ]"}
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>REGISTER NO</th>
                    <th>STUDENT NAME</th>
                    <th>DEPARTMENT</th>
                    <th>YEAR / BATCH</th>
                    <th>SECTION</th>
                    <th>ENROLLMENT STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        Loading student roster...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        No students match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const isSelected = bulkSelectedStudentIds.includes(s.id);
                      return (
                        <tr key={s.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkSelectedStudentIds((prev) => [...prev, s.id]);
                                } else {
                                  setBulkSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                                }
                              }}
                            />
                          </td>
                          <td className="reg-number">{s.registerNumber}</td>
                          <td>
                            <strong>{s.name}</strong>
                          </td>
                          <td>{s.department}</td>
                          <td>Year {s.year} ({s.batch})</td>
                          <td>Section {s.section}</td>
                          <td>
                            <span
                              className={
                                s.enrollmentStatus === "Fully Enrolled"
                                  ? "enrolled-pill"
                                  : s.enrollmentStatus === "Partially Enrolled"
                                  ? "pending-pill"
                                  : "muted-text"
                              }
                            >
                              {s.enrollmentStatus} ({s.enrolledCount}/{s.totalAvailable})
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: NOT ENROLLED STUDENTS */}
        {/* ==================================================================== */}
        {activeTab === "not_enrolled" && (
          <section className="enrollment-panel">
            <div className="panel-heading">
              <div>
                <h2>Students Not Enrolled / Pending Enrollment</h2>
                <p>Filter students who have not completed course registration for Semester {semester}.</p>
              </div>
              <span className="count-badge" style={{ background: "#4a242c", color: "#ff8585" }}>
                {stats.notEnrolled} Not Enrolled
              </span>
            </div>

            <div className="enrollment-stats" style={{ marginTop: "18px" }}>
              <div className="stat-card">
                <span>Total Students</span>
                <strong>{stats.total}</strong>
                <small>Matching Filter Criteria</small>
              </div>

              <div className="stat-card">
                <span>Fully Enrolled</span>
                <strong className="green-text">{stats.fully}</strong>
                <small>Completed Registration</small>
              </div>

              <div className="stat-card">
                <span>Partially Enrolled</span>
                <strong className="orange-text">{stats.partial}</strong>
                <small>Pending Remaining Courses</small>
              </div>

              <div className="stat-card">
                <span>Not Enrolled</span>
                <strong style={{ color: "#ff8585" }}>{stats.notEnrolled}</strong>
                <small>No Courses Enrolled</small>
              </div>
            </div>

            <div className="filter-grid" style={{ gridTemplateColumns: "1.5fr repeat(5, 1fr)" }}>
              <input
                type="text"
                placeholder="Search name or reg no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {SEMESTERS.map((s) => (
                  <option key={s} value={String(s)}>
                    Sem {s}
                  </option>
                ))}
              </select>

              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Depts" : d}
                  </option>
                ))}
              </select>

              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === "All" ? "All Secs" : `Sec ${sec}`}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Not Enrolled">Not Enrolled</option>
                <option value="Partially Enrolled">Partially Enrolled</option>
                <option value="Fully Enrolled">Fully Enrolled</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>REGISTER NO</th>
                    <th>STUDENT NAME</th>
                    <th>DEPARTMENT</th>
                    <th>SEMESTER</th>
                    <th>SECTION</th>
                    <th>ENROLLED COURSES</th>
                    <th>ENROLLMENT STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading ? (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        Loading student status...
                      </td>
                    </tr>
                  ) : filteredStudentsForTab.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        No students match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsForTab.map((s) => (
                      <tr key={s.id}>
                        <td className="reg-number">{s.registerNumber}</td>
                        <td>
                          <strong>{s.name}</strong>
                          <small style={{ color: "#9692a9", display: "block" }}>{s.email}</small>
                        </td>
                        <td>{s.department}</td>
                        <td>Sem {semester}</td>
                        <td>Section {s.section}</td>
                        <td>{s.enrolledCount} / {s.totalAvailable} Courses</td>
                        <td>
                          <span
                            className={
                              s.enrollmentStatus === "Fully Enrolled"
                                ? "enrolled-pill"
                                : s.enrollmentStatus === "Partially Enrolled"
                                ? "pending-pill"
                                : "remove-button"
                            }
                            style={{ padding: "4px 10px" }}
                          >
                            {s.enrollmentStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            className="row-enroll"
                            onClick={() => {
                              setSelectedStudent(s);
                              setManualStudentSearch(`${s.name} (${s.registerNumber})`);
                              setManualSem(semester);
                              setManualYear(academicYear);
                              setActiveTab("manual");
                            }}
                          >
                            + Enroll Student
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: ENROLLMENT HISTORY / ROSTER */}
        {/* ==================================================================== */}
        {activeTab === "roster" && (
          <section className="enrollment-panel">
            <div className="panel-heading">
              <div>
                <h2>Enrollment History & Active Roster</h2>
                <p>Complete record of active course enrollments across all students.</p>
              </div>
              <span className="count-badge">{roster.length} Records</span>
            </div>

            <div className="filter-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
              <input
                type="text"
                placeholder="Search student, reg no, or course..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
              />

              <select value={rosterYear} onChange={(e) => setRosterYear(e.target.value)}>
                <option value="All">All Academic Years</option>
                {(academicYears.length > 0 ? academicYears : DEFAULT_ACADEMIC_YEARS).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select value={rosterSem} onChange={(e) => setRosterSem(e.target.value)}>
                <option value="All">All Semesters</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>REGISTER NO</th>
                    <th>STUDENT NAME</th>
                    <th>COURSE</th>
                    <th>ACADEMIC YEAR</th>
                    <th>SEMESTER</th>
                    <th>TYPE</th>
                    <th>DATE ENROLLED</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterLoading ? (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        Loading roster records...
                      </td>
                    </tr>
                  ) : roster.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-state">
                        No enrollment records found.
                      </td>
                    </tr>
                  ) : (
                    roster.map((r) => (
                      <tr key={r.id}>
                        <td className="reg-number">{r.student_reg_no}</td>
                        <td>
                          <strong>{r.student_name}</strong>
                        </td>
                        <td>
                          <strong>{r.course_code}</strong> — {r.course_name}
                        </td>
                        <td>{r.academicYear}</td>
                        <td>Sem {r.semester}</td>
                        <td>
                          <span
                            style={{
                              background: r.enrollmentType === "bulk_admin" ? "#34244d" : "#1e3048",
                              color: r.enrollmentType === "bulk_admin" ? "#c2a1ff" : "#81b8ff",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "10px",
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            {r.enrollmentType || "student"}
                          </span>
                        </td>
                        <td>{r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString() : "—"}</td>
                        <td>
                          <button
                            className="remove-button"
                            onClick={() => handleRemoveEnrollment(r.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
