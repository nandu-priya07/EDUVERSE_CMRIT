import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Store authentication data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Login successful! User role:", data.user.role);

      const userRole = data.user?.role || role;

      // Redirect based on user role
      if (userRole === "admin" || userRole === "hod") {
        navigate("/admin/dashboard");
      } else if (userRole === "teacher") {
        navigate("/teacher-dashboard");
      } else if (userRole === "student") {
        navigate("/studentdashboard");
      } else if (data.redirectTo && data.redirectTo !== "/") {
        navigate(data.redirectTo);
      } else {
        navigate("/admin/dashboard");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMessage(error.message || "Sign in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* LEFT BRANDING PANEL */}
      <section className="login-brand-panel">

        <Link to="/" className="login-brand">
          <span className="login-brand-icon">S</span>
          <span>SmartCampus</span>
        </Link>

        <div className="login-brand-content">
          <span className="login-eyebrow">
            ✦ THE FUTURE OF EDUCATION
          </span>

          <h1>
            Learn beyond
            <br />
            <span>boundaries.</span>
          </h1>

          <p>
            Your academic world, intelligently connected.
            Access courses, collaborate, and discover a
            smarter way to learn.
          </p>

          <div className="login-illustration">
            <div className="login-orbit orbit-1"></div>
            <div className="login-orbit orbit-2"></div>

            <div className="login-illustration-core">
              ✦
            </div>

            <div className="login-float float-1">
              <span>✦</span>
              AI Powered
            </div>

            <div className="login-float float-2">
              <span>◈</span>
              Smart Learning
            </div>

            <div className="login-star star-1">✧</div>
            <div className="login-star star-2">✦</div>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>© 2026 SmartCampus</span>
          <span>Built for the future of learning.</span>
        </div>
      </section>

      {/* RIGHT LOGIN PANEL */}
      <section className="login-form-panel">

        <div className="login-mobile-brand">
          <Link to="/" className="login-brand">
            <span className="login-brand-icon">S</span>
            <span>SmartCampus</span>
          </Link>
        </div>

        <div className="login-form-wrapper">

          <div className="login-heading">
            <span className="login-small-label">
              WELCOME BACK
            </span>

            <h2>Sign in to your account</h2>

            <p>
              Enter your credentials to access your learning space.
            </p>
          </div>

          {errorMessage && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.9rem"
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin}>

            {/* ROLE SELECTOR */}
            <label className="login-label">I am signing in as</label>

            <div className="role-selector">
              {[
                { value: "student", label: "Student", icon: "◉" },
                { value: "teacher", label: "Teacher", icon: "▤" },
                { value: "hod", label: "HOD", icon: "◈" },
                { value: "admin", label: "Admin", icon: "⚙" },
              ].map((item) => (

                <button
                  type="button"
                  key={item.value}
                  className={`role-option ${
                    role === item.value ? "selected" : ""
                  }`}
                  onClick={() => setRole(item.value)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* EMAIL */}
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email or Username
              </label>

              <div className="login-input-wrapper">
                <span className="input-icon">✉</span>

                <input
                  id="email"
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="login-field">
              <div className="password-label-row">
                <label htmlFor="password" className="login-label">
                  Password
                </label>

                <a href="/forgot-password">
                  Forgot password?
                </a>
              </div>

              <div className="login-input-wrapper">
                <span className="input-icon">♙</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* REMEMBER */}
            <div className="login-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <span className="secure-label">
                <span>●</span> Secure login
              </span>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <span>→</span>}
            </button>

          </form>

          <div className="login-divider">
            <span></span>
            <p>SMARTCAMPUS LMS</p>
            <span></span>
          </div>

          <div className="login-help">
            <div className="help-icon">✦</div>
            <div>
              <strong>Need access?</strong>
              <p>
                Contact your institution administrator
                to obtain your login credentials.
              </p>
            </div>
          </div>

          <p className="login-back">
            <Link to="/">← Back to Home</Link>
          </p>

        </div>

        <div className="login-mobile-footer">
          © 2026 SmartCampus
        </div>

      </section>
    </div>
  );
}

export default Login;