
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ComicBotWindow from "../components/ComicBotWindow";
import "./teacherassignments.css";

export default function TeacherAssignments() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBotModal, setShowBotModal] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  
  // Selected assignment for viewing details / submissions
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Grading form state
  const [gradingSubmissionId, setGradingSubmissionId] = useState(null);
  const [marksInput, setMarksInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/teacher/assignments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setAssignments(data.data || []);
      } else {
        setError(data.message || "Failed to load assignments.");
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError("Server connection error while loading assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const openAssignmentModal = async (item) => {
    setSelectedAssignment(item);
    setLoadingSubmissions(true);
    setSubmissions([]);
    setGradingSubmissionId(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/teacher/assignments/${item.id}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || data.data || []);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    if (!gradingSubmissionId || !selectedAssignment) return;
    setIsGrading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/teacher/assignments/${selectedAssignment.id}/submissions/${gradingSubmissionId}/grade`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marks_obtained: Number(marksInput),
            feedback: feedbackInput,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === gradingSubmissionId ? data.submission : sub))
        );
        setGradingSubmissionId(null);
        setMarksInput("");
        setFeedbackInput("");
        fetchAssignments(); // refresh list counts
      } else {
        alert(data.message || "Failed to grade submission");
      }
    } catch (err) {
      console.error("Error grading submission:", err);
      alert("Error grading submission");
    } finally {
      setIsGrading(false);
    }
  };

  const handleStatusChange = async (assignmentId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/teacher/assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignmentId ? { ...a, status: newStatus } : a))
        );
        if (selectedAssignment && selectedAssignment.id === assignmentId) {
          setSelectedAssignment((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Error updating assignment status:", err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/teacher/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        setSelectedAssignment(null);
      } else {
        alert(data.message || "Could not delete assignment");
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
    }
  };

  const filteredAssignments = useMemo(() => {
    const now = new Date();
    return assignments.filter((item) => {
      const isOverdue = new Date(item.due_at) < now && item.status !== "closed";
      const dueAt = item.due_at ? new Date(item.due_at) : null;
      const startAt = item.start_at ? new Date(item.start_at) : null;

      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.course_name && item.course_name.toLowerCase().includes(search.toLowerCase())) ||
        (item.course_code && item.course_code.toLowerCase().includes(search.toLowerCase()));

      let matchesFilter = true;
      if (filter === "Ongoing") {
        matchesFilter = item.status !== "closed" && (!dueAt || dueAt >= now) && (!startAt || startAt <= now);
      } else if (filter === "Upcoming") {
        matchesFilter = startAt && startAt > now;
      } else if (filter === "Closed") {
        matchesFilter = item.status === "closed" || (dueAt && dueAt < now);
      } else if (filter === "Published") matchesFilter = item.status === "published";
      else if (filter === "Draft") matchesFilter = item.status === "draft";
      else if (filter === "Overdue") matchesFilter = isOverdue;

      return matchesSearch && matchesFilter;
    });
  }, [assignments, search, filter]);

  // Statistics calculation
  const totalCount = assignments.length;
  const publishedCount = assignments.filter((a) => a.status === "published").length;
  const draftCount = assignments.filter((a) => a.status === "draft").length;
  const totalSubmissions = assignments.reduce((sum, a) => sum + Number(a.submission_count || 0), 0);
  const pendingSubmissions = assignments.reduce((sum, a) => sum + Number(a.pending_count || 0), 0);
  const overdueCount = assignments.filter((a) => new Date(a.due_at) < new Date() && a.status !== "closed").length;

  return (
    <div className="ta-layout">
      <aside className="ta-sidebar">
        <div className="ta-brand"><span>✦</span> SmartCampus</div>

        <div className="ta-user">
          <div className="ta-avatar">T</div>
          <div><h4>Teacher Workspace</h4><p>Instructor</p></div>
          <span className="ta-arrow">→</span>
        </div>

        <div className="ta-label">WORKSPACE</div>
        <nav className="ta-nav">
          <a href="/teacher-dashboard"><span>▦</span> Dashboard</a>
          <a href="/teacher/courses"><span>▤</span> My Courses</a>
          <a href="/teacher/students"><span>♙</span> Students</a>
          <a className="active" href="/teacher/assignments"><span>▣</span> Assignments</a>
          <a href="/teacher/assessments"><span>◉</span> Assessments</a>
          <a href="/teacher/attendance"><span>◷</span> Attendance</a>
        </nav>

        <div className="ta-label ta-pref">PREFERENCES</div>
        <nav className="ta-nav">
          <a href="/login"><span>↪</span> Log Out</a>
        </nav>
      </aside>

      <main className="ta-main">
        <header className="ta-header">
          <div><p>Workspace / Assignments</p><h2>Assignments Dashboard</h2></div>
          <div className="ta-header-right" style={{ display: "flex", gap: "10px" }}>
            <button
              className="ta-create-btn"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", border: "1px solid #c084fc" }}
              onClick={() => setShowBotModal(!showBotModal)}
            >
              🤖 Smart AI Assistant
            </button>
            <button className="ta-create-btn" onClick={() => navigate("/teacher/assignments/create")}>
              ＋ Create Assignment
            </button>
          </div>
        </header>

        <section className="ta-heading">
          <div>
            <h1>Assignment Management <span>✦</span></h1>
            <p>Create assignments, track submissions, and grade student work in real time.</p>
          </div>
        </section>

        {/* Dynamic Statistics Cards */}
        <section className="ta-stats">
          <div className="ta-stat">
            <div className="ta-stat-icon purple">▣</div>
            <p>Total Assignments</p>
            <h2>{totalCount.toString().padStart(2, "0")}</h2>
            <span>Published: {publishedCount} · Drafts: {draftCount}</span>
          </div>
          <div className="ta-stat">
            <div className="ta-stat-icon blue">↥</div>
            <p>Total Submissions</p>
            <h2>{totalSubmissions}</h2>
            <span>Student submissions received</span>
          </div>
          <div className="ta-stat">
            <div className="ta-stat-icon orange">◷</div>
            <p>Pending Grading</p>
            <h2>{pendingSubmissions}</h2>
            <span className="ta-orange">Requires review</span>
          </div>
          <div className="ta-stat">
            <div className="ta-stat-icon red" style={{ color: "#f87171" }}>!</div>
            <p>Overdue</p>
            <h2>{overdueCount}</h2>
            <span>Past deadline</span>
          </div>
        </section>

        <section className="ta-list-card">
          <div className="ta-list-heading">
            <div><h3>All Assignments</h3><p>Manage and track course assignments.</p></div>
            <span className="ta-count">{filteredAssignments.length} assignments</span>
          </div>

          <div className="ta-toolbar">
            <div className="ta-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assignment or course..."
              />
              {search && <button onClick={() => setSearch("")}>×</button>}
            </div>

            <div className="ta-filters">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Closed">Closed</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#a1a1aa" }}>
              Loading assignments from Supabase database...
            </div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#f87171" }}>
              ⚠️ {error}
            </div>
          ) : (
            <div className="ta-assignment-list">
              {filteredAssignments.map((item) => {
                const totalStudents = Number(item.enrolled_students || 0);
                const subCount = Number(item.submission_count || 0);
                const percentage = totalStudents ? Math.round((subCount / totalStudents) * 100) : 0;
                const isPastDue = new Date(item.due_at) < new Date();

                return (
                  <article className="ta-assignment-row" key={item.id}>
                    <div className="ta-assignment-icon">▤</div>

                    <div className="ta-assignment-info">
                      <div className="ta-assignment-title">
                        <h4>{item.title}</h4>
                        <span className={`ta-status ${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                        {isPastDue && item.status !== "closed" && (
                          <span className="ta-status overdue" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p>{item.course_name} <span>·</span> {item.course_code}</p>
                      <div className="ta-row-meta">
                        <span>◷ Due: {new Date(item.due_at).toLocaleString()}</span>
                        <span>★ Max Marks: {item.max_marks}</span>
                      </div>
                    </div>

                    <div className="ta-submission-info">
                      <div><strong>{subCount}</strong><span> Submissions</span></div>
                      <div className="ta-progress"><i style={{ width: `${Math.min(100, percentage)}%` }} /></div>
                      <small>{item.pending_count ? `${item.pending_count} pending review` : "All reviewed"}</small>
                    </div>

                    <button className="ta-review-btn" onClick={() => openAssignmentModal(item)}>
                      View & Grade <span>→</span>
                    </button>
                  </article>
                );
              })}

              {filteredAssignments.length === 0 && (
                <div className="ta-empty">
                  <h3>No assignments found</h3>
                  <p>Create your first assignment or change filters.</p>
                  <button onClick={() => { setSearch(""); setFilter("All"); }}>Clear filters</button>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="ta-footer">
          © 2026 SmartCampus · Teacher Workspace
          <span>Built for dynamic learning ✦</span>
        </footer>
      </main>

      {/* Assignment Details & Submission Review Modal */}
      {selectedAssignment && (
        <div className="ta-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="ta-modal ta-detail-modal" style={{ maxWidth: "800px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="ta-modal-header">
              <div>
                <h2>{selectedAssignment.title}</h2>
                <p>
                  {selectedAssignment.course_name || selectedAssignment.courseName || "Course"}
                  {(selectedAssignment.course_code || selectedAssignment.courseCode) && ` (${selectedAssignment.course_code || selectedAssignment.courseCode})`}
                </p>
              </div>
              <button onClick={() => setSelectedAssignment(null)}>×</button>
            </div>

            <div className="ta-detail-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
              <div><span>Status</span><strong>{(selectedAssignment.status || "published").toUpperCase()}</strong></div>
              <div>
                <span>Due Date</span>
                <strong>
                  {(() => {
                    const d = selectedAssignment.due_at || selectedAssignment.dueAt;
                    return d && !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString() : "No deadline";
                  })()}
                </strong>
              </div>
              <div><span>Max Marks</span><strong>{selectedAssignment.max_marks ?? selectedAssignment.maxMarks ?? 100}</strong></div>
              <div><span>Submissions</span><strong>{selectedAssignment.submission_count ?? selectedAssignment.submissionCount ?? submissions.length}</strong></div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", color: "#d4d4d8" }}>
              <strong>Description: </strong>{selectedAssignment.description}
              {selectedAssignment.instructions && (
                <div style={{ marginTop: "6px" }}>
                  <strong>Instructions: </strong>{selectedAssignment.instructions}
                </div>
              )}
              {selectedAssignment.attachment_url && (
                <div style={{ marginTop: "8px" }}>
                  <a href={selectedAssignment.attachment_url} target="_blank" rel="noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>
                    📎 Open Reference Attachment
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {selectedAssignment.status === "draft" && (
                <button
                  style={{ background: "#6366f1", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                  onClick={() => handleStatusChange(selectedAssignment.id, "published")}
                >
                  Publish Assignment
                </button>
              )}
              {selectedAssignment.status === "published" && (
                <button
                  style={{ background: "#3f3f46", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                  onClick={() => handleStatusChange(selectedAssignment.id, "closed")}
                >
                  Close Submissions
                </button>
              )}
              <button
                style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => handleDeleteAssignment(selectedAssignment.id)}
              >
                Delete Assignment
              </button>
            </div>

            {/* Student Submissions List */}
            <h3 style={{ fontSize: "16px", color: "#fff", marginBottom: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
              Student Submissions ({submissions.length})
            </h3>

            {loadingSubmissions ? (
              <p style={{ color: "#a1a1aa", fontSize: "14px" }}>Loading student submissions...</p>
            ) : submissions.length === 0 ? (
              <p style={{ color: "#71717a", fontSize: "14px" }}>No student submissions recorded yet.</p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {submissions.map((sub) => (
                  <div key={sub.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", padding: "14px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div>
                        <strong style={{ color: "#fff" }}>{sub.student_name}</strong>
                        <span style={{ fontSize: "12px", color: "#a1a1aa", marginLeft: "8px" }}>({sub.register_number || sub.student_email})</span>
                      </div>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: sub.status === "graded" ? "rgba(34,197,94,0.2)" : sub.status === "late" ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)",
                        color: sub.status === "graded" ? "#4ade80" : sub.status === "late" ? "#f87171" : "#818cf8"
                      }}>
                        {sub.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#d4d4d8", marginBottom: "6px" }}>
                      Submitted: {sub.submitted_at || sub.submittedAt ? new Date(sub.submitted_at || sub.submittedAt).toLocaleString() : "Recently"}
                    </div>

                    {(sub.submission_text || sub.submissionText) ? (
                      <div style={{ fontSize: "13px", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }}>
                        <strong>Student Response: </strong>"{sub.submission_text || sub.submissionText}"
                      </div>
                    ) : null}

                    {(sub.file_url || sub.fileUrl) ? (
                      <div style={{ marginTop: "6px" }}>
                        <a href={sub.file_url || sub.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#60a5fa", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          📥 Download / View File ({sub.file_url || sub.fileUrl})
                        </a>
                      </div>
                    ) : null}

                    {!(sub.submission_text || sub.submissionText) && !(sub.file_url || sub.fileUrl) && (
                      <div style={{ fontSize: "12px", color: "#a1a1aa", fontStyle: "italic", margin: "4px 0" }}>
                        📝 Submission recorded (No text or file link provided)
                      </div>
                    )}

                    {sub.status === "graded" ? (
                      <div style={{ marginTop: "8px", padding: "8px", background: "rgba(34,197,94,0.08)", borderRadius: "4px", fontSize: "13px" }}>
                        <span style={{ color: "#4ade80", fontWeight: "600" }}>
                          Marks: {sub.marks_obtained} / {selectedAssignment.max_marks}
                        </span>
                        {sub.feedback && <span style={{ color: "#a1a1aa", marginLeft: "12px" }}>Feedback: {sub.feedback}</span>}
                      </div>
                    ) : (
                      <div style={{ marginTop: "10px" }}>
                        {gradingSubmissionId === sub.id ? (
                          <form onSubmit={handleGradeSubmission} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <input
                                type="number"
                                step="0.5"
                                max={selectedAssignment.max_marks}
                                min="0"
                                required
                                placeholder={`Marks (Max ${selectedAssignment.max_marks})`}
                                value={marksInput}
                                onChange={(e) => setMarksInput(e.target.value)}
                                style={{ flex: 1, padding: "6px 10px", background: "#18181b", border: "1px solid #3f3f46", color: "#fff", borderRadius: "4px" }}
                              />
                              <button type="submit" disabled={isGrading} style={{ padding: "6px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                                {isGrading ? "Saving..." : "Submit Grade"}
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Feedback for student..."
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              style={{ padding: "6px 10px", background: "#18181b", border: "1px solid #3f3f46", color: "#fff", borderRadius: "4px" }}
                            />
                          </form>
                        ) : (
                          <button
                            onClick={() => {
                              setGradingSubmissionId(sub.id);
                              setMarksInput(sub.marks_obtained || "");
                              setFeedbackInput(sub.feedback || "");
                            }}
                            style={{ padding: "4px 12px", background: "#3f3f46", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                          >
                            ✏️ Grade Student Work
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button className="ta-submit-btn full" style={{ marginTop: "20px" }} onClick={() => setSelectedAssignment(null)}>Close</button>
          </div>
        </div>
      )}
      {/* AI Comic Bot Window */}
      {showBotModal && (
        <div style={{ marginTop: "20px" }}>
          <ComicBotWindow isOpen={true} onClose={() => setShowBotModal(false)} />
        </div>
      )}
    </div>
  );
}