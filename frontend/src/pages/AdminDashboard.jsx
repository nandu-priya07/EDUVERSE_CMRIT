import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Bell,
  Search,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Activity,
  Clock3,
  Plus,
  RefreshCw,
  LogOut,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

import "./AdminDashboard.css";
import AdminSidebar from "../components/AdminSidebar";

const API_URL = "http://localhost:5000/api";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Students", icon: Users, path: "/admin/students" },
  { label: "Faculty", icon: UserRound, path: "/admin/teachers" },
  { label: "Departments", icon: Building2, path: "/admin/departments" },
  { label: "Courses", icon: BookOpen, path: "/admin/courses" },
  { label: "Semesters", icon: CalendarDays, path: "/admin/semesters" },
  { label: "Enrollments", icon: ClipboardList, path: "/admin/enrollments" },
  { label: "Assignments", icon: ClipboardList, path: "/admin/assignments" },
  { label: "Quizzes", icon: Brain, path: "/admin/quizzes" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
];

const defaultStats = {
  totalStudents: 0,
  totalFaculty: 0,
  totalDepartments: 0,
  totalCourses: 0,
  activeStudents: 0,
  activeFaculty: 0,
  totalEnrollments: 0,
  publishedAssignments: 0,
  publishedQuizzes: 0,
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(defaultStats);
  const [departments, setDepartments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const adminName =
    localStorage.getItem("userName") || "Administrator";

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/admin/dashboard/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Session expired. Please login again."
            : response.status === 403
            ? "You do not have admin access."
            : "Failed to load dashboard data."
        );
      }

      const result = await response.json();
      const data = result.data || result;

      setStats({
        ...defaultStats,
        ...(data.stats || {}),
      });

      setDepartments(data.departments || []);
      setActivities(data.recentActivities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      subtitle: `${formatNumber(stats.activeStudents)} active`,
      icon: Users,
      color: "purple",
      path: "/admin/students",
    },
    {
      title: "Faculty Members",
      value: stats.totalFaculty,
      subtitle: `${formatNumber(stats.activeFaculty)} active`,
      icon: UserRound,
      color: "blue",
      path: "/admin/teachers",
    },
    {
      title: "Departments",
      value: stats.totalDepartments,
      subtitle: "Academic departments",
      icon: Building2,
      color: "green",
      path: "/admin/departments",
    },
    {
      title: "Total Courses",
      value: stats.totalCourses,
      subtitle: "Available courses",
      icon: BookOpen,
      color: "orange",
      path: "/admin/courses",
    },
  ];

  const secondaryStats = [
    {
      label: "Enrollments",
      value: stats.totalEnrollments,
      icon: GraduationCap,
      color: "purple",
    },
    {
      label: "Assignments",
      value: stats.publishedAssignments,
      icon: ClipboardList,
      color: "blue",
    },
    {
      label: "Published Quizzes",
      value: stats.publishedQuizzes,
      icon: Brain,
      color: "green",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const filteredDepartments = departments.filter((d) =>
    (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = activities.filter((a) =>
    (a.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.subtitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.actor || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">

      {/* Shared Admin Sidebar */}
      <AdminSidebar activeItem="Dashboard" />

      {/* Main */}
      <main className="admin-main">

        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div>
              <div className="admin-breadcrumb">
                Administration <ChevronRight size={13} /> Dashboard
              </div>
              <h1>Dashboard</h1>
            </div>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-search">
              <Search size={17} />
              <input
                placeholder="Search anything..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>

            <button className="admin-icon-btn" aria-label="Notifications">
              <Bell size={19} />
              <span className="admin-notification-dot" />
            </button>

            <div className="admin-top-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">

          <section className="admin-welcome">
            <div>
              <span className="admin-welcome-tag">
                <Activity size={14} /> OVERVIEW
              </span>

              <h2>Welcome back, {adminName.split(" ")[0]} 👋</h2>

              <p>
                Here's what's happening across your campus today.
              </p>
            </div>

            <button
              className="admin-refresh-btn"
              onClick={fetchDashboard}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "admin-spin" : ""}
              />
              Refresh
            </button>
          </section>

          {error && (
            <div className="admin-error">
              <div>
                <strong>Unable to load dashboard</strong>
                <p>{error}</p>
              </div>

              <button onClick={fetchDashboard}>Retry</button>
            </div>
          )}

          {/* Main Stats */}
          <section className="admin-stats-grid">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  className="admin-stat-card"
                  key={card.title}
                  onClick={() => handleNavigation(card.path)}
                >
                  <div className="admin-stat-top">
                    <div className={`admin-stat-icon ${card.color}`}>
                      <Icon size={21} />
                    </div>

                    <ArrowUpRight
                      size={17}
                      className="admin-stat-arrow"
                    />
                  </div>

                  <div className="admin-stat-value">
                    {loading ? (
                      <div className="admin-skeleton" />
                    ) : (
                      formatNumber(card.value)
                    )}
                  </div>

                  <div className="admin-stat-title">{card.title}</div>
                  <div className="admin-stat-subtitle">
                    {card.subtitle}
                  </div>
                </button>
              );
            })}
          </section>

          {/* Secondary Stats */}
          <section className="admin-secondary-grid">
            {secondaryStats.map((item) => {
              const Icon = item.icon;

              return (
                <div className="admin-secondary-card" key={item.label}>
                  <div className={`admin-secondary-icon ${item.color}`}>
                    <Icon size={19} />
                  </div>

                  <div className="admin-secondary-info">
                    <span>{item.label}</span>
                    <strong>
                      {loading ? "—" : formatNumber(item.value)}
                    </strong>
                  </div>

                  <MoreHorizontal size={19} className="admin-muted-icon" />
                </div>
              );
            })}
          </section>

          {/* Main Grid */}
          <section className="admin-dashboard-grid">

            {/* Department Chart */}
            <div className="admin-panel admin-department-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>Students by Department</h3>
                  <p>Department-wise student distribution</p>
                </div>

                <button
                  className="admin-panel-action"
                  onClick={() => handleNavigation("/admin/departments")}
                >
                  View all <ArrowUpRight size={15} />
                </button>
              </div>

              {loading ? (
                <div className="admin-chart-loading">Loading chart...</div>
              ) : filteredDepartments.length > 0 ? (
                <div className="admin-department-chart">
                  {filteredDepartments.map((department, index) => {
                    const maxStudents = Math.max(
                      ...filteredDepartments.map((d) => Number(d.student_count || 0)),
                      1
                    );

                    const count = Number(department.student_count || 0);
                    const percentage = (count / maxStudents) * 100;

                    return (
                      <div className="admin-bar-item" key={department.id || index}>
                        <div className="admin-bar-label">
                          <span>
                            {department.code || department.name}
                          </span>
                          <strong>{formatNumber(count)}</strong>
                        </div>

                        <div className="admin-bar-track">
                          <div
                            className={`admin-bar-fill bar-${index % 5}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-empty">
                  <Building2 size={30} />
                  <p>No department data available</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="admin-panel admin-quick-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Frequently used operations</p>
                </div>
              </div>

              <div className="admin-quick-actions">
                <button
                  onClick={() => handleNavigation("/admin/students")}
                >
                  <div className="quick-icon purple">
                    <Plus size={19} />
                  </div>
                  <div>
                    <strong>Add Student</strong>
                    <span>Create a student account</span>
                  </div>
                  <ChevronRight size={17} />
                </button>

                <button
                  onClick={() => handleNavigation("/admin/teachers")}
                >
                  <div className="quick-icon blue">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <strong>Add Faculty</strong>
                    <span>Register faculty member</span>
                  </div>
                  <ChevronRight size={17} />
                </button>

                <button
                  onClick={() => handleNavigation("/admin/courses")}
                >
                  <div className="quick-icon green">
                    <BookOpen size={19} />
                  </div>
                  <div>
                    <strong>Create Course</strong>
                    <span>Add academic course</span>
                  </div>
                  <ChevronRight size={17} />
                </button>

                <button
                  onClick={() => handleNavigation("/admin/enrollments")}
                >
                  <div className="quick-icon orange">
                    <ClipboardList size={19} />
                  </div>
                  <div>
                    <strong>Bulk Enrollment</strong>
                    <span>Assign students to courses</span>
                  </div>
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Grid */}
          <section className="admin-bottom-grid">

            <div className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>Recent Activity</h3>
                  <p>Latest system updates</p>
                </div>

                <button className="admin-dots-btn">
                  <MoreHorizontal size={19} />
                </button>
              </div>

              <div className="admin-activity-list">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity, index) => (
                    <div className="admin-activity-item" key={activity.id || index}>
                      <div className={`admin-activity-icon activity-${index % 4}`}>
                        {index % 2 === 0 ? (
                          <Users size={17} />
                        ) : (
                          <BookOpen size={17} />
                        )}
                      </div>

                      <div className="admin-activity-info">
                        <strong>{activity.title || activity.description}</strong>
                        <span>{activity.subtitle || activity.actor || "System activity"}</span>
                      </div>

                      <time>
                        {activity.created_at
                          ? new Date(activity.created_at).toLocaleDateString()
                          : "Recently"}
                      </time>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty">
                    <Clock3 size={28} />
                    <p>No recent activity available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-panel admin-system-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>System Overview</h3>
                  <p>Campus management summary</p>
                </div>
              </div>

              <div className="admin-system-item">
                <div className="admin-system-icon purple">
                  <Users size={18} />
                </div>
                <div className="admin-system-info">
                  <span>Student Accounts</span>
                  <strong>{formatNumber(stats.totalStudents)}</strong>
                </div>
              </div>

              <div className="admin-system-item">
                <div className="admin-system-icon blue">
                  <UserRound size={18} />
                </div>
                <div className="admin-system-info">
                  <span>Faculty Accounts</span>
                  <strong>{formatNumber(stats.totalFaculty)}</strong>
                </div>
              </div>

              <div className="admin-system-item">
                <div className="admin-system-icon green">
                  <BookOpen size={18} />
                </div>
                <div className="admin-system-info">
                  <span>Course Catalog</span>
                  <strong>{formatNumber(stats.totalCourses)}</strong>
                </div>
              </div>

              <div className="admin-system-status">
                <span className="admin-online-dot" />
                Dashboard connected
                <span className="admin-status-label">Live</span>
              </div>
            </div>
          </section>

          <footer className="admin-footer">
            <span>© 2026 SmartCampus LMS</span>
            <span>Administration Portal</span>
          </footer>
        </div>
      </main>
    </div>
  );
}