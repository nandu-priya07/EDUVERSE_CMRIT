import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Award,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bell
} from "lucide-react";
import "./studentattendance.css";
import StudentSidebar from "../components/StudentSidebar";

const subjects = [
  { code: "CS3501", name: "Artificial Intelligence", attended: 38, total: 42, color: "linear-gradient(90deg, #8b5cf6, #a78bfa)" },
  { code: "CS3502", name: "Machine Learning", attended: 34, total: 40, color: "linear-gradient(90deg, #10b981, #34d399)" },
  { code: "CS3503", name: "Database Management", attended: 29, total: 35, color: "linear-gradient(90deg, #3b82f6, #60a5fa)" },
  { code: "CS3504", name: "Cloud Computing", attended: 24, total: 32, color: "linear-gradient(90deg, #f59e0b, #fbbf24)" },
  { code: "CS3505", name: "Computer Networks", attended: 20, total: 30, color: "linear-gradient(90deg, #ef4444, #f87171)" },
];

const records = [
  { date: "Oct 03, 2026", subject: "Artificial Intelligence", code: "CS3501", time: "09:00 AM - 10:00 AM", status: "Present" },
  { date: "Oct 02, 2026", subject: "Machine Learning", code: "CS3502", time: "11:00 AM - 12:00 PM", status: "Present" },
  { date: "Oct 02, 2026", subject: "Cloud Computing", code: "CS3504", time: "02:00 PM - 03:00 PM", status: "Absent" },
  { date: "Oct 01, 2026", subject: "Database Management", code: "CS3503", time: "10:00 AM - 11:00 AM", status: "OD" },
  { date: "Sep 30, 2026", subject: "Computer Networks", code: "CS3505", time: "09:00 AM - 10:00 AM", status: "Present" },
  { date: "Sep 29, 2026", subject: "Artificial Intelligence", code: "CS3501", time: "11:00 AM - 12:00 PM", status: "Present" },
  { date: "Sep 29, 2026", subject: "Machine Learning", code: "CS3502", time: "02:00 PM - 03:00 PM", status: "Absent" },
];

const calendarDays = [
  { day: 1, status: "present" }, { day: 2, status: "present" },
  { day: 3, status: "present" }, { day: 4, status: "weekend" },
  { day: 5, status: "weekend" }, { day: 6, status: "present" },
  { day: 7, status: "absent" }, { day: 8, status: "present" },
  { day: 9, status: "present" }, { day: 10, status: "present" },
  { day: 11, status: "weekend" }, { day: 12, status: "weekend" },
  { day: 13, status: "present" }, { day: 14, status: "od" },
  { day: 15, status: "present" }, { day: 16, status: "present" },
  { day: 17, status: "absent" }, { day: 18, status: "weekend" },
  { day: 19, status: "weekend" }, { day: 20, status: "present" },
  { day: 21, status: "present" }, { day: 22, status: "present" },
  { day: 23, status: "present" }, { day: 24, status: "absent" },
  { day: 25, status: "weekend" }, { day: 26, status: "weekend" },
  { day: 27, status: "present" }, { day: 28, status: "present" },
  { day: 29, status: "present" }, { day: 30, status: "present" },
  { day: 31, status: "present" },
];

