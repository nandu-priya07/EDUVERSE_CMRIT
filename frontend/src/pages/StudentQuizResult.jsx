import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, HelpCircle } from "lucide-react";
import "./TeacherCourseDetails.css";

const API_URL = "http://localhost:5000/api";

export default function StudentQuizResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/student/quiz-attempts/${attemptId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch attempt result.");
        }

        setResult(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="tcd-loading">
        <div className="tcd-spinner" />
        <p>Loading your results...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="tcd-error">
        <h2>Result Unavailable</h2>
        <p>{error || "Result not found."}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const { attempt, questions } = result;

  return (
    <div className="tcd-page" style={{ maxWidth: "850px", margin: "0 auto" }}>
      <header className="tcd-header">
        <button className="tcd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back to Course
        </button>
        <h2>Quiz Performance Summary</h2>
      </header>

      {/* Score Hero */}
      <div className="tcd-hero" style={{ minHeight: "160px", padding: "25px 35px", marginBottom: "2rem" }}>
        <div>
          <span className="tcd-badge">{attempt.courseName}</span>
          <h1>{attempt.quizTitle}</h1>
          <p className="tcd-description">Attempt #{attempt.attemptNumber} · Submitted {new Date(attempt.submittedAt).toLocaleString()}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "36px", fontWeight: "700", color: attempt.percentage >= 50 ? "#7ee0b0" : "#f87171" }}>
            {attempt.score} / {attempt.totalMarks}
          </div>
          <div style={{ fontSize: "14px", color: "#a78bfa" }}>{attempt.percentage}% Overall Score</div>
        </div>
      </div>

      {/* Questions Breakdown */}
      <section className="tcd-content">
        <h3 style={{ fontSize: "20px", marginBottom: "1.5rem" }}>Question Review</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {questions.map((q, idx) => (
            <div key={q.questionId} className="tcd-panel">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <strong>Question {idx + 1}</strong>
                <span style={{ color: q.awardedMarks > 0 ? "#7ee0b0" : "#f87171", fontWeight: "600" }}>
                  {q.awardedMarks} / {q.maxMarks} pts
                </span>
              </div>
              <p style={{ fontSize: "15px", marginBottom: "12px", color: "#f4f4f8" }}>{q.questionText}</p>

              <div style={{ background: "#171722", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#cbd5e1", marginBottom: "8px" }}>
                <strong>Your Answer:</strong> {JSON.stringify(q.studentAnswer) || "No answer submitted"}
              </div>

              {q.correctAnswer !== undefined && (
                <div style={{ background: "#1d3c32", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#7ee0b0" }}>
                  <strong>Correct Answer:</strong> {JSON.stringify(q.correctAnswer)}
                </div>
              )}

              {q.feedback && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#b99aff" }}>
                  💬 Teacher Feedback: {q.feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
