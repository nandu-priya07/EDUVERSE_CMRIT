
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./teacherprofile.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialProfile = {
  fullName: "",
  email: "",
  employeeId: "",
  phone: "",
  alternatePhone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  designation: "",
  department: "",
  qualification: "",
  specialization: "",
  experienceYears: "",
  joiningDate: "",
  employmentType: "",
  officeLocation: "",
  profileImage: "",
  bio: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
};

export default function TeacherProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setError("No active session found. Please login.");
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch(`${API_URL}/api/teacher/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(result.message || "Unauthorized access. Session expired.");
        }
        throw new Error(result.message || "Failed to load profile");
      }

      setProfile({
        ...initialProfile,
        ...result.data,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch(`${API_URL}/api/teacher/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(profile),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile");
      }

      setProfile({
        ...initialProfile,
        ...result.data,
      });

      setEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    fetchProfile();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getInitials = () => {
    return (
      profile.fullName
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase() || "T"
    );
  };

  const Field = ({ label, name, type = "text", options }) => (
    <div className="tp-field">
      <label>{label}</label>

      {options ? (
        <select
          name={name}
          value={profile[name] || ""}
          onChange={handleChange}
          disabled={!editing}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={profile[name] ?? ""}
          onChange={handleChange}
          disabled={!editing}
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="tp-loading">
        <div className="tp-spinner" />
        <p>Loading teacher profile...</p>
      </div>
    );
  }

  return (
    <div className="tp-page">
      <aside className="tp-sidebar">
        <div className="tp-brand">
          <div className="tp-logo">S</div>
          <div>
            <h2>SmartCampus</h2>
            <span>Teacher Portal</span>
          </div>
        </div>

        <p className="tp-nav-label">WORKSPACE</p>

        <nav className="tp-nav">
          <button onClick={() => navigate("/teacher-dashboard")}>
            <span>▦</span> Dashboard
          </button>
          <button onClick={() => navigate("/teacher/courses")}>
            <span>▤</span> My Courses
          </button>
          <button onClick={() => navigate("/teacher/students")}>
            <span>♙</span> Students
          </button>
          <button onClick={() => navigate("/teacher/assignments")}>
            <span>▧</span> Assignments
          </button>
          <button onClick={() => navigate("/teacher/assessments")}>
            <span>☑</span> Assessments
          </button>
          <button onClick={() => navigate("/teacher/attendance")}>
            <span>◷</span> Attendance
          </button>
          <button onClick={() => navigate("/teacher/analytics")}>
            <span>▥</span> Analytics
          </button>
          <button onClick={() => navigate("/teacher/ai-tools")}>
            <span>✦</span> AI Teaching Tools
          </button>
        </nav>

        <div className="tp-sidebar-bottom">
          <button className="active">
            ⚙ My Profile
          </button>
          <button onClick={() => navigate("/teacher/settings")}>
            ⚙ Settings
          </button>
          <button onClick={handleLogout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="tp-main">
        <header className="tp-header">
          <div>
            <span className="tp-eyebrow">ACCOUNT / PROFILE</span>
            <h1>My Profile</h1>
            <p>Manage your personal and professional information.</p>
          </div>

          <div className="tp-header-avatar">
            {getInitials()}
          </div>
        </header>

        {error && <div className="tp-alert error">{error}</div>}
        {success && <div className="tp-alert success">{success}</div>}

        <section className="tp-profile-card">
          <div className="tp-profile-avatar">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt="Teacher profile"
              />
            ) : (
              getInitials()
            )}
          </div>

          <div className="tp-profile-info">
            <h2>{profile.fullName || "Teacher Name"}</h2>
            <p>{profile.designation || "Faculty Member"}</p>
            <span>{profile.department || "Department not assigned"}</span>
            <div className="tp-profile-meta">
              <span>✉ {profile.email || "Email unavailable"}</span>
              <span>♙ {profile.employeeId || "Employee ID pending"}</span>
            </div>
          </div>

          <div className="tp-profile-actions">
            {!editing ? (
              <button
                className="tp-edit-btn"
                onClick={() => setEditing(true)}
              >
                ✎ Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="tp-cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="tp-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </section>

        <div className="tp-content">
          <section className="tp-section">
            <div className="tp-section-heading">
              <div className="tp-section-icon">♙</div>
              <div>
                <h2>Personal Information</h2>
                <p>Your basic identity details</p>
              </div>
            </div>

            <div className="tp-grid">
              <Field label="Full Name" name="fullName" />
              <Field label="Email Address" name="email" />
              <Field label="Phone Number" name="phone" />
              <Field label="Alternate Phone" name="alternatePhone" />
              <Field label="Date of Birth" name="dateOfBirth" type="date" />
              <Field
                label="Gender"
                name="gender"
                options={["Male", "Female", "Other", "Prefer not to say"]}
              />
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-section-heading">
              <div className="tp-section-icon">⌖</div>
              <div>
                <h2>Address Information</h2>
                <p>Your residential details</p>
              </div>
            </div>

            <div className="tp-grid">
              <div className="tp-field tp-full">
                <label>Address</label>
                <textarea
                  name="address"
                  value={profile.address || ""}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                />
              </div>

              <Field label="City" name="city" />
              <Field label="State" name="state" />
              <Field label="Pincode" name="pincode" />
              <Field label="Country" name="country" />
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-section-heading">
              <div className="tp-section-icon">▤</div>
              <div>
                <h2>Professional Information</h2>
                <p>Your academic and employment details</p>
              </div>
            </div>

            <div className="tp-grid">
              <Field label="Employee ID" name="employeeId" />
              <Field label="Designation" name="designation" />
              <Field label="Department" name="department" />
              <Field label="Qualification" name="qualification" />
              <Field label="Specialization" name="specialization" />
              <Field
                label="Experience (Years)"
                name="experienceYears"
                type="number"
              />
              <Field label="Joining Date" name="joiningDate" type="date" />
              <Field
                label="Employment Type"
                name="employmentType"
                options={["Permanent", "Contract", "Temporary", "Visiting"]}
              />
              <Field label="Office Location" name="officeLocation" />
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-section-heading">
              <div className="tp-section-icon">✦</div>
              <div>
                <h2>About Me</h2>
                <p>A short introduction about yourself</p>
              </div>
            </div>

            <div className="tp-field">
              <label>Professional Bio</label>
              <textarea
                name="bio"
                value={profile.bio || ""}
                onChange={handleChange}
                disabled={!editing}
                rows={4}
                placeholder="Write a short professional introduction..."
              />
            </div>

            <div className="tp-field tp-image-field">
              <label>Profile Image URL</label>
              <input
                name="profileImage"
                value={profile.profileImage || ""}
                onChange={handleChange}
                disabled={!editing}
                placeholder="https://example.com/profile.jpg"
              />
            </div>
          </section>

          <section className="tp-section">
            <div className="tp-section-heading">
              <div className="tp-section-icon">♡</div>
              <div>
                <h2>Emergency Contact</h2>
                <p>Contact information for emergencies</p>
              </div>
            </div>

            <div className="tp-grid">
              <Field
                label="Contact Person"
                name="emergencyContactName"
              />
              <Field
                label="Contact Phone"
                name="emergencyContactPhone"
              />
              <Field
                label="Relationship"
                name="emergencyContactRelation"
                options={["Father", "Mother", "Spouse", "Sibling", "Other"]}
              />
            </div>
          </section>
        </div>

        <footer className="tp-footer">
          SmartCampus LMS · Teacher Profile
        </footer>
      </main>
    </div>
  );
}