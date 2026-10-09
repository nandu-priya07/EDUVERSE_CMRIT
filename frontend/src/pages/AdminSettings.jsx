import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, UserRound, Building2, BookOpen,
  CalendarDays, ClipboardList, Brain, BarChart3, Settings,
  ShieldCheck, GraduationCap, RotateCcw, Save, CheckCircle2,
  AlertTriangle, Wrench, ToggleLeft, ToggleRight
} from "lucide-react";
import "./AdminSettings.css";
import AdminSidebar from "../components/AdminSidebar";

const defaultSettings = {
  enrollmentEnabled: true,
  studentRegistration: false,
  teacherRegistration: false,
  assessmentsEnabled: true,
  assignmentsEnabled: true,
  studyMaterialsEnabled: true,
  aiFeaturesEnabled: true,
  aiComicGeneration: true,
  aiVideoGeneration: false,
  notificationsEnabled: true,
  maintenanceMode: false,
  enrollmentApproval: false,
  maxCredits: 24,
  academicYear: "2026-2027",
  currentSemester: "5",
  enrollmentStart: "",
  enrollmentEnd: "",
};

const settingGroups = [
  {
    title: "Academic Management",
    description: "Control academic activities and student access.",
    icon: BookOpen,
    settings: [
      {
        key: "enrollmentEnabled",
        title: "Course Enrollment",
        description: "Allow students to enroll in available courses.",
        danger: false,
      },
      {
        key: "enrollmentApproval",
        title: "Manual Enrollment Approval",
        description: "Require admin or HOD approval for enrollments.",
      },
      {
        key: "assessmentsEnabled",
        title: "Assessments & Quizzes",
        description: "Enable online tests, quizzes, and examinations.",
      },
      {
        key: "assignmentsEnabled",
        title: "Assignments",
        description: "Allow instructors to publish assignments and students to submit them.",
      },
      {
        key: "studyMaterialsEnabled",
        title: "Study Materials",
        description: "Enable access to notes, PDFs, and learning resources.",
      },
    ],
  },
  {
    title: "User Management",
    description: "Manage account creation and access.",
    icon: Users,
    settings: [
      {
        key: "studentRegistration",
        title: "Student Registration",
        description: "Allow student account registration.",
      },
      {
        key: "teacherRegistration",
        title: "Teacher Registration",
        description: "Allow teacher account registration.",
      },
    ],
  },
  {
    title: "AI Features",
    description: "Configure AI-powered learning tools.",
    icon: Brain,
    settings: [
      {
        key: "aiFeaturesEnabled",
        title: "AI Learning Assistant",
        description: "Enable AI-powered learning features across SmartCampus.",
      },
      {
        key: "aiComicGeneration",
        title: "AI Comic Generation",
        description: "Allow students to generate educational comics.",
      },
      {
        key: "aiVideoGeneration",
        title: "AI Video Generation",
        description: "Enable AI-generated educational videos.",
      },
    ],
  },
  {
    title: "System Configuration",
    description: "Control notifications and platform availability.",
    icon: Settings,
    settings: [
      {
        key: "notificationsEnabled",
        title: "System Notifications",
        description: "Enable platform-wide announcements and notifications.",
      },
      {
        key: "maintenanceMode",
        title: "Maintenance Mode",
        description: "Restrict normal platform access during maintenance.",
        danger: true,
      },
    ],
  },
];

