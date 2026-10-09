import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Edit3, MessageSquare } from "lucide-react";
import "./TeacherCourseDetails.css";

const API_URL = "http://localhost:5000/api";

export default function TeacherQuizResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);

  const [gradeMarks, setGradeMarks] = useState({});
  const [gradeFeedbacks, setGradeFeedbacks] = useState({});

  useEffect(() => {
    fetchResults();
  }, [quizId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/teacher/quizzes/${quizId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch results.");
      }

      setQuiz(data.data.quiz);
      setResults(data.data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttempt = async (attemptId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/teacher/quizzes/${quizId}/attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAttemptDetails(data.data);
        const marksObj = {};
        const feedbackObj = {};
        data.data.questions.forEach((q) => {
          marksObj[q.answerId] = q.awardedMarks;
          feedbackObj[q.answerId] = q.feedback;
        });
        setGradeMarks(marksObj);
        setGradeFeedbacks(feedbackObj);
        setGradingModalOpen(true);
      }
    } catch (err) {
      alert("Failed to load attempt details.");
    }
  };

  const handleGradeAnswer = async (answerId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/teacher/quiz-answers/${answerId}/grade`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          awardedMarks: gradeMarks[answerId],
          feedback: gradeFeedbacks[answerId],
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert("Grade updated!");
        fetchResults();
      } else {
        alert(data.message || "Failed to save grade.");
      }
    } catch (err) {
      alert("Error grading answer.");
    }
  };

  if (loading) {
    return (
      <div className="tcd-loading">
        <div className="tcd-spinner" />
        <p>Loading quiz results...</p>
      </div>
    );
  }

  return (
    <div className="tcd-page">
      <header className="tcd-header">
        <button className="tcd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <h2>Quiz Results & Submissions</h2>
      </header>

      <section className="tcd-hero" style={{ minHeight: "140px", padding: "20px 30px" }}>
        <div>
          <h1>{quiz?.title}</h1>
          <p className="tcd-description">Total Submissions: {results.length} | Max Marks: {quiz?.totalMarks}</p>
        </div>
      </section>

      <section className="tcd-content">
        <div className="tcd-table-wrapper">
          <table className="tcd-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Register No.</th>
                <th>Submitted Date</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.attemptId}>
                  <td>
                    <strong>{r.studentName}</strong>
                    <div style={{ fontSize: "11px", color: "#9292a5" }}>{r.studentEmail}</div>
                  </td>
                  <td>{r.registerNumber}</td>
                  <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}</td>
                  <td>{r.score} / {r.totalMarks}</td>
                  <td>
                    <strong style={{ color: r.percentage >= 50 ? "#7ee0b0" : "#f87171" }}>{r.percentage}%</strong>
                  </td>
                  <td>
                    <span className="tcd-status" style={{ background: r.attemptStatus === "evaluated" ? "#1d3c32" : "#33264e", color: r.attemptStatus === "evaluated" ? "#7ee0b0" : "#b99aff" }}>
                      {r.attemptStatus.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button className="tcd-primary-btn" onClick={() => handleOpenAttempt(r.attemptId)} style={{ padding: "6px 12px", fontSize: "12px" }}>
                      Review & Grade
                    </button>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan="7" className="tcd-empty">No student submissions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grading Modal */}
      {gradingModalOpen && attemptDetails && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", zIndex: 100, padding: "20px" }}>
          <div className="tcd-panel" style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Student Submission Review: {attemptDetails.attempt.studentName}</h3>
              <button onClick={() => setGradingModalOpen(false)} style={{ background: "none", border: "none", color: "#9292a5", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            {attemptDetails.questions.map((q, idx) => (
              <div key={q.questionId} style={{ background: "#0b0b12", padding: "16px", borderRadius: "10px", marginBottom: "1rem" }}>
                <strong>Q{idx + 1}: {q.questionText} ({q.maxMarks} pts)</strong>
                <div style={{ margin: "8px 0", color: "#cbd5e1", fontSize: "13px" }}>
                  <strong>Student Answer:</strong> {JSON.stringify(q.studentAnswer) || "No answer provided"}
                </div>
                {q.questionType !== "short_answer" ? (
                  <div style={{ fontSize: "12px", color: "#7ee0b0" }}>
                    ✓ Auto-graded: {q.awardedMarks} / {q.maxMarks} pts
                  </div>
                ) : (
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ fontSize: "12px", color: "#9292a5" }}>Awarded Marks:</label>
                      <input
                        type="number"
                        step="0.5"
                        max={q.maxMarks}
                        value={gradeMarks[q.answerId] !== undefined ? gradeMarks[q.answerId] : q.awardedMarks}
                        onChange={(e) => setGradeMarks({ ...gradeMarks, [q.answerId]: e.target.value })}
                        style={{ width: "70px", padding: "4px", background: "#15151f", border: "1px solid #30303e", color: "white", borderRadius: "4px" }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Add feedback..."
                      value={gradeFeedbacks[q.answerId] !== undefined ? gradeFeedbacks[q.answerId] : q.feedback}
                      onChange={(e) => setGradeFeedbacks({ ...gradeFeedbacks, [q.answerId]: e.target.value })}
                      style={{ padding: "6px", background: "#15151f", border: "1px solid #30303e", color: "white", borderRadius: "4px" }}
                    />
                    <button className="tcd-primary-btn" onClick={() => handleGradeAnswer(q.answerId)} style={{ width: "fit-content", padding: "4px 10px", fontSize: "12px" }}>
                      Save Grade
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