export default function StudentAttendance() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthIndex, setMonthIndex] = useState(9); // October (0-indexed 9)

  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    };
  };

  const user = getUserData();
  const studentName = user?.name || "Student";

  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalAbsent = totalClasses - totalAttended;
  const percentage = Math.round((totalAttended / totalClasses) * 100);

  const filteredRecords = records.filter(r => {
    const matchesFilter = filter === "All" || r.status === filter;
    const matchesSearch =
      r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="attendance-layout">
      {/* Reusable Unified Sidebar */}
      <StudentSidebar activeItem="Attendance" />

      {/* Main Content View */}
      <main className="attendance-main">
        {/* Top Navbar */}
        <header className="attendance-navbar">
          <div className="attendance-breadcrumb">
            <span>Pages</span>
            <span>/</span>
            <strong>Attendance</strong>
          </div>

          <div className="navbar-actions">
            <div className="search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search subject or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="nav-icon-btn" title="Notifications">
              <Bell size={17} />
              <span className="dot" />
            </button>

            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>{studentName}</strong>
                <span>Student</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="attendance-content">
          {/* Hero Banner Card */}
          <div className="attendance-hero-banner">
            <div className="hero-text-side">
              <span className="hero-eyebrow">
                <Clock size={13} /> ACADEMIC PERFORMANCE & ATTENDANCE
              </span>
              <h1>Attendance Summary</h1>
              <p>
                Monitor your class participation rate, subject breakdown, and monthly logs to maintain academic eligibility.
              </p>
            </div>

            <div className="hero-badge-side">
              <div className="eligibility-badge">
                <TrendingUp size={16} />
                <span>Eligibility Status</span>
                <strong>{percentage >= 75 ? "ELIGIBLE" : "ACTION REQUIRED"}</strong>
              </div>
            </div>
          </div>

          {/* Key Metrics Overview Grid */}
          <section className="attendance-overview-grid">
            {/* Circular Progress Overall Card */}
            <div className="overview-card main-rate-card">
              <div className="ring-container">
                <svg className="progress-ring" width="120" height="120">
                  <circle
                    className="progress-ring-bg"
                    stroke="#272138"
                    strokeWidth="10"
                    fill="transparent"
                    r="48"
                    cx="60"
                    cy="60"
                  />
                  <circle
                    className="progress-ring-fill"
                    stroke={percentage >= 75 ? "#8b5cf6" : "#f59e0b"}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - percentage / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    r="48"
                    cx="60"
                    cy="60"
                  />
                </svg>
                <div className="ring-text">
                  <strong>{percentage}%</strong>
                  <span>Overall</span>
                </div>
              </div>

              <div className="rate-info">
                <span className="rate-label">OVERALL ATTENDANCE</span>
                <h2>{percentage >= 75 ? "Great job! You're on track." : "Attendance needs attention"}</h2>
                <p>Attended <strong>{totalAttended}</strong> out of <strong>{totalClasses}</strong> total conducted classes.</p>
                
                <div className={`status-pill ${percentage >= 75 ? "safe" : "warning"}`}>
                  {percentage >= 75 ? (
                    <>
                      <CheckCircle2 size={14} /> Above minimum 75% criteria
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} /> Below minimum 75% criteria
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stat Box: Present */}
            <div className="overview-card stat-box green">
              <div className="stat-top">
                <div className="stat-icon-wrapper green">
                  <CheckCircle2 size={20} />
                </div>
                <span className="stat-trend green">+4% vs last month</span>
              </div>
              <p className="stat-label">Classes Attended</p>
              <h2 className="stat-value">{totalAttended}</h2>
              <small className="stat-sub">Present sessions recorded</small>
            </div>

            {/* Stat Box: Absent */}
            <div className="overview-card stat-box red">
              <div className="stat-top">
                <div className="stat-icon-wrapper red">
                  <XCircle size={20} />
                </div>
                <span className="stat-trend red">Missed</span>
              </div>
              <p className="stat-label">Classes Missed</p>
              <h2 className="stat-value">{totalAbsent}</h2>
              <small className="stat-sub">Unattended sessions</small>
            </div>

            {/* Stat Box: OD / Leave */}
            <div className="overview-card stat-box violet">
              <div className="stat-top">
                <div className="stat-icon-wrapper violet">
                  <Award size={20} />
                </div>
                <span className="stat-trend violet">On Duty</span>
              </div>
              <p className="stat-label">OD & Approved Leave</p>
              <h2 className="stat-value">2</h2>
              <small className="stat-sub">Official duty credits</small>
            </div>
          </section>

          {/* Middle Content Grid: Subject Breakdown & Attendance Calendar */}
          <section className="attendance-content-split">
            {/* Subject-Wise Breakdown Card */}
            <div className="content-card subject-card">
              <div className="card-header">
                <div>
                  <h3>Subject-wise Attendance</h3>
                  <p>Attendance percentage per enrolled course</p>
                </div>
                <span className="badge-pill">{subjects.length} Subjects</span>
              </div>

              <div className="subjects-list">
                {subjects.map((subj) => {
                  const rate = Math.round((subj.attended / subj.total) * 100);
                  const isLow = rate < 75;
                  return (
                    <div className="subject-row" key={subj.code}>
                      <div className="subject-info-top">
                        <div className="subject-title-box">
                          <span className="subject-code-tag">{subj.code}</span>
                          <strong>{subj.name}</strong>
                        </div>
                        <div className="subject-rate-box">
                          <span className={isLow ? "rate-low" : "rate-good"}>{rate}%</span>
                        </div>
                      </div>

                      <div className="subject-progress-track">
                        <div
                          className="subject-progress-bar"
                          style={{
                            width: `${rate}%`,
                            background: subj.color,
                          }}
                        />
                      </div>

                      <div className="subject-info-bottom">
                        <span>{subj.attended} / {subj.total} Sessions attended</span>
                        <span className={isLow ? "status-warning-text" : "status-safe-text"}>
                          {isLow ? "⚠ Action Required" : "✓ On Track"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance Calendar Card */}
            <div className="content-card calendar-card">
              <div className="card-header">
                <div>
                  <h3>Attendance Calendar</h3>
                  <p>Monthly session log visualization</p>
                </div>
                <div className="month-nav-controls">
                  <button
                    className="month-btn"
                    onClick={() => setMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="month-title">{monthsList[monthIndex]} 2026</span>
                  <button
                    className="month-btn"
                    onClick={() => setMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="calendar-week-row">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                  <span key={i} className="week-header-day">{day}</span>
                ))}
              </div>

              <div className="calendar-days-grid">
                {Array.from({ length: 4 }, (_, i) => (
                  <span key={`empty-${i}`} className="calendar-day-cell empty" />
                ))}
                {calendarDays.map((item) => (
                  <div
                    key={item.day}
                    className={`calendar-day-cell ${item.status} ${item.day === 3 ? "today" : ""}`}
                    title={`Oct ${item.day}: ${item.status.toUpperCase()}`}
                  >
                    <span>{item.day}</span>
                    {item.day === 3 && <span className="today-dot" />}
                  </div>
                ))}
              </div>

              <div className="calendar-legend-bar">
                <div className="legend-item">
                  <span className="legend-dot present" />
                  <span>Present</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot absent" />
                  <span>Absent</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot od" />
                  <span>OD / Leave</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot weekend" />
                  <span>Weekend</span>
                </div>
              </div>
            </div>
          </section>

          {/* Attendance History Table Card */}
          <section className="content-card history-card">
            <div className="card-header history-header">
              <div>
                <h3>Attendance History Logs</h3>
                <p>Detailed session records for recent lectures</p>
              </div>

              <div className="history-filters">
                <div className="table-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="filter-select-wrapper">
                  <Filter size={14} />
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Present">Present Only</option>
                    <option value="Absent">Absent Only</option>
                    <option value="OD">OD Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>COURSE CODE</th>
                    <th>SUBJECT NAME</th>
                    <th>SESSION TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec, i) => (
                    <tr key={i}>
                      <td>
                        <div className="date-cell">
                          <CalendarIcon size={14} className="cell-icon" />
                          <span>{rec.date}</span>
                        </div>
                      </td>
                      <td>
                        <span className="code-pill">{rec.code}</span>
                      </td>
                      <td>
                        <strong className="subject-name-cell">{rec.subject}</strong>
                      </td>
                      <td>
                        <div className="time-cell">
                          <Clock size={13} className="cell-icon" />
                          <span>{rec.time}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${rec.status.toLowerCase()}`}>
                          {rec.status === "Present" && <CheckCircle2 size={13} />}
                          {rec.status === "Absent" && <XCircle size={13} />}
                          {rec.status === "OD" && <Award size={13} />}
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-table-row">
                        No matching attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="attendance-footer">
            <span>© 2026 SmartCampus LMS</span>
            <span>Live Attendance Portal · Real-time Supabase Sync</span>
          </footer>
        </div>
      </main>
    </div>
  );
}