function Toggle({ checked, onChange, danger }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`setting-toggle ${checked ? "enabled" : ""} ${
        danger && checked ? "danger-toggle" : ""
      }`}
    >
      <span />
    </button>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  const adminName = localStorage.getItem("userName") || "Administrator";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("smartcampus-admin-settings");
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {
      console.error("Unable to load settings");
    }
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(
      "smartcampus-admin-settings",
      JSON.stringify(settings)
    );
    setSaved(true);
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings to default values?")) {
      setSettings(defaultSettings);
      localStorage.removeItem("smartcampus-admin-settings");
      setSaved(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="Settings" />

      {/* Main Content */}
      <main className="admin-settings-main">
        <header className="admin-settings-header">
          <div>
            <p className="admin-breadcrumb">Administration / Settings</p>
            <h1>System Settings</h1>
            <p className="admin-header-description">
              Manage platform features, academic policies, and system access.
            </p>
          </div>

          <div className="admin-header-actions">
            <button className="reset-btn" onClick={handleReset}>
              <RotateCcw size={15} />
              Reset
            </button>
            <button className="save-btn" onClick={handleSave}>
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </header>


        {saved && (
          <div className="save-success">
            ✓ Settings saved in this browser.
          </div>
        )}

        {settings.maintenanceMode && (
          <div className="maintenance-warning">
            ⚠ Maintenance mode is enabled. Normal platform access should be
            restricted by your backend.
          </div>
        )}

        <section className="settings-overview">
          <div className="overview-card">
            <div className="overview-icon purple-icon">⚙</div>
            <div>
              <p>Platform Status</p>
              <h3>{settings.maintenanceMode ? "Maintenance" : "Operational"}</h3>
            </div>
            <span
              className={`status-dot ${
                settings.maintenanceMode ? "offline" : ""
              }`}
            />
          </div>

          <div className="overview-card">
            <div className="overview-icon green-icon">▣</div>
            <div>
              <p>Course Enrollment</p>
              <h3>{settings.enrollmentEnabled ? "Enabled" : "Disabled"}</h3>
            </div>
            <span
              className={`status-dot ${
                !settings.enrollmentEnabled ? "offline" : ""
              }`}
            />
          </div>

          <div className="overview-card">
            <div className="overview-icon blue-icon">✦</div>
            <div>
              <p>AI Services</p>
              <h3>{settings.aiFeaturesEnabled ? "Active" : "Disabled"}</h3>
            </div>
            <span
              className={`status-dot ${
                !settings.aiFeaturesEnabled ? "offline" : ""
              }`}
            />
          </div>
        </section>

        <section className="academic-config">
          <div className="config-heading">
            <div>
              <h2>Academic Configuration</h2>
              <p>Set the current academic period and enrollment limits.</p>
            </div>
            <span className="config-icon">▤</span>
          </div>

          <div className="config-grid">
            <label>
              Academic Year
              <select
                value={settings.academicYear}
                onChange={(e) =>
                  updateSetting("academicYear", e.target.value)
                }
              >
                <option value="2025-2026">2025–2026</option>
                <option value="2026-2027">2026–2027</option>
                <option value="2027-2028">2027–2028</option>
              </select>
            </label>

            <label>
              Current Semester
              <select
                value={settings.currentSemester}
                onChange={(e) =>
                  updateSetting("currentSemester", e.target.value)
                }
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Maximum Credits
              <input
                type="number"
                min="1"
                max="40"
                value={settings.maxCredits}
                onChange={(e) =>
                  updateSetting("maxCredits", Number(e.target.value))
                }
              />
            </label>

            <label>
              Enrollment Start Date
              <input
                type="date"
                value={settings.enrollmentStart}
                onChange={(e) =>
                  updateSetting("enrollmentStart", e.target.value)
                }
              />
            </label>

            <label>
              Enrollment End Date
              <input
                type="date"
                value={settings.enrollmentEnd}
                onChange={(e) =>
                  updateSetting("enrollmentEnd", e.target.value)
                }
              />
            </label>
          </div>
        </section>

        {settingGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section className="settings-group" key={group.title}>
              <div className="group-heading">
                <div className="group-icon">
                  <GroupIcon size={19} />
                </div>
                <div>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
              </div>

            <div className="settings-list">
              {group.settings.map((item) => (
                <div className="setting-row" key={item.key}>
                  <div className="setting-info">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>

                  <div className="setting-control">
                    <span
                      className={`setting-state ${
                        settings[item.key] ? "state-on" : "state-off"
                      }`}
                    >
                      {settings[item.key] ? "Enabled" : "Disabled"}
                    </span>

                    <Toggle
                      checked={settings[item.key]}
                      danger={item.danger}
                      onChange={() =>
                        updateSetting(item.key, !settings[item.key])
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            </section>
          );
        })}

        <footer className="settings-footer">
          <span>SmartCampus LMS · Admin Configuration</span>
          <button className="save-btn" onClick={handleSave}>
            Save All Settings
          </button>
        </footer>
      </main>
    </div>
  );
}