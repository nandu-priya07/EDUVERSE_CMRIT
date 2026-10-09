import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Wand2,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Award,
  Code,
  Layers,
  Terminal,
  Flame,
  GraduationCap,
  Clock,
  Compass
} from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import ComicGenerator from "../components/ComicGenerator";
import "./studentailearning.css";

const modes = [
  { id: "explain", icon: "✦", title: "Explain Topic", desc: "Intuitive breakdowns & real-world analogies" },
  { id: "quiz", icon: "▤", title: "Interactive Quiz", desc: "Auto-graded practice tests with answers" },
  { id: "flashcards", icon: "🎴", title: "3D Flashcards", desc: "Interactive revision cards & mastery score" },
  { id: "code_solver", icon: "💻", title: "Code & Lab Solver", desc: "Production code, walkthrough & output" },
  { id: "roadmap", icon: "🗺️", title: "Learning Roadmap", desc: "Step-by-step mindmap & time estimates" },
  { id: "exam_prep", icon: "📝", title: "Exam Prep (5/10M)", desc: "University questions & examiner keywords" },
  { id: "notes", icon: "≡", title: "Smart Notes", desc: "Concise cheat-sheets & key takeaways" },
  { id: "comic", icon: "🎨", title: "Learning Comic", desc: "Visual storytelling with AI SDXL" },
];

const topics = [
  "Apache Spark Architecture & RDD Lineage",
  "Neural Networks & Backpropagation",
  "DBMS Indexing & B-Trees",
  "Operating Systems Process Scheduling",
];

