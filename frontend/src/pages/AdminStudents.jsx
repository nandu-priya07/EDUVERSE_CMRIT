import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Search, Plus, Users, GraduationCap, RefreshCw,
  Eye, Pencil, UserX, UserCheck, X, ChevronLeft,
  ChevronRight, Filter, Mail, Phone, BookOpen, Shield,
  Award, FileText, CheckCircle2, Home, Upload, Download, FileSpreadsheet
} from "lucide-react";

import "./AdminStudents.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const SAMPLE_HEADERS = [
  "S.no", "Student Reg No", "Student Full Name", "Student Email", "Dept",
  "Programme", "Degree Name", "Batch Year", "Current Year", "Current Sem",
  "Section", "Admission Quota", "Academic Status", "Expected Passing Year",
  "Student Phone Number", "Aadhar Number", "DOB", "Is Hosteler", "Profile Img URL",
  "Father Name", "Father Mobile Number", "Father Email", "Father Occupation", "Father Annual Income",
  "Address", "Father Aadhar Number", "Mother Name", "Mother Phone Number", "Mother Email",
  "Mother Occupation", "Mother Annual Income", "Mother Aadhar Number", "Local Guardian Name",
  "Guardian Number", "Guardian Occupation", "Guardian Address", "Password"
];

const initialForm = {
  // Basic & Account Info
  name: "",
  email: "",
  password: "",
  register_number: "",
  department: "",
  phone: "",
  programme: "B.Tech",
  degree: "Bachelor of Technology",
  batch_year: "2023-2027",
  academic_status: "Active",
  year: "1",
  semester: "1",
  section: "A",
  quota: "Counselling",
  expected_year_of_passing: "2027",
  date_of_birth: "",
  aadhar_number: "",
  is_hostel: false,
  profile_image: "",

  // Guardians
  father: {
    name: "",
    phone: "",
    email: "",
    occupation: "",
    annual_income: "",
    aadhar_number: "",
    address: "",
  },
  mother: {
    name: "",
    phone: "",
    email: "",
    occupation: "",
    annual_income: "",
    aadhar_number: "",
    address: "",
  },
  guardian: {
    name: "",
    phone: "",
    email: "",
    occupation: "",
    annual_income: "",
    aadhar_number: "",
    address: "",
  },

  // Academic Details
  academic: {
    // 10th
    tenth_marks: "",
    tenth_percentage: "",
    tenth_year_of_passing: "",
    tenth_medium: "English",
    tenth_board: "State Board",
    tenth_school_name: "",

    // 12th
    twelfth_marks: "",
    twelfth_percentage: "",
    twelfth_year_of_passing: "",
    twelfth_medium: "English",
    twelfth_board: "State Board",
    twelfth_school_name: "",

    // Diploma
    diploma_marks: "",
    diploma_percentage: "",
    diploma_year_of_passing: "",
    diploma_institute_name: "",

    // UG
    ug_marks: "",
    ug_programme: "B.Tech",
    ug_cgpa: "",
    ug_percentage: "",
    ug_year_of_passing: "",
    ug_college_name: "",
  },
};

