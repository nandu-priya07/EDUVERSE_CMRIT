
import React from "react";
import "./Home.css";

const features = [
  {
    icon: "✦",
    title: "AI Learning Tutor",
    description:
      "Get instant explanations, personalized guidance, and answers to your academic questions.",
    tag: "AI POWERED",
    color: "violet",
  },
  {
    icon: "▧",
    title: "AI Comic Generator",
    description:
      "Transform complex concepts into engaging visual stories and educational comic panels.",
    tag: "VISUAL LEARNING",
    color: "pink",
  },
  {
    icon: "▶",
    title: "AI Video Studio",
    description:
      "Generate educational video content to understand difficult topics through visual learning.",
    tag: "COMING SOON",
    color: "blue",
  },
  {
    icon: "▤",
    title: "Smart Course Management",
    description:
      "Access course materials, lectures, notes, and resources in one organized learning space.",
    tag: "LMS",
    color: "orange",
  },
  {
    icon: "◈",
    title: "Progress Analytics",
    description:
      "Track academic performance, monitor learning progress, and identify areas for improvement.",
    tag: "INSIGHTS",
    color: "green",
  },
  {
    icon: "▣",
    title: "Smart Assessments",
    description:
      "Practice with quizzes, complete assignments, and evaluate your understanding.",
    tag: "ASSESSMENTS",
    color: "cyan",
  },
];

