import React, { useState, useEffect } from "react";
import {
  Wand2,
  Sparkles,
  Loader2,
  Download,
  FileDown,
  CheckCircle2,
  Clock,
  Timer,
  BookOpen,
  ImageIcon,
  Layers,
  RefreshCw,
  X,
  FileText,
  Upload
} from "lucide-react";
import "./comicgenerator.css";

const COMIC_API_BASE = "http://127.0.0.1:8009";

export default function ComicGenerator({ isOpen = true, onClose, courseId = "AD23531", defaultTopic = "Apache Spark Architecture" }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [notes, setNotes] = useState("");
  const [numPanels, setNumPanels] = useState(6);
  const [style, setStyle] = useState("educational comic book");
  const [targetAudience, setTargetAudience] = useState("college");
  const [llmProvider, setLlmProvider] = useState("gemini");
  const [pdfFile, setPdfFile] = useState(null);

  // Status & Progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState("");
  const [jobId, setJobId] = useState(null);
  const [comicResult, setComicResult] = useState(null);
  const [activeView, setActiveView] = useState("full_image");
  const [error, setError] = useState(null);
  const [regeneratingPanel, setRegeneratingPanel] = useState(null);

  // Publish to Course Materials State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [publishError, setPublishError] = useState(null);

  // Timers
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estTotalSeconds, setEstTotalSeconds] = useState(60);

  useEffect(() => {
    let timer;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGenerating]);

  const formatTimer = (totalSec) => {
    const sec = Math.max(0, Math.floor(totalSec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleStartGeneration = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setError(null);
    setComicResult(null);
    const estSec = Math.max(30, Number(numPanels) * 12 + 15);
    setEstTotalSeconds(estSec);
    setElapsedSeconds(0);
    setIsGenerating(true);
    setProgress(5);
    setStepMessage("Initializing Gemini Storyboard & SDXL Pipeline...");

    try {
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("text_notes", notes || "");
      formData.append("num_panels", numPanels);
      formData.append("style", style);
      formData.append("target_audience", targetAudience);
      formData.append("llm_provider", llmProvider);
      if (pdfFile) {
        formData.append("file", pdfFile);
      }

      const res = await fetch(`${COMIC_API_BASE}/api/comic/generate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to start comic generation.");
      }

      const data = await res.json();
      setJobId(data.job_id);
      await pollComicStatus(data.job_id);
    } catch (err) {
      console.error("Comic gen error:", err);
      setError(err.message || "Failed to connect to Comic Generator Backend on port 8009.");
      setIsGenerating(false);
    }
  };

  const pollComicStatus = async (jId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${COMIC_API_BASE}/api/comic/status/${jId}`);
        if (!res.ok) return;
        const data = await res.json();

        const pct = Math.min(100, Math.max(5, Math.round(data.progress > 1 ? data.progress : data.progress * 100)));
        setProgress(pct);
        setStepMessage(data.step || data.step_message || "Rendering comic panels...");

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setIsGenerating(false);

          if (data.status === "completed") {
            setComicResult(data.result || data);
          } else {
            setError(data.error || "Generation failed during panel rendering.");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
  };

  const handleRegeneratePanel = async (pNum) => {
    if (!jobId) return;
    setRegeneratingPanel(pNum);

    try {
      const res = await fetch(`${COMIC_API_BASE}/api/comic/panel/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          panel_number: pNum,
          prompt_override: ""
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setComicResult(updated);
      }
    } catch (err) {
      console.error("Panel regen error:", err);
    } finally {
      setRegeneratingPanel(null);
    }
  };

  const handlePublishComicToMaterials = async () => {
    if (!comicResult) return;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/materials/publish-comic", {
        method: "POST",
        headers,
        body: JSON.stringify({
          courseId: courseId || "AD23531",
          title: comicResult.title || topic,
          description: `AI Educational Comic Storyboard for topic: ${topic}`,
          comicData: comicResult
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to publish comic material.");
      }

      setPublishedSuccess(true);
    } catch (err) {
      console.error("Publish comic error:", err);
      setPublishError(err.message || "Failed to publish comic to course materials.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cg-wrapper">
      <div className="cg-container">
        {/* Header */}
        <header className="cg-header">
          <div className="cg-title-group">
            <div className="cg-icon-badge">
              <Wand2 size={20} />
            </div>
            <div>
              <h3>AI Educational Comic Generator</h3>
              <p>Standalone Visual Storyboarding & Art Generation Tool (SDXL Turbo + Gemini)</p>
            </div>
          </div>
          {onClose && (
            <button className="cg-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </header>

        {/* Main Body */}
        <div className="cg-body">
          {/* Controls Form */}
          <form onSubmit={handleStartGeneration} className="cg-form-panel">
            <div className="cg-form-row">
              <label>Topic / Concept Title *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Apache Spark Architecture & RDD Lineage"
                required
                disabled={isGenerating}
              />
            </div>

            <div className="cg-form-row">
              <label>Optional Source Notes / Lecture Text</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste key formulas, notes, or explanations to guide comic script..."
                disabled={isGenerating}
              />
            </div>

            <div className="cg-form-grid-3">
              <div className="cg-form-row">
                <label>Number of Panels</label>
                <select value={numPanels} onChange={(e) => setNumPanels(Number(e.target.value))} disabled={isGenerating}>
                  <option value={4}>4 Panels (Short Concept)</option>
                  <option value={6}>6 Panels (Detailed Architecture)</option>
                  <option value={8}>8 Panels (Full Chapter Walkthrough)</option>
                </select>
              </div>

              <div className="cg-form-row">
                <label>Visual Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={isGenerating}>
                  <option value="educational comic book">Educational Comic Book</option>
                  <option value="futuristic tech graphic novel">Futuristic Tech Graphic Novel</option>
                  <option value="vibrant manga textbook">Vibrant Manga Style</option>
                </select>
              </div>

              <div className="cg-form-row">
                <label>Target Audience</label>
                <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} disabled={isGenerating}>
                  <option value="college">College / Undergraduate</option>
                  <option value="high_school">High School</option>
                  <option value="beginners">Beginners / General</option>
                </select>
              </div>
            </div>

            <div className="cg-form-row">
              <label>Source PDF Upload (Optional)</label>
              <div className="cg-file-upload-box">
                <FileText size={16} />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                  disabled={isGenerating}
                />
                <span>{pdfFile ? pdfFile.name : "Attach reference PDF material"}</span>
              </div>
            </div>

            <button type="submit" className="cg-submit-btn" disabled={isGenerating || !topic.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="cg-spin" />
                  <span>Generating Educational Comic...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Comic Storyboard</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="cg-error-box">
              ❌ <strong>Error:</strong> {error}
            </div>
          )}

          {/* Active Generation Progress Card */}
          {isGenerating && (
            <div className="cg-progress-card">
              <div className="cg-progress-head">
                <Loader2 size={20} className="cg-spin" />
                <div>
                  <h4>Generating Educational Comic...</h4>
                  <p>{stepMessage}</p>
                </div>
              </div>

              <div className="cg-timer-bar">
                <div className="cg-timer-item elapsed">
                  <Clock size={14} />
                  <span>Elapsed: <strong>{formatTimer(elapsedSeconds)}</strong></span>
                </div>
                <div className="cg-timer-item countdown">
                  <Timer size={14} />
                  <span>Est. Remaining: <strong>{formatTimer(Math.max(0, estTotalSeconds - elapsedSeconds))}</strong></span>
                </div>
              </div>

              <div className="cg-progress-track">
                <div className="cg-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="cg-progress-meta">
                <span>Gemini Storyboard + SDXL Turbo Engine</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Generated Result Output */}
          {comicResult && (
            <div className="cg-result-section">
              {/* Publish to Students Prompt Card */}
              <div className="cg-publish-banner">
                <div className="cg-publish-info">
                  <span className="cg-publish-tag">📚 Teacher Publishing Prompt</span>
                  <h4>Do you want to upload & publish this Educational Comic for students in this course?</h4>
                  <p>Publishing will add this visual comic storyboard directly under Course Study Materials for student review.</p>
                </div>
                {publishedSuccess ? (
                  <div className="cg-publish-success-badge">
                    <CheckCircle2 size={18} />
                    <span>Published to Course Materials!</span>
                  </div>
                ) : (
                  <button
                    className="cg-publish-btn"
                    onClick={handlePublishComicToMaterials}
                    disabled={isPublishing}
                  >
                    {isPublishing ? <Loader2 size={16} className="cg-spin" /> : <Upload size={16} />}
                    <span>{isPublishing ? "Publishing to Course..." : "Publish to Course Materials"}</span>
                  </button>
                )}
              </div>
              {publishError && <div className="cg-error-box" style={{ marginTop: "10px" }}>❌ {publishError}</div>}

              <div className="cg-result-header">
                <div>
                  <span className="cg-badge"><CheckCircle2 size={14} /> Generated Comic Storyboard</span>
                  <h2>{comicResult.title || topic}</h2>
                </div>

                <div className="cg-actions-row">
                  <a href={`${COMIC_API_BASE}${comicResult.comic_png_url}`} target="_blank" rel="noreferrer" className="cg-btn primary">
                    <Download size={14} /> Download PNG
                  </a>
                  <a href={`${COMIC_API_BASE}${comicResult.comic_pdf_url}`} target="_blank" rel="noreferrer" className="cg-btn secondary">
                    <FileDown size={14} /> Download PDF
                  </a>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="cg-tabs">
                <button className={activeView === "full_image" ? "active" : ""} onClick={() => setActiveView("full_image")}>
                  <ImageIcon size={14} /> Full Composite Page
                </button>
                <button className={activeView === "panels" ? "active" : ""} onClick={() => setActiveView("panels")}>
                  <Layers size={14} /> Individual Panels ({comicResult.panels ? comicResult.panels.length : 0})
                </button>
              </div>

              {/* Content View */}
              {activeView === "full_image" ? (
                <div className="cg-full-preview">
                  <div className="cg-img-wrapper">
                    <img src={`${COMIC_API_BASE}${comicResult.comic_png_url}`} alt={comicResult.title} className="cg-full-img" />
                  </div>

                  {comicResult.panels && (
                    <div className="cg-breakdown-box">
                      <h3><BookOpen size={16} /> Architectural & Pedagogical Breakdown</h3>
                      <div className="cg-breakdown-grid">
                        {comicResult.panels.map((p, idx) => (
                          <div key={idx} className="cg-breakdown-card">
                            <span className="cg-panel-num">Panel {p.panel_number}</span>
                            <h4>{p.concept}</h4>
                            <p>{p.detailed_explanation || p.caption || p.concept}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="cg-panels-grid">
                  {comicResult.panels && comicResult.panels.map((p, idx) => (
                    <div key={idx} className="cg-panel-card">
                      <div className="cg-panel-header">Panel {p.panel_number}</div>
                      <img src={`${COMIC_API_BASE}${p.panel_image_url}`} alt={`Panel ${p.panel_number}`} />
                      <div className="cg-panel-info">
                        <h4>{p.concept}</h4>
                        {p.caption && <p className="cg-caption">"{p.caption}"</p>}
                        <p className="cg-exp">{p.detailed_explanation || p.caption || p.concept}</p>
                        <button
                          className="cg-regen-btn"
                          onClick={() => handleRegeneratePanel(p.panel_number)}
                          disabled={regeneratingPanel === p.panel_number}
                        >
                          {regeneratingPanel === p.panel_number ? <Loader2 size={13} className="cg-spin" /> : <RefreshCw size={13} />}
                          <span>Regenerate Panel</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
