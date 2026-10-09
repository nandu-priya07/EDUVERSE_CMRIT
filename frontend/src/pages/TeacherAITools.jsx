import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./teacheraitools.css";

const tools = [
  {
    id: "questions",
    title: "Question Generator",
    description: "Generate MCQs, short answers and descriptive questions.",
    icon: "📝",
  },
  {
    id: "lesson",
    title: "Lesson Plan Generator",
    description: "Create structured lesson plans with learning objectives.",
    icon: "📚",
  },
  {
    id: "comic",
    title: "Educational Comic Generator",
    description: "Convert complex concepts into visual storyboards.",
    icon: "🎨",
  },
];

export default function TeacherAITools() {
  const navigate = useNavigate();

  const [activeTool, setActiveTool] = useState("questions");
  const [topic, setTopic] = useState("");
  const [course, setCourse] = useState("Artificial Intelligence");
  const [level, setLevel] = useState("Intermediate");
  const [count, setCount] = useState("5");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  const selectedTool = tools.find((tool) => tool.id === activeTool);

  const generateContent = () => {
    if (!topic.trim()) {
      alert("Please enter a topic");
      return;
    }

    setLoading(true);
    setOutput("");

    // Demo generation. Replace with backend AI API later.
    setTimeout(() => {
      let result = "";

      if (activeTool === "questions") {
        result = `QUESTION PAPER
Course: ${course}
Topic: ${topic}
Level: ${level}

1. Explain the fundamental concepts of ${topic}.
2. What are the important applications of ${topic}?
3. Describe the architecture or working principle of ${topic}.
4. Compare the advantages and limitations of ${topic}.
5. Explain a real-world use case of ${topic}.

Note: This is demo output. Connect an AI API for actual generated questions.`;
      } else if (activeTool === "lesson") {
        result = `LESSON PLAN

Course: ${course}
Topic: ${topic}
Level: ${level}
Duration: 60 Minutes

Learning Objectives:
• Understand the fundamentals of ${topic}
• Identify key concepts and components
• Apply the concept to practical problems

Teaching Schedule:
1. Introduction – 10 min
2. Core Concepts – 20 min
3. Practical Example – 15 min
4. Student Activity – 10 min
5. Recap – 5 min

Assessment:
Ask students to explain ${topic} using a practical example.`;
      } else {
        result = `EDUCATIONAL COMIC STORYBOARD

Topic: ${topic}

Panel 1 – Introduction
A student encounters a problem related to ${topic}.

Panel 2 – Discovery
A teacher introduces the core concept.

Panel 3 – Explanation
The concept is explained through a simple real-world analogy.

Panel 4 – Application
The student applies ${topic} to solve a practical problem.

Panel 5 – Conclusion
The student summarizes what was learned.

This is a storyboard draft. Connect an image-generation API to create actual comic panels.`;
      }

      setOutput(result);
      setLoading(false);
    }, 1200);
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      alert("Copied successfully!");
    } catch {
      alert("Unable to copy");
    }
  };

  return (
    <div className="teacher-ai-page">
      <aside className="teacher-ai-sidebar">
        <div className="teacher-ai-brand">
          <div className="teacher-ai-logo">S</div>
          <div>
            <h2>SmartCampus</h2>
            <span>Teacher Portal</span>
          </div>
        </div>

        <div className="teacher-ai-nav-label">WORKSPACE</div>

        <nav className="teacher-ai-nav">
          <button onClick={() => navigate("/teacher-dashboard")}>
            <span>▦</span> Dashboard
          </button>
          <button onClick={() => navigate("/teacher/courses")}>
            <span>▤</span> My Courses
          </button>
          <button onClick={() => navigate("/teacher/students")}>
            <span>♙</span> Students
          </button>
          <button onClick={() => navigate("/teacher/assignments")}>
            <span>▧</span> Assignments
          </button>
          <button onClick={() => navigate("/teacher/assessments")}>
            <span>☑</span> Assessments
          </button>
          <button onClick={() => navigate("/teacher/attendance")}>
            <span>◷</span> Attendance
          </button>
          <button onClick={() => navigate("/teacher/analytics")}>
            <span>▥</span> Analytics
          </button>
          <button className="active">
            <span>✦</span> AI Teaching Tools
          </button>
        </nav>

        <div className="teacher-ai-sidebar-bottom">
          <button onClick={() => navigate("/teacher/settings")}>
            ⚙ Settings
          </button>
          <button onClick={() => navigate("/login")}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="teacher-ai-main">
        <header className="teacher-ai-header">
          <div>
            <span className="teacher-ai-eyebrow">SMARTCAMPUS / AI LAB</span>
            <h1>AI Teaching Tools</h1>
            <p>Plan, create and transform your teaching materials.</p>
          </div>
          <div className="teacher-ai-avatar">T</div>
        </header>

        <section className="teacher-ai-hero">
          <div>
            <span className="teacher-ai-hero-tag">✦ AI POWERED WORKSPACE</span>
            <h2>Teach smarter.<br />Create faster.</h2>
            <p>
              Generate educational content, build structured lessons,
              and transform concepts into engaging learning experiences.
            </p>
          </div>
          <div className="teacher-ai-hero-art">✦</div>
        </section>

        <section className="teacher-ai-tools">
          <div className="teacher-ai-section-heading">
            <div>
              <h2>Choose your AI tool</h2>
              <p>Select a tool to start creating.</p>
            </div>
          </div>

          <div className="teacher-ai-tool-grid">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className={`teacher-ai-tool-card ${
                  activeTool === tool.id ? "selected" : ""
                }`}
                onClick={() => {
                  setActiveTool(tool.id);
                  setOutput("");
                }}
              >
                <div className="teacher-ai-tool-icon">{tool.icon}</div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
                <span className="teacher-ai-tool-action">
                  Use tool ↗
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="teacher-ai-workspace">
          <div className="teacher-ai-workspace-heading">
            <div>
              <span className="teacher-ai-workspace-icon">
                {selectedTool.icon}
              </span>
              <div>
                <h2>{selectedTool.title}</h2>
                <p>{selectedTool.description}</p>
              </div>
            </div>
            <span className="teacher-ai-beta">DEMO MODE</span>
          </div>

          <div className="teacher-ai-form">
            <div className="teacher-ai-field">
              <label>Course</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                <option>Artificial Intelligence</option>
                <option>Data Structures</option>
                <option>Machine Learning</option>
                <option>Database Management Systems</option>
                <option>Computer Networks</option>
                <option>Data Science</option>
              </select>
            </div>

            <div className="teacher-ai-field">
              <label>Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Neural Networks, DBMS Normalization..."
              />
            </div>

            <div className="teacher-ai-field-row">
              <div className="teacher-ai-field">
                <label>Difficulty Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>

              <div className="teacher-ai-field">
                <label>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>English</option>
                  <option>Tamil</option>
                  <option>Telugu</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>

            {activeTool === "questions" && (
              <div className="teacher-ai-field">
                <label>Number of Questions</label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                >
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                  <option value="15">15 Questions</option>
                  <option value="20">20 Questions</option>
                </select>
              </div>
            )}

            <button
              className="teacher-ai-generate"
              onClick={generateContent}
              disabled={loading}
            >
              {loading ? "Generating..." : "✦ Generate Content"}
            </button>
          </div>

          <div className="teacher-ai-output">
            <div className="teacher-ai-output-header">
              <div>
                <h3>Generated Content</h3>
                <p>Your AI-generated material will appear here.</p>
              </div>
              {output && (
                <button onClick={copyOutput}>Copy ↗</button>
              )}
            </div>

            {loading ? (
              <div className="teacher-ai-loading">
                <div className="teacher-ai-spinner" />
                <p>Creating your content...</p>
              </div>
            ) : output ? (
              <pre>{output}</pre>
            ) : (
              <div className="teacher-ai-empty">
                <div>✦</div>
                <h3>Ready to create?</h3>
                <p>
                  Enter a topic and generate your teaching material.
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="teacher-ai-footer">
          SmartCampus LMS · AI Teaching Workspace
        </footer>
      </main>
    </div>
  );
}