
import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./AdminDepartments.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const initialForm = {
  name: "",
  code: "",
  description: "",
};

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Bulk Import state
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
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });

      const response = await fetch(
        `${API_URL}/admin/departments?${params}`,
        { headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch departments");
      }

      setDepartments(result.data?.departments || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchDepartments, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  const openAddModal = () => {
    setEditingDepartment(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (department) => {
    setEditingDepartment(department);
    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
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
      const url = editingDepartment
        ? `${API_URL}/admin/departments/${editingDepartment.id}`
        : `${API_URL}/admin/departments`;

      const response = await fetch(url, {
        method: editingDepartment ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save department");
      }

      setShowModal(false);
      setForm(initialForm);
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (department) => {
    const nextStatus = !department.is_active;

    if (
      !window.confirm(
        `Are you sure you want to ${nextStatus ? "activate" : "deactivate"} ${department.name}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/departments/${department.id}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_active: nextStatus }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Status update failed");
      }

      fetchDepartments();
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

  // Trigger hidden file picker
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  // Download Sample Excel/CSV template in exact required format
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "S.No": 1,
        "Dept.code": "AD123",
        "Dept.Name": "AI&DS",
        "Descreption": "Artificial Intelligence and Data Science Department"
      },
      {
        "S.No": 2,
        "Dept.code": "CSE101",
        "Dept.Name": "Computer Science & Engineering",
        "Descreption": "Core CS Department"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, {
      header: ["S.No", "Dept.code", "Dept.Name", "Descreption"],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    XLSX.writeFile(wb, "Department_Import_Template.xlsx");
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

        // Parse header row
        const headersArr = rows[0].map((h) =>
          String(h || "").trim().toLowerCase()
        );

        const codeIdx = headersArr.findIndex(
          (h) => h.includes("code") || h === "dept.code" || h === "deptcode"
        );
        const nameIdx = headersArr.findIndex(
          (h) => h.includes("name") || h === "dept.name" || h === "deptname"
        );
        const descIdx = headersArr.findIndex(
          (h) =>
            h.includes("desc") ||
            h === "descreption" ||
            h === "description"
        );

        if (codeIdx === -1 || nameIdx === -1) {
          throw new Error(
            "Invalid file format! Sheet must contain columns: 'Dept.code' and 'Dept.Name'."
          );
        }

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const sno = row[0] ? String(row[0]).trim() : String(i);
          const code = row[codeIdx] ? String(row[codeIdx]).trim() : "";
          const name = row[nameIdx] ? String(row[nameIdx]).trim() : "";
          const description =
            descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : "";

          if (code || name) {
            parsed.push({
              sno,
              code,
              name,
              description,
              isValid: Boolean(code && name),
            });
          }
        }

        if (parsed.length === 0) {
          throw new Error("No valid department records found in file.");
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
      const response = await fetch(`${API_URL}/admin/departments/bulk-import`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          departments: validItems.map((item) => ({
            code: item.code,
            name: item.name,
            description: item.description,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to import departments");
      }

      setImportMessage(result.message || "Import successful!");
      setTimeout(() => {
        setShowImportModal(false);
        setImportPreview([]);
        setImportMessage("");
        fetchDepartments();
      }, 1500);
    } catch (err) {
      setImportMessage("Error: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Departments" />
      <div className="admin-departments" style={{ flex: 1, marginLeft: "250px" }}>
        {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        style={{ display: "none" }}
      />

      <div className="ad-header">
        <div>
          <h1>Department Management</h1>
          <p>Manage academic departments and their information.</p>
        </div>

        <div className="ad-header-actions">
          <button
            className="ad-secondary-btn"
            onClick={openImportModal}
            title="Import Excel or CSV file matching format"
          >
            📥 Import CSV / Excel
          </button>

          <button className="ad-primary-btn" onClick={openAddModal}>
            <span>+</span> Add Department
          </button>
        </div>
      </div>

      <div className="ad-stats">
        <div className="ad-stat-card">
          <div className="ad-stat-icon">🏢</div>
          <div>
            <p>Total Departments</p>
            <h2>{departments.length}</h2>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="ad-stat-icon">📚</div>
          <div>
            <p>Current Page</p>
            <h2>{page} / {totalPages}</h2>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="ad-stat-icon">⌕</div>
          <div>
            <p>Search Results</p>
            <h2>{departments.length}</h2>
          </div>
        </div>
      </div>

      <div className="ad-content">
        <div className="ad-toolbar">
          <div className="ad-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search department name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error && !showModal && (
          <div className="ad-error">{error}</div>
        )}

        <div className="ad-grid">
          {loading ? (
            <div className="ad-empty">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="ad-empty">No departments found.</div>
          ) : (
            departments.map((department) => (
              <div className="ad-card" key={department.id}>
                <div className="ad-card-top">
                  <div className="ad-dept-icon">
                    {department.code?.slice(0, 2) || "DP"}
                  </div>

                  <span
                    className={`ad-status ${
                      department.is_active === false
                        ? "inactive"
                        : "active"
                    }`}
                  >
                    {department.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>

                <div className="ad-card-info">
                  <h3>{department.name}</h3>
                  <span className="ad-code">{department.code}</span>

                  <p>
                    {department.description ||
                      "No description provided."}
                  </p>
                </div>

                <div className="ad-card-meta">
                  <div>
                    <span>Faculty</span>
                    <strong>{department.faculty_count ?? "—"}</strong>
                  </div>

                  <div>
                    <span>Students</span>
                    <strong>{department.student_count ?? "—"}</strong>
                  </div>

                  <div>
                    <span>Courses</span>
                    <strong>{department.course_count ?? "—"}</strong>
                  </div>
                </div>

                <div className="ad-card-actions">
                  <button
                    className="ad-edit-btn"
                    onClick={() => openEditModal(department)}
                  >
                    Edit Details
                  </button>

                  <button
                    className="ad-toggle-btn"
                    onClick={() => toggleStatus(department)}
                  >
                    {department.is_active === false
                      ? "Activate"
                      : "Deactivate"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ad-pagination">
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

      {/* Add / Edit Department Modal */}
      {showModal && (
        <div
          className="ad-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header">
              <div>
                <h2>
                  {editingDepartment ? "Edit Department" : "Add Department"}
                </h2>
                <p>Enter department details below or import from file.</p>
              </div>

              <button
                className="ad-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {!editingDepartment && (
              <div className="ad-modal-import-banner">
                <span>Have an Excel or CSV file?</span>
                <button
                  type="button"
                  className="ad-link-btn"
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
              <div className="ad-form">
                <label>
                  Department Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Artificial Intelligence and Data Science"
                    required
                  />
                </label>

                <label>
                  Department Code *
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="AIDS"
                    maxLength={20}
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Enter department description..."
                    rows={4}
                  />
                </label>
              </div>

              {error && <div className="ad-error">{error}</div>}

              <div className="ad-modal-footer">
                <button
                  type="button"
                  className="ad-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ad-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingDepartment
                    ? "Save Changes"
                    : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Department Popup Modal */}
      {showImportModal && (
        <div
          className="ad-modal-overlay"
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            className="ad-modal ad-import-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ad-modal-header">
              <div>
                <h2>Import Departments</h2>
                <p>
                  Upload an Excel (.xlsx, .xls) or CSV file matching the required column format below.
                </p>
              </div>

              <button
                className="ad-close"
                onClick={() => !importing && setShowImportModal(false)}
              >
                ×
              </button>
            </div>

            {/* Sample Column Order Box */}
            <div className="ad-format-guide-box">
              <div className="ad-format-guide-title">
                📊 Sample Column Order & Structure:
              </div>
              <div className="ad-sample-table-wrapper">
                <table className="ad-sample-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Dept.code <span className="req-star">*</span></th>
                      <th>Dept.Name <span className="req-star">*</span></th>
                      <th>Descreption</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>AD123</td>
                      <td>AI&DS</td>
                      <td>Artificial Intelligence and Data Science</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>CSE101</td>
                      <td>Computer Science</td>
                      <td>Core Computer Science Department</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {importMessage && (
              <div
                className={`ad-import-message ${
                  importMessage.startsWith("Error") ? "error" : "success"
                }`}
              >
                {importMessage}
              </div>
            )}

            {/* Parsed Rows Preview (If File Selected) */}
            {importPreview.length > 0 ? (
              <div className="ad-import-table-container">
                <div className="ad-preview-header-label">
                  Parsed Data Preview ({importPreview.length} Rows):
                </div>
                <table className="ad-import-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Dept.code</th>
                      <th>Dept.Name</th>
                      <th>Descreption</th>
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
                        <td>{row.description || "—"}</td>
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

            <div className="ad-modal-footer ad-import-footer">
              <button
                type="button"
                className="ad-secondary-btn"
                onClick={downloadSampleTemplate}
              >
                📄 Download Sample Template
              </button>

              <button
                type="button"
                className="ad-secondary-btn"
                onClick={triggerFileSelect}
              >
                {importPreview.length > 0 ? "🔄 Choose Different File" : "📁 Choose Excel / CSV File"}
              </button>

              {importPreview.length > 0 && (
                <button
                  type="button"
                  className="ad-primary-btn"
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
