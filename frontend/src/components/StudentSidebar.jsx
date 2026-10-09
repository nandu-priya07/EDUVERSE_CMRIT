import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  Clock,
  Award,
  Brain,
  UserRound,
  Settings,
  GraduationCap,
  LogOut,
  X,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import "./StudentSidebar.css";

export const studentNavigation = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/studentdashboard" },
  { label: "My Courses", icon: BookOpen, path: "/student/courses" },
  { label: "Course Enrollment", icon: ClipboardList, path: "/student/course-enrollment" },
  { label: "Assignments", icon: FileText, path: "/student/assignments" },
  { label: "Attendance", icon: Clock, path: "/student/attendance" },
  { label: "Results", icon: Award, path: "/student/results" },
  { label: "AI Learning", icon: Brain, path: "/student/ai-learning", badge: "NEW" },
];

export const personalNavigation = [
  { label: "My Profile", icon: UserRound, path: "/student/profile" },
  { label: "Settings", icon: Settings, path: "/student/settings" },
];

export default function StudentSidebar({ activeItem }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Retrieve student name and info from localStorage
  const getUserData = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch {
      // fallback
    }
    return {
      name: localStorage.getItem("userName") || "Student",
      department: localStorage.getItem("department") || "AI&DS",
    };
  };

  const user = getUserData();
  const studentName = user?.name || "Student";
  const studentDept = user?.department || user?.degree || "AI&DS";

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="student-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`common-student-sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="student-brand">
          <div className="student-brand-icon">
            <GraduationCap size={23} />
          </div>

          <div className="student-brand-text">
            <h2>SmartCampus</h2>
            <span>Student Portal</span>
          </div>

          <button
            className="student-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        {/* Student Mini Profile */}
        <div className="student-profile-mini">
          <div className="student-avatar-mini">
            {studentName.charAt(0).toUpperCase()}
          </div>

          <div className="student-profile-info">
            <strong>{studentName}</strong>
            <span>{studentDept}</span>
          </div>
        </div>

        {/* Main Workspace Navigation */}
        <div className="student-nav-label">MAIN MENU</div>

        <nav className="student-nav">
          {studentNavigation.map((item) => {
            const Icon = item.icon;
            const isPathActive =
              location.pathname === item.path ||
              (item.path === "/studentdashboard" && location.pathname === "/student-dashboard");
            const active = activeItem === item.label || isPathActive;

            return (
              <button
                key={item.label}
                className={`student-nav-item ${active ? "active" : ""}`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
                {active && <ChevronRight size={15} className="active-arrow" />}
              </button>
            );
          })}
        </nav>

        {/* Personal Settings Section */}
        <div className="student-nav-label student-preferences">PERSONAL</div>

        <nav className="student-nav">
          {personalNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              activeItem === item.label || location.pathname === item.path;

            return (
              <button
                key={item.label}
                className={`student-nav-item ${active ? "active" : ""}`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <ChevronRight size={15} className="active-arrow" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer & Logout */}
        <div className="student-sidebar-footer">
          <div className="student-help-box">
            <HelpCircle size={16} className="help-icon" />
            <div>
              <strong>Need Help?</strong>
              <small>Contact Faculty Advisor</small>
            </div>
          </div>

          <button className="student-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
