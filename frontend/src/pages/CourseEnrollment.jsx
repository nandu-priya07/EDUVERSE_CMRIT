import React, { useEffect, useState } from "react";
import "./CourseEnrollment.css";
import StudentSidebar from "../components/StudentSidebar";

const API_URL = "http://localhost:5000/api";

export default function CourseEnrollment() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({ type: "", message: "" });

  const [student, setStudent] = useState(null);
  const [enrollment, setEnrollment] = useState({
    isEnabled: false,
    isWindowOpen: false,
    startDate: null,
    endDate: null,
    message: "",
  });
  const [courses, setCourses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewCourseModal, setViewCourseModal] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: "", message: "" });
    }, 4000);
  };

  const fetchStudentEnrollment = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/student/enrollment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load student enrollment data.");
      }

      setStudent(data.student || null);
      setEnrollment(data.enrollment || {});
      setCourses(data.courses || []);
      setSelectedIds([]);
    } catch (err) {
      console.error("Error fetching enrollment data:", err);
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentEnrollment();
  }, []);

  const handleEnrollSubmit = async () => {
    if (selectedIds.length === 0) {
      showNotification("error", "Please select at least one course to enroll.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/student/enrollment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courses: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Enrollment failed.");
      }

      showNotification("success", data.message || "Successfully enrolled in selected course(s)!");
      await fetchStudentEnrollment();
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectedCredits = courses
    .filter((c) => selectedIds.includes(c.courseId))
    .reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);

  const enrolledCount = courses.filter((c) => c.status === "enrolled").length;

  if (loading) {
    return (
      <div className="course-enrollment-page">
        <StudentSidebar activeItem="Course Enrollment" />
        <main className="main-content">
          <div className="empty-state" style={{ padding: "80px 0" }}>
            <h3>Loading Student Enrollment Portal...</h3>
            <p>Fetching dynamic profile, enrollment window, and courses...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="course-enrollment-page">
      {/* Shared Common Student Sidebar */}
      <StudentSidebar activeItem="Course Enrollment" />

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Student / Academics</p>
            <h1>Course Enrollment</h1>
          </div>
          <div className="topbar-right">
            <span className="semester-tag">
              Academic Year {student?.academicYear || "2026-2027"}
            </span>
          </div>
        </header>

        {/* Notifications */}
        {notification.message && (
          <div className={`notification-toast ${notification.type}`}>
            <span>{notification.type === "success" ? "✓" : "⚠"}</span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Dynamic Student Banner */}
        {student && (
          <div className="student-profile-banner">
            <div className="student-avatar-badge">
              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="student-info-meta">
              <span className="student-tag">REGISTERED STUDENT</span>
              <h2>{student.name}</h2>
              <div className="student-details-grid">
                <span><strong>Register No:</strong> {student.registerNumber}</span>
                <span><strong>Department:</strong> {student.department_name || student.department}</span>
                <span><strong>Academic Year:</strong> {student.academicYear}</span>
                <span><strong>Semester:</strong> Semester {student.semester}</span>
                <span><strong>Section:</strong> Section {student.section}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment Window Status Banner */}
        {enrollment.isWindowOpen ? (
          <div className="status-notice notice-open">
            <span className="status-indicator-dot open">●</span>
            <div>
              <strong>🟢 Course Enrollment Open for Semester {student?.semester}</strong>
              <p>Select your available courses below and click enroll to finalize your current semester course load.</p>
              {enrollment.endDate && (
                <small>Enrollment closes: {new Date(enrollment.endDate).toLocaleDateString()}</small>
              )}
            </div>
          </div>
        ) : (
          <div className="status-notice notice-closed">
            <span className="status-indicator-dot closed">🔒</span>
            <div>
              <strong>Course Enrollment is currently closed.</strong>
              <p>
                {enrollment.message ||
                  `Enrollment is currently not available for Semester ${student?.semester || 5}. Please wait until the administrator enables course enrollment.`}
              </p>
            </div>
          </div>
        )}

        {/* Enrollment Overview Stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">▣</div>
            <div>
              <p>Enrolled Courses</p>
              <h2>{enrolledCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">◈</div>
            <div>
              <p>Available Courses</p>
              <h2>{courses.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <p>Enrollment Window</p>
              <h2>{enrollment.isWindowOpen ? "OPEN" : "CLOSED"}</h2>
            </div>
          </div>
        </section>

        {/* Course Catalog Section */}
        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <h2>Semester {student?.semester} Courses</h2>
              <p>Only displaying courses assigned to your department ({student?.department}) and Semester {student?.semester}.</p>
            </div>
            <span className="course-count">{courses.length} Courses Found</span>
          </div>

          {!enrollment.isWindowOpen && courses.length === 0 ? (
            <div className="empty-state">
              <h3>Course Enrollment is currently not available for Semester {student?.semester}.</h3>
              <p>Please wait until the administrator enables course enrollment.</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <h3>No courses found for Semester {student?.semester}</h3>
              <p>Contact your department coordinator to configure courses.</p>
            </div>
          ) : (
            <>
              <div className="course-grid">
                {courses.map((course) => {
                  const isEnrolled = course.status === "enrolled";
                  const teacherName = course.teacher && course.teacher.name ? course.teacher.name : "--";

                  return (
                    <article
                      className={`course-card ${isEnrolled ? "card-enrolled" : ""}`}
                      key={course.courseId}
                    >
                      <div className="course-card-top">
                        <span className="course-category">
                          {course.category || "Professional Core"}
                        </span>
                        <span className="credits">{course.credits} Credits</span>
                      </div>

                      <div className="course-code">{course.courseCode}</div>
                      <h3>{course.courseName}</h3>

                      {course.description && (
                        <p className="course-description">{course.description}</p>
                      )}

                      <div className="course-meta">
                        <span><strong>Department:</strong> {course.department}</span>
                        <span><strong>Semester:</strong> Semester {course.semester}</span>
                        <span className="teacher-line">
                          <strong>Teacher:</strong> {teacherName}
                        </span>
                      </div>

                      <div className="course-actions">
                        <button
                          type="button"
                          className="details-btn"
                          onClick={() => setViewCourseModal(course)}
                        >
                          View Details
                        </button>

                        {isEnrolled ? (
                          <span className="enrolled-status-badge">✓ Enrolled</span>
                        ) : (
                          enrollment.isWindowOpen && (
                            <label className="select-course-checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(course.courseId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds((prev) => [...prev, course.courseId]);
                                  } else {
                                    setSelectedIds((prev) =>
                                      prev.filter((id) => id !== course.courseId)
                                    );
                                  }
                                }}
                              />
                              <span>Select Course</span>
                            </label>
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Action Bar for Course Enrollment */}
              {enrollment.isWindowOpen && (
                <div className="enroll-action-bar">
                  <div className="action-info">
                    <span>Selected Courses: <strong>{selectedIds.length}</strong></span>
                    <span>Total Selected Credits: <strong>{totalSelectedCredits} Credits</strong></span>
                  </div>
                  <button
                    type="button"
                    className="submit-enroll-btn"
                    disabled={selectedIds.length === 0 || submitting}
                    onClick={handleEnrollSubmit}
                  >
                    {submitting ? "Enrolling..." : "Enroll Selected Courses"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* View Details Popup Modal */}
      {viewCourseModal && (
        <div className="modal-overlay" onClick={() => setViewCourseModal(null)}>
          <div className="course-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setViewCourseModal(null)}
            >
              ×
            </button>

            <span className="course-category">
              {viewCourseModal.category || "Professional Core"}
            </span>
            <h2>{viewCourseModal.courseName}</h2>
            <p className="course-code">{viewCourseModal.courseCode}</p>

            {viewCourseModal.description && <p>{viewCourseModal.description}</p>}

            <div className="modal-info-grid">
              <div>
                <strong>Department:</strong> {viewCourseModal.department}
              </div>
              <div>
                <strong>Semester:</strong> Semester {viewCourseModal.semester}
              </div>
              <div>
                <strong>Credits:</strong> {viewCourseModal.credits} Credits
              </div>
              <div>
                <strong>Category:</strong> {viewCourseModal.category || "Professional Core"}
              </div>
              <div>
                <strong>Assigned Section:</strong> Section {student?.section}
              </div>
              <div>
                <strong>Academic Year:</strong> {student?.academicYear || "2026-2027"}
              </div>
              <div className="full-width-field">
                <strong>Assigned Teacher:</strong>{" "}
                <span className="teacher-name-highlight">
                  {viewCourseModal.teacher && viewCourseModal.teacher.name
                    ? viewCourseModal.teacher.name
                    : "--"}
                </span>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="details-btn modal-close-btn"
                onClick={() => setViewCourseModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}