export default function AdminStudents() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const [modal, setModal] = useState(""); // 'create', 'edit', 'view'
  const [activeTab, setActiveTab] = useState("basic"); // 'basic', 'guardians', 'academic'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fullStudentData, setFullStudentData] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");


  const request = async (url, options = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Request failed");
    }

    return result;
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        department: departmentFilter,
        year: yearFilter,
        status: statusFilter,
      });

      const result = await request(`/admin/students?${params.toString()}`);
      const data = result.data || result;

      setStudents(data.students || []);
      setTotalStudents(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const result = await request("/admin/departments");
      const data = result.data || result;
      setDepartments(data.departments || data || []);
    } catch (err) {
      console.error("Department loading failed:", err.message);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, departmentFilter, yearFilter, statusFilter]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreate = () => {
    setForm(initialForm);
    setSelectedStudent(null);
    setFullStudentData(null);
    setActiveTab("basic");
    setModal("create");
    setMessage("");
  };

  const openEdit = async (student) => {
    try {
      setSelectedStudent(student);
      setActiveTab("basic");
      setModal("edit");
      setMessage("");

      // Fetch full details
      const details = await request(`/admin/students/${student.uid}`);
      const d = details.data || {};
      const u = d.user || {};
      const p = d.profile || {};
      const gList = d.guardians || [];
      const a = d.academic || {};

      const fatherObj = gList.find((g) => g.relation === "father") || {};
      const motherObj = gList.find((g) => g.relation === "mother") || {};
      const guardianObj = gList.find((g) => g.relation === "guardian") || {};

      setForm({
        name: u.name || p.name || "",
        email: u.email || p.email || "",
        password: "",
        register_number: u.register_number || p.register_number || "",
        department: u.department || p.department || "",
        phone: p.phone || "",
        programme: p.programme || "B.Tech",
        degree: p.degree || "Bachelor of Technology",
        batch_year: p.batch_year || "2023-2027",
        academic_status: p.academic_status || "Active",
        year: String(p.year || 1),
        semester: String(p.semester || 1),
        section: p.section || "A",
        quota: p.quota || "Counselling",
        expected_year_of_passing: String(p.expected_year_of_passing || 2027),
        date_of_birth: p.date_of_birth ? p.date_of_birth.split("T")[0] : "",
        aadhar_number: p.aadhar_number || "",
        is_hostel: Boolean(p.is_hostel),
        profile_image: p.profile_image || "",

        father: {
          name: fatherObj.name || "",
          phone: fatherObj.phone || "",
          email: fatherObj.email || "",
          occupation: fatherObj.occupation || "",
          annual_income: fatherObj.annual_income || "",
          aadhar_number: fatherObj.aadhar_number || "",
          address: fatherObj.address || "",
        },
        mother: {
          name: motherObj.name || "",
          phone: motherObj.phone || "",
          email: motherObj.email || "",
          occupation: motherObj.occupation || "",
          annual_income: motherObj.annual_income || "",
          aadhar_number: motherObj.aadhar_number || "",
          address: motherObj.address || "",
        },
        guardian: {
          name: guardianObj.name || "",
          phone: guardianObj.phone || "",
          email: guardianObj.email || "",
          occupation: guardianObj.occupation || "",
          annual_income: guardianObj.annual_income || "",
          aadhar_number: guardianObj.aadhar_number || "",
          address: guardianObj.address || "",
        },

        academic: {
          tenth_marks: a.tenth_marks || "",
          tenth_percentage: a.tenth_percentage || "",
          tenth_year_of_passing: a.tenth_year_of_passing || "",
          tenth_medium: a.tenth_medium || "English",
          tenth_board: a.tenth_board || "State Board",
          tenth_school_name: a.tenth_school_name || "",

          twelfth_marks: a.twelfth_marks || "",
          twelfth_percentage: a.twelfth_percentage || "",
          twelfth_year_of_passing: a.twelfth_year_of_passing || "",
          twelfth_medium: a.twelfth_medium || "English",
          twelfth_board: a.twelfth_board || "State Board",
          twelfth_school_name: a.twelfth_school_name || "",

          diploma_marks: a.diploma_marks || "",
          diploma_percentage: a.diploma_percentage || "",
          diploma_year_of_passing: a.diploma_year_of_passing || "",
          diploma_institute_name: a.diploma_institute_name || "",

          ug_marks: a.ug_marks || "",
          ug_programme: a.ug_programme || "B.Tech",
          ug_cgpa: a.ug_cgpa || "",
          ug_percentage: a.ug_percentage || "",
          ug_year_of_passing: a.ug_year_of_passing || "",
          ug_college_name: a.ug_college_name || "",
        },
      });
    } catch (err) {
      console.error("Failed to load student details:", err);
    }
  };

  const viewStudent = async (student) => {
    try {
      setSelectedStudent(student);
      setActiveTab("basic");
      setModal("view");

      const details = await request(`/admin/students/${student.uid}`);
      setFullStudentData(details.data || null);
    } catch (err) {
      console.error("Failed to load student view data:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      if (modal === "create") {
        await request("/admin/students", {
          method: "POST",
          body: JSON.stringify(form),
        });
      } else {
        const { password, ...updateData } = form;

        await request(`/admin/students/${selectedStudent.uid}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        });
      }

      setModal("");
      await fetchStudents();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (student) => {
    const action = student.is_active ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this student?`)) {
      return;
    }

    try {
      await request(`/admin/students/${student.uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !student.is_active,
        }),
      });

      await fetchStudents();
    } catch (err) {
      setError(err.message);
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

  // Download Sample Excel/CSV template in exact required 37-column format
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "S.no": 1,
        "Student Reg No": "7376231AD101",
        "Student Full Name": "Aarav Sharma",
        "Student Email": "aarav.sharma@smartcampus.edu",
        "Dept": "AI&DS",
        "Programme": "B.Tech",
        "Degree Name": "Bachelor of Technology",
        "Batch Year": "2023-2027",
        "Current Year": 2,
        "Current Sem": 3,
        "Section": "A",
        "Admission Quota": "Counselling",
        "Academic Status": "Active",
        "Expected Passing Year": 2027,
        "Student Phone Number": "9876543210",
        "Aadhar Number": "123456789012",
        "DOB": "2005-04-15",
        "Is Hosteler": "No",
        "Profile Img URL": "",
        "Father Name": "Rajesh Sharma",
        "Father Mobile Number": "9876500001",
        "Father Email": "rajesh.sharma@gmail.com",
        "Father Occupation": "Software Engineer",
        "Father Annual Income": "1200000",
        "Address": "123 Green Park, Chennai",
        "Father Aadhar Number": "987654321098",
        "Mother Name": "Sunita Sharma",
        "Mother Phone Number": "9876500002",
        "Mother Email": "sunita.sharma@gmail.com",
        "Mother Occupation": "Teacher",
        "Mother Annual Income": "600000",
        "Mother Aadhar Number": "876543210987",
        "Local Guardian Name": "",
        "Guardian Number": "",
        "Guardian Occupation": "",
        "Guardian Address": "",
        "Password": "Student@123"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: SAMPLE_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
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
        const jsonRows = XLSX.utils.sheet_to_json(ws);

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error("File is empty or contains no data rows.");
        }

        setImportPreview(jsonRows);
        setImportMessage(`Loaded ${jsonRows.length} student row(s) for preview.`);
      } catch (err) {
        setImportMessage(`Error parsing file: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Post parsed students data to bulk-import endpoint
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    setImportMessage("");

    try {
      const res = await request("/admin/students/bulk-import", {
        method: "POST",
        body: JSON.stringify({ students: importPreview }),
      });

      setImportMessage(`✅ ${res.message}`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportPreview([]);
        fetchStudents();
      }, 1500);
    } catch (err) {
      setImportMessage(`❌ ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "year") {
        next.semester = String((Number(value) - 1) * 2 + 1);
      }
      return next;
    });
  };

  const updateNestedField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Students" />
      <div className="admin-students-page" style={{ flex: 1, marginLeft: "250px" }}>
        {/* Header */}
      <div className="students-header">
        <div>
          <div className="students-breadcrumb">Administration / Students</div>
          <h1>Student Management</h1>
          <p>Manage student profiles, guardian information, and academic records.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="students-secondary-btn" onClick={openImportModal}>
            <Upload size={16} />
            Import Students
          </button>
          <button className="students-primary-btn" onClick={openCreate}>
            <Plus size={17} />
            Add Student
          </button>
        </div>
      </div>


      {/* Summary Stats */}
      <div className="students-summary">
        <div className="students-summary-card">
          <div className="students-summary-icon purple">
            <Users size={21} />
          </div>
          <div>
            <span>Total Students</span>
            <strong>{totalStudents.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        <div className="students-summary-card">
          <div className="students-summary-icon blue">
            <GraduationCap size={21} />
          </div>
          <div>
            <span>Current Page</span>
            <strong>{students.length}</strong>
          </div>
        </div>

        <div className="students-summary-card">
          <div className="students-summary-icon green">
            <UserCheck size={21} />
          </div>
          <div>
            <span>Active on Page</span>
            <strong>{students.filter((s) => s.is_active).length}</strong>
          </div>
        </div>
      </div>

      {/* Table Panel */}
      <section className="students-panel">
        <div className="students-panel-header">
          <div>
            <h2>All Students</h2>
            <p>View and manage registered students</p>
          </div>

          <button
            className="students-refresh-btn"
            onClick={fetchStudents}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {/* Toolbar Filters */}
        <div className="students-toolbar">
          <div className="students-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email or register number..."
            />
          </div>

          <div className="students-filter">
            <Filter size={15} />
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code || dept.name}
                </option>
              ))}
            </select>
          </div>

          <select
            className="students-select"
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Years</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          <select
            className="students-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && <div className="students-error">{error}</div>}

        {/* Table */}
        <div className="students-table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Register No</th>
                <th>Department</th>
                <th>Year / Sem</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="students-loading">
                    Loading students list...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="students-empty">
                    No student records found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.uid}>
                    <td>
                      <div className="student-info">
                        <div className="student-avatar">
                          {student.profile_image ? (
                            <img src={student.profile_image} alt={student.name} />
                          ) : (
                            (student.name || "S").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>{student.name}</strong>
                          <span>
                            <Mail size={12} />
                            {student.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <code className="reg-badge">{student.register_number || "—"}</code>
                    </td>

                    <td>
                      <span className="student-department">
                        {student.department_code || student.department_name || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="student-academic">
                        Year {student.year || "—"}
                      </span>
                      <span className="student-semester">
                        Sem {student.semester || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`student-status ${
                          student.is_active ? "active" : "inactive"
                        }`}
                      >
                        <span />
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="student-actions">
                        <button title="View Full Details" onClick={() => viewStudent(student)}>
                          <Eye size={16} />
                        </button>

                        <button title="Edit Record" onClick={() => openEdit(student)}>
                          <Pencil size={16} />
                        </button>

                        <button
                          title={student.is_active ? "Deactivate" : "Activate"}
                          className={student.is_active ? "danger" : "success"}
                          onClick={() => toggleStatus(student)}
                        >
                          {student.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="students-pagination">
          <span>
            Showing {students.length ? (page - 1) * 10 + 1 : 0}–
            {(page - 1) * 10 + students.length} of {totalStudents}
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>

            <span>
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* CREATE / EDIT MULTI-TAB MODAL */}
      {(modal === "create" || modal === "edit") && (
        <div className="students-modal-overlay">
          <div className="students-modal large-modal">
            <div className="students-modal-header">
              <div>
                <h2>{modal === "create" ? "Add New Student" : "Edit Student Record"}</h2>
                <p>Enter comprehensive student profile, guardian, and academic details.</p>
              </div>

              <button onClick={() => setModal("")}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="students-tab-nav">
              <button
                type="button"
                className={activeTab === "basic" ? "active" : ""}
                onClick={() => setActiveTab("basic")}
              >
                <Users size={15} />
                1. Basic & Profile Info
              </button>

              <button
                type="button"
                className={activeTab === "guardians" ? "active" : ""}
                onClick={() => setActiveTab("guardians")}
              >
                <Shield size={15} />
                2. Guardian Information
              </button>

              <button
                type="button"
                className={activeTab === "academic" ? "active" : ""}
                onClick={() => setActiveTab("academic")}
              >
                <Award size={15} />
                3. Academic History
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="students-tab-body">
                {/* TAB 1: BASIC & PROFILE */}
                {activeTab === "basic" && (
                  <div className="students-form-grid">
                    <label>
                      Full Name *
                      <input
                        required
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="e.g. Arun Kumar"
                      />
                    </label>

                    <label>
                      Email Address *
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="std.aids.s1.01@smartcampus.com"
                      />
                    </label>

                    {modal === "create" && (
                      <label>
                        Password *
                        <input
                          required
                          type="password"
                          minLength={6}
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          placeholder="Default password (min 6 chars)"
                        />
                      </label>
                    )}

                    <label>
                      Register Number *
                      <input
                        required
                        value={form.register_number}
                        onChange={(e) => updateField("register_number", e.target.value)}
                        placeholder="e.g. ADS2024001"
                      />
                    </label>

                    <label>
                      Department *
                      <select
                        required
                        value={form.department}
                        onChange={(e) => updateField("department", e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Programme
                      <input
                        value={form.programme}
                        onChange={(e) => updateField("programme", e.target.value)}
                        placeholder="e.g. B.Tech"
                      />
                    </label>

                    <label>
                      Degree Name
                      <input
                        value={form.degree}
                        onChange={(e) => updateField("degree", e.target.value)}
                        placeholder="e.g. Bachelor of Technology"
                      />
                    </label>

                    <label>
                      Batch Year
                      <input
                        value={form.batch_year}
                        onChange={(e) => updateField("batch_year", e.target.value)}
                        placeholder="e.g. 2023-2027"
                      />
                    </label>

                    <label>
                      Current Year *
                      <select
                        value={form.year}
                        onChange={(e) => updateField("year", e.target.value)}
                      >
                        {[1, 2, 3, 4].map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Current Semester *
                      <select
                        value={form.semester}
                        onChange={(e) => updateField("semester", e.target.value)}
                      >
                        {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Section
                      <select
                        value={form.section}
                        onChange={(e) => updateField("section", e.target.value)}
                      >
                        {["A", "B", "C", "D"].map((sec) => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Admission Quota
                      <select
                        value={form.quota}
                        onChange={(e) => updateField("quota", e.target.value)}
                      >
                        {["Counselling", "Management", "Sports", "NRI"].map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Academic Status
                      <select
                        value={form.academic_status}
                        onChange={(e) => updateField("academic_status", e.target.value)}
                      >
                        {["Active", "Inactive", "Completed", "Suspended"].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Expected Passing Year
                      <input
                        type="number"
                        value={form.expected_year_of_passing}
                        onChange={(e) => updateField("expected_year_of_passing", e.target.value)}
                        placeholder="e.g. 2027"
                      />
                    </label>

                    <label>
                      Phone Number
                      <input
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="e.g. 9840123456"
                      />
                    </label>

                    <label>
                      Aadhaar Card Number
                      <input
                        value={form.aadhar_number}
                        onChange={(e) => updateField("aadhar_number", e.target.value)}
                        placeholder="e.g. 7000 1234 5678"
                      />
                    </label>

                    <label>
                      Date of Birth
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => updateField("date_of_birth", e.target.value)}
                      />
                    </label>

                    <label>
                      Hosteller Status
                      <select
                        value={form.is_hostel ? "true" : "false"}
                        onChange={(e) => updateField("is_hostel", e.target.value === "true")}
                      >
                        <option value="false">Dayscholar</option>
                        <option value="true">Hosteller</option>
                      </select>
                    </label>

                    <label className="students-full-field">
                      Profile Image URL
                      <input
                        value={form.profile_image}
                        onChange={(e) => updateField("profile_image", e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </label>
                  </div>
                )}

                {/* TAB 2: GUARDIAN DETAILS */}
                {activeTab === "guardians" && (
                  <div className="students-guardian-sections">
                    {/* Father Section */}
                    <div className="guardian-card">
                      <h3>Father's Details (Primary)</h3>
                      <div className="students-form-grid">
                        <label>
                          Father's Name
                          <input
                            value={form.father.name}
                            onChange={(e) => updateNestedField("father", "name", e.target.value)}
                            placeholder="Full Name"
                          />
                        </label>

                        <label>
                          Phone Number
                          <input
                            value={form.father.phone}
                            onChange={(e) => updateNestedField("father", "phone", e.target.value)}
                            placeholder="Phone Number"
                          />
                        </label>

                        <label>
                          Email Address
                          <input
                            type="email"
                            value={form.father.email}
                            onChange={(e) => updateNestedField("father", "email", e.target.value)}
                            placeholder="father@example.com"
                          />
                        </label>

                        <label>
                          Occupation
                          <input
                            value={form.father.occupation}
                            onChange={(e) => updateNestedField("father", "occupation", e.target.value)}
                            placeholder="e.g. Business / Engineer"
                          />
                        </label>

                        <label>
                          Annual Income
                          <input
                            value={form.father.annual_income}
                            onChange={(e) => updateNestedField("father", "annual_income", e.target.value)}
                            placeholder="e.g. ₹6,00,000"
                          />
                        </label>

                        <label>
                          Aadhaar Number
                          <input
                            value={form.father.aadhar_number}
                            onChange={(e) => updateNestedField("father", "aadhar_number", e.target.value)}
                            placeholder="Aadhaar Card No"
                          />
                        </label>

                        <label className="students-full-field">
                          Residential Address
                          <input
                            value={form.father.address}
                            onChange={(e) => updateNestedField("father", "address", e.target.value)}
                            placeholder="Door No, Street, City, State, Pincode"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Mother Section */}
                    <div className="guardian-card">
                      <h3>Mother's Details</h3>
                      <div className="students-form-grid">
                        <label>
                          Mother's Name
                          <input
                            value={form.mother.name}
                            onChange={(e) => updateNestedField("mother", "name", e.target.value)}
                            placeholder="Full Name"
                          />
                        </label>

                        <label>
                          Phone Number
                          <input
                            value={form.mother.phone}
                            onChange={(e) => updateNestedField("mother", "phone", e.target.value)}
                            placeholder="Phone Number"
                          />
                        </label>

                        <label>
                          Email Address
                          <input
                            type="email"
                            value={form.mother.email}
                            onChange={(e) => updateNestedField("mother", "email", e.target.value)}
                            placeholder="mother@example.com"
                          />
                        </label>

                        <label>
                          Occupation
                          <input
                            value={form.mother.occupation}
                            onChange={(e) => updateNestedField("mother", "occupation", e.target.value)}
                            placeholder="e.g. Teacher / Homemaker"
                          />
                        </label>

                        <label>
                          Annual Income
                          <input
                            value={form.mother.annual_income}
                            onChange={(e) => updateNestedField("mother", "annual_income", e.target.value)}
                            placeholder="e.g. ₹3,00,000"
                          />
                        </label>

                        <label>
                          Aadhaar Number
                          <input
                            value={form.mother.aadhar_number}
                            onChange={(e) => updateNestedField("mother", "aadhar_number", e.target.value)}
                            placeholder="Aadhaar Card No"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Local Guardian Section */}
                    <div className="guardian-card">
                      <h3>Local Guardian Details</h3>
                      <div className="students-form-grid">
                        <label>
                          Guardian's Name
                          <input
                            value={form.guardian.name}
                            onChange={(e) => updateNestedField("guardian", "name", e.target.value)}
                            placeholder="Full Name"
                          />
                        </label>

                        <label>
                          Phone Number
                          <input
                            value={form.guardian.phone}
                            onChange={(e) => updateNestedField("guardian", "phone", e.target.value)}
                            placeholder="Phone Number"
                          />
                        </label>

                        <label>
                          Occupation
                          <input
                            value={form.guardian.occupation}
                            onChange={(e) => updateNestedField("guardian", "occupation", e.target.value)}
                            placeholder="Occupation"
                          />
                        </label>

                        <label className="students-full-field">
                          Local Address
                          <input
                            value={form.guardian.address}
                            onChange={(e) => updateNestedField("guardian", "address", e.target.value)}
                            placeholder="Local Address"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ACADEMIC DETAILS */}
                {activeTab === "academic" && (
                  <div className="students-academic-sections">
                    {/* 10th Details */}
                    <div className="academic-card">
                      <h3>SSLC (10th Standard) Details</h3>
                      <div className="students-form-grid">
                        <label>
                          Marks Obtained
                          <input
                            value={form.academic.tenth_marks}
                            onChange={(e) => updateNestedField("academic", "tenth_marks", e.target.value)}
                            placeholder="e.g. 450/500"
                          />
                        </label>

                        <label>
                          Percentage (%)
                          <input
                            type="number"
                            step="0.01"
                            value={form.academic.tenth_percentage}
                            onChange={(e) => updateNestedField("academic", "tenth_percentage", e.target.value)}
                            placeholder="e.g. 90.00"
                          />
                        </label>

                        <label>
                          Year of Passing
                          <input
                            type="number"
                            value={form.academic.tenth_year_of_passing}
                            onChange={(e) => updateNestedField("academic", "tenth_year_of_passing", e.target.value)}
                            placeholder="e.g. 2020"
                          />
                        </label>

                        <label>
                          Medium of Study
                          <input
                            value={form.academic.tenth_medium}
                            onChange={(e) => updateNestedField("academic", "tenth_medium", e.target.value)}
                            placeholder="e.g. English / Tamil"
                          />
                        </label>

                        <label>
                          Board of Study
                          <input
                            value={form.academic.tenth_board}
                            onChange={(e) => updateNestedField("academic", "tenth_board", e.target.value)}
                            placeholder="e.g. State Board / CBSE"
                          />
                        </label>

                        <label className="students-full-field">
                          School Name
                          <input
                            value={form.academic.tenth_school_name}
                            onChange={(e) => updateNestedField("academic", "tenth_school_name", e.target.value)}
                            placeholder="Name of SSLC School"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 12th Details */}
                    <div className="academic-card">
                      <h3>HSC (12th Standard) Details</h3>
                      <div className="students-form-grid">
                        <label>
                          Marks Obtained
                          <input
                            value={form.academic.twelfth_marks}
                            onChange={(e) => updateNestedField("academic", "twelfth_marks", e.target.value)}
                            placeholder="e.g. 540/600"
                          />
                        </label>

                        <label>
                          Percentage (%)
                          <input
                            type="number"
                            step="0.01"
                            value={form.academic.twelfth_percentage}
                            onChange={(e) => updateNestedField("academic", "twelfth_percentage", e.target.value)}
                            placeholder="e.g. 90.00"
                          />
                        </label>

                        <label>
                          Year of Passing
                          <input
                            type="number"
                            value={form.academic.twelfth_year_of_passing}
                            onChange={(e) => updateNestedField("academic", "twelfth_year_of_passing", e.target.value)}
                            placeholder="e.g. 2022"
                          />
                        </label>

                        <label>
                          Medium of Study
                          <input
                            value={form.academic.twelfth_medium}
                            onChange={(e) => updateNestedField("academic", "twelfth_medium", e.target.value)}
                            placeholder="e.g. English"
                          />
                        </label>

                        <label>
                          Board of Study
                          <input
                            value={form.academic.twelfth_board}
                            onChange={(e) => updateNestedField("academic", "twelfth_board", e.target.value)}
                            placeholder="e.g. State Board / CBSE"
                          />
                        </label>

                        <label className="students-full-field">
                          School Name
                          <input
                            value={form.academic.twelfth_school_name}
                            onChange={(e) => updateNestedField("academic", "twelfth_school_name", e.target.value)}
                            placeholder="Name of HSC School"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Diploma Details */}
                    <div className="academic-card">
                      <h3>Diploma Details (For Lateral Entry)</h3>
                      <div className="students-form-grid">
                        <label>
                          Marks Obtained
                          <input
                            value={form.academic.diploma_marks}
                            onChange={(e) => updateNestedField("academic", "diploma_marks", e.target.value)}
                            placeholder="e.g. 850/1000"
                          />
                        </label>

                        <label>
                          Percentage (%)
                          <input
                            type="number"
                            step="0.01"
                            value={form.academic.diploma_percentage}
                            onChange={(e) => updateNestedField("academic", "diploma_percentage", e.target.value)}
                            placeholder="e.g. 85.00"
                          />
                        </label>

                        <label>
                          Year of Passing
                          <input
                            type="number"
                            value={form.academic.diploma_year_of_passing}
                            onChange={(e) => updateNestedField("academic", "diploma_year_of_passing", e.target.value)}
                            placeholder="e.g. 2023"
                          />
                        </label>

                        <label className="students-full-field">
                          Institute Name
                          <input
                            value={form.academic.diploma_institute_name}
                            onChange={(e) => updateNestedField("academic", "diploma_institute_name", e.target.value)}
                            placeholder="Polytechnic College Name"
                          />
                        </label>
                      </div>
                    </div>

                    {/* UG Details */}
                    <div className="academic-card">
                      <h3>Undergraduate (UG) Current Performance</h3>
                      <div className="students-form-grid">
                        <label>
                          UG Programme
                          <input
                            value={form.academic.ug_programme}
                            onChange={(e) => updateNestedField("academic", "ug_programme", e.target.value)}
                            placeholder="e.g. B.Tech"
                          />
                        </label>

                        <label>
                          Obtained CGPA
                          <input
                            type="number"
                            step="0.01"
                            value={form.academic.ug_cgpa}
                            onChange={(e) => updateNestedField("academic", "ug_cgpa", e.target.value)}
                            placeholder="e.g. 8.50"
                          />
                        </label>

                        <label>
                          UG Percentage (%)
                          <input
                            type="number"
                            step="0.01"
                            value={form.academic.ug_percentage}
                            onChange={(e) => updateNestedField("academic", "ug_percentage", e.target.value)}
                            placeholder="e.g. 80.75"
                          />
                        </label>

                        <label>
                          Year of Passing
                          <input
                            type="number"
                            value={form.academic.ug_year_of_passing}
                            onChange={(e) => updateNestedField("academic", "ug_year_of_passing", e.target.value)}
                            placeholder="e.g. 2027"
                          />
                        </label>

                        <label className="students-full-field">
                          College of Study
                          <input
                            value={form.academic.ug_college_name}
                            onChange={(e) => updateNestedField("academic", "ug_college_name", e.target.value)}
                            placeholder="SmartCampus Institute of Technology"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {message && <div className="students-form-error">{message}</div>}

              <div className="students-modal-actions">
                <button
                  type="button"
                  className="students-cancel-btn"
                  onClick={() => setModal("")}
                >
                  Cancel
                </button>

                <button type="submit" className="students-primary-btn" disabled={saving}>
                  {saving ? "Saving Record..." : modal === "create" ? "Create Student" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FULL DETAILS MODAL */}
      {modal === "view" && selectedStudent && (
        <div className="students-modal-overlay">
          <div className="students-modal large-modal view-modal">
            <div className="students-modal-header">
              <div>
                <h2>Student Detailed Dossier</h2>
                <p>Register Number: {selectedStudent.register_number || "N/A"}</p>
              </div>
              <button onClick={() => setModal("")}>
                <X size={20} />
              </button>
            </div>

            <div className="students-tab-nav">
              <button
                type="button"
                className={activeTab === "basic" ? "active" : ""}
                onClick={() => setActiveTab("basic")}
              >
                <Users size={15} />
                Profile Info
              </button>

              <button
                type="button"
                className={activeTab === "guardians" ? "active" : ""}
                onClick={() => setActiveTab("guardians")}
              >
                <Shield size={15} />
                Guardians ({fullStudentData?.guardians?.length || 0})
              </button>

              <button
                type="button"
                className={activeTab === "academic" ? "active" : ""}
                onClick={() => setActiveTab("academic")}
              >
                <Award size={15} />
                Academic History
              </button>
            </div>

            <div className="students-tab-body">
              {activeTab === "basic" && (
                <div className="students-view-container">
                  <div className="students-view-profile">
                    <div className="students-view-avatar">
                      {selectedStudent.profile_image ? (
                        <img src={selectedStudent.profile_image} alt={selectedStudent.name} />
                      ) : (
                        (selectedStudent.name || "S").charAt(0).toUpperCase()
                      )}
                    </div>
                    <h3>{selectedStudent.name}</h3>
                    <span>{selectedStudent.register_number || "No Register Number"}</span>
                    <span className={`student-status ${selectedStudent.is_active ? "active" : "inactive"}`}>
                      <span />
                      {selectedStudent.is_active ? "Active Student" : "Inactive Student"}
                    </span>
                  </div>

                  <div className="students-detail-grid">
                    <div>
                      <Mail size={16} />
                      <span>Email:</span>
                      <strong>{selectedStudent.email || "—"}</strong>
                    </div>

                    <div>
                      <Phone size={16} />
                      <span>Phone:</span>
                      <strong>{selectedStudent.phone || "—"}</strong>
                    </div>

                    <div>
                      <BookOpen size={16} />
                      <span>Department:</span>
                      <strong>
                        {selectedStudent.department_name || selectedStudent.department_code || "—"}
                      </strong>
                    </div>

                    <div>
                      <GraduationCap size={16} />
                      <span>Year & Sem:</span>
                      <strong>
                        Year {selectedStudent.year || 1} · Semester {selectedStudent.semester || 1} ({selectedStudent.section || "A"})
                      </strong>
                    </div>

                    <div>
                      <FileText size={16} />
                      <span>Programme & Degree:</span>
                      <strong>{selectedStudent.programme || "B.Tech"} ({selectedStudent.degree || "B.Tech"})</strong>
                    </div>

                    <div>
                      <Award size={16} />
                      <span>Quota & Status:</span>
                      <strong>{selectedStudent.quota || "Counselling"} ({selectedStudent.academic_status || "Active"})</strong>
                    </div>

                    <div>
                      <Home size={16} />
                      <span>Accommodation:</span>
                      <strong>{selectedStudent.is_hostel ? "Hosteller" : "Dayscholar"}</strong>
                    </div>

                    <div>
                      <CheckCircle2 size={16} />
                      <span>Aadhaar Card:</span>
                      <strong>{selectedStudent.aadhar_number || "—"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "guardians" && (
                <div className="students-guardian-sections">
                  {fullStudentData?.guardians?.length === 0 ? (
                    <div className="students-empty">No guardian records filed.</div>
                  ) : (
                    fullStudentData?.guardians?.map((g) => (
                      <div key={g.id || g.relation} className="guardian-card">
                        <h3>
                          {g.relation?.toUpperCase()} {g.is_primary && "(Primary Contact)"}
                        </h3>
                        <div className="students-detail-grid">
                          <div>
                            <span>Name:</span>
                            <strong>{g.name || "—"}</strong>
                          </div>

                          <div>
                            <span>Phone:</span>
                            <strong>{g.phone || "—"}</strong>
                          </div>

                          <div>
                            <span>Email:</span>
                            <strong>{g.email || "—"}</strong>
                          </div>

                          <div>
                            <span>Occupation:</span>
                            <strong>{g.occupation || "—"}</strong>
                          </div>

                          <div>
                            <span>Annual Income:</span>
                            <strong>{g.annual_income || "—"}</strong>
                          </div>

                          <div>
                            <span>Aadhaar No:</span>
                            <strong>{g.aadhar_number || "—"}</strong>
                          </div>

                          <div className="students-full-field">
                            <span>Address:</span>
                            <strong>{g.address || "—"}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "academic" && (
                <div className="students-academic-sections">
                  {!fullStudentData?.academic ? (
                    <div className="students-empty">No academic details recorded.</div>
                  ) : (
                    <>
                      <div className="academic-card">
                        <h3>SSLC (10th Standard)</h3>
                        <div className="students-detail-grid">
                          <div><span>Marks:</span><strong>{fullStudentData.academic.tenth_marks || "—"}</strong></div>
                          <div><span>Percentage:</span><strong>{fullStudentData.academic.tenth_percentage ? `${fullStudentData.academic.tenth_percentage}%` : "—"}</strong></div>
                          <div><span>Passing Year:</span><strong>{fullStudentData.academic.tenth_year_of_passing || "—"}</strong></div>
                          <div><span>Board:</span><strong>{fullStudentData.academic.tenth_board || "—"}</strong></div>
                          <div className="students-full-field"><span>School Name:</span><strong>{fullStudentData.academic.tenth_school_name || "—"}</strong></div>
                        </div>
                      </div>

                      <div className="academic-card">
                        <h3>HSC (12th Standard)</h3>
                        <div className="students-detail-grid">
                          <div><span>Marks:</span><strong>{fullStudentData.academic.twelfth_marks || "—"}</strong></div>
                          <div><span>Percentage:</span><strong>{fullStudentData.academic.twelfth_percentage ? `${fullStudentData.academic.twelfth_percentage}%` : "—"}</strong></div>
                          <div><span>Passing Year:</span><strong>{fullStudentData.academic.twelfth_year_of_passing || "—"}</strong></div>
                          <div><span>Board:</span><strong>{fullStudentData.academic.twelfth_board || "—"}</strong></div>
                          <div className="students-full-field"><span>School Name:</span><strong>{fullStudentData.academic.twelfth_school_name || "—"}</strong></div>
                        </div>
                      </div>

                      {fullStudentData.academic.diploma_institute_name && (
                        <div className="academic-card">
                          <h3>Diploma (Lateral Entry)</h3>
                          <div className="students-detail-grid">
                            <div><span>Marks:</span><strong>{fullStudentData.academic.diploma_marks || "—"}</strong></div>
                            <div><span>Percentage:</span><strong>{fullStudentData.academic.diploma_percentage ? `${fullStudentData.academic.diploma_percentage}%` : "—"}</strong></div>
                            <div><span>Passing Year:</span><strong>{fullStudentData.academic.diploma_year_of_passing || "—"}</strong></div>
                            <div className="students-full-field"><span>Institute:</span><strong>{fullStudentData.academic.diploma_institute_name || "—"}</strong></div>
                          </div>
                        </div>
                      )}

                      <div className="academic-card">
                        <h3>Undergraduate (UG) Metrics</h3>
                        <div className="students-detail-grid">
                          <div><span>Obtained CGPA:</span><strong>{fullStudentData.academic.ug_cgpa || "—"}</strong></div>
                          <div><span>Percentage:</span><strong>{fullStudentData.academic.ug_percentage ? `${fullStudentData.academic.ug_percentage}%` : "—"}</strong></div>
                          <div><span>Programme:</span><strong>{fullStudentData.academic.ug_programme || "B.Tech"}</strong></div>
                          <div><span>Passing Year:</span><strong>{fullStudentData.academic.ug_year_of_passing || "—"}</strong></div>
                          <div className="students-full-field"><span>College Name:</span><strong>{fullStudentData.academic.ug_college_name || "—"}</strong></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="students-modal-actions">
              <button className="students-cancel-btn" onClick={() => setModal("")}>
                Close
              </button>

              <button className="students-primary-btn" onClick={() => openEdit(selectedStudent)}>
                <Pencil size={15} />
                Edit Student Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal Popup */}
      {showImportModal && (
        <div className="students-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div
            className="students-modal import-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1100px", width: "95%" }}
          >
            <div className="students-modal-header">
              <div>
                <h2>Bulk Import Students</h2>
                <p>Upload Excel or CSV file matching the standard template format</p>
              </div>
              <button
                className="students-close-btn"
                onClick={() => setShowImportModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="students-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {/* Sample Format Overview Box */}
              <div className="import-format-box" style={{ background: "#13121b", border: "1px solid #2b2938", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#e2e8f0" }}>Sample File Column Format</h4>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Your Excel/CSV sheet must contain the following 37 header columns:
                    </span>
                  </div>
                  <button
                    className="students-secondary-btn"
                    onClick={downloadSampleTemplate}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    <Download size={14} />
                    Download Sample Excel
                  </button>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #282536", borderRadius: "8px" }}>
                  <table className="import-sample-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textWrap: "nowrap" }}>
                    <thead>
                      <tr style={{ background: "#1e1b2e", color: "#a78bfa" }}>
                        {SAMPLE_HEADERS.map((h, i) => (
                          <th key={i} style={{ padding: "8px 12px", borderRight: "1px solid #282536", textTransform: "none", fontWeight: "600" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ color: "#cbd5e1", background: "#161424" }}>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>1</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>7376231AD101</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Aarav Sharma</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>aarav.sharma@smartcampus.edu</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>AI&DS</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>B.Tech</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Bachelor of Technology</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>2023-2027</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>2</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>3</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>A</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Counselling</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Active</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>2027</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>9876543210</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>123456789012</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>2005-04-15</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>No</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>—</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Rajesh Sharma</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>9876500001</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>rajesh@gmail.com</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Engineer</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>1200000</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>123 Green Park</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>987654321098</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Sunita Sharma</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>9876500002</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>sunita@gmail.com</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Teacher</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>600000</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>876543210987</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>—</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>—</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>—</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>—</td>
                        <td style={{ padding: "8px 12px", borderRight: "1px solid #282536" }}>Student@123</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                style={{ display: "none" }}
              />

              <div
                onClick={triggerFileSelect}
                style={{
                  border: "2px dashed #4c3b7a",
                  borderRadius: "12px",
                  padding: "30px",
                  textAlign: "center",
                  background: "#161422",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <FileSpreadsheet size={36} style={{ color: "#a78bfa", marginBottom: "10px" }} />
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px" }}>Click to upload file (.xlsx, .csv)</h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                  Select an Excel or CSV spreadsheet formatted according to the template above
                </p>
              </div>

              {/* Message */}
              {importMessage && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    background: importMessage.startsWith("❌") || importMessage.includes("Error") ? "#3b171e" : "#172b21",
                    color: importMessage.startsWith("❌") || importMessage.includes("Error") ? "#fca5a5" : "#6ee7b7",
                    border: `1px solid ${importMessage.startsWith("❌") || importMessage.includes("Error") ? "#7f1d1d" : "#065f46"}`
                  }}
                >
                  {importMessage}
                </div>
              )}

              {/* Preview Table if rows loaded */}
              {importPreview.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ fontSize: "13px", marginBottom: "10px", color: "#e2e8f0" }}>
                    File Preview ({importPreview.length} Rows Ready to Import)
                  </h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #2b2938", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr style={{ background: "#1e1b2e", color: "#94a3b8", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px" }}>#</th>
                          <th style={{ padding: "8px 12px" }}>Reg No</th>
                          <th style={{ padding: "8px 12px" }}>Full Name</th>
                          <th style={{ padding: "8px 12px" }}>Email</th>
                          <th style={{ padding: "8px 12px" }}>Dept</th>
                          <th style={{ padding: "8px 12px" }}>Year/Sem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((r, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #262436", color: "#e2e8f0" }}>
                            <td style={{ padding: "8px 12px" }}>{i + 1}</td>
                            <td style={{ padding: "8px 12px" }}>{r["Student Reg No"] || r["register_number"] || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>{r["Student Full Name"] || r["name"] || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>{r["Student Email"] || r["email"] || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>{r["Dept"] || r["department"] || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>Y{r["Current Year"] || 1} / S{r["Current Sem"] || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 10 && (
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 0 0" }}>
                      Showing first 10 of {importPreview.length} rows...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="students-modal-actions">
              <button
                className="students-cancel-btn"
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Cancel
              </button>

              <button
                className="students-primary-btn"
                onClick={handleConfirmImport}
                disabled={importPreview.length === 0 || importing}
              >
                {importing ? "Importing Data..." : `Confirm Import (${importPreview.length} Students)`}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}