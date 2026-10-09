
import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./AdminCourses.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const initialForm = {
  name: "",
  code: "",
  description: "",
  department_id: "",
  credit: "3",
  category: "Core",
  year: "1",
  sem: "1",
  academic_year: "2024-2025",
  thumbnail_url: "",
  syllabus_url: "",
  learning_objectives: "",
};

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [sem, setSem] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/departments?limit=100`, {
        headers,
      });

      const result = await response.json();

      if (response.ok) {
        setDepartments(result.data?.departments || []);
      }
    } catch (err) {
      console.error("Department fetch error:", err);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        department,
        year,
        sem,
      });

      const response = await fetch(
        `${API_URL}/admin/courses?${params}`,
        { headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch courses");
      }

      setCourses(result.data?.courses || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchCourses, 300);
    return () => clearTimeout(timer);
  }, [page, search, department, year, sem]);

  const openAddModal = () => {
    setEditingCourse(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);

    setForm({
      name: course.name || "",
      code: course.code || "",
      description: course.description || "",
      department_id: course.department_id || "",
      credit: String(course.credit ?? "3"),
      category: course.category || "Core",
      year: String(course.year || "1"),
      sem: String(course.sem || "1"),
      academic_year: course.academic_year || "2024-2025",
      thumbnail_url: course.thumbnail_url || "",
      syllabus_url: course.syllabus_url || "",
      learning_objectives: course.learning_objectives || "",
    });

    setError("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingCourse
        ? `${API_URL}/admin/courses/${editingCourse.id}`
        : `${API_URL}/admin/courses`;

      const response = await fetch(url, {
        method: editingCourse ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          ...form,
          credit: Number(form.credit),
          year: Number(form.year),
          sem: Number(form.sem),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save course");
      }

      setShowModal(false);
      setForm(initialForm);
      fetchCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (course) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${course.name} (${course.code})?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/courses/${course.id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete course");
      }

      fetchCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Import Modal popup first
  const openImportModal = () => {
    setImportPreview([]);
    setImportMessage("");
    setShowImportModal(true);
  };

  // Trigger hidden file input
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  // Download Sample Excel/CSV template matching user's requested format
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "S.No": 1,
        "Course code": "CS101",
        "Course name": "Data Structures & Algorithms",
        "Course Descreption": "Fundamental concepts of data structures and algorithms.",
        "Department": "AIDS",
        "Credit": 4,
        "Category": "Core",
        "Sem": 1,
        "Year": 1,
        "Academic Year": "2024-2025",
        "Learning Objective": "Understand arrays, trees, graphs, sorting, and searching algorithms."
      },
      {
        "S.No": 2,
        "Course code": "AI202",
        "Course name": "Machine Learning Fundamentals",
        "Course Descreption": "Introduction to supervised and unsupervised machine learning.",
        "Department": "AIDS",
        "Credit": 3,
        "Category": "Core",
        "Sem": 3,
        "Year": 2,
        "Academic Year": "2024-2025",
        "Learning Objective": "Master regression, classification, clustering, and model evaluation."
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, {
      header: [
        "S.No",
        "Course code",
        "Course name",
        "Course Descreption",
        "Department",
        "Credit",
        "Category",
        "Sem",
        "Year",
        "Academic Year",
        "Learning Objective"
      ],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courses");
    XLSX.writeFile(wb, "Course_Import_Template.xlsx");
  };

  // Parse uploaded Excel or CSV file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage("");
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

        if (!rows || rows.length < 2) {
          throw new Error("File is empty or missing data rows.");
        }

        // Parse headers row
        const headersArr = rows[0].map((h) =>
          String(h || "").trim().toLowerCase()
        );

        const codeIdx = headersArr.findIndex(
          (h) => h.includes("code") || h === "course code" || h === "coursecode"
        );
        const nameIdx = headersArr.findIndex(
          (h) => h.includes("name") || h === "course name" || h === "coursename"
        );
        const descIdx = headersArr.findIndex(
          (h) => h.includes("desc") || h.includes("descreption") || h.includes("description")
        );
        const deptIdx = headersArr.findIndex(
          (h) => h.includes("dept") || h.includes("department")
        );
        const creditIdx = headersArr.findIndex((h) => h.includes("credit"));
        const categoryIdx = headersArr.findIndex((h) => h.includes("category"));
        const semIdx = headersArr.findIndex((h) => h.includes("sem"));
        const yearIdx = headersArr.findIndex((h) => h.includes("year") && !h.includes("academic"));
        const acadYearIdx = headersArr.findIndex((h) => h.includes("academic"));
        const objIdx = headersArr.findIndex(
          (h) => h.includes("objective") || h.includes("learning objective")
        );

        if (codeIdx === -1 || nameIdx === -1) {
          throw new Error(
            "Invalid file format! Sheet must contain columns: 'Course code' and 'Course name'."
          );
        }

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const sno = row[0] ? String(row[0]).trim() : String(i);
          const code = row[codeIdx] ? String(row[codeIdx]).trim() : "";
          const name = row[nameIdx] ? String(row[nameIdx]).trim() : "";
          const description = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : "";
          const department = deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : "";
          const credit = creditIdx !== -1 && row[creditIdx] ? String(row[creditIdx]).trim() : "3";
          const category = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim() : "Core";
          const sem = semIdx !== -1 && row[semIdx] ? String(row[semIdx]).trim() : "1";
          const year = yearIdx !== -1 && row[yearIdx] ? String(row[yearIdx]).trim() : "1";
          const academicYear = acadYearIdx !== -1 && row[acadYearIdx] ? String(row[acadYearIdx]).trim() : "";
          const learningObjectives = objIdx !== -1 && row[objIdx] ? String(row[objIdx]).trim() : "";

          if (code || name) {
            parsed.push({
              sno,
              code,
              name,
              description,
              department,
              credit,
              category,
              sem,
              year,
              academicYear,
              learningObjectives,
              isValid: Boolean(code && name),
            });
          }
        }

        if (parsed.length === 0) {
          throw new Error("No valid course records found in file.");
        }

        setImportPreview(parsed);
        setShowImportModal(true);
      } catch (err) {
        alert(err.message || "Failed to parse file.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit parsed import data to backend
  const handleConfirmImport = async () => {
    const validItems = importPreview.filter((item) => item.isValid);
    if (validItems.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    setImporting(true);
    setImportMessage("");

    try {
      const response = await fetch(`${API_URL}/admin/courses/bulk-import`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          courses: validItems.map((item) => ({
            code: item.code,
            name: item.name,
            description: item.description,
            department: item.department,
            credit: item.credit,
            category: item.category,
            sem: item.sem,
            year: item.year,
            academic_year: item.academicYear,
            learning_objectives: item.learningObjectives,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to import courses");
      }

      setImportMessage(result.message || "Import successful!");
      setTimeout(() => {
        setShowImportModal(false);
        setImportPreview([]);
        setImportMessage("");
        fetchCourses();
      }, 1500);
    } catch (err) {
      setImportMessage("Error: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Courses" />
      <div className="admin-courses" style={{ flex: 1, marginLeft: "250px" }}>
        {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        style={{ display: "none" }}
      />

      <div className="ac-header">
        <div>
          <h1>Course Management</h1>
          <p>Create, organize and manage academic courses.</p>
        </div>

        <div className="ac-header-actions">
          <button
            className="ac-secondary-btn"
            onClick={openImportModal}
            title="Import Excel or CSV file matching format"
          >
            📥 Import CSV / Excel
          </button>

          <button className="ac-primary-btn" onClick={openAddModal}>
            + Add Course
          </button>
        </div>
      </div>

      <div className="ac-stats">
        <div className="ac-stat-card">
          <div className="ac-stat-icon">📚</div>
          <div>
            <p>Courses on Page</p>
            <h2>{courses.length}</h2>
          </div>
        </div>

        <div className="ac-stat-card">
          <div className="ac-stat-icon">🏢</div>
          <div>
            <p>Departments</p>
            <h2>{departments.length}</h2>
          </div>
        </div>

        <div className="ac-stat-card">
          <div className="ac-stat-icon">📄</div>
          <div>
            <p>Current Page</p>
            <h2>{page} / {totalPages}</h2>
          </div>
        </div>
      </div>

      <div className="ac-content">
        <div className="ac-toolbar">
          <div className="ac-search">
            <span>⌕</span>
            <input
              placeholder="Search course name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Years</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>Year {n}</option>
            ))}
          </select>

          <select
            value={sem}
            onChange={(e) => {
              setSem(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>

        {error && !showModal && <div className="ac-error">{error}</div>}

        <div className="ac-table-wrapper">
          <table className="ac-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Department</th>
                <th>Year / Sem</th>
                <th>Credits</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="ac-empty">
                    Loading courses...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="ac-empty">
                    No courses found.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="ac-course-cell">
                        <div className="ac-course-icon">
                          {course.code?.slice(0, 2) || "CS"}
                        </div>
                        <div>
                          <strong>{course.name}</strong>
                          <small>{course.code}</small>
                        </div>
                      </div>
                    </td>

                    <td>{course.department_name || "—"}</td>
                    <td>
                      Year {course.year} · Sem {course.sem}
                    </td>
                    <td>{course.credit}</td>
                    <td>
                      <span className="ac-category">
                        {course.category || "Core"}
                      </span>
                    </td>

                    <td>
                      <div className="ac-actions">
                        <button
                          className="ac-edit-btn"
                          onClick={() => openEditModal(course)}
                        >
                          Edit
                        </button>

                        <button
                          className="ac-delete-btn"
                          onClick={() => deleteCourse(course)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ac-pagination">
          <span>Page {page} of {totalPages}</span>

          <div>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Course Modal */}
      {showModal && (
        <div
          className="ac-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-header">
              <div>
                <h2>{editingCourse ? "Edit Course" : "Create Course"}</h2>
                <p>Enter course details below or import from file.</p>
              </div>

              <button
                className="ac-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {!editingCourse && (
              <div className="ac-modal-import-banner">
                <span>Have an Excel or CSV file?</span>
                <button
                  type="button"
                  className="ac-link-btn"
                  onClick={() => {
                    setShowModal(false);
                    openImportModal();
                  }}
                >
                  Import File
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="ac-form-grid">
                <label>
                  Course Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Course Code *
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Department *
                  <select
                    name="department_id"
                    value={form.department_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Credits *
                  <input
                    type="number"
                    name="credit"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={form.credit}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="Core">Core</option>
                    <option value="Elective">Elective</option>
                    <option value="Lab">Lab</option>
                    <option value="Open Elective">Open Elective</option>
                    <option value="Professional Elective">Professional Elective</option>
                  </select>
                </label>

                <label>
                  Year *
                  <select
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    required
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>Year {n}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Semester *
                  <select
                    name="sem"
                    value={form.sem}
                    onChange={handleChange}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>Semester {n}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Academic Year
                  <input
                    name="academic_year"
                    value={form.academic_year}
                    onChange={handleChange}
                    placeholder="2024-2025"
                  />
                </label>

                <label>
                  Thumbnail URL
                  <input
                    name="thumbnail_url"
                    value={form.thumbnail_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <label className="ac-full-width">
                  Syllabus URL
                  <input
                    name="syllabus_url"
                    value={form.syllabus_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <label className="ac-full-width">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                  />
                </label>

                <label className="ac-full-width">
                  Learning Objectives
                  <textarea
                    name="learning_objectives"
                    value={form.learning_objectives}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter learning objectives..."
                  />
                </label>
              </div>

              {error && <div className="ac-error">{error}</div>}

              <div className="ac-modal-footer">
                <button
                  type="button"
                  className="ac-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ac-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCourse
                    ? "Save Changes"
                    : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Import Popup Modal */}
      {showImportModal && (
        <div
          className="ac-modal-overlay"
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            className="ac-modal ac-import-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ac-modal-header">
              <div>
                <h2>Import Courses</h2>
                <p>
                  Upload an Excel (.xlsx, .xls) or CSV file matching the required column format below.
                </p>
              </div>

              <button
                className="ac-close"
                onClick={() => !importing && setShowImportModal(false)}
              >
                ×
              </button>
            </div>

            {/* Sample Column Order Box */}
            <div className="ac-format-guide-box">
              <div className="ac-format-guide-title">
                📊 Sample Column Order & Structure:
              </div>
              <div className="ac-sample-table-wrapper">
                <table className="ac-sample-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Course code <span className="req-star">*</span></th>
                      <th>Course name <span className="req-star">*</span></th>
                      <th>Course Descreption</th>
                      <th>Department</th>
                      <th>Credit</th>
                      <th>Category</th>
                      <th>Sem</th>
                      <th>Year</th>
                      <th>Academic Year</th>
                      <th>Learning Objective</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>CS101</td>
                      <td>Data Structures</td>
                      <td>Core algorithm topics</td>
                      <td>AIDS</td>
                      <td>4</td>
                      <td>Core</td>
                      <td>1</td>
                      <td>1</td>
                      <td>2024-2025</td>
                      <td>Arrays, trees, sorting...</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>AI202</td>
                      <td>Machine Learning</td>
                      <td>ML algorithms</td>
                      <td>AIDS</td>
                      <td>3</td>
                      <td>Core</td>
                      <td>3</td>
                      <td>2</td>
                      <td>2024-2025</td>
                      <td>Regression, classification...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {importMessage && (
              <div
                className={`ac-import-message ${
                  importMessage.startsWith("Error") ? "error" : "success"
                }`}
              >
                {importMessage}
              </div>
            )}

            {/* Parsed Data Rows Table (If file selected) */}
            {importPreview.length > 0 ? (
              <div className="ac-import-table-container">
                <div className="ac-preview-header-label">
                  Parsed Data Preview ({importPreview.length} Courses):
                </div>
                <table className="ac-import-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Dept</th>
                      <th>Credit</th>
                      <th>Cat</th>
                      <th>Sem</th>
                      <th>Year</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? "row-valid" : "row-invalid"}
                      >
                        <td>{row.sno}</td>
                        <td>
                          <strong>{row.code || "—"}</strong>
                        </td>
                        <td>{row.name || "—"}</td>
                        <td>{row.department || "Default"}</td>
                        <td>{row.credit}</td>
                        <td>{row.category}</td>
                        <td>Sem {row.sem}</td>
                        <td>Yr {row.year}</td>
                        <td>
                          {row.isValid ? (
                            <span className="badge-valid">Valid</span>
                          ) : (
                            <span className="badge-invalid">Missing Code/Name</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="ac-modal-footer ac-import-footer">
              <button
                type="button"
                className="ac-secondary-btn"
                onClick={downloadSampleTemplate}
              >
                📄 Download Sample Template
              </button>

              <button
                type="button"
                className="ac-secondary-btn"
                onClick={triggerFileSelect}
              >
                {importPreview.length > 0 ? "🔄 Choose Different File" : "📁 Choose Excel / CSV File"}
              </button>

              {importPreview.length > 0 && (
                <button
                  type="button"
                  className="ac-primary-btn"
                  disabled={
                    importing ||
                    importPreview.filter((i) => i.isValid).length === 0
                  }
                  onClick={handleConfirmImport}
                >
                  {importing
                    ? "Importing..."
                    : `Confirm & Import (${importPreview.filter((i) => i.isValid).length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
