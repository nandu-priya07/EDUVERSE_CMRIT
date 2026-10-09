import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./studentprofile.css";
import StudentSidebar from "../components/StudentSidebar";

function StudentProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch student profile dynamically from backend for the authenticated user
  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/student/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load student profile");
      }

      const p = data.profile;
      setProfile(p);

      // Populate form data for editing
      setFormData({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        dateOfBirth: p.dateOfBirth || "",
        degree: p.degree || "",
        year: p.year || "",
        semester: p.semester || "",
        section: p.section || "",
        department: p.department || "",
        registerNumber: p.registerNumber || "",
        fatherName: p.father?.name || "",
        fatherPhone: p.father?.phone || "",
        fatherEmail: p.father?.email || "",
        fatherOccupation: p.father?.occupation || "",
        fatherAddress: p.father?.address || "",
        motherName: p.mother?.name || "",
        motherPhone: p.mother?.phone || "",
        motherEmail: p.mother?.email || "",
        motherOccupation: p.mother?.occupation || "",
        motherAddress: p.mother?.address || "",
      });

      localStorage.setItem("user", JSON.stringify(p));
    } catch (err) {
      console.error("Fetch profile error:", err);
      setError(err.message || "Could not fetch profile from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setProfile(data.profile);
      localStorage.setItem("user", JSON.stringify(data.profile));
      setEditing(false);
      setSuccessMsg("✓ Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        degree: profile.degree || "",
        year: profile.year || "",
        semester: profile.semester || "",
        section: profile.section || "",
        department: profile.department || "",
        registerNumber: profile.registerNumber || "",
        fatherName: profile.father?.name || "",
        fatherPhone: profile.father?.phone || "",
        fatherEmail: profile.father?.email || "",
        fatherOccupation: profile.father?.occupation || "",
        fatherAddress: profile.father?.address || "",
        motherName: profile.mother?.name || "",
        motherPhone: profile.mother?.phone || "",
        motherEmail: profile.mother?.email || "",
        motherOccupation: profile.mother?.occupation || "",
        motherAddress: profile.mother?.address || "",
      });
    }
    setEditing(false);
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Calculate dynamic completion %
  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.dateOfBirth,
      profile.degree,
      profile.department,
      profile.registerNumber,
      profile.year,
      profile.semester,
      profile.section,
      profile.father?.name,
      profile.mother?.name,
    ];
    const filled = fields.filter((f) => f !== null && f !== undefined && String(f).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPct = calculateCompletion();

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "ST";

  return (
    <div className="student-profile-page">
      {/* Sidebar */}
      <StudentSidebar activeItem="My Profile" />

      {/* Main Content */}
      <main className="profile-main">
        {/* Navbar */}
        <header className="profile-navbar">
          <div className="profile-breadcrumb">
            <span>Pages</span>
            <span>/</span>
            <strong>My Profile</strong>
          </div>

          <div className="profile-navbar-user">
            <div className="profile-navbar-avatar">{initials}</div>
            <div>
              <strong>{profile?.name || "Student"}</strong>
              <span>{profile?.role || "Student"}</span>
            </div>
          </div>
        </header>

        <div className="profile-content">
          {/* Status Messages */}
          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              padding: "0.85rem 1.25rem",
              borderRadius: "10px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem"
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              backgroundColor: "rgba(32, 180, 134, 0.15)",
              border: "1px solid rgba(32, 180, 134, 0.4)",
              color: "#65d9a8",
              padding: "0.85rem 1.25rem",
              borderRadius: "10px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem"
            }}>
              {successMsg}
            </div>
          )}

          {/* Page Heading */}
          <div className="profile-page-heading">
            <div>
              <h1>My Profile</h1>
              <p>Official profile details for: <strong>{profile?.email || "Logged-in User"}</strong></p>
            </div>

            {!editing ? (
              <button
                className="profile-edit-btn"
                onClick={() => setEditing(true)}
                disabled={loading}
              >
                ✎ &nbsp; Edit Profile
              </button>
            ) : (
              <div className="profile-action-buttons">
                <button
                  className="profile-cancel-btn"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="profile-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "✓ Save Changes"}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{
              textAlign: "center",
              padding: "4rem 2rem",
              color: "#94a3b8",
              fontSize: "1.1rem"
            }}>
              Loading profile data for logged-in user...
            </div>
          ) : (
            <>
              {/* Profile Hero Card */}
              <section className="profile-hero-card">
                <div className="profile-cover"></div>

                <div className="profile-hero-body">
                  <div className="profile-large-avatar">{initials}</div>

                  <div className="profile-hero-details">
                    <h2>{profile?.name || "Student"}</h2>
                    <p>{profile?.email || ""}</p>

                    <div className="profile-tags">
                      <span>🎓 {profile?.department || "Department Not Set"}</span>
                      <span>Reg No: {profile?.registerNumber || "N/A"}</span>
                      <span>● Active User</span>
                    </div>
                  </div>

                  <div className="profile-completion">
                    <div className="completion-top">
                      <span>Profile Completion</span>
                      <strong>{completionPct}%</strong>
                    </div>
                    <div className="completion-track">
                      <div style={{ width: `${completionPct}%` }}></div>
                    </div>
                    <p>Keep your profile details up to date</p>
                  </div>
                </div>
              </section>

              {/* Information Grid */}
              <div className="profile-information-grid">
                {/* Personal Information */}
                <section className="profile-info-card">
                  <div className="profile-card-heading">
                    <div className="profile-heading-icon purple">♙</div>
                    <div>
                      <h3>Personal Details</h3>
                      <p>Your basic contact & personal details</p>
                    </div>
                  </div>

                  <div className="profile-fields-grid">
                    <div className="profile-field">
                      <label>Full Name</label>
                      {editing ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Full Name"
                        />
                      ) : (
                        <div className="field-value">{profile?.name || "Not provided"}</div>
                      )}
                    </div>

                    <div className="profile-field">
                      <label>Email Address</label>
                      <div className="field-value">{profile?.email || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Phone Number</label>
                      {editing ? (
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Phone Number"
                        />
                      ) : (
                        <div className="field-value">{profile?.phone || "Not provided"}</div>
                      )}
                    </div>

                    <div className="profile-field">
                      <label>Date of Birth</label>
                      {editing ? (
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                        />
                      ) : (
                        <div className="field-value">{profile?.dateOfBirth || "Not provided"}</div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Academic Information */}
                <section className="profile-info-card">
                  <div className="profile-card-heading">
                    <div className="profile-heading-icon blue">🎓</div>
                    <div>
                      <h3>Academic Details</h3>
                      <p>Official course & registration details</p>
                    </div>
                  </div>

                  <div className="profile-fields-grid">
                    <div className="profile-field">
                      <label>Register Number</label>
                      <div className="field-value">{profile?.registerNumber || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Department</label>
                      <div className="field-value">{profile?.department || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Degree Program</label>
                      {editing ? (
                        <input
                          type="text"
                          name="degree"
                          value={formData.degree}
                          onChange={handleChange}
                          placeholder="Degree Program"
                        />
                      ) : (
                        <div className="field-value">{profile?.degree || "Not provided"}</div>
                      )}
                    </div>

                    <div className="profile-field">
                      <label>Year / Semester / Section</label>
                      {editing ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="number"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            placeholder="Year"
                            min="1"
                            max="4"
                          />
                          <input
                            type="number"
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            placeholder="Sem"
                            min="1"
                            max="8"
                          />
                          <input
                            type="text"
                            name="section"
                            value={formData.section}
                            onChange={handleChange}
                            placeholder="Sec"
                          />
                        </div>
                      ) : (
                        <div className="field-value">
                          Year {profile?.year || "-"} · Sem {profile?.semester || "-"} · Sec {profile?.section || "-"}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Family / Guardian Details Card */}
              <section className="profile-info-card account-card">
                <div className="profile-card-heading">
                  <div className="profile-heading-icon green">👨‍👩‍👦</div>
                  <div>
                    <h3>Guardian Information</h3>
                    <p>Parent & emergency contact details</p>
                  </div>
                </div>

                <div className="profile-fields-grid">
                  {/* Father Details */}
                  <div className="profile-field">
                    <label>Father's Name</label>
                    {editing ? (
                      <input
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleChange}
                        placeholder="Father Name"
                      />
                    ) : (
                      <div className="field-value">{profile?.father?.name || "Not provided"}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label>Father's Phone</label>
                    {editing ? (
                      <input
                        type="text"
                        name="fatherPhone"
                        value={formData.fatherPhone}
                        onChange={handleChange}
                        placeholder="Father Phone"
                      />
                    ) : (
                      <div className="field-value">{profile?.father?.phone || "Not provided"}</div>
                    )}
                  </div>

                  {/* Mother Details */}
                  <div className="profile-field">
                    <label>Mother's Name</label>
                    {editing ? (
                      <input
                        type="text"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleChange}
                        placeholder="Mother Name"
                      />
                    ) : (
                      <div className="field-value">{profile?.mother?.name || "Not provided"}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label>Mother's Phone</label>
                    {editing ? (
                      <input
                        type="text"
                        name="motherPhone"
                        value={formData.motherPhone}
                        onChange={handleChange}
                        placeholder="Mother Phone"
                      />
                    ) : (
                      <div className="field-value">{profile?.mother?.phone || "Not provided"}</div>
                    )}
                  </div>
                </div>
              </section>

              {/* Account Information Card */}
              <section className="profile-info-card account-card">
                <div className="profile-card-heading">
                  <div className="profile-heading-icon blue">♧</div>
                  <div>
                    <h3>Account Metadata</h3>
                    <p>Your unique account identifier & role</p>
                  </div>
                </div>

                <div className="account-details-grid">
                  <div>
                    <span>Account Role</span>
                    <strong>{profile?.role || "Student"}</strong>
                  </div>

                  <div>
                    <span>Account Status</span>
                    <strong className="account-active">● Active</strong>
                  </div>

                  <div>
                    <span>Unique User ID</span>
                    <strong>{profile?.uid || "N/A"}</strong>
                  </div>
                </div>
              </section>

              <footer className="profile-footer">
                <span>© 2026 SmartCampus LMS</span>
                <span>User Profile for {profile?.email}</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentProfile;