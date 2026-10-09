import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./studentresults.css";
import StudentSidebar from "../components/StudentSidebar";
import { Award, BookOpen, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";

export default function StudentResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("");

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch("http://localhost:5000/api/student/results", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch examination results.");
      }

      setData(json.data || null);
      if (json.data?.publishedSemesters?.length > 0) {
        setSelectedSemester(json.data.publishedSemesters[0].semester);
      }
    } catch (err) {
      console.error("Error loading student results:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const publishedSemesters = data?.publishedSemesters || [];
  const currentSemesterData = publishedSemesters.find((s) => s.semester === selectedSemester) || publishedSemesters[0];

  const gradeCounts = currentSemesterData?.subjects?.reduce((acc, subject) => {
    const g = subject.grade || "F";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0f19", color: "#f3f4f6" }}>
      <StudentSidebar activeItem="Results" />
      <div className="results-page" style={{ flex: 1, minWidth: 0, padding: "2rem" }}>
        <header className="results-header" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="results-eyebrow" style={{ fontSize: "0.75rem", letterSpacing: "1px", color: "#6366f1", fontWeight: 600, textTransform: "uppercase" }}>STUDENT PORTAL / ACADEMICS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.25rem 0" }}>My Examination Results</h1>
            <p className="results-subtitle" style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
              Track your verified academic performance, credits earned, and semester grades.
            </p>
          </div>
          <button
            onClick={fetchResults}
            className="refresh-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem", width: "40px", height: "40px", border: "3px solid #374151", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#9ca3af" }}>Fetching official examination results...</p>
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", background: "#7f1d1d22", border: "1px solid #ef444444", borderRadius: "12px", color: "#fca5a5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <AlertCircle size={20} color="#ef4444" />
              <strong style={{ fontSize: "1.1rem" }}>Unable to load results</strong>
            </div>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : publishedSemesters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937", margin: "1rem 0" }}>
            <Clock size={48} color="#6366f1" style={{ marginBottom: "1rem", opacity: 0.8 }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#f3f4f6", marginBottom: "0.5rem" }}>
              Results Have Not Been Published Yet
            </h2>
            <p style={{ color: "#9ca3af", maxWidth: "500px", margin: "0 auto 1.5rem", lineHeight: "1.6" }}>
              Your examination results for the current term are under evaluation or pending admin publication. 
              Please check back later or contact your department administration for updates.
            </p>
            <div style={{ display: "inline-flex", gap: "1rem", background: "#1e293b", padding: "0.75rem 1.25rem", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.875rem", color: "#cbd5e1" }}>
              <span>Student: <strong>{data?.student?.name || "N/A"}</strong></span>
              <span>•</span>
              <span>Reg No: <strong>{data?.student?.registerNumber || "N/A"}</strong></span>
              <span>•</span>
              <span>Dept: <strong>{data?.student?.department || "N/A"}</strong></span>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Overview Cards */}
            <section className="results-overview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              <div className="result-highlight" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", padding: "1.25rem", borderRadius: "12px", boxShadow: "0 4px 20px rgba(79, 70, 229, 0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <span>OVERALL CGPA</span>
                  <span>✦</span>
                </div>
                <h2 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0.5rem 0 0" }}>{data?.cgpa?.toFixed(2) || "0.00"}</h2>
                <p style={{ margin: "0 0 0.5rem", opacity: 0.8, fontSize: "0.85rem" }}>Out of 10.00</p>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (data?.cgpa || 0) * 10)}%`, height: "100%", background: "#ffffff" }} />
                </div>
                <small style={{ display: "block", marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.8 }}>Across {publishedSemesters.length} published term(s)</small>
              </div>

              <div className="result-stat" style={{ background: "#111827", border: "1px solid #1f2937", padding: "1.25rem", borderRadius: "12px" }}>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>Current Term SGPA</p>
                <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.35rem 0", color: "#6366f1" }}>{currentSemesterData?.sgpa?.toFixed(2) || "0.00"}</h2>
                <small style={{ color: "#6b7280" }}>{selectedSemester}</small>
              </div>

              <div className="result-stat" style={{ background: "#111827", border: "1px solid #1f2937", padding: "1.25rem", borderRadius: "12px" }}>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>Total Credits Earned</p>
                <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.35rem 0", color: "#10b981" }}>{data?.totalCreditsEarned || 0}</h2>
                <small style={{ color: "#6b7280" }}>Verified credits</small>
              </div>

              <div className="result-stat" style={{ background: "#111827", border: "1px solid #1f2937", padding: "1.25rem", borderRadius: "12px" }}>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>Published Semesters</p>
                <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.35rem 0", color: "#f59e0b" }}>{publishedSemesters.length}</h2>
                <small style={{ color: "#6b7280" }}>Official transcripts available</small>
              </div>
            </section>

            {/* Semester Details Section */}
            <section className="results-panel" style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Semester Performance Breakdown</h2>
                  <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>Select a published semester to view subject-wise mark details.</p>
                </div>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  style={{
                    background: "#1e293b",
                    color: "#f3f4f6",
                    border: "1px solid #374151",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  {publishedSemesters.map((s) => (
                    <option key={s.semester} value={s.semester}>
                      {s.semester} ({s.academicYear || "Academic Year"})
                    </option>
                  ))}
                </select>
              </div>

              {currentSemesterData && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", background: "#1f293755", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block" }}>SGPA</span>
                      <strong style={{ fontSize: "1.2rem", color: "#6366f1" }}>{currentSemesterData.sgpa.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block" }}>Term Credits</span>
                      <strong style={{ fontSize: "1.2rem", color: "#e2e8f0" }}>{currentSemesterData.credits}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block" }}>Total Subjects</span>
                      <strong style={{ fontSize: "1.2rem", color: "#e2e8f0" }}>{currentSemesterData.subjects?.length || 0}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "block" }}>Overall Status</span>
                      <strong style={{ fontSize: "1rem", color: currentSemesterData.status === "Passed" ? "#10b981" : "#ef4444" }}>
                        {currentSemesterData.status}
                      </strong>
                    </div>
                  </div>

                  <div className="results-table-wrap" style={{ overflowX: "auto" }}>
                    <table className="results-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #374151", color: "#9ca3af", fontSize: "0.85rem" }}>
                          <th style={{ padding: "0.75rem 1rem" }}>Subject</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Internal</th>
                          <th style={{ padding: "0.75rem 1rem" }}>External</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Total Marks</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Grade</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Credits</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSemesterData.subjects?.map((sub) => (
                          <tr key={sub.code} style={{ borderBottom: "1px solid #1f2937" }}>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <strong style={{ display: "block", color: "#f3f4f6" }}>{sub.name}</strong>
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{sub.code}</span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "#cbd5e1" }}>{sub.internal} / {sub.internalMax}</td>
                            <td style={{ padding: "0.85rem 1rem", color: "#cbd5e1" }}>{sub.external} / {sub.externalMax}</td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <strong style={{ color: "#f3f4f6" }}>{sub.total}</strong> / {sub.totalMax}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span
                                style={{
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "4px",
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  background: sub.grade === "O" || sub.grade === "A+" ? "#10b98122" : sub.grade === "F" ? "#ef444422" : "#6366f122",
                                  color: sub.grade === "O" || sub.grade === "A+" ? "#34d399" : sub.grade === "F" ? "#f87171" : "#818cf8",
                                  border: `1px solid ${sub.grade === "O" || sub.grade === "A+" ? "#10b98144" : sub.grade === "F" ? "#ef444444" : "#6366f144"}`,
                                }}
                              >
                                {sub.grade}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "#cbd5e1" }}>{sub.credits}</td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span style={{ color: sub.status === "Pass" ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: "0.85rem" }}>
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}