
import React, { useEffect, useState } from "react";
import "./AdminTeachers.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const initialForm = {
  name: "",
  email: "",
  password: "",
  employee_id: "",
  department_id: "",
  designation: "",
  qualification: "",
  phone: "",
  employment_type: "full-time",
};

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        department,
        status,
      });

      const response = await fetch(
        `${API_URL}/admin/teachers?${params}`,
        { headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch teachers");
      }

      setTeachers(result.data?.teachers || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/departments`, {
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

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(timer);
  }, [page, search, department, status]);

  const openAddModal = () => {
    setEditingTeacher(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);

    setForm({
      ...initialForm,
      name: teacher.name || "",
      email: teacher.email || "",
      employee_id: teacher.employee_id || "",
      department_id: teacher.department_id || "",
      designation: teacher.designation || "",
      qualification: teacher.qualification || "",
      phone: teacher.phone || "",
      employment_type: teacher.employment_type || "full-time",
    });

    setError("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingTeacher
        ? `${API_URL}/admin/teachers/${editingTeacher.uid}`
        : `${API_URL}/admin/teachers`;

      const method = editingTeacher ? "PUT" : "POST";

      const payload = { ...form };

      if (editingTeacher) {
        delete payload.password;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Operation failed");
      }

      setShowModal(false);
      setForm(initialForm);
      fetchTeachers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (teacher) => {
    const action = teacher.is_active ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this faculty?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/teachers/${teacher.uid}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_active: !teacher.is_active }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Status update failed");
      }

      fetchTeachers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Faculty" />
      <div className="admin-teachers" style={{ flex: 1, marginLeft: "250px" }}>
      <div className="at-header">
        <div>
          <h1>Faculty Management</h1>
          <p>Manage faculty accounts, departments and information.</p>
        </div>

        <button className="at-primary-btn" onClick={openAddModal}>
          <span>+</span> Add Faculty
        </button>
      </div>

      <div className="at-stats">
        <div className="at-stat-card">
          <span className="at-stat-icon">👨‍🏫</span>
          <div>
            <p>Total Faculty</p>
            <h2>{teachers.length}</h2>
          </div>
        </div>

        <div className="at-stat-card">
          <span className="at-stat-icon">🏢</span>
          <div>
            <p>Departments</p>
            <h2>{departments.length}</h2>
          </div>
        </div>

        <div className="at-stat-card">
          <span className="at-stat-icon">✓</span>
          <div>
            <p>Current Page</p>
            <h2>{page} / {totalPages}</h2>
          </div>
        </div>
      </div>

      <div className="at-content">
        <div className="at-toolbar">
          <div className="at-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search name, email or employee ID..."
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && !showModal && (
          <div className="at-error">{error}</div>
        )}

        <div className="at-table-wrapper">
          <table className="at-table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="at-empty">
                    Loading faculty...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="at-empty">
                    No faculty members found.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.uid}>
                    <td>
                      <div className="at-person">
                        <div className="at-avatar">
                          {(teacher.name || "F").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{teacher.name}</strong>
                          <small>{teacher.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>{teacher.employee_id || "—"}</td>
                    <td>{teacher.department_name || "—"}</td>
                    <td>{teacher.designation || "Faculty"}</td>
                    <td>{teacher.phone || "—"}</td>

                    <td>
                      <span
                        className={`at-status ${
                          teacher.is_active ? "active" : "inactive"
                        }`}
                      >
                        {teacher.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="at-actions">
                        <button
                          className="at-edit-btn"
                          onClick={() => openEditModal(teacher)}
                        >
                          Edit
                        </button>

                        <button
                          className={`at-toggle-btn ${
                            teacher.is_active ? "deactivate" : "activate"
                          }`}
                          onClick={() => toggleStatus(teacher)}
                        >
                          {teacher.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="at-pagination">
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

      {showModal && (
        <div
          className="at-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div className="at-modal" onClick={(e) => e.stopPropagation()}>
            <div className="at-modal-header">
              <div>
                <h2>{editingTeacher ? "Edit Faculty" : "Add Faculty"}</h2>
                <p>Enter faculty account and professional details.</p>
              </div>

              <button
                className="at-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="at-form-grid">
                <label>
                  Full Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                {!editingTeacher && (
                  <label>
                    Initial Password *
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength={8}
                      required
                    />
                  </label>
                )}

                <label>
                  Employee ID *
                  <input
                    name="employee_id"
                    value={form.employee_id}
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
                  Designation
                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Assistant Professor"
                  />
                </label>

                <label>
                  Qualification
                  <input
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    placeholder="M.Tech / Ph.D"
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </label>

                <label>
                  Employment Type
                  <select
                    name="employment_type"
                    value={form.employment_type}
                    onChange={handleChange}
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </label>
              </div>

              {error && <div className="at-error">{error}</div>}

              <div className="at-modal-footer">
                <button
                  type="button"
                  className="at-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="at-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingTeacher
                    ? "Save Changes"
                    : "Create Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}