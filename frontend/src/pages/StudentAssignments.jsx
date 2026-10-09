
import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./studentassignments.css";
import StudentSidebar from "../components/StudentSidebar";

function StudentAssignments() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  
  const [submissionText, setSubmissionText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchStudentAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/student/assignments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setAssignments(data.data || []);
      } else {
        setError(data.message || "Failed to load student assignments.");
      }
    } catch (err) {
      console.error("Error fetching student assignments:", err);
      setError("Server connection error while loading assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentAssignments();
  }, []);

  const getAssignmentStatus = (item) => {
    const rawSubStatus = (item.submission_status || item.submission?.status || "").toLowerCase();
    const rawStatus = (item.status || "").toLowerCase();

    if (rawSubStatus === "graded" || rawStatus === "graded") {
      return "graded";
    }
    if (item.submission || rawSubStatus === "submitted" || rawSubStatus === "late" || rawStatus === "submitted") {
      return "submitted";
    }

    const now = new Date();
    const rawDue = item.due_at || item.dueAt || item.due_date;
    const dueTime = rawDue ? new Date(rawDue).getTime() : NaN;
    const isPastDue = !isNaN(dueTime) && now.getTime() > dueTime;

    if (item.is_overdue || (isPastDue && rawStatus !== "closed")) {
      return "overdue";
    }

    return "pending";
  };

  const getItemCategory = (item) => {
    const now = new Date();
    const rawDue = item.due_at || item.dueAt || item.due_date;
    const rawStart = item.start_at || item.startAt || item.start_date;
    const dueTime = rawDue ? new Date(rawDue).getTime() : NaN;
    const startTime = rawStart ? new Date(rawStart).getTime() : NaN;

    if (item.status === "closed" || item.status === "Closed" || (!isNaN(dueTime) && now.getTime() > dueTime)) {
      return "closed";
    }
    if (!isNaN(startTime) && now.getTime() < startTime) {
      return "upcoming";
    }
    return "ongoing";
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const status = getAssignmentStatus(item);
      const cat = getItemCategory(item);

      const matchesFilter =
        filter === "All" ||
        (filter === "Ongoing" && cat === "ongoing") ||
        (filter === "Upcoming" && cat === "upcoming") ||
        (filter === "Closed" && cat === "closed") ||
        (filter === "Pending" && status === "pending") ||
        (filter === "Submitted" && status === "submitted") ||
        (filter === "Graded" && status === "graded") ||
        (filter === "Overdue" && status === "overdue");

      const courseName = item.course_name || item.courseName || "";
      const courseCode = item.course_code || item.courseCode || "";

      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        courseName.toLowerCase().includes(search.toLowerCase()) ||
        courseCode.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [assignments, filter, search]);

  const ongoingCount = assignments.filter((a) => getItemCategory(a) === "ongoing").length;
  const upcomingCount = assignments.filter((a) => getItemCategory(a) === "upcoming").length;
  const closedCount = assignments.filter((a) => getItemCategory(a) === "closed").length;
  const pendingCount = assignments.filter((a) => getAssignmentStatus(a) === "pending").length;
  const submittedCount = assignments.filter((a) => getAssignmentStatus(a) === "submitted").length;
  const gradedCount = assignments.filter((a) => getAssignmentStatus(a) === "graded").length;
  const overdueCount = assignments.filter((a) => getAssignmentStatus(a) === "overdue").length;

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!submissionText.trim() && !fileUrl.trim()) {
      setSubmitError("Please provide submission text or a file URL.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/student/assignments/${selectedAssignment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submission_text: submissionText.trim(),
          submissionText: submissionText.trim(),
          file_url: fileUrl.trim(),
          fileUrl: fileUrl.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedAssignment(null);
        setSubmissionText("");
        setFileUrl("");
        fetchStudentAssignments();
      } else {
        setSubmitError(data.message || "Failed to submit assignment.");
      }
    } catch (err) {
      console.error("Error submitting assignment:", err);
      setSubmitError("Server connection error while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="assign-layout">

      {/* Common Student Sidebar */}
      <StudentSidebar activeItem="Assignments" />

      {/* Main */}
      <main className="assign-main">

        <header className="assign-topbar">
          <div className="assign-breadcrumb">
            Pages / <strong>Assignments</strong>
          </div>

          <div className="assign-user">
            <div className="assign-avatar">
              {(user.name || "Student").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user.name || "Student"}</strong>
              <small>Student</small>
            </div>
          </div>
        </header>

        <div className="assign-content">

          {/* Heading */}
          <section className="assign-heading">
            <div>
              <span className="assign-eyebrow">ACADEMIC WORKSPACE</span>
              <h1>Assignments<span>.</span></h1>
              <p>Track deadlines, submit coursework, and view teacher feedback.</p>
            </div>
          </section>

          {/* Dynamic Stats */}
          <section className="assign-stats">
            <div className="assign-stat">
              <div className="assign-stat-icon violet">☷</div>
              <div>
                <span>Total Assignments</span>
                <h2>{assignments.length.toString().padStart(2, "0")}</h2>
                <small>Enrolled courses</small>
              </div>
            </div>

            <div className="assign-stat">
              <div className="assign-stat-icon orange">◷</div>
              <div>
                <span>Pending</span>
                <h2>{pendingCount.toString().padStart(2, "0")}</h2>
                <small>Need your action</small>
              </div>
            </div>

            <div className="assign-stat">
              <div className="assign-stat-icon green">✓</div>
              <div>
                <span>Submitted / Graded</span>
                <h2>{(submittedCount + gradedCount).toString().padStart(2, "0")}</h2>
                <small>Graded: {gradedCount}</small>
              </div>
            </div>

            <div className="assign-stat">
              <div className="assign-stat-icon red">!</div>
              <div>
                <span>Overdue</span>
                <h2>{overdueCount.toString().padStart(2, "0")}</h2>
                <small>Past deadline</small>
              </div>
            </div>
          </section>

          {/* Assignment List */}
          <section className="assign-section">

            <div className="assign-section-header">
              <div>
                <h2>Course Assignments</h2>
                <p>View assignments published for your enrolled courses.</p>
              </div>

              <div className="assign-search">
                <span>⌕</span>
                <input
                  placeholder="Search assignments or courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="assign-filters">
              {[
                { name: "All", count: assignments.length },
                { name: "Ongoing", count: ongoingCount },
                { name: "Upcoming", count: upcomingCount },
                { name: "Closed", count: closedCount },
                { name: "Pending", count: pendingCount },
                { name: "Submitted", count: submittedCount },
                { name: "Graded", count: gradedCount },
                { name: "Overdue", count: overdueCount },
              ].map((item) => (
                <button
                  key={item.name}
                  className={filter === item.name ? "selected" : ""}
                  onClick={() => setFilter(item.name)}
                >
                  {item.name}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>

            {/* Cards */}
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#a1a1aa" }}>
                Loading enrolled course assignments...
              </div>
            ) : error ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#f87171" }}>
                ⚠️ {error}
              </div>
            ) : (
              <div className="assignment-list">
                {filteredAssignments.map((item) => {
                  const status = item.submission_status || (item.submission ? item.submission.status : "pending");
                  const isSubmitted = status === "submitted" || status === "late" || status === "graded";

                  const rawDueDate = item.due_at || item.dueAt || item.due_date;
                  const parsedDueDate = rawDueDate ? new Date(rawDueDate) : null;
                  const displayDueDate = parsedDueDate && !isNaN(parsedDueDate.getTime())
                    ? parsedDueDate.toLocaleString()
                    : "No deadline specified";

                  const courseNameDisplay = item.course_name || item.courseName || "Course";
                  const courseCodeDisplay = item.course_code || item.courseCode || "";
                  const maxMarksDisplay = item.max_marks || item.maxMarks || 100;

                  return (
                    <article className="assignment-card" key={item.id}>

                      <div className={`assignment-type-icon ${status}`}>
                        {status === "graded" ? "★" : isSubmitted ? "✓" : "▤"}
                      </div>

                      <div className="assignment-details">
                        <div className="assignment-title-row">
                          <h3>{item.title}</h3>
                          <span className={`assignment-status ${status}`}>
                            {status.toUpperCase()}
                          </span>
                        </div>

                        <p className="assignment-subject">
                          {courseNameDisplay} {courseCodeDisplay && <span>· {courseCodeDisplay}</span>}
                        </p>

                        <p className="assignment-description">
                          {item.description}
                        </p>

                        <div className="assignment-meta">
                          <span>◷ Due: {displayDueDate}</span>
                          <span>★ {maxMarksDisplay} Marks</span>
                        </div>

                        {/* Submission details display if already submitted */}
                        {item.submission && (
                          <div style={{ marginTop: "10px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "13px" }}>
                            <div style={{ color: "#4ade80", fontWeight: "600" }}>
                              Submitted on: {new Date(item.submission.submitted_at).toLocaleString()}
                            </div>
                            {item.submission.submission_text && (
                              <p style={{ marginTop: "4px", color: "#d4d4d8" }}>
                                Note: "{item.submission.submission_text}"
                              </p>
                            )}
                            {item.submission.file_url && (
                              <div style={{ marginTop: "4px" }}>
                                <a href={item.submission.file_url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>
                                  📄 Submitted File Link
                                </a>
                              </div>
                            )}

                            {item.submission.status === "graded" && (
                              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                <strong style={{ color: "#fbbf24" }}>
                                  Grade: {item.submission.marks_obtained} / {item.max_marks}
                                </strong>
                                {item.submission.feedback && (
                                  <p style={{ color: "#a1a1aa", marginTop: "2px" }}>
                                    Teacher Feedback: "{item.submission.feedback}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="assignment-action">
                        {status === "graded" ? (
                          <button className="submitted-btn" disabled style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
                            ✓ Graded
                          </button>
                        ) : isSubmitted ? (
                          <button className="submitted-btn" disabled>
                            ✓ Submitted
                          </button>
                        ) : (
                          <button
                            className="submit-btn"
                            onClick={() => {
                              setSelectedAssignment(item);
                              setSubmissionText("");
                              setFileUrl("");
                              setSubmitError("");
                            }}
                          >
                            Submit Work <span>→</span>
                          </button>
                        )}
                      </div>

                    </article>
                  );
                })}
              </div>
            )}

            {!loading && filteredAssignments.length === 0 && (
              <div className="assign-empty">
                <span>⌕</span>
                <h3>No assignments found</h3>
                <p>Try changing your search or filter options.</p>
              </div>
            )}
          </section>

          {/* Submission Modal */}
          {selectedAssignment && (
            <div
              className="assign-modal-overlay"
              onClick={() => setSelectedAssignment(null)}
            >
              <div
                className="assign-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "550px" }}
              >
                <button
                  className="modal-close"
                  onClick={() => setSelectedAssignment(null)}
                >
                  ×
                </button>

                <span className="assign-eyebrow">SUBMISSION PORTAL</span>
                <h2>Submit Assignment</h2>
                <p className="modal-assignment-title" style={{ fontWeight: "bold", color: "#fff", marginBottom: "12px" }}>
                  {selectedAssignment.title} ({selectedAssignment.course_code})
                </p>

                {submitError && (
                  <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>
                    ⚠️ {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmitAssignment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>
                      Submission Note / Answers Text
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Write your text submission or notes here..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "#18181b", border: "1px solid #3f3f46", color: "#fff", borderRadius: "6px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>
                      File URL / Drive / GitHub Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/your-submission-file.pdf"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "#18181b", border: "1px solid #3f3f46", color: "#fff", borderRadius: "6px" }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="modal-submit"
                    disabled={submitting}
                    style={{ marginTop: "12px" }}
                  >
                    {submitting ? "Submitting..." : "Confirm Submission →"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default StudentAssignments;