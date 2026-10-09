import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, AlertCircle, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import "./TeacherCourseDetails.css";

const API_URL = "http://localhost:5000/api";

export default function StudentQuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("instructions"); // instructions | active | submitted
  const [quizInfo, setQuizInfo] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuizOverview();
  }, [quizId]);

  const fetchQuizOverview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/student/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load quiz.");
      }

      setQuizInfo(data.data.quiz);
      if (data.data.activeAttempt) {
        handleStartAttempt();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/student/quizzes/${quizId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not start quiz.");
      }

      setAttempt(data.data.attempt);
      setQuestions(data.data.questions);

      const initialAnswers = {};
      data.data.questions.forEach((q) => {
        if (q.savedAnswer !== null) initialAnswers[q.id] = q.savedAnswer;
      });
      setAnswers(initialAnswers);

      // Setup countdown
      const durationSec = data.data.attempt.durationMinutes * 60;
      const elapsedSec = Math.floor((new Date() - new Date(data.data.attempt.startedAt)) / 1000);
      const remaining = Math.max(0, durationSec - elapsedSec);
      setTimeLeftSeconds(remaining);

      setPhase("active");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phase !== "active" || timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeftSeconds]);

  const handleAnswerChange = async (questionId, value) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    // Save draft on backend
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/student/quiz-attempts/${attempt.id}/answers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer: value }),
      });
    } catch (err) {
      console.error("Auto-save answer error:", err);
    }
  };

  const toggleReviewFlag = (questionId) => {
    setReviewFlags((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/student/quiz-attempts/${attempt.id}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit quiz.");
      }

      navigate(`/student/quiz-attempts/${attempt.id}/result`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tcd-loading">
        <div className="tcd-spinner" />
        <p>Loading quiz attempt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tcd-error">
        <AlertCircle size={40} />
        <h2>Quiz Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  // Phase 1: Instructions
  if (phase === "instructions") {
    return (
      <div className="tcd-page" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
        <button className="tcd-back" onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="tcd-panel" style={{ padding: "35px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>{quizInfo.title}</h1>
          <p className="tcd-description" style={{ marginBottom: "20px" }}>{quizInfo.description || "Prepare yourself before starting the quiz."}</p>

          <div className="tcd-overview-grid" style={{ marginBottom: "25px" }}>
            <div className="tcd-info-row"><span>Course</span><strong>{quizInfo.courseCode}</strong></div>
            <div className="tcd-info-row"><span>Duration</span><strong>{quizInfo.durationMinutes} mins</strong></div>
            <div className="tcd-info-row"><span>Total Marks</span><strong>{quizInfo.totalMarks} pts</strong></div>
            <div className="tcd-info-row"><span>Attempts Used</span><strong>{quizInfo.attemptsUsed} / {quizInfo.maxAttempts}</strong></div>
          </div>

          <div style={{ background: "#171722", padding: "20px", borderRadius: "12px", marginBottom: "25px" }}>
            <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#c3a6ff" }}>Instructions</h3>
            <p style={{ color: "#aaaabb", fontSize: "14px", lineHeight: "1.7" }}>
              {quizInfo.instructions || "Answer all questions to the best of your ability. Do not refresh or exit during active test taking."}
            </p>
          </div>

          <button
            className="tcd-primary-btn"
            onClick={handleStartAttempt}
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "16px", background: "#7652d6" }}
          >
            Start Quiz Now <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="tcd-page">
      {/* Header bar with timer */}
      <header className="tcd-header" style={{ background: "#15151f", padding: "15px 25px", borderRadius: "12px", marginBottom: "20px" }}>
        <div>
          <h2>{quizInfo?.title}</h2>
          <span style={{ fontSize: "12px", color: "#9292a5" }}>Question {currentIdx + 1} of {questions.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#33264e", padding: "8px 16px", borderRadius: "20px", color: "#b99aff", fontWeight: "600" }}>
          <Clock size={18} />
          <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
        {/* Main Question Panel */}
        <div className="tcd-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ color: "#a78bfa", fontSize: "13px", fontWeight: "600" }}>{currentQ.questionType.toUpperCase()} ({currentQ.marks} pts)</span>
            <button
              onClick={() => toggleReviewFlag(currentQ.id)}
              style={{ background: reviewFlags[currentQ.id] ? "#38275a" : "transparent", border: "1px solid #7156a8", color: reviewFlags[currentQ.id] ? "#c4a9ff" : "#9292a5", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
            >
              {reviewFlags[currentQ.id] ? "★ Marked for Review" : "☆ Mark for Review"}
            </button>
          </div>

          <h3 style={{ fontSize: "18px", marginBottom: "1.5rem", lineHeight: "1.6" }}>{currentQ.questionText}</h3>

          {/* MCQ */}
          {currentQ.questionType === "mcq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentQ.options.map((opt, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: answers[currentQ.id] === opt ? "#33264e" : "#171722", border: answers[currentQ.id] === opt ? "1px solid #a78bfa" : "1px solid #292936", borderRadius: "10px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name={`q-${currentQ.id}`}
                    checked={answers[currentQ.id] === opt}
                    onChange={() => handleAnswerChange(currentQ.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Multiple Select */}
          {currentQ.questionType === "multiple_select" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentQ.options.map((opt, idx) => {
                const currentArr = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                const isSelected = currentArr.includes(opt);
                return (
                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: isSelected ? "#33264e" : "#171722", border: isSelected ? "1px solid #a78bfa" : "1px solid #292936", borderRadius: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        let next = [...currentArr];
                        if (e.target.checked) next.push(opt);
                        else next = next.filter((item) => item !== opt);
                        handleAnswerChange(currentQ.id, next);
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {currentQ.questionType === "true_false" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              {["True", "False"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswerChange(currentQ.id, opt)}
                  style={{ padding: "20px", background: answers[currentQ.id] === opt ? "#33264e" : "#171722", border: answers[currentQ.id] === opt ? "2px solid #a78bfa" : "1px solid #292936", borderRadius: "12px", color: "white", fontSize: "16px", cursor: "pointer" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Short Answer */}
          {currentQ.questionType === "short_answer" && (
            <textarea
              rows={5}
              placeholder="Type your answer here..."
              value={answers[currentQ.id] || ""}
              onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
              style={{ width: "100%", padding: "14px", background: "#171722", border: "1px solid #292936", borderRadius: "10px", color: "white" }}
            />
          )}

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #292936" }}>
            <button
              className="tcd-back"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            >
              ← Previous
            </button>
            <button
              className="tcd-primary-btn"
              onClick={() => {
                if (currentIdx < questions.length - 1) setCurrentIdx((prev) => prev + 1);
                else handleSubmitQuiz();
              }}
            >
              {currentIdx === questions.length - 1 ? "Submit Quiz" : "Next Question →"}
            </button>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="tcd-panel" style={{ height: "fit-content" }}>
          <h3>Question Palette</h3>
          <p style={{ fontSize: "12px", color: "#9292a5", marginBottom: "1rem" }}>
            Answered: {answeredCount} / {questions.length}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "1.5rem" }}>
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
              const isFlagged = reviewFlags[q.id];
              const isCurrent = currentIdx === idx;

              let bg = "#171722";
              if (isCurrent) bg = "#7652d6";
              else if (isFlagged) bg = "#7156a8";
              else if (isAnswered) bg = "#1d3c32";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    height: "38px",
                    background: bg,
                    border: isCurrent ? "2px solid white" : "1px solid #292936",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            className="tcd-primary-btn"
            onClick={handleSubmitQuiz}
            style={{ width: "100%", justifyContent: "center", background: "#7652d6" }}
          >
            Submit Quiz Now
          </button>
        </div>
      </div>
    </div>
  );
}
