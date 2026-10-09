import React, { useEffect, useMemo, useState } from "react";
import "./AdminCourseAssignment.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

export default function AdminCourseAssignment() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [department, setDepartment] = useState("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewCourse, setViewCourse] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    courseId: "",
    teacherId: "",
    academicYear: "2026-2027",
    semester: "5",
    section: "Section A",
    role: "Primary",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/admin/course-assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch teaching allocations data.");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setCourses(result.data.courses || []);
        setTeachers(result.data.teachers || []);
        setAssignments(result.data.assignments || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const deptCode = course.department_code || course.dept || "";
      const deptName = course.department_name || "";
      
      const matchesDept =
        department === "All" ||
        deptCode === department ||
        deptName.toLowerCase().includes(department.toLowerCase());

      const matchesSearch =
        course.name.toLowerCase().includes(search.toLowerCase()) ||
        course.code.toLowerCase().includes(search.toLowerCase());

      return matchesDept && matchesSearch;
    });
  }, [courses, department, search]);

  const getCourse = (id) =>
    courses.find((c) => String(c.id) === String(id));

  const getTeacher = (id) =>
    teachers.find((t) => String(t.id) === String(id));

  const selectedCourse = useMemo(() => {
    if (!form.courseId) return null;
    return getCourse(form.courseId);
  }, [form.courseId, courses]);

  const availableSemesters = useMemo(() => {
    if (!selectedCourse) return [];
    if (selectedCourse.availableSemesters && selectedCourse.availableSemesters.length > 0) {
      return [...selectedCourse.availableSemesters].sort((a, b) => a - b);
    }
    const sem = selectedCourse.semester || selectedCourse.sem;
    return sem ? [parseInt(sem, 10)] : [1, 2, 3, 4, 5, 6, 7, 8];
  }, [selectedCourse]);

  const availableAcademicYears = useMemo(() => {
    if (!selectedCourse) return [];
    if (selectedCourse.availableAcademicYears && selectedCourse.availableAcademicYears.length > 0) {
      return selectedCourse.availableAcademicYears;
    }
    const year = selectedCourse.academicYear || selectedCourse.academic_year || "2026-2027";
    return [year];
  }, [selectedCourse]);

  const selectedTeacher = useMemo(() => {
    if (!form.teacherId) return null;
    return getTeacher(form.teacherId);
  }, [form.teacherId, teachers]);

  const selectedTeacherAssignments = useMemo(() => {
    if (!form.teacherId) return [];
    return assignments.filter(
      (a) => String(a.teacherId) === String(form.teacherId) && a.status === "Active"
    );
  }, [form.teacherId, assignments]);

  const teacherAssignmentCounts = useMemo(() => {
    const counts = {};
    assignments.forEach((a) => {
      if (a.status === "Active" && a.teacherId) {
        const key = String(a.teacherId);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [assignments]);

  const viewCourseAssignments = useMemo(() => {
    if (!viewCourse) return [];
    return assignments.filter(
      (a) => String(a.courseId) === String(viewCourse.id)
    );
  }, [viewCourse, assignments]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      courseId: "",
      teacherId: "",
      academicYear: "",
      semester: "",
      section: "Section A",
      role: "Primary",
    });
    setModalOpen(true);
  };

  const openEditModal = (assignment) => {
    const course = getCourse(assignment.courseId);
    const availSems = (course?.availableSemesters && course.availableSemesters.length > 0)
      ? course.availableSemesters
      : [course?.semester || course?.sem || 5];
    const availYears = (course?.availableAcademicYears && course.availableAcademicYears.length > 0)
      ? course.availableAcademicYears
      : [course?.academicYear || course?.academic_year || "2026-2027"];

    setEditingId(assignment.id);
    setForm({
      courseId: String(assignment.courseId),
      teacherId: String(assignment.teacherId),
      academicYear: assignment.academicYear || String(availYears[0]),
      semester: String(assignment.semester || availSems[0]),
      section: assignment.section || "Section A",
      role: assignment.role || "Primary",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.courseId || !form.teacherId) {
      alert("Please select a course and teacher.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const url = editingId
        ? `${API_URL}/admin/course-assignments/${editingId}`
        : `${API_URL}/admin/course-assignments`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save teacher assignment.");
      }

      await fetchData();
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const removeAssignment = async (id) => {
    if (!window.confirm("Remove this teacher assignment?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/admin/course-assignments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete assignment.");
      }

      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";

      const response = await fetch(`${API_URL}/admin/course-assignments/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update status.");
      }

      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const assignedCourseIds = new Set(
    assignments
      .filter((a) => a.status === "Active")
      .map((a) => String(a.courseId))
  );

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Assignments" />
      <main className="assignment-main">
        <header className="assignment-header">
          <div>
            <p className="assignment-breadcrumb">
              Admin / Academic Management
            </p>
            <h1>Course–Teacher Assignment</h1>
            <p className="assignment-subtitle">
              Assign instructors to courses and manage teaching allocations.
            </p>
          </div>

          <button className="assignment-primary-btn" onClick={openCreateModal}>
            + Assign Teacher
          </button>
        </header>

        {error && (
          <div style={{ padding: "14px", background: "#3b1e24", border: "1px solid #572932", color: "#ff8585", borderRadius: "10px", marginBottom: "20px" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <section className="assignment-stats">
          <div className="assignment-stat">
            <span className="stat-symbol purple-symbol">▣</span>
            <div>
              <p>Total Courses</p>
              <h2>{loading ? "…" : courses.length}</h2>
            </div>
          </div>

          <div className="assignment-stat">
            <span className="stat-symbol green-symbol">✓</span>
            <div>
              <p>Assigned Courses</p>
              <h2>{loading ? "…" : assignedCourseIds.size}</h2>
            </div>
          </div>

          <div className="assignment-stat">
            <span className="stat-symbol blue-symbol">♙</span>
            <div>
              <p>Total Teachers</p>
              <h2>{loading ? "…" : teachers.length}</h2>
            </div>
          </div>

          <div className="assignment-stat">
            <span className="stat-symbol orange-symbol">!</span>
            <div>
              <p>Unassigned Courses</p>
              <h2>{loading ? "…" : Math.max(0, courses.length - assignedCourseIds.size)}</h2>
            </div>
          </div>
        </section>

        <section className="assignment-content">
          <div className="assignment-section-heading">
            <div>
              <h2>Teaching Allocations</h2>
              <p>View and manage teacher-course assignments.</p>
            </div>
            <span className="assignment-count">
              {assignments.length} assignments
            </span>
          </div>

          <div className="assignment-filters">
            <div className="assignment-search">
              <span>⌕</span>
              <input
                placeholder="Search course or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="AI&DS">AI&DS</option>
              <option value="AI&ML">AI&ML</option>
              <option value="CSE">CSE</option>
            </select>
          </div>

          <div className="assignment-table-wrapper">
            <table className="assignment-table">
              <thead>
                <tr>
                  <th>COURSE</th>
                  <th>DEPARTMENT</th>
                  <th>SEMESTER</th>
                  <th>ASSIGNED TEACHER</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#8c849b" }}>
                      Loading allocations data from database...
                    </td>
                  </tr>
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#8c849b" }}>
                      No courses match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => {
                    const courseAssignments = assignments.filter(
                      (a) => String(a.courseId) === String(course.id)
                    );

                    const firstTeacher = courseAssignments[0];
                    const firstTeacherName = firstTeacher
                      ? firstTeacher.teacher_name || getTeacher(firstTeacher.teacherId)?.name || "Teacher"
                      : null;

                    return (
                      <tr key={course.id}>
                        <td style={{ verticalAlign: "middle" }}>
                          <strong>{course.name}</strong>
                          <small>{course.code}</small>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          {course.department_code || course.dept || "—"}
                        </td>
                        <td style={{ verticalAlign: "middle" }}>Sem {course.semester}</td>

                        <td style={{ verticalAlign: "middle" }}>
                          {courseAssignments.length === 0 ? (
                            <span className="unassigned-label">Not Assigned</span>
                          ) : (
                            <div className="teacher-cell">
                              <div className="teacher-avatar">
                                {firstTeacherName.charAt(0)}
                              </div>
                              <div>
                                <strong>{firstTeacherName}</strong>
                                <small>
                                  {firstTeacher.role}
                                  {courseAssignments.length > 1 && (
                                    <span style={{ color: "#a78bfa", marginLeft: "6px", fontWeight: 600 }}>
                                      +{courseAssignments.length - 1} co-teacher
                                    </span>
                                  )}
                                </small>
                              </div>
                            </div>
                          )}
                        </td>

                        <td style={{ verticalAlign: "middle" }}>
                          {courseAssignments.length === 0 ? (
                            <span className="assignment-status pending">Unassigned</span>
                          ) : (
                            <span className="assignment-status active-status">
                              Assigned ({courseAssignments.length})
                            </span>
                          )}
                        </td>

                        <td style={{ verticalAlign: "middle" }}>
                          <div className="row-actions">
                            <button
                              className="table-action"
                              style={{ background: "#3b2b5c", color: "#d8b4fe", borderColor: "#6b46c1" }}
                              onClick={() => setViewCourse(course)}
                            >
                              👁 View Details
                            </button>

                            <button
                              className="table-action"
                              onClick={() => {
                                const availSems = (course.availableSemesters && course.availableSemesters.length > 0)
                                  ? course.availableSemesters
                                  : [course.semester || course.sem || 5];
                                const availYears = (course.availableAcademicYears && course.availableAcademicYears.length > 0)
                                  ? course.availableAcademicYears
                                  : [course.academicYear || course.academic_year || "2026-2027"];
                                setForm({
                                  courseId: String(course.id),
                                  teacherId: "",
                                  academicYear: String(availYears[0]),
                                  semester: String(availSems[0]),
                                  role: courseAssignments.length > 0 ? "Co-teacher" : "Primary",
                                });
                                setEditingId(null);
                                setModalOpen(true);
                              }}
                            >
                              + Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="assignment-info">
          <div className="info-icon">✦</div>
          <div>
            <h3>Assignment Guidelines</h3>
            <p>
              Assign teachers within the same department as the course.
              Primary teachers are responsible for course delivery, while
              co-teachers can support teaching activities.
            </p>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div
          className="assignment-modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <form
            className="assignment-modal"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>{editingId ? "Edit Assignment" : "Assign Teacher"}</h2>
                <p>Configure the course teaching allocation.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <label>
              Select Course
              <select
                required
                value={form.courseId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const course = getCourse(selectedId);

                  let sem = "";
                  let acadYear = "";

                  if (course) {
                    const availSems = (course.availableSemesters && course.availableSemesters.length > 0)
                      ? course.availableSemesters
                      : [course.semester || course.sem || 5];
                    sem = String(availSems[0] || "");

                    const availYears = (course.availableAcademicYears && course.availableAcademicYears.length > 0)
                      ? course.availableAcademicYears
                      : [course.academicYear || course.academic_year || "2026-2027"];
                    acadYear = String(availYears[0] || "2026-2027");
                  }

                  setForm((prev) => ({
                    ...prev,
                    courseId: selectedId,
                    semester: sem,
                    academicYear: acadYear,
                    teacherId: "",
                  }));
                }}
              >
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name} ({course.department_code || course.dept})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Select Teacher
              <select
                required
                value={form.teacherId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, teacherId: e.target.value }))
                }
              >
                <option value="">Choose a teacher</option>
                {teachers.map((teacher) => {
                  const count = teacherAssignmentCounts[String(teacher.id)] || 0;
                  return (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.department_code || teacher.department_name || "Faculty"}) — {count} assigned
                    </option>
                  );
                })}
              </select>
            </label>

            {selectedTeacher && (
              <div
                style={{
                  marginTop: "-4px",
                  marginBottom: "16px",
                  padding: "12px 14px",
                  background: "rgba(139, 92, 246, 0.08)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#d8b4fe",
                    marginBottom: selectedTeacherAssignments.length > 0 ? "6px" : "0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📋</span> Currently Assigned Courses ({selectedTeacherAssignments.length}):
                </div>
                {selectedTeacherAssignments.length === 0 ? (
                  <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontStyle: "italic", fontSize: "12px" }}>
                    No active course assignments yet.
                  </p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "18px", color: "#e2e8f0", lineHeight: "1.6" }}>
                    {selectedTeacherAssignments.map((a) => {
                      const c = getCourse(a.courseId);
                      const code = a.course_code || c?.code || "";
                      const name = a.course_name || c?.name || "Course";
                      return (
                        <li key={a.id} style={{ marginBottom: "2px" }}>
                          <strong>{code}</strong> {code ? "—" : ""} {name}{" "}
                          <span style={{ color: "#a78bfa", fontSize: "12px" }}>
                            (Sem {a.semester} · {a.academicYear} · {a.role})
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <label>
              Academic Year
              <select
                required
                disabled={!form.courseId}
                value={form.academicYear}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
              >
                {!form.courseId ? (
                  <option value="">Select a course first</option>
                ) : availableAcademicYears.length === 0 ? (
                  <option value="">No academic year found</option>
                ) : (
                  availableAcademicYears.map((year) => (
                    <option key={year} value={year}>
                      {year.replace("-", "–")}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="modal-form-row">
              <label>
                Semester
                <select
                  required
                  disabled={!form.courseId}
                  value={form.semester}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      semester: e.target.value,
                    }))
                  }
                >
                  {!form.courseId ? (
                    <option value="">Select a course first</option>
                  ) : availableSemesters.length === 0 ? (
                    <option value="">No semester found</option>
                  ) : (
                    availableSemesters.map((sem) => (
                      <option key={sem} value={String(sem)}>
                        Semester {sem}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label>
                Section
                <select
                  value={form.section}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, section: e.target.value }))
                  }
                >
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                  <option value="Section D">Section D</option>
                  <option value="All Sections">All Sections</option>
                </select>
              </label>

              <label>
                Teaching Role
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="Primary">Primary</option>
                  <option value="Co-teacher">Co-teacher</option>
                  <option value="Lab Instructor">Lab Instructor</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="assignment-primary-btn" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Assign Teacher"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewCourse && (
        <div
          className="assignment-modal-overlay"
          onClick={() => setViewCourse(null)}
        >
          <div
            className="assignment-modal"
            style={{ maxWidth: "600px", padding: "28px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-heading"
              style={{
                marginBottom: "18px",
                borderBottom: "1px solid #332b42",
                paddingBottom: "14px",
              }}
            >
              <div>
                <h2>{viewCourse.name}</h2>
                <p style={{ color: "#a78bfa", fontSize: "13px", fontWeight: 500, marginTop: "4px" }}>
                  Code: <strong>{viewCourse.code}</strong> · Dept: <strong>{viewCourse.department_code || viewCourse.dept || "—"}</strong> · Semester: <strong>Sem {viewCourse.semester}</strong>
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewCourse(null)}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "14px", color: "#e2e8f0" }}>
                Assigned Instructors ({viewCourseAssignments.length})
              </h3>

              <button
                className="assignment-primary-btn"
                style={{ padding: "8px 14px", fontSize: "11px" }}
                onClick={() => {
                  const course = viewCourse;
                  const availSems = (course.availableSemesters && course.availableSemesters.length > 0)
                    ? course.availableSemesters
                    : [course.semester || course.sem || 5];
                  const availYears = (course.availableAcademicYears && course.availableAcademicYears.length > 0)
                    ? course.availableAcademicYears
                    : [course.academicYear || course.academic_year || "2026-2027"];
                  setForm({
                    courseId: String(course.id),
                    teacherId: "",
                    academicYear: String(availYears[0]),
                    semester: String(availSems[0]),
                    role: viewCourseAssignments.length > 0 ? "Co-teacher" : "Primary",
                  });
                  setEditingId(null);
                  setViewCourse(null);
                  setModalOpen(true);
                }}
              >
                + Add Teacher
              </button>
            </div>

            {viewCourseAssignments.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 20px",
                  background: "#151221",
                  borderRadius: "12px",
                  border: "1px dashed #3a324b",
                  marginBottom: "20px",
                }}
              >
                <p style={{ color: "#9ca3af", margin: "0 0 12px 0", fontSize: "13px" }}>
                  No teachers are currently assigned to this course.
                </p>
                <button
                  className="table-action"
                  onClick={() => {
                    const course = viewCourse;
                    setForm({
                      courseId: String(course.id),
                      teacherId: "",
                      academicYear: "2026-2027",
                      semester: String(course.semester || 5),
                      role: "Primary",
                    });
                    setEditingId(null);
                    setViewCourse(null);
                    setModalOpen(true);
                  }}
                >
                  + Assign Teacher Now
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxHeight: "360px",
                  overflowY: "auto",
                  paddingRight: "4px",
                  marginBottom: "20px",
                }}
              >
                {viewCourseAssignments.map((assignment) => {
                  const teacherName =
                    assignment.teacher_name ||
                    getTeacher(assignment.teacherId)?.name ||
                    "Teacher";
                  return (
                    <div
                      key={assignment.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "#161224",
                        border: "1px solid #2e2640",
                        borderRadius: "12px",
                      }}
                    >
                      <div className="teacher-cell">
                        <div
                          className="teacher-avatar"
                          style={{ width: "38px", height: "38px", borderRadius: "10px" }}
                        >
                          {teacherName.charAt(0)}
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px" }}>{teacherName}</strong>
                          <small style={{ color: "#9ca3af" }}>
                            {assignment.teacher_employee_id || assignment.teacherId}{" "}
                            {assignment.teacher_email ? `· ${assignment.teacher_email}` : ""}
                          </small>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              marginTop: "6px",
                              alignItems: "center",
                            }}
                          >
                            <span className="role-badge">{assignment.role}</span>
                            <span className="role-badge" style={{ background: "#252038", color: "#81b8ff" }}>
                              {assignment.section || "Section A"}
                            </span>
                            <span style={{ fontSize: "11px", color: "#8c849b" }}>
                              Sem {assignment.semester} ({assignment.academicYear})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          onClick={() => toggleStatus(assignment.id, assignment.status)}
                        >
                          <span
                            className={`assignment-status ${
                              assignment.status === "Active"
                                ? "active-status"
                                : "inactive-status"
                            }`}
                          >
                            {assignment.status}
                          </span>
                        </button>

                        <button
                          className="table-action"
                          onClick={() => {
                            setViewCourse(null);
                            openEditModal(assignment);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="table-delete"
                          title="Remove Assignment"
                          onClick={() => removeAssignment(assignment.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="modal-cancel"
                onClick={() => setViewCourse(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}