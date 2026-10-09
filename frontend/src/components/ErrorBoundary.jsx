import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b12",
          color: "#f4f4f8",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "1rem", color: "#f87171" }}>
            Something went wrong rendering this page
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "500px", marginBottom: "1.5rem", fontSize: "14px" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#7652d6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Retry / Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