function Home() {
  return (
    <div className="landing">

      {/* NAVBAR */}
      <nav className="landing-nav">
        <a href="/" className="brand">
          <span className="brand-icon">S</span>
          <span>SmartCampus</span>
        </a>

        <div className="nav-links">
          <a href="#home" className="nav-active">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How it works</a>
        </div>

        <div className="nav-actions">
          <a href="/login" className="login-link">Log in</a>
          <a href="/login" className="nav-cta">
            Get Started <span>↗</span>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <main>
        <section className="hero-section" id="home">

          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              THE NEXT GENERATION OF EDUCATION
            </div>

            <h1>
              Education,
              <br />
              <span className="gradient-text">reimagined</span>
              <br />
              for everyone.
            </h1>

            <p className="hero-description">
              One intelligent platform for learning, teaching, and
              academic growth. Experience the power of AI-driven
              education with SmartCampus.
            </p>

            <div className="hero-actions">
              <a href="/login" className="hero-primary">
                Start Learning <span>→</span>
              </a>

              <a href="#features" className="hero-secondary">
                Explore Features <span>↓</span>
              </a>
            </div>

            <div className="hero-trust">
              <div className="trust-avatars">
                <span> S </span>
                <span> T </span>
                <span> A </span>
              </div>

              <div>
                <strong>One platform. Endless possibilities.</strong>
                <p>Designed for students and educators.</p>
              </div>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="hero-visual">
            <div className="visual-glow"></div>

            <div className="visual-orbit orbit-a"></div>
            <div className="visual-orbit orbit-b"></div>

            <div className="floating-card float-top">
              <span className="float-icon">✦</span>
              <div>
                <strong>AI Powered</strong>
                <small>Personalized learning</small>
              </div>
            </div>

            <div className="hero-core">
              <div className="core-inner">
                <span>✦</span>
              </div>
              <div className="core-ring"></div>
            </div>

            <div className="floating-card float-bottom">
              <div className="mini-chart">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div>
                <strong>Learn. Create. Grow.</strong>
                <small>Your journey starts here.</small>
              </div>
            </div>

            <div className="visual-tag tag-one">AI</div>
            <div className="visual-tag tag-two">01</div>
            <div className="visual-spark spark-one">✧</div>
            <div className="visual-spark spark-two">✦</div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="marquee">
          <div className="marquee-track">
            <span>SMART LEARNING</span>
            <i>✦</i>
            <span>AI EDUCATION</span>
            <i>✦</i>
            <span>PERSONALIZED GROWTH</span>
            <i>✦</i>
            <span>FUTURE READY</span>
            <i>✦</i>
            <span>SMART LEARNING</span>
            <i>✦</i>
            <span>AI EDUCATION</span>
            <i>✦</i>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="eyebrow">✦ EVERYTHING YOU NEED</span>
            <h2>
              More than an LMS.
              <br />
              <span className="gradient-text">A smarter way to learn.</span>
            </h2>
            <p>
              A complete academic ecosystem combining traditional
              learning tools with next-generation AI capabilities.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature, index) => (
              <article
                className="feature-card"
                key={feature.title}
                style={{ "--delay": `${index * 80}ms` }}
              >
                <div className={`feature-icon ${feature.color}`}>
                  {feature.icon}
                </div>

                <span className="feature-tag">{feature.tag}</span>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>

                <a href="/login" className="feature-link">
                  Explore feature <span>↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* ABOUT / AI SECTION */}
        <section className="ai-section" id="about">
          <div className="ai-visual">
            <div className="ai-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span><span></span><span></span>
                </div>
                <span>SmartCampus AI</span>
                <span>✦</span>
              </div>

              <div className="chat-content">
                <div className="chat-label">YOUR AI TUTOR</div>

                <div className="chat-message user-message">
                  Explain neural networks simply.
                </div>

                <div className="chat-message ai-message">
                  <span className="ai-avatar">✦</span>
                  <div>
                    A neural network is inspired by how the human brain
                    processes information. It learns patterns from data
                    through interconnected layers.
                  </div>
                </div>

                <div className="chat-suggestions">
                  <span>Generate notes</span>
                  <span>Create a quiz</span>
                  <span>Visualize concept</span>
                </div>

                <div className="chat-input">
                  Ask anything about your subject...
                  <span>↑</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ai-content">
            <span className="eyebrow">✦ LEARNING, REDEFINED</span>

            <h2>
              Your personal
              <br />
              <span className="gradient-text">AI learning companion.</span>
            </h2>

            <p>
              Learning shouldn't be limited to textbooks and lectures.
              SmartCampus brings intelligent assistance directly into
              your academic journey.
            </p>

            <ul className="ai-benefits">
              <li><span>✓</span> Understand difficult concepts faster</li>
              <li><span>✓</span> Generate personalized study materials</li>
              <li><span>✓</span> Learn through interactive visual content</li>
              <li><span>✓</span> Practice and evaluate your knowledge</li>
            </ul>

            <a href="/login" className="hero-primary">
              Experience AI Learning →
            </a>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="steps-section" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">✦ SIMPLE BY DESIGN</span>
            <h2>
              Your journey to
              <br />
              <span className="gradient-text">smarter learning.</span>
            </h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon">⌘</div>
              <h3>Access your campus</h3>
              <p>Log in to your personalized academic workspace.</p>
            </div>

            <div className="step-connector">→</div>

            <div className="step-card">
              <span className="step-number">02</span>
              <div className="step-icon">✦</div>
              <h3>Explore and learn</h3>
              <p>Discover courses, resources, and AI learning tools.</p>
            </div>

            <div className="step-connector">→</div>

            <div className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon">◈</div>
              <h3>Grow continuously</h3>
              <p>Track your progress and achieve your academic goals.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-glow"></div>

          <span className="eyebrow">✦ YOUR FUTURE STARTS HERE</span>

          <h2>
            Ready to transform
            <br />
            the way you learn?
          </h2>

          <p>
            Step into a smarter academic experience with SmartCampus.
          </p>

          <a href="/login" className="cta-button">
            Get Started Today <span>→</span>
          </a>

          <div className="cta-decoration">✦</div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-top">
          <a href="/" className="brand">
            <span className="brand-icon">S</span>
            <span>SmartCampus</span>
          </a>

          <p>Empowering the next generation of learners.</p>

          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="/login">Login</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SmartCampus. All rights reserved.</span>
          <span>Built for the future of education. ✦</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;