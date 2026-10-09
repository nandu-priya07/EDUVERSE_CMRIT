
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./createassignment.css";

export default function CreateAssignment() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    title: "",
    course_id: "",
    description: "",
    instructions: "",
    start_at: "",
    due_at: "",
    max_marks: 100,
    allow_late_submission: false,
    max_file_size_mb: 10,
    allowed_file_types: "pdf, doc, docx",
    attachment_url: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/teacher/courses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCourses(data.data);
          if (data.data.length > 0) {
            setForm((prev) => ({ ...prev, course_id: data.data[0].id }));
          }
        }
      } catch (err) {
        console.error("Error fetching courses for teacher:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchTeacherCourses();
  }, []);

  const update = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.course_id) newErrors.course_id = "Select a course";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (!form.due_at) newErrors.due_at = "Due date is required";

    if (form.start_at && form.due_at && new Date(form.due_at) <= new Date(form.start_at)) {
      newErrors.due_at = "Due date must be after start date";
    }

    if (Number(form.max_marks) <= 0) {
      newErrors.max_marks = "Maximum marks must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status) => {
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError("");

    const token = localStorage.getItem("token");

    const payload = {
      course_id: form.course_id,
      title: form.title.trim(),
      description: form.description.trim(),
      instructions: form.instructions ? form.instructions.trim() : "",
      max_marks: Number(form.max_marks) || 100,
      start_at: form.start_at || null,
      due_at: form.due_at,
      allow_late_submission: form.allow_late_submission,
      max_file_size_mb: Number(form.max_file_size_mb) || 10,
      allowed_file_types: form.allowed_file_types
        ? form.allowed_file_types.split(",").map((t) => t.trim().toLowerCase())
        : ["pdf", "doc", "docx"],
      attachment_url: form.attachment_url || null,
      status: status.toLowerCase(),
    };

    try {
      const res = await fetch("http://localhost:5000/api/teacher/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        navigate("/teacher/assignments");
      } else {
        setSubmitError(data.message || "Failed to create assignment");
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
      setSubmitError("Server connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourseObj = courses.find((c) => c.id === form.course_id);

  return (
    <div className="create-assignment">
      <header className="ca-header">
        <div>
          <button
            className="ca-back"
            onClick={() => navigate("/teacher/assignments")}
          >
            ← Back to Assignments
          </button>

          <h1>Create Assignment</h1>
          <p>Create and manage coursework for your students.</p>
        </div>

        <span className="ca-status">New Assignment</span>
      </header>

      {submitError && (
        <div style={{ padding: "12px 20px", margin: "0 24px 20px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "14px" }}>
          ⚠️ {submitError}
        </div>
      )}

      <div className="ca-layout">
        <main className="ca-main">

          <section className="ca-card">
            <div className="ca-section-title">
              <span>01</span>
              <div>
                <h2>Basic Information</h2>
                <p>Provide the assignment details.</p>
              </div>
            </div>

            <div className="ca-field">
              <label>Assignment Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={update}
                placeholder="e.g. Neural Network Implementation"
              />
              {errors.title && <small>{errors.title}</small>}
            </div>

            <div className="ca-grid">
              <div className="ca-field">
                <label>Course *</label>
                {loadingCourses ? (
                  <select disabled><option>Loading courses...</option></select>
                ) : (
                  <select
                    name="course_id"
                    value={form.course_id}
                    onChange={update}
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.course_id && <small>{errors.course_id}</small>}
              </div>

              <div className="ca-field">
                <label>Maximum Marks *</label>
                <input
                  type="number"
                  min="1"
                  name="max_marks"
                  value={form.max_marks}
                  onChange={update}
                />
                {errors.max_marks && <small>{errors.max_marks}</small>}
              </div>
            </div>

            <div className="ca-field">
              <label>Description *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={update}
                placeholder="Describe what students are expected to complete..."
                rows="5"
              />
              {errors.description && <small>{errors.description}</small>}
            </div>
          </section>

          <section className="ca-card">
            <div className="ca-section-title">
              <span>02</span>
              <div>
                <h2>Schedule & Submission Rules</h2>
                <p>Set start/due dates and file restrictions.</p>
              </div>
            </div>

            <div className="ca-grid">
              <div className="ca-field">
                <label>Start Date & Time</label>
                <input
                  type="datetime-local"
                  name="start_at"
                  value={form.start_at}
                  onChange={update}
                />
              </div>

              <div className="ca-field">
                <label>Due Date & Time *</label>
                <input
                  type="datetime-local"
                  name="due_at"
                  value={form.due_at}
                  onChange={update}
                />
                {errors.due_at && <small>{errors.due_at}</small>}
              </div>

              <div className="ca-field">
                <label>Max File Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  name="max_file_size_mb"
                  value={form.max_file_size_mb}
                  onChange={update}
                />
              </div>

              <div className="ca-field">
                <label>Allowed File Types (comma separated)</label>
                <input
                  type="text"
                  name="allowed_file_types"
                  value={form.allowed_file_types}
                  onChange={update}
                  placeholder="pdf, doc, docx, zip"
                />
              </div>
            </div>

            <div className="ca-field" style={{ marginTop: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="allow_late_submission"
                  checked={form.allow_late_submission}
                  onChange={update}
                  style={{ width: "18px", height: "18px" }}
                />
                <span>Allow late submission after due date</span>
              </label>
            </div>
          </section>

          <section className="ca-card">
            <div className="ca-section-title">
              <span>03</span>
              <div>
                <h2>Resources & Instructions</h2>
                <p>Attach reference material links and submission guidelines.</p>
              </div>
            </div>

            <div className="ca-field">
              <label>Attachment URL (PDF / Drive link)</label>
              <input
                type="text"
                name="attachment_url"
                value={form.attachment_url}
                onChange={update}
                placeholder="https://example.com/assignment-spec.pdf"
              />
            </div>

            <div className="ca-field">
              <label>Submission Instructions</label>
              <textarea
                name="instructions"
                value={form.instructions}
                onChange={update}
                placeholder="Mention formatting guidelines, submission rules, code structure, etc."
                rows="4"
              />
            </div>
          </section>

          <div className="ca-actions">
            <button
              className="ca-cancel"
              disabled={isSubmitting}
              onClick={() => navigate("/teacher/assignments")}
            >
              Cancel
            </button>

            <button
              className="ca-draft"
              disabled={isSubmitting}
              onClick={() => handleSubmit("draft")}
            >
              {isSubmitting ? "Saving..." : "Save Draft"}
            </button>

            <button
              className="ca-publish"
              disabled={isSubmitting}
              onClick={() => handleSubmit("published")}
            >
              {isSubmitting ? "Publishing..." : "Publish Assignment →"}
            </button>
          </div>
        </main>

        <aside className="ca-preview">
          <div className="ca-preview-top">
            <span>LIVE PREVIEW</span>
            <span className="ca-dot" />
          </div>

          <div className="ca-preview-icon">📝</div>
          <h2>{form.title || "Assignment Title"}</h2>
          <p>{selectedCourseObj ? `${selectedCourseObj.code} - ${selectedCourseObj.name}` : "Select a course"}</p>

          <div className="ca-preview-info">
            <div>
              <span>Max Marks</span>
              <strong>{form.max_marks}</strong>
            </div>
            <div>
              <span>Late Submission</span>
              <strong>{form.allow_late_submission ? "Allowed" : "Not Allowed"}</strong>
            </div>
            <div>
              <span>Max File Size</span>
              <strong>{form.max_file_size_mb} MB</strong>
            </div>
            <div>
              <span>Due Date</span>
              <strong>
                {form.due_at
                  ? new Date(form.due_at).toLocaleString()
                  : "Not set"}
              </strong>
            </div>
          </div>

          <div className="ca-preview-description">
            <h4>Description</h4>
            <p>
              {form.description ||
                "Your assignment description will appear here."}
            </p>
          </div>

          <div className="ca-preview-note">
            <span>✦</span>
            Students will be able to view this assignment once published.
          </div>
        </aside>
      </div>
    </div>
  );
}