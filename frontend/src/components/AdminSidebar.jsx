import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserRound,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Brain,
  BarChart3,
  Settings,
  ShieldCheck,
  GraduationCap,
  Award,
  ChevronRight,
  LogOut,
  X,
  UserCheck,
  Clock,
} from "lucide-react";

export const adminNavigation = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Students", icon: Users, path: "/admin/students" },
  { label: "Faculty", icon: UserRound, path: "/admin/teachers" },
  { label: "Departments", icon: Building2, path: "/admin/departments" },
  { label: "Courses", icon: BookOpen, path: "/admin/courses" },
  { label: "Timetable", icon: Clock, path: "/admin/timetable" },
  { label: "Assignments", icon: UserCheck, path: "/admin/course-assignments" },
  { label: "Results", icon: Award, path: "/admin/results" },
  { label: "Semesters", icon: CalendarDays, path: "/admin/semesters" },
  { label: "Enrollments", icon: ClipboardList, path: "/admin/enrollment" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
];

export default function AdminSidebar({ activeItem }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminName = localStorage.getItem("userName") || "Administrator";

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="admin-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <GraduationCap size={23} />
          </div>

          <div className="admin-brand-text">
            <h2>SmartCampus</h2>
            <span>Administration</span>
          </div>

          <button
            className="admin-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="admin-profile-mini">
          <div className="admin-avatar">
            {adminName.charAt(0).toUpperCase()}
          </div>

          <div className="admin-profile-info">
            <strong>{adminName}</strong>
            <span>Administrator</span>
          </div>

          <ShieldCheck size={17} className="admin-shield" />
        </div>

        <div className="admin-nav-label">WORKSPACE</div>

        <nav className="admin-nav">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              activeItem === item.label ||
              location.pathname === item.path;

            return (
              <button
                key={item.label}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <ChevronRight size={15} />}
              </button>
            );
          })}
        </nav>

        <div className="admin-nav-label admin-preferences">
          PREFERENCES
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${
              activeItem === "Settings" || location.pathname === "/admin/settings"
                ? "active"
                : ""
            }`}
            onClick={() => handleNavigation("/admin/settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
            {(activeItem === "Settings" || location.pathname === "/admin/settings") && (
              <ChevronRight size={15} />
            )}
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-footer-status">
            <span className="admin-online-dot" />
            System Operational
          </div>

          <button
            className="admin-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
