import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Grid,
  List,
  RefreshCw,
  X,
  CheckCircle2,
  User,
  MapPin,
  ChevronRight
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminTimetable.css";

const API_URL = "http://localhost:5000/api/admin/timetable";

const TIME_SLOTS = [
  { slotNumber: 1, label: "Period 1", startTime: "09:00 AM", endTime: "09:50 AM" },
  { slotNumber: 2, label: "Period 2", startTime: "09:50 AM", endTime: "10:40 AM" },
  { slotNumber: 3, label: "Period 3", startTime: "10:50 AM", endTime: "11:40 AM" },
  { slotNumber: 4, label: "Period 4", startTime: "11:40 AM", endTime: "12:30 PM" },
  { slotNumber: 0, label: "Lunch Break", startTime: "12:30 PM", endTime: "01:30 PM", isBreak: true },
  { slotNumber: 5, label: "Period 5", startTime: "01:30 PM", endTime: "02:20 PM" },
  { slotNumber: 6, label: "Period 6", startTime: "02:20 PM", endTime: "03:10 PM" },
  { slotNumber: 7, label: "Period 7", startTime: "03:20 PM", endTime: "04:10 PM" },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminTimetable() {
  // Filter States
  const [department, setDepartment] = useState("Artificial Intelligence and Data Science");
  const [semester, setSemester] = useState("5");
  const [section, setSection] = useState("Section A");
  const [teacherFilter, setTeacherFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  // Data & Metadata States
  const [timetable, setTimetable] = useState([]);
  const [meta, setMeta] = useState({ departments: [], teachers: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const defaultForm = {
    id: null,
    courseId: "",
    teacherUid: "",
    department: department,
    semester: semester,
    section: section,
    academicYear: "2026-2027",
    dayOfWeek: "Monday",
    slotNumber: 1,
    startTime: "09:00 AM",
    endTime: "09:50 AM",
    roomNumber: "Classroom 101",
  };
  const [formData, setFormData] = useState(defaultForm);

  // Fetch Metadata
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/meta`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMeta({
          departments: data.departments || [],
          teachers: data.teachers || [],
          courses: data.courses || [],
        });
        if (data.departments?.length > 0 && !department) {
          setDepartment(data.departments[0].name);
        }
      }
    } catch (err) {
      console.error("Fetch metadata error:", err);
    }
  }, [department]);

  // Fetch Timetable Records
  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (department) params.append("department", department);
      if (semester) params.append("semester", semester);
      if (section) params.append("section", section);
      if (teacherFilter && teacherFilter !== "All") params.append("teacherUid", teacherFilter);

      const res = await fetch(`${API_URL}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load timetable.");
      }

      setTimetable(data.timetable || []);
    } catch (err) {
      console.error("Fetch timetable error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [department, semester, section, teacherFilter]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Open Modal to Create or Edit
  const handleOpenModal = (day = "Monday", slot = 1, existingSlot = null) => {
    setModalError(null);
    if (existingSlot) {
      setEditingSlot(existingSlot);
      setFormData({
        id: existingSlot.id,
        courseId: existingSlot.course_id,
        teacherUid: existingSlot.teacher_uid,
        department: existingSlot.department || department,
        semester: existingSlot.semester || semester,
        section: existingSlot.section || section,
        academicYear: existingSlot.academic_year || "2026-2027",
        dayOfWeek: existingSlot.day_of_week || day,
        slotNumber: existingSlot.slot_number || slot,
        startTime: existingSlot.start_time || "09:00 AM",
        endTime: existingSlot.end_time || "09:50 AM",
        roomNumber: existingSlot.room_number || "Classroom 101",
      });
    } else {
      setEditingSlot(null);
      const slotRef = TIME_SLOTS.find((s) => s.slotNumber === slot) || TIME_SLOTS[0];
      const defaultCourse = meta.courses.find(c => c.sem == semester) || meta.courses[0];
      const defaultTeacher = meta.teachers[0];

      setFormData({
        id: null,
        courseId: defaultCourse ? defaultCourse.id : "",
        teacherUid: defaultTeacher ? defaultTeacher.uid : "",
        department: department,
        semester: semester,
        section: section,
        academicYear: "2026-2027",
        dayOfWeek: day,
        slotNumber: slot,
        startTime: slotRef.startTime,
        endTime: slotRef.endTime,
        roomNumber: "Classroom 101",
      });
    }
    setShowAssignModal(true);
  };

  // Save Timetable Assignment
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.courseId || !formData.teacherUid) {
      setModalError("Please select both a Course and a Staff Member.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      const isEdit = !!formData.id;
      const url = isEdit ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save timetable slot.");
      }

      setShowAssignModal(false);
      setToastMessage(isEdit ? "Timetable slot updated!" : "Timing assigned successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      fetchTimetable();
    } catch (err) {
      console.error("Save timetable error:", err);
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Timetable Entry
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this timetable timing assignment?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage("Timetable timing removed.");
        setTimeout(() => setToastMessage(null), 3000);
        fetchTimetable();
      } else {
        alert(data.message || "Failed to delete timetable slot.");
      }
    } catch (err) {
      alert("Server error while deleting slot.");
    }
  };

  // Quick lookup helper for cell matching
  const getSlotForCell = (day, slotNum) => {
    return timetable.find(
      (t) =>
        t.day_of_week?.toLowerCase() === day.toLowerCase() &&
        parseInt(t.slot_number, 10) === slotNum
    );
  };

  return (
    <div className="admin-layout">
      {/* Admin Sidebar */}
      <AdminSidebar activeItem="Timetable" />

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 9999,
              background: "#16a34a",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "10px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
              fontWeight: "600",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={18} /> {toastMessage}
          </div>
        )}

        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div>
              <div className="admin-breadcrumb">
                Administration <ChevronRight size={13} /> Timetable
              </div>
              <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={22} style={{ color: "#c084fc" }} /> Admin Staff Timetable Assignment
              </h1>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button className="at-btn-secondary" onClick={fetchTimetable} title="Refresh Timetable Data">
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="at-btn-primary" onClick={() => handleOpenModal("Monday", 1)}>
              <Plus size={18} /> Assign Staff Timing
            </button>
          </div>
        </header>

        <div className="admin-content">

        {/* Filters Bar */}
        <section className="at-filter-card">
          <div className="at-filter-group">
            {/* Department Filter */}
            <div className="at-field">
              <label>DEPARTMENT</label>
              <select
                className="at-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {meta.departments.map((d, i) => (
                  <option key={i} value={d.name}>
                    {d.code || d.name} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="at-field">
              <label>SEMESTER</label>
              <select
                className="at-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ minWidth: "100px" }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="at-field">
              <label>SECTION</label>
              <select
                className="at-select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                style={{ minWidth: "110px" }}
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>

            {/* Faculty Staff Filter */}
            <div className="at-field">
              <label>FACULTY FILTER</label>
              <select
                className="at-select"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                style={{ minWidth: "160px" }}
              >
                <option value="All">All Staff Members</option>
                {meta.teachers.map((t) => (
                  <option key={t.uid} value={t.uid}>
                    {t.name} ({t.department || "Faculty"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="at-view-toggle">
            <button
              className={`at-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid size={15} /> Weekly Matrix
            </button>
            <button
              className={`at-toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List size={15} /> Staff Schedule List
            </button>
          </div>
        </section>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(255,255,255,0.1)",
                borderTopColor: "#a855f7",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p>Loading timetables & conflict checks...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px", background: "#161224", borderRadius: "14px", color: "#f87171" }}>
            <AlertTriangle size={32} style={{ marginBottom: "8px" }} />
            <h3>Unable to load timetable</h3>
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>{error}</p>
          </div>
        ) : viewMode === "grid" ? (
          /* WEEKLY TIMETABLE MATRIX GRID VIEW */
          <section className="at-grid-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", padding: "0 4px" }}>
              <span style={{ color: "#d8b4fe", fontSize: "14px", fontWeight: "600" }}>
                Timetable Grid for {department} — Semester {semester} ({section})
              </span>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                Total Scheduled Periods: <strong>{timetable.length}</strong>
              </span>
            </div>

            <table className="at-grid-table">
              <thead>
                <tr>
                  <th className="at-time-col">TIME / PERIOD</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => {
                  if (slot.isBreak) {
                    return (
                      <tr key="break">
                        <td className="at-time-col">
                          <strong>{slot.label}</strong>
                          <span className="at-period-time">{slot.startTime} - {slot.endTime}</span>
                        </td>
                        <td colSpan={DAYS_OF_WEEK.length} className="at-cell-break">
                          ☕ LUNCH & REFRESHMENT BREAK ({slot.startTime} - {slot.endTime})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.slotNumber}>
                      {/* Time Column */}
                      <td className="at-time-col">
                        <strong>{slot.label}</strong>
                        <span className="at-period-time">{slot.startTime} - {slot.endTime}</span>
                      </td>

                      {/* Day Columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const item = getSlotForCell(day, slot.slotNumber);

                        return (
                          <td key={day} className="at-cell">
                            {item ? (
                              <div className="at-slot-card">
                                <div className="at-slot-header">
                                  <span className="at-course-code">{item.course_code}</span>
                                  <div className="at-slot-actions">
                                    <button
                                      className="at-icon-btn"
                                      onClick={() => handleOpenModal(day, slot.slotNumber, item)}
                                      title="Edit Timing"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      className="at-icon-btn delete"
                                      onClick={(e) => handleDelete(item.id, e)}
                                      title="Remove Timing"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="at-course-title" title={item.course_title}>
                                  {item.course_title || "Course"}
                                </div>

                                <div className="at-teacher-tag">
                                  <User size={12} />
                                  <span>{item.teacher_name || "Faculty Member"}</span>
                                </div>

                                <span className="at-room-pill">
                                  <MapPin size={10} style={{ display: "inline", marginRight: "3px" }} />
                                  {item.room_number || "Classroom 101"}
                                </span>
                              </div>
                            ) : (
                              <button
                                className="at-empty-assign"
                                onClick={() => handleOpenModal(day, slot.slotNumber)}
                              >
                                <Plus size={14} />
                                <span>Assign Staff</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : (
          /* STAFF SCHEDULE LIST VIEW */
          <section className="at-grid-container">
            <h3 style={{ margin: "0 0 16px", color: "#f8fafc", fontSize: "16px" }}>
              Assigned Timetable List ({timetable.length} entries)
            </h3>
            <table className="at-table">
              <thead>
                <tr>
                  <th>DAY</th>
                  <th>PERIOD & TIME</th>
                  <th>COURSE</th>
                  <th>ASSIGNED STAFF</th>
                  <th>DEPT & SECTION</th>
                  <th>ROOM NUMBER</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: "#d8b4fe" }}>{item.day_of_week}</strong>
                    </td>
                    <td>
                      <span className="at-course-code">Period {item.slot_number}</span>
                      <small style={{ display: "block", color: "#94a3b8", marginTop: "2px" }}>
                        {item.start_time} - {item.end_time}
                      </small>
                    </td>
                    <td>
                      <strong>{item.course_code}</strong>
                      <small style={{ display: "block", color: "#94a3b8" }}>{item.course_title}</small>
                    </td>
                    <td>
                      <span style={{ color: "#a78bfa", fontWeight: "600" }}>{item.teacher_name}</span>
                      <small style={{ display: "block", color: "#64748b" }}>{item.teacher_email}</small>
                    </td>
                    <td>
                      {item.department} - Sem {item.semester} ({item.section})
                    </td>
                    <td>
                      <span className="at-room-pill">{item.room_number}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="at-icon-btn"
                          onClick={() => handleOpenModal(item.day_of_week, item.slot_number, item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="at-icon-btn delete"
                          onClick={(e) => handleDelete(item.id, e)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {timetable.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                      No staff timing assigned yet for {department} Sem {semester} ({section}).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* ASSIGN / EDIT TIMING MODAL */}
        {showAssignModal && (
          <div className="at-modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="at-modal" onClick={(e) => e.stopPropagation()}>
              <div className="at-modal-header">
                <h3>{editingSlot ? "Edit Timing Assignment" : "Assign Staff Timing"}</h3>
                <button className="at-close-btn" onClick={() => setShowAssignModal(false)}>
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div className="at-alert-danger">
                  ⚠️ {modalError}
                </div>
              )}

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Department & Semester Readonly Context */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>DEPARTMENT</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>SEMESTER & SECTION</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        style={{ width: "50%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                        required
                      />
                      <input
                        type="text"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        style={{ width: "50%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Day of Week & Period Slot */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>DAY OF WEEK *</label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>TIME PERIOD SLOT *</label>
                    <select
                      value={formData.slotNumber}
                      onChange={(e) => {
                        const slotNum = parseInt(e.target.value, 10);
                        const slotRef = TIME_SLOTS.find((s) => s.slotNumber === slotNum) || TIME_SLOTS[0];
                        setFormData({
                          ...formData,
                          slotNumber: slotNum,
                          startTime: slotRef.startTime,
                          endTime: slotRef.endTime,
                        });
                      }}
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                    >
                      {TIME_SLOTS.filter((s) => !s.isBreak).map((s) => (
                        <option key={s.slotNumber} value={s.slotNumber}>
                          {s.label} ({s.startTime} - {s.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course Selection */}
                <div>
                  <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>COURSE / SUBJECT *</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                    required
                  >
                    <option value="">-- Select Course --</option>
                    {meta.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title} (Sem {c.sem || "--"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty / Staff Selection */}
                <div>
                  <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>ASSIGNED FACULTY / STAFF MEMBER *</label>
                  <select
                    value={formData.teacherUid}
                    onChange={(e) => setFormData({ ...formData, teacherUid: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                    required
                  >
                    <option value="">-- Select Staff Member --</option>
                    {meta.teachers.map((t) => (
                      <option key={t.uid} value={t.uid}>
                        {t.name} ({t.email}) - {t.department || "Faculty"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Number & Start/End Time Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>START TIME</label>
                    <input
                      type="text"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>END TIME</label>
                    <input
                      type="text"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>ROOM / HALL</label>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder="e.g. Lab 2 / LH-101"
                      style={{ width: "100%", padding: "10px", background: "#0b0813", border: "1px solid #2d2645", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    style={{ padding: "10px 16px", background: "transparent", border: "1px solid #382c54", borderRadius: "8px", color: "#94a3b8", cursor: "pointer", fontSize: "13px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="at-btn-primary"
                  >
                    {submitting ? "Saving..." : editingSlot ? "Update Timing" : "Assign Timing →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
