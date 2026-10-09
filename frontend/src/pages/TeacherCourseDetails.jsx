import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Users,
  FileText,
  ClipboardList,
  Search,
  Download,
  Plus,
  CalendarDays,
  GraduationCap,
  Clock,
  MoreVertical,
  ExternalLink,
  HelpCircle,
  CheckCircle,
  Upload,
  Trash2,
  X,
  Bot,
  Sparkles,
} from "lucide-react";

import ComicBotWindow from "../components/ComicBotWindow";
import ComicGenerator from "../components/ComicGenerator";
import "./teachermycourses.css";
import "./TeacherCourseDetails.css";


const API_URL = "http://localhost:5000/api";

export default function TeacherCourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignedSection, setAssignedSection] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quizFilter, setQuizFilter] = useState("All");
  const [assignFilter, setAssignFilter] = useState("All");

  const getQuizCategory = (quiz) => {
    const now = new Date();
    const endAt = quiz.end_at || quiz.endAt ? new Date(quiz.end_at || quiz.endAt) : null;
    const startAt = quiz.start_at || quiz.startAt ? new Date(quiz.start_at || quiz.startAt) : null;

    if (quiz.status === "closed" || quiz.status === "Closed" || (endAt && !isNaN(endAt.getTime()) && now > endAt)) {
      return "Closed";
    }
    if (startAt && !isNaN(startAt.getTime()) && now < startAt) {
      return "Upcoming";
    }
    return "Ongoing";
  };

  const getAssignmentCategory = (assign) => {
    const now = new Date();
    const dueAt = assign.due_at || assign.dueAt || assign.due_date ? new Date(assign.due_at || assign.dueAt || assign.due_date) : null;
    const startAt = assign.start_at || assign.startAt ? new Date(assign.start_at || assign.startAt) : null;

    if (assign.status === "closed" || assign.status === "Closed" || (dueAt && !isNaN(dueAt.getTime()) && now > dueAt)) {
      return "Closed";
    }
    if (startAt && !isNaN(startAt.getTime()) && now < startAt) {
      return "Upcoming";
    }
    return "Ongoing";
  };

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/teacher/courses/${courseId}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuizzes(data.data || []);
      }
    } catch (err) {
      console.error("Fetch quizzes error:", err);
    }
  };

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        console.log("Fetching teacher course details for courseId:", courseId, "Token present:", !!token);

        const response = await fetch(
          `${API_URL}/teacher/courses/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        console.log("Teacher course fetch status:", response.status, result);

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to fetch course details");
        }

        setCourse(result.data.course);
        setStudents(result.data.students || []);
        setAssignments(result.data.assignments || []);
        setMaterials(result.data.materials || []);
        setAssignedSection(result.data.assignedSection || result.data.assignment?.section || null);
        fetchQuizzes();
      } catch (err) {
        console.error("fetchCourseDetails error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchCourseDetails();
  }, [courseId]);


  const handlePublishQuiz = async (quizId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/teacher/quizzes/${quizId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchQuizzes();
      } else {
        alert(data.message || "Failed to publish quiz.");
      }
    } catch (err) {
      alert("Error publishing quiz.");
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/teacher/quizzes/${quizId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchQuizzes();
      } else {
        alert(data.message || "Failed to delete quiz.");
      }
    } catch (err) {
      alert("Error deleting quiz.");
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Material state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialType, setMaterialType] = useState("PDF Document");
  const [materialDescription, setMaterialDescription] = useState("");
  const [selectedMaterialFile, setSelectedMaterialFile] = useState(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState("");

  const fetchMaterialsForCourse = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/materials/course/${course?.id || courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaterials(data.data || []);
      }
    } catch (err) {
      console.error("Error refreshing course materials:", err);
    }
  };

  const handleUploadMaterial = async (e) => {
    if (e) e.preventDefault();
    if (!materialTitle.trim()) {
      setMaterialError("Material title is required.");
      return;
    }
    setIsUploadingMaterial(true);
    setMaterialError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("courseId", course?.id || courseId);
      formData.append("title", materialTitle.trim());
      formData.append("type", materialType);
      formData.append("description", materialDescription.trim());
      if (selectedMaterialFile) {
        formData.append("file", selectedMaterialFile);
      }

      const res = await fetch(`${API_URL}/materials/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowMaterialModal(false);
        setMaterialTitle("");
        setMaterialType("PDF Document");
        setMaterialDescription("");
        setSelectedMaterialFile(null);
        setToastMessage(`Study material "${materialTitle}" uploaded successfully!`);
        setTimeout(() => setToastMessage(""), 4000);
        await fetchMaterialsForCourse();
      } else {
        setMaterialError(data.message || "Failed to upload material.");
      }
    } catch (err) {
      console.error("Error uploading material:", err);
      setMaterialError("Server connection error while uploading material.");
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this study material?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/materials/${materialId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage("Material deleted successfully.");
        setTimeout(() => setToastMessage(""), 3000);
        fetchMaterialsForCourse();
      } else {
        alert(data.message || "Failed to delete material.");
      }
    } catch (err) {
      alert("Error deleting material.");
    }
  };

  const emptyAssignmentForm = {
    title: "",
    description: "",
    instructions: "",
    max_marks: 100,
    start_at: "",
    due_at: "",
    allow_late_submission: false,
    max_file_size_mb: 10,
    allowed_file_types: "pdf, doc, docx",
    attachment_url: "",
  };

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);

  const fetchAssignmentsForCourse = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/teacher/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignments(data.data.assignments || []);
      }
    } catch (err) {
      console.error("Error refreshing course assignments:", err);
    }
  };

  const handleCreateAssignment = async (status) => {
    if (!assignmentForm.title.trim()) {
      setAssignmentError("Assignment title is required.");
      return;
    }
    if (!assignmentForm.due_at) {
      setAssignmentError("Due date and time is required.");
      return;
    }
    if (assignmentForm.start_at && assignmentForm.due_at && new Date(assignmentForm.due_at) <= new Date(assignmentForm.start_at)) {
      setAssignmentError("Due date must be later than the start date.");
      return;
    }

    setIsSubmittingAssignment(true);
    setAssignmentError("");

    try {
      const token = localStorage.getItem("token");
      const payload = {
        courseId: course?.id || courseId,
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        instructions: assignmentForm.instructions.trim(),
        maxMarks: Number(assignmentForm.max_marks) || 100,
        startAt: assignmentForm.start_at || null,
        dueAt: assignmentForm.due_at,
        allowLateSubmission: assignmentForm.allow_late_submission,
        maxFileSizeMb: Number(assignmentForm.max_file_size_mb) || 10,
        allowedFileTypes: assignmentForm.allowed_file_types
          ? assignmentForm.allowed_file_types.split(",").map((t) => t.trim().toLowerCase())
          : ["pdf", "doc", "docx"],
        attachmentUrl: assignmentForm.attachment_url || null,
        status: status.toLowerCase(),
      };

      const res = await fetch(`${API_URL}/teacher/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowCreateModal(false);
        setAssignmentForm(emptyAssignmentForm);
        setToastMessage(`Assignment "${payload.title}" created successfully!`);
        setTimeout(() => setToastMessage(""), 4000);
        await fetchAssignmentsForCourse();
      } else {
        setAssignmentError(data.message || "Failed to create assignment.");
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
      setAssignmentError("Server connection error while creating assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/teacher/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage("Assignment deleted.");
        setTimeout(() => setToastMessage(""), 3000);
        fetchAssignmentsForCourse();
      } else {
        alert(data.message || "Failed to delete assignment.");
      }
    } catch (err) {
      alert("Error deleting assignment.");
    }
  };

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.register_number} ${student.department} ${student.section} ${student.assigned_staff}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  if (loading) {
    return (
      <div className="tcd-layout-container" style={{ display: "flex", minHeight: "100vh", background: "#0b0813" }}>
        <aside className="tmc-sidebar">
          <div className="tmc-brand"><span className="tmc-brand-icon">✦</span><span>SmartCampus</span></div>
        </aside>
        <main className="tmc-main" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", color: "#a1a1b5", flex: 1 }}>
          <div className="tcd-spinner" style={{ width: "36px", height: "36px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "tcd-spin 1s linear infinite", marginBottom: "1rem" }} />
          <p>Loading course details...</p>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="tcd-layout-container" style={{ display: "flex", minHeight: "100vh", background: "#0b0813" }}>
        <aside className="tmc-sidebar">
          <div className="tmc-brand"><span className="tmc-brand-icon">✦</span><span>SmartCampus</span></div>
        </aside>
        <main className="tmc-main" style={{ padding: "40px", textAlign: "center", color: "#f87171", flex: 1 }}>
          <BookOpen size={44} style={{ marginBottom: "1rem" }} />
          <h2>Course not found</h2>
          <p style={{ color: "#94a3b8", margin: "1rem 0 2rem" }}>{error || "This course is unavailable."}</p>
          <button className="tcd-primary-btn" style={{ margin: "0 auto" }} onClick={() => navigate("/teacher/courses")}>← Back to My Courses</button>
        </main>
      </div>
    );
  }


  return (
    <div className="tcd-layout-container" style={{ display: "flex", minHeight: "100vh", background: "#0b0813" }}>
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          background: "#16a34a",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          fontWeight: "500",
          fontSize: "14px",
        }}>
          ✓ {toastMessage}
        </div>
      )}

      <aside className="tmc-sidebar">
        <div className="tmc-brand">
          <span className="tmc-brand-icon">✦</span>
          <span>SmartCampus</span>
        </div>

        <div className="tmc-user" onClick={() => navigate("/teacher/profile")} style={{ cursor: "pointer" }}>
          <div className="tmc-avatar">T</div>
          <div>
            <h4>Teacher</h4>
            <p>Faculty</p>
          </div>
          <span className="tmc-arrow">→</span>
        </div>

        <div className="tmc-label">WORKSPACE</div>
        <nav className="tmc-nav">
          <a href="/teacher-dashboard"><span>▦</span> Dashboard</a>
          <a className="active" href="/teacher/courses"><span>▤</span> My Courses</a>
          <a href="/teacher/students"><span>♙</span> Students</a>
          <a href="/teacher/assignments"><span>▣</span> Assignments</a>
          <a href="/teacher/assessments"><span>◉</span> Assessments</a>
          <a href="/teacher/attendance"><span>◷</span> Attendance</a>
        </nav>

        <div className="tmc-label tmc-preferences">PREFERENCES</div>
        <nav className="tmc-nav">
          <a href="/teacher/profile"><span>♙</span> My Profile</a>
          <a href="/login"><span>↪</span> Log Out</a>
        </nav>
      </aside>

      <main className="tmc-main" style={{ padding: "28px", flex: 1, minWidth: 0, background: "#0d0a18" }}>
        {/* Header */}
        <header className="tcd-header">
          <button className="tcd-back" onClick={() => navigate("/teacher/courses")}>
            <ArrowLeft size={18} />
            Back to Courses
          </button>
        </header>

        {/* Course Hero */}
        <section className="tcd-hero">

        <div className="tcd-hero-content">
          <span className="tcd-badge">
            {course.category || "Core Course"}
          </span>

          <h1>{course.name}</h1>

          <p className="tcd-description">
            {course.description || "No course description available."}
          </p>

          <div className="tcd-meta">
            <span>
              <BookOpen size={16} />
              {course.code}
            </span>

            <span>
              <GraduationCap size={16} />
              {course.department_name || "Department"}
            </span>

            <span>
              <CalendarDays size={16} />
              Semester {course.sem}
            </span>

            <span>
              <Clock size={16} />
              {course.credit} Credits
            </span>
          </div>
        </div>

        <div className="tcd-hero-icon">
          <BookOpen size={64} strokeWidth={1.2} />
        </div>
      </section>

      {/* Statistics */}
      <section className="tcd-stats">
        <div className="tcd-stat-card">
          <div className="tcd-stat-icon purple">
            <Users size={21} />
          </div>
          <div>
            <h2>{students.length}</h2>
            <p>Enrolled Students</p>
          </div>
        </div>

        <div className="tcd-stat-card" style={{ position: "relative" }}>
          <div className="tcd-stat-icon blue">
            <ClipboardList size={21} />
          </div>
          <div>
            <h2>{assignments.length}</h2>
            <p>Assignments</p>
          </div>
          <button
            onClick={() => setActiveTab("comic_bot")}
            title="Open Smart AI Assistant"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(168, 85, 247, 0.2)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#c084fc",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Bot size={13} /> AI Assistant
          </button>
        </div>

        <div className="tcd-stat-card">
          <div className="tcd-stat-icon green">
            <FileText size={21} />
          </div>
          <div>
            <h2>{materials.length}</h2>
            <p>Study Materials</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="tcd-tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "quizzes", label: "Quizzes" },
          { id: "students", label: "Students" },
          { id: "materials", label: "Materials" },
          { id: "assignments", label: "Assignments" },
          { id: "comic_bot", label: "Smart AI Assistant", isSpecial: true },
          { id: "comic_generator", label: "Comic Generator", isComic: true },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`${activeTab === tab.id ? "active" : ""} ${tab.isSpecial ? "special-bot-tab" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={
              tab.isSpecial
                ? {
                    color: activeTab === "comic_bot" ? "#c084fc" : "#a855f7",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderBottom: activeTab === "comic_bot" ? "2px solid #a855f7" : "none"
                  }
                : tab.isComic
                ? {
                    color: activeTab === "comic_generator" ? "#f472b6" : "#ec4899",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderBottom: activeTab === "comic_generator" ? "2px solid #ec4899" : "none"
                  }
                : {}
            }
          >
            {tab.isSpecial && <Bot size={15} />}
            {tab.isComic && <Sparkles size={15} />}
            {tab.label}
          </button>
        ))}
      </nav>

       {/* Quizzes Tab */}
      {activeTab === "quizzes" && (() => {
        const ongoingCount = quizzes.filter((q) => getQuizCategory(q) === "Ongoing").length;
        const upcomingCount = quizzes.filter((q) => getQuizCategory(q) === "Upcoming").length;
        const closedCount = quizzes.filter((q) => getQuizCategory(q) === "Closed").length;

        const filteredQuizzes = quizzes.filter((q) => {
          if (quizFilter === "All") return true;
          return getQuizCategory(q) === quizFilter;
        });

        return (
          <section className="tcd-content">
            <div className="tcd-section-heading">
              <div>
                <h2>Course Quizzes</h2>
                <p>Manage, create, and grade course quizzes</p>
              </div>
              <button className="tcd-primary-btn" onClick={() => navigate(`/teacher/courses/${courseId}/quizzes/create`)}>
                <Plus size={17} /> Create Quiz
              </button>
            </div>

            {/* Quiz Stat Summary */}
            <div className="tcd-stats" style={{ marginBottom: "1.5rem" }}>
              <div className="tcd-stat-card">
                <div className="tcd-stat-icon purple"><HelpCircle size={21} /></div>
                <div><h2>{quizzes.length}</h2><p>Total Quizzes</p></div>
              </div>
              <div className="tcd-stat-card">
                <div className="tcd-stat-icon green"><CheckCircle size={21} /></div>
                <div><h2>{quizzes.filter((q) => q.status === "published").length}</h2><p>Published Quizzes</p></div>
              </div>
              <div className="tcd-stat-card">
                <div className="tcd-stat-icon blue"><FileText size={21} /></div>
                <div><h2>{quizzes.reduce((sum, q) => sum + (q.submissionCount || 0), 0)}</h2><p>Student Submissions</p></div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {[
                { id: "All", label: "All", count: quizzes.length },
                { id: "Ongoing", label: "Ongoing", count: ongoingCount },
                { id: "Upcoming", label: "Upcoming", count: upcomingCount },
                { id: "Closed", label: "Closed", count: closedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setQuizFilter(tab.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: quizFilter === tab.id ? "1px solid #a855f7" : "1px solid #292938",
                    background: quizFilter === tab.id ? "rgba(168, 85, 247, 0.2)" : "#161224",
                    color: quizFilter === tab.id ? "#c084fc" : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: quizFilter === tab.id ? "#a855f7" : "#292244",
                    color: quizFilter === tab.id ? "#ffffff" : "#94a3b8",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "10px"
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {filteredQuizzes.map((q) => {
                const cat = getQuizCategory(q);
                return (
                  <div key={q.id} className="tcd-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                              background:
                                cat === "Ongoing"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : cat === "Upcoming"
                                  ? "rgba(96, 165, 250, 0.2)"
                                  : "rgba(100, 116, 139, 0.2)",
                              color:
                                cat === "Ongoing"
                                  ? "#34d399"
                                  : cat === "Upcoming"
                                  ? "#60a5fa"
                                  : "#94a3b8",
                            }}
                          >
                            {cat}
                          </span>
                          <span className="tcd-status" style={{ background: q.status === "published" ? "#1d3c32" : "#33264e", color: q.status === "published" ? "#7ee0b0" : "#b99aff" }}>
                            {q.status.toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: "12px", color: "#9292a5" }}>{q.durationMinutes} Mins</span>
                      </div>

                      <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>{q.title}</h3>
                      <p style={{ fontSize: "13px", color: "#aaaabb", marginBottom: "16px", lineHeight: "1.6" }}>{q.description || "No description provided."}</p>

                      <div className="tcd-info-row"><span>Total Questions</span><strong>{q.totalQuestions}</strong></div>
                      <div className="tcd-info-row"><span>Total Marks</span><strong>{q.totalMarks} pts</strong></div>
                      <div className="tcd-info-row"><span>Submissions</span><strong>{q.submissionCount} student(s)</strong></div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #292936", flexWrap: "wrap" }}>
                      {q.status === "draft" && (
                        <button className="tcd-primary-btn" onClick={() => handlePublishQuiz(q.id)} style={{ padding: "6px 12px", fontSize: "12px", background: "#1d3c32", color: "#7ee0b0" }}>
                          Publish
                        </button>
                      )}
                      <button className="tcd-primary-btn" onClick={() => navigate(`/teacher/quizzes/${q.id}/results`)} style={{ padding: "6px 12px", fontSize: "12px" }}>
                        Results ({q.submissionCount})
                      </button>
                      <button onClick={() => handleDeleteQuiz(q.id)} style={{ background: "none", border: "1px solid #30303e", borderRadius: "8px", color: "#f87171", padding: "6px 10px", cursor: "pointer", fontSize: "12px" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredQuizzes.length === 0 && (
              <div className="tcd-empty-state">No {quizFilter !== "All" ? quizFilter.toLowerCase() : ""} quizzes found.</div>
            )}
          </section>
        );
      })()}


      {/* Overview */}
      {activeTab === "overview" && (
        <section className="tcd-content">
          <div className="tcd-section-heading">
            <div>
              <h2>Course Overview</h2>
              <p>Information about this course</p>
            </div>
          </div>

          <div className="tcd-overview-grid">
            <div className="tcd-panel">
              <h3>Course Information</h3>

              <div className="tcd-info-row">
                <span>Course Name</span>
                <strong>{course.name}</strong>
              </div>

              <div className="tcd-info-row">
                <span>Course Code</span>
                <strong>{course.code}</strong>
              </div>

              <div className="tcd-info-row">
                <span>Department</span>
                <strong>{course.department_name || "—"}</strong>
              </div>

              <div className="tcd-info-row">
                <span>Academic Year</span>
                <strong>{course.academic_year || "2026-2027"}</strong>
              </div>

              <div className="tcd-info-row">
                <span>Year</span>
                <strong>{course.year || "—"}</strong>
              </div>

              <div className="tcd-info-row">
                <span>Semester</span>
                <strong>{course.sem || "—"}</strong>
              </div>
            </div>

            <div className="tcd-panel">
              <h3>Learning Objectives</h3>

              <p className="tcd-objectives">
                {course.learning_objectives ||
                  "Learning objectives have not been added yet."}
              </p>

              {course.syllabus_url && (
                <a
                  className="tcd-syllabus"
                  href={course.syllabus_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Syllabus
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <section className="tcd-content">
          <div className="tcd-section-heading">
            <div>
              <h2>Enrolled Students</h2>
              <p>
                Students enrolled in {course.name} ({course.code})
                {assignedSection ? ` for your assigned ${assignedSection}` : ""}
              </p>
            </div>

            <span className="tcd-count">
              {filteredStudents.length} Total Students
            </span>
          </div>

          {/* Teacher Assignment Info Card */}
          <div style={{
            background: "#161224",
            border: "1px solid #292244",
            borderRadius: "14px",
            padding: "16px 22px",
            marginBottom: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "28px",
            alignItems: "center"
          }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>COURSE</span>
              <strong style={{ color: "#ffffff", fontSize: "14px" }}>{course.name}</strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>COURSE CODE</span>
              <span className="tcd-code-badge">{course.code}</span>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>ASSIGNED SECTION</span>
              {assignedSection ? (
                <span className="tcd-section-pill">{assignedSection}</span>
              ) : (
                <span style={{ color: "#f87171", fontSize: "12px", fontWeight: "600" }}>No Section Assigned</span>
              )}
            </div>
          </div>

          <div className="tcd-search">
            <Search size={18} />
            <input
              placeholder="Search by student name, reg number or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tcd-table-wrapper">
            <table className="tcd-table">
              <thead>
                <tr>
                  <th>STUDENT NAME & EMAIL</th>
                  <th>REGISTER NUMBER</th>
                  <th>DEPARTMENT</th>
                  <th>SECTION</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const sectionDisplay = student.section
                    ? (String(student.section).startsWith("Section") ? student.section : `Section ${student.section}`)
                    : (assignedSection || "Section A");

                  return (
                    <tr key={student.uid}>
                      <td>
                        <div className="tcd-student">
                          <div className="tcd-avatar">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{student.name}</strong>
                            <small style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
                              {student.email}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="tcd-code-badge">{student.register_number || "—"}</span>
                      </td>

                      <td>{student.department || "AI&DS"}</td>

                      <td>
                        <span className="tcd-section-pill">
                          {sectionDisplay}
                        </span>
                      </td>

                      <td>
                        <span className="tcd-status active">
                          Enrolled
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="tcd-empty" style={{ padding: "40px 20px" }}>
                      {!assignedSection ? (
                        <div style={{ color: "#f87171", fontSize: "14px", fontWeight: "500" }}>
                          ⚠️ No section has been assigned to you for this course.
                        </div>
                      ) : (
                        `No matching students found for ${assignedSection}.`
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Materials Tab */}
      {activeTab === "materials" && (
        <section className="tcd-content">
          <div className="tcd-section-heading">
            <div>
              <h2>Study Materials</h2>
              <p>Resources and study documents available for students</p>
            </div>

            <button className="tcd-primary-btn" onClick={() => setShowMaterialModal(true)}>
              <Plus size={17} />
              Add Material
            </button>
          </div>

          <div className="tcd-resource-list">
            {materials.map((material) => (
              <div className="tcd-resource" key={material.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                  <div className="tcd-resource-icon">
                    <FileText size={21} />
                  </div>

                  <div className="tcd-resource-info">
                    <strong style={{ fontSize: "14px", color: "#f8fafc" }}>{material.title}</strong>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                      <span className="tcd-badge" style={{ fontSize: "10px", padding: "2px 10px" }}>{material.type || "PDF Document"}</span>
                      {material.uploaded_by && (
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Uploaded by {material.uploaded_by}</span>
                      )}
                      {material.file_size > 0 && (
                        <span style={{ fontSize: "11px", color: "#64748b" }}>({(material.file_size / (1024 * 1024)).toFixed(2)} MB)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {material.file_url && material.file_url !== "#" ? (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="tcd-download"
                      title="Download / View File"
                      style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "8px", padding: "6px 12px", color: "#c084fc", fontSize: "12px", textDecoration: "none" }}
                    >
                      <Download size={16} /> Download
                    </a>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#64748b" }}>No File</span>
                  )}

                  <button
                    onClick={() => handleDeleteMaterial(material.id)}
                    title="Delete Material"
                    style={{ background: "transparent", border: "1px solid #3b2a3a", borderRadius: "8px", color: "#f87171", padding: "6px 10px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {materials.length === 0 && (
              <div className="tcd-empty-state">
                No materials uploaded yet. Click "+ Add Material" above to upload lecture notes or handouts.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upload Material Modal */}
      {showMaterialModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.75)",
          display: "grid",
          placeItems: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#161224",
            border: "1px solid #292244",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            padding: "28px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#ffffff", fontSize: "18px" }}>Upload Study Material</h3>
              <button onClick={() => setShowMaterialModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {materialError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                ⚠️ {materialError}
              </div>
            )}

            <form onSubmit={handleUploadMaterial} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Material Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Unit 1 Big Data Architecture Lecture Slides"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#0d0a18", border: "1px solid #2e264a", borderRadius: "8px", color: "white", fontSize: "13px" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Resource Category / Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#0d0a18", border: "1px solid #2e264a", borderRadius: "8px", color: "white", fontSize: "13px" }}
                >
                  <option value="PDF Document">PDF Document</option>
                  <option value="Presentation Slides">Presentation Slides</option>
                  <option value="Lab Resource">Lab Resource / Source Code</option>
                  <option value="Lecture Video">Lecture Video / Recording</option>
                  <option value="Reference Book">Reference Book / Article</option>
                  <option value="Assignment Reference">Assignment Reference</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary or instructions for students..."
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#0d0a18", border: "1px solid #2e264a", borderRadius: "8px", color: "white", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>Upload File (PDF, PPT, DOC, ZIP, Video)</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedMaterialFile(e.target.files[0] || null)}
                  style={{ width: "100%", padding: "8px", background: "#0d0a18", border: "1px dashed #3b3355", borderRadius: "8px", color: "#cbd5e1", fontSize: "12px" }}
                />
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>Stored locally in backend/src/materials folder</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  style={{ padding: "10px 18px", background: "transparent", border: "1px solid #3b3355", borderRadius: "8px", color: "#94a3b8", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMaterial}
                  className="tcd-primary-btn"
                >
                  <Upload size={16} /> {isUploadingMaterial ? "Uploading..." : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (() => {
        const ongoingCount = assignments.filter((a) => getAssignmentCategory(a) === "Ongoing").length;
        const upcomingCount = assignments.filter((a) => getAssignmentCategory(a) === "Upcoming").length;
        const closedCount = assignments.filter((a) => getAssignmentCategory(a) === "Closed").length;

        const filteredAssignments = assignments.filter((a) => {
          if (assignFilter === "All") return true;
          return getAssignmentCategory(a) === assignFilter;
        });

        return (
          <section className="tcd-content">
            <div className="tcd-section-heading">
              <div>
                <h2>Course Assignments</h2>
                <p>Manage assignments for {course.name} ({course.code})</p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="tcd-secondary-btn"
                  onClick={() => setActiveTab("comic_bot")}
                  style={{
                    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)",
                    border: "1px solid #a855f7",
                    color: "#c084fc",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  <Bot size={17} />
                  Smart AI Assistant
                </button>

                <button className="tcd-primary-btn" onClick={() => setShowCreateModal(true)}>
                  <Plus size={17} />
                  Create Assignment
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {[
                { id: "All", label: "All", count: assignments.length },
                { id: "Ongoing", label: "Ongoing", count: ongoingCount },
                { id: "Upcoming", label: "Upcoming", count: upcomingCount },
                { id: "Closed", label: "Closed", count: closedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAssignFilter(tab.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: assignFilter === tab.id ? "1px solid #a855f7" : "1px solid #292938",
                    background: assignFilter === tab.id ? "rgba(168, 85, 247, 0.2)" : "#161224",
                    color: assignFilter === tab.id ? "#c084fc" : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: assignFilter === tab.id ? "#a855f7" : "#292244",
                    color: assignFilter === tab.id ? "#ffffff" : "#94a3b8",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "10px"
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="tcd-assignment-list">
              {filteredAssignments.map((assignment) => {
                const cat = getAssignmentCategory(assignment);
                return (
                  <div className="tcd-assignment" key={assignment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div className="tcd-assignment-icon">
                        <ClipboardList size={22} />
                      </div>

                      <div className="tcd-assignment-info">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                              background:
                                cat === "Ongoing"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : cat === "Upcoming"
                                  ? "rgba(96, 165, 250, 0.2)"
                                  : "rgba(100, 116, 139, 0.2)",
                              color:
                                cat === "Ongoing"
                                  ? "#34d399"
                                  : cat === "Upcoming"
                                  ? "#60a5fa"
                                  : "#94a3b8",
                            }}
                          >
                            {cat}
                          </span>
                          <strong style={{ fontSize: "16px", color: "#fff" }}>{assignment.title}</strong>
                        </div>
                        <span>
                          Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleString() : assignment.due_date || "Not specified"} · Max Marks: {assignment.max_marks || 100}
                        </span>
                        {assignment.description && (
                          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#a1a1aa" }}>{assignment.description}</p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="tcd-status" style={{
                        background: assignment.status === "published" ? "#1d3c32" : "#33264e",
                        color: assignment.status === "published" ? "#7ee0b0" : "#b99aff"
                      }}>
                        {(assignment.status || "Published").toUpperCase()}
                      </span>

                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        style={{ background: "none", border: "1px solid #30303e", borderRadius: "8px", color: "#f87171", padding: "6px 12px", cursor: "pointer", fontSize: "12px" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredAssignments.length === 0 && (
                <div className="tcd-empty-state">
                  No {assignFilter !== "All" ? assignFilter.toLowerCase() : ""} assignments found.
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* AI Smart Assistant Tab */}
      {activeTab === "comic_bot" && (
        <section className="tcd-content">
          <ComicBotWindow
            isOpen={true}
            courseName={course?.name || "Big Data Architecture"}
            onClose={() => setActiveTab("assignments")}
          />
        </section>
      )}

      {/* Standalone Comic Generator Tab */}
      {activeTab === "comic_generator" && (
        <section className="tcd-content">
          <ComicGenerator
            isOpen={true}
            courseId={course?.id || courseId || "AD23531"}
            defaultTopic={course?.name ? `${course.name} Concepts` : "Apache Spark Architecture"}
            onClose={() => setActiveTab("assignments")}
          />
        </section>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: "#15151f",
            border: "1px solid #292936",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "28px",
            color: "#fff",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #292936", paddingBottom: "14px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px" }}>Create Course Assignment</h2>
                <p style={{ margin: "4px 0 0", color: "#9292a5", fontSize: "13px" }}>
                  Course: <strong style={{ color: "#c4a9ff" }}>{course.code} - {course.name}</strong>
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#a1a1aa", fontSize: "24px", cursor: "pointer" }}>×</button>
            </div>

            {assignmentError && (
              <div style={{ padding: "10px 14px", marginBottom: "16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
                ⚠️ {assignmentError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Assignment Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures Assignment 1"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Maximum Marks *</label>
                  <input
                    type="number"
                    min="1"
                    value={assignmentForm.max_marks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_marks: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Max File Size (MB)</label>
                  <input
                    type="number"
                    min="1"
                    value={assignmentForm.max_file_size_mb}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_file_size_mb: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Description *</label>
                <textarea
                  rows="3"
                  placeholder="Describe the tasks and goals..."
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Submission Instructions</label>
                <textarea
                  rows="2"
                  placeholder="Format guidelines, code requirements, file naming, etc."
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.start_at}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, start_at: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.due_at}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#a1a1aa", marginBottom: "4px" }}>Attachment / Reference URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/spec.pdf"
                  value={assignmentForm.attachment_url}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, attachment_url: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", background: "#0b0b12", border: "1px solid #30303e", borderRadius: "8px", color: "#fff", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginTop: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#d4d4d8" }}>
                  <input
                    type="checkbox"
                    checked={assignmentForm.allow_late_submission}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, allow_late_submission: e.target.checked })}
                    style={{ width: "18px", height: "18px" }}
                  />
                  Allow late submission after due date
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", borderTop: "1px solid #292936", paddingTop: "18px" }}>
                <button
                  type="button"
                  disabled={isSubmittingAssignment}
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "10px 18px", background: "#27273a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAssignment}
                  onClick={() => handleCreateAssignment("draft")}
                  style={{ padding: "10px 18px", background: "#3f3f46", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAssignment}
                  onClick={() => handleCreateAssignment("published")}
                  style={{ padding: "10px 18px", background: "#7652d6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                >
                  {isSubmittingAssignment ? "Publishing..." : "Publish Assignment →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}