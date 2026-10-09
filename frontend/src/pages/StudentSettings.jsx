import React, { useState } from "react";
import "./studentsettings.css";
import StudentSidebar from "../components/StudentSidebar";

const StudentSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("English");

  const [notifications, setNotifications] = useState({
    assignments: true,
    announcements: true,
    results: true,
    reminders: false,
    email: true,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showActivity: false,
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const toggleNotification = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePrivacy = (key) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();

    if (password.new !== password.confirm) {
      alert("New passwords do not match!");
      return;
    }

    if (password.new.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    alert("Password change UI completed. Connect backend to save it.");

    setPassword({
      current: "",
      new: "",
      confirm: "",
    });
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      // Connect your authentication logout function here.
      alert("Connect Supabase signOut() here.");
    }
  };

  const tabs = [
    { id: "general", icon: "⚙", label: "General" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "appearance", icon: "🎨", label: "Appearance" },
    { id: "privacy", icon: "🔒", label: "Privacy & Security" },
    { id: "account", icon: "👤", label: "Account" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0c0a15" }}>
      <StudentSidebar activeItem="Settings" />
      <div className="settings-page" style={{ flex: 1, minWidth: 0 }}>
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">PREFERENCES</span>
          <h1>Settings</h1>
          <p>Manage your account preferences and application settings.</p>
        </div>

        <div className="settings-avatar">V</div>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <div className="settings-user">
            <div className="settings-user-avatar">V</div>
            <div>
              <h3>Vetrichelvan</h3>
              <p>Student Account</p>
            </div>
          </div>

          <div className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-nav-item ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && <span className="nav-arrow">›</span>}
              </button>
            ))}
          </div>

          <button className="settings-logout" onClick={handleLogout}>
            <span>↪</span> Log Out
          </button>
        </aside>

        {/* Main Content */}
        <main className="settings-content">
          {activeTab === "general" && (
            <section className="settings-section">
              <div className="section-heading">
                <div>
                  <h2>General Settings</h2>
                  <p>Manage your basic application preferences.</p>
                </div>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Language</h3>
                  <p>Choose your preferred application language.</p>
                </div>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="settings-select"
                >
                  <option>English</option>
                  <option>Tamil</option>
                  <option>Telugu</option>
                  <option>Hindi</option>
                </select>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Auto Save</h3>
                  <p>Automatically save your learning progress.</p>
                </div>
                <span className="enabled-label">Enabled</span>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Default Dashboard</h3>
                  <p>Choose the page displayed after login.</p>
                </div>

                <select className="settings-select" defaultValue="Dashboard">
                  <option>Dashboard</option>
                  <option>My Courses</option>
                  <option>AI Learning</option>
                </select>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="settings-section">
              <div className="section-heading">
                <h2>Notifications</h2>
                <p>Choose what updates you want to receive.</p>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Assignment Updates</h3>
                  <p>Get notified about new assignments and deadlines.</p>
                </div>
                <Toggle
                  checked={notifications.assignments}
                  onChange={() => toggleNotification("assignments")}
                />
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Announcements</h3>
                  <p>Receive updates from your faculty and department.</p>
                </div>
                <Toggle
                  checked={notifications.announcements}
                  onChange={() => toggleNotification("announcements")}
                />
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Results & Grades</h3>
                  <p>Get notified when examination results are published.</p>
                </div>
                <Toggle
                  checked={notifications.results}
                  onChange={() => toggleNotification("results")}
                />
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Study Reminders</h3>
                  <p>Receive reminders for your learning schedule.</p>
                </div>
                <Toggle
                  checked={notifications.reminders}
                  onChange={() => toggleNotification("reminders")}
                />
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Email Notifications</h3>
                  <p>Receive important updates through email.</p>
                </div>
                <Toggle
                  checked={notifications.email}
                  onChange={() => toggleNotification("email")}
                />
              </div>
            </section>
          )}

          {activeTab === "appearance" && (
            <section className="settings-section">
              <div className="section-heading">
                <h2>Appearance</h2>
                <p>Customize how SmartCampus looks on your device.</p>
              </div>

              <div className="theme-options">
                <button
                  className={`theme-card ${
                    theme === "dark" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="theme-preview dark-preview">
                    <div className="preview-sidebar"></div>
                    <div className="preview-content">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                  </div>
                  <div className="theme-label">
                    <span>Dark Mode</span>
                    <span>{theme === "dark" ? "✓" : ""}</span>
                  </div>
                </button>

                <button
                  className={`theme-card ${
                    theme === "light" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("light")}
                >
                  <div className="theme-preview light-preview">
                    <div className="preview-sidebar"></div>
                    <div className="preview-content">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                  </div>
                  <div className="theme-label">
                    <span>Light Mode</span>
                    <span>{theme === "light" ? "✓" : ""}</span>
                  </div>
                </button>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Accent Color</h3>
                  <p>SmartCampus primary color.</p>
                </div>
                <div className="accent-color">
                  <span></span>
                  Violet
                </div>
              </div>
            </section>
          )}

          {activeTab === "privacy" && (
            <section className="settings-section">
              <div className="section-heading">
                <h2>Privacy & Security</h2>
                <p>Control your profile visibility and account security.</p>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Public Profile</h3>
                  <p>Allow other students to view your profile.</p>
                </div>
                <Toggle
                  checked={privacy.showProfile}
                  onChange={() => togglePrivacy("showProfile")}
                />
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Learning Activity</h3>
                  <p>Allow others to see your learning activity.</p>
                </div>
                <Toggle
                  checked={privacy.showActivity}
                  onChange={() => togglePrivacy("showActivity")}
                />
              </div>

              <form className="password-card" onSubmit={handlePasswordChange}>
                <h3>Change Password</h3>
                <p>Update your account password securely.</p>

                <label>Current Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.current}
                  onChange={(e) =>
                    setPassword({ ...password, current: e.target.value })
                  }
                  placeholder="Enter current password"
                  required
                />

                <label>New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.new}
                  onChange={(e) =>
                    setPassword({ ...password, new: e.target.value })
                  }
                  placeholder="Enter new password"
                  required
                />

                <label>Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password.confirm}
                  onChange={(e) =>
                    setPassword({ ...password, confirm: e.target.value })
                  }
                  placeholder="Confirm new password"
                  required
                />

                <label className="show-password">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show passwords
                </label>

                <button className="primary-settings-btn" type="submit">
                  Update Password
                </button>
              </form>
            </section>
          )}

          {activeTab === "account" && (
            <section className="settings-section">
              <div className="section-heading">
                <h2>Account</h2>
                <p>View your account information.</p>
              </div>

              <div className="account-card">
                <div className="account-avatar">V</div>
                <div>
                  <h3>Vetrichelvan</h3>
                  <p>Student · SmartCampus LMS</p>
                  <span className="account-status">● Active Account</span>
                </div>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Account Type</h3>
                  <p>Student</p>
                </div>
              </div>

              <div className="settings-card">
                <div className="setting-info">
                  <h3>Application</h3>
                  <p>SmartCampus LMS</p>
                </div>
                <span className="version-label">v1.0.0</span>
              </div>

              <div className="danger-zone">
                <h3>Danger Zone</h3>
                <p>Logging out will end your current session.</p>
                <button onClick={handleLogout}>Log Out</button>
              </div>
            </section>
          )}

          <div className="settings-footer">
            <span>SmartCampus LMS</span>
            <span>Settings · v1.0.0</span>
          </div>
        </main>
      </div>
    </div>
  </div>
  );
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    className={`settings-toggle ${checked ? "on" : ""}`}
    onClick={onChange}
  >
    <span />
  </button>
);

export default StudentSettings;