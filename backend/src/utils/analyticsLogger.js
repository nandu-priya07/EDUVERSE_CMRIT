import { pool } from "../database/db.js";

export async function logAIRequest({
  featureName,
  userUid = null,
  userRole = "student",
  department = "AI&DS",
  courseCode = null,
  promptSummary = "",
  modelName = "gemini-3.5-flash",
  isLocalModel = false,
  status = "success",
  errorMessage = null,
  latencyMs = 350,
}) {
  try {
    await pool.query(
      `INSERT INTO ai_request_logs (
        feature_name, user_uid, user_role, department, course_code,
        prompt_summary, model_name, is_local_model, status, error_message, latency_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        featureName,
        userUid,
        userRole,
        department,
        courseCode,
        (promptSummary || "").slice(0, 255),
        modelName,
        Boolean(isLocalModel),
        status,
        errorMessage,
        parseInt(latencyMs, 10) || 350,
      ]
    );
  } catch (err) {
    console.error("[AI Logger Error]:", err.message);
  }
}

export async function logLMSActivity({
  activityType,
  userUid = null,
  userRole = "student",
  department = "AI&DS",
  courseId = null,
  details = {},
}) {
  try {
    await pool.query(
      `INSERT INTO lms_activity_logs (
        activity_type, user_uid, user_role, department, course_id, details
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [activityType, userUid, userRole, department, courseId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("[LMS Activity Logger Error]:", err.message);
  }
}