export default function StudentAILearning() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("explain");
  const [level, setLevel] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Interactive Quiz Answers State: { questionIndex: selectedOptionIndex }
  const [userAnswers, setUserAnswers] = useState({});

  // Flashcards State
  const [flippedCards, setFlippedCards] = useState({});
  const [masteredCards, setMasteredCards] = useState({});

  const generate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setUserAnswers({});
    setFlippedCards({});
    setMasteredCards({});

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/student/ai-learning/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          topic: topic.trim(),
          mode,
          level
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate AI learning material.");
      }

      setResult(data);
    } catch (err) {
      console.error("AI Learning generation error:", err);
      setError(err.message || "Failed to connect to AI server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuizOption = (qIdx, optIdx) => {
    if (userAnswers[qIdx] !== undefined) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };

  const handleFlipFlashcard = (id) => {
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleMastery = (id, e) => {
    e.stopPropagation();
    setMasteredCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyContent = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateQuizScore = () => {
    if (!result || !result.questions) return { score: 0, total: 0 };
    let correct = 0;
    result.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correct += 1;
      }
    });
    return { score: correct, total: result.questions.length };
  };

  const calculateMasteredCount = () => {
    return Object.values(masteredCards).filter(Boolean).length;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0813" }}>
      <StudentSidebar activeItem="AI Learning" />
      <div className="ai-learning-page" style={{ flex: 1, minWidth: 0 }}>
        <header className="ai-learning-header">
          <div>
            <p className="ai-eyebrow">SMARTCAMPUS / AI LEARNING STUDIO</p>
            <h1>Learn Smarter with AI <span>✦</span></h1>
            <p>Supercharged AI Tutor: Explanations, Interactive Quizzes, 3D Flashcards, Code Solvers, Exam Roadmaps & Comics.</p>
          </div>
        </header>

        <section className="ai-hero">
          <div className="ai-hero-content">
            <span className="ai-live-tag"><i /> AI LEARNING STUDIO</span>
            <h2>Your personal AI tutor suite.</h2>
            <p>
              Select any learning mode below to generate custom quizzes, lab code, spaced-repetition flashcards, and exam preparation material instantly.
            </p>
            <div className="ai-hero-points">
              <span>✦ 8 AI Learning Modes</span>
              <span>✦ Interactive 3D Flashcards</span>
              <span>✦ Code Solver & Exam Prep</span>
            </div>
          </div>
          <div className="ai-orb">
            <div className="ai-orb-inner">✦</div>
            <span className="orb-label">AI</span>
          </div>
        </section>

        {/* Workspace Form */}
        <section className="ai-workspace">
          <div className="ai-section-heading">
            <div>
              <h2>What do you want to learn?</h2>
              <p>Choose a mode, pick your learning level, and enter any course topic.</p>
            </div>
            <span className="ai-step">01 / CREATE</span>
          </div>

          <div className="ai-mode-grid-8">
            {modes.map((item) => (
              <button
                key={item.id}
                className={`ai-mode-card ${mode === item.id ? "active" : ""}`}
                onClick={() => setMode(item.id)}
              >
                <span className="ai-mode-icon">{item.icon}</span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
                <span className="ai-mode-check">{mode === item.id ? "✓" : "+"}</span>
              </button>
            ))}
          </div>

          <div className="ai-prompt-box">
            <label htmlFor="ai-topic">YOUR LEARNING TOPIC</label>
            <textarea
              id="ai-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Apache Spark DAG Scheduler, Neural Networks, DBMS B-Trees..."
              rows={3}
            />

            <div className="ai-topic-suggestions">
              <span>Try:</span>
              {topics.map((item) => (
                <button key={item} onClick={() => setTopic(item)}>
                  {item}
                </button>
              ))}
            </div>

            <div className="ai-prompt-footer">
              <div className="ai-level">
                <label htmlFor="ai-level">Learning level</label>
                <select id="ai-level" value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <button
                className="ai-generate-btn"
                onClick={generate}
                disabled={!topic.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="cbw-animate-spin" />
                    <span>Generating Content...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>✦ Generate with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Results Workspace Section */}
        <section className="ai-result-section">
          <div className="ai-section-heading">
            <div>
              <h2>Learning Workspace</h2>
              <p>Your dynamic AI-generated learning material will appear below.</p>
            </div>
            <span className="ai-step">02 / LEARN</span>
          </div>

          {error && (
            <div className="ai-error-box">
              ❌ <strong>Error:</strong> {error}
            </div>
          )}

          {loading ? (
            <div className="ai-empty-state">
              <div className="ai-loader" />
              <h3>Synthesizing AI Learning Content...</h3>
              <p>Analyzing topic "{topic}" at {level} level.</p>
            </div>
          ) : result ? (
            <div className="ai-generated-result-card">
              <div className="ai-result-header">
                <div>
                  <span className="ai-result-tag">
                    <Sparkles size={12} /> {result.mode.toUpperCase()} · {result.level}
                  </span>
                  <h3>{result.topic}</h3>
                </div>

                {(result.markdown || result.codeData) && (
                  <button
                    className="ai-copy-btn"
                    onClick={() => handleCopyContent(result.markdown || (result.codeData ? result.codeData.code : ""))}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copied!" : "Copy Content"}</span>
                  </button>
                )}
              </div>

              {/* 1. EXPLAIN MODE */}
              {result.mode === "explain" && (
                <div className="ai-explain-content">
                  <div className="ai-markdown-block">
                    {result.markdown.split("\n\n").map((para, idx) => (
                      <p key={idx} style={{ whiteSpace: "pre-wrap", margin: "0 0 1rem 0", lineHeight: "1.6" }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. QUIZ MODE */}
              {result.mode === "quiz" && result.questions && (
                <div className="ai-quiz-workspace">
                  <div className="ai-quiz-score-banner">
                    <div>
                      <h4>Interactive Self-Assessment Quiz</h4>
                      <p>Click your answers below to receive instant validation and explanations.</p>
                    </div>
                    {Object.keys(userAnswers).length > 0 && (
                      <div className="ai-score-pill">
                        <Award size={16} />
                        <span>Score: {calculateQuizScore().score} / {calculateQuizScore().total}</span>
                      </div>
                    )}
                  </div>

                  <div className="ai-questions-list">
                    {result.questions.map((q, qIdx) => {
                      const selectedOpt = userAnswers[qIdx];
                      const isAnswered = selectedOpt !== undefined;

                      return (
                        <div key={qIdx} className={`ai-question-card ${isAnswered ? "answered" : ""}`}>
                          <div className="ai-q-head">
                            <span className="ai-q-num">Q{qIdx + 1}</span>
                            <h5>{q.question}</h5>
                          </div>

                          <div className="ai-options-grid">
                            {q.options.map((optText, optIdx) => {
                              let optClass = "";
                              if (isAnswered) {
                                if (optIdx === q.correctIndex) optClass = "correct";
                                else if (optIdx === selectedOpt) optClass = "incorrect";
                              }

                              return (
                                <button
                                  key={optIdx}
                                  className={`ai-opt-btn ${optClass}`}
                                  onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                                  disabled={isAnswered}
                                >
                                  <span className="ai-opt-badge">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{optText}</span>
                                  {isAnswered && optIdx === q.correctIndex && <CheckCircle2 size={16} className="ai-correct-icon" />}
                                  {isAnswered && optIdx === selectedOpt && optIdx !== q.correctIndex && <XCircle size={16} className="ai-incorrect-icon" />}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div className="ai-q-exp-box">
                              <strong>💡 Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. FLASHCARDS MODE (NEW!) */}
              {result.mode === "flashcards" && result.flashcards && (
                <div className="ai-flashcards-workspace">
                  <div className="ai-quiz-score-banner">
                    <div>
                      <h4>Interactive 3D Revision Flashcards</h4>
                      <p>Click any card to flip between Question & Answer. Mark mastered cards to track retention!</p>
                    </div>
                    <div className="ai-score-pill">
                      <Flame size={16} />
                      <span>Mastered: {calculateMasteredCount()} / {result.flashcards.length}</span>
                    </div>
                  </div>

                  <div className="ai-flashcards-grid">
                    {result.flashcards.map((card) => {
                      const isFlipped = !!flippedCards[card.id];
                      const isMastered = !!masteredCards[card.id];

                      return (
                        <div
                          key={card.id}
                          className={`ai-flashcard-box ${isFlipped ? "flipped" : ""} ${isMastered ? "mastered" : ""}`}
                          onClick={() => handleFlipFlashcard(card.id)}
                        >
                          <div className="ai-card-inner">
                            {/* Front Side */}
                            <div className="ai-card-front">
                              <span className="ai-card-tag">{card.category || "CONCEPT"}</span>
                              <h4 className="ai-card-term">{card.term}</h4>
                              <span className="ai-card-flip-hint">🔄 Click to Flip</span>
                            </div>

                            {/* Back Side */}
                            <div className="ai-card-back">
                              <span className="ai-card-tag">ANSWER & DEFINITION</span>
                              <p className="ai-card-def">{card.definition}</p>

                              <button
                                className={`ai-master-btn ${isMastered ? "active" : ""}`}
                                onClick={(e) => handleToggleMastery(card.id, e)}
                              >
                                {isMastered ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
                                <span>{isMastered ? "Mastered ✅" : "Mark Mastered"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. CODE SOLVER MODE (NEW!) */}
              {result.mode === "code_solver" && result.codeData && (
                <div className="ai-code-workspace">
                  <div className="ai-code-header-bar">
                    <div className="ai-code-lang">
                      <Terminal size={16} />
                      <span>{result.codeData.language} Code Implementation</span>
                    </div>
                  </div>

                  <pre className="ai-code-block">
                    <code>{result.codeData.code}</code>
                  </pre>

                  {result.codeData.sampleOutput && (
                    <div className="ai-console-output">
                      <span className="ai-console-tag">▶ Expected Console Output:</span>
                      <code>{result.codeData.sampleOutput}</code>
                    </div>
                  )}

                  {result.codeData.explanation && (
                    <div className="ai-code-exp-card">
                      <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: "1.6" }}>
                        {result.codeData.explanation}
                      </p>
                    </div>
                  )}

                  {result.codeData.pitfalls && (
                    <div className="ai-pitfalls-box">
                      <h5>⚠️ Common Coding Pitfalls & Bugs:</h5>
                      <ul>
                        {result.codeData.pitfalls.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 5. LEARNING ROADMAP MODE (NEW!) */}
              {result.mode === "roadmap" && result.roadmap && (
                <div className="ai-roadmap-workspace">
                  <div className="ai-roadmap-header">
                    <h4><Compass size={18} /> Interactive Learning Pathway & Mindmap</h4>
                    <p>Follow this step-by-step masterclass sequence to master {result.topic}.</p>
                  </div>

                  <div className="ai-timeline-list">
                    {result.roadmap.map((stage) => (
                      <div key={stage.stage} className="ai-timeline-stage">
                        <div className="ai-timeline-badge">Stage {stage.stage}</div>
                        <div className="ai-timeline-body">
                          <div className="ai-stage-head">
                            <h5>{stage.title}</h5>
                            <span className="ai-hours-tag"><Clock size={12} /> ~{stage.estimatedHours} Hours</span>
                          </div>
                          <p>{stage.summary}</p>
                          <div className="ai-topics-chips">
                            {stage.topics.map((t, tIdx) => (
                              <span key={tIdx} className="ai-topic-chip">✦ {t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. EXAM PREP MODE (NEW!) */}
              {result.mode === "exam_prep" && (
                <div className="ai-exam-workspace">
                  <div className="ai-markdown-block">
                    {result.markdown.split("\n\n").map((para, idx) => (
                      <div key={idx} className="ai-exam-card">
                        <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: "1.6" }}>{para}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. SMART NOTES MODE */}
              {result.mode === "notes" && (
                <div className="ai-notes-content">
                  <div className="ai-markdown-block">
                    {result.markdown.split("\n\n").map((para, idx) => (
                      <div key={idx} className="ai-note-card">
                        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{para}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. COMIC MODE */}
              {result.mode === "comic" && (
                <div className="ai-comic-wrapper">
                  <ComicGenerator
                    isOpen={true}
                    defaultTopic={result.topic}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">✦</div>
              <h3>Your AI learning studio is ready</h3>
              <p>Pick a mode, enter any course topic above, and click "Generate with AI".</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}