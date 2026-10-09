import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { authenticate } from "../pages/login.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target materials folder: d:\New folder\smartcampus\backend\src\materials
const MATERIALS_DIR = path.join(__dirname, "..", "materials");
const METADATA_FILE = path.join(MATERIALS_DIR, "materials.json");

// Ensure directory exists
if (!fs.existsSync(MATERIALS_DIR)) {
  fs.mkdirSync(MATERIALS_DIR, { recursive: true });
}

// Ensure materials.json exists
if (!fs.existsSync(METADATA_FILE)) {
  const initialMaterials = [
    {
      id: "mat-1",
      course_id: "263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40",
      title: "Big Data Architecture - Complete Syllabus & Course Handout",
      type: "PDF Document",
      file_name: null,
      original_name: "Complete_Syllabus.pdf",
      file_url: "#",
      uploaded_by: "Dr. K. Anand",
      uploaded_at: new Date().toISOString()
    },
    {
      id: "mat-2",
      course_id: "263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40",
      title: "Unit 1 Lecture Slides & Lecture Notes",
      type: "Presentation Slides",
      file_name: null,
      original_name: "Unit1_Slides.pdf",
      file_url: "#",
      uploaded_by: "Dr. K. Anand",
      uploaded_at: new Date().toISOString()
    },
    {
      id: "mat-3",
      course_id: "263cb6d9-2c5b-48d5-a48a-d0b4c5aafc40",
      title: "Lab Manual & Reference Implementation",
      type: "Lab Resource",
      file_name: null,
      original_name: "Lab_Manual.pdf",
      file_url: "#",
      uploaded_by: "Dr. K. Anand",
      uploaded_at: new Date().toISOString()
    }
  ];
  fs.writeFileSync(METADATA_FILE, JSON.stringify(initialMaterials, null, 2));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MATERIALS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${uniqueSuffix}_${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

export function readMaterialsJSON() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading materials.json:", err);
  }
  return [];
}

export function writeMaterialsJSON(materials) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(materials, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing materials.json:", err);
  }
}

import { pool } from "../database/db.js";

/**
 * GET /api/materials/course/:courseId
 * List materials for a specific course (by course UUID or course Code)
 */
router.get("/course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    let courseUuid = courseId;
    let courseCode = courseId;

    try {
      const courseRes = await pool.query(
        "SELECT id, code FROM courses WHERE id::text = $1 OR LOWER(code) = LOWER($1);",
        [courseId]
      );
      if (courseRes.rows.length > 0) {
        courseUuid = courseRes.rows[0].id;
        courseCode = courseRes.rows[0].code;
      }
    } catch (dbErr) {
      console.error("Course lookup error in materialRoutes:", dbErr);
    }

    const all = readMaterialsJSON();
    const filtered = all.filter(
      (m) =>
        String(m.course_id).toLowerCase() === String(courseId).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(courseUuid).toLowerCase() ||
        String(m.course_id).toLowerCase() === String(courseCode).toLowerCase()
    );

    res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    console.error("GET Materials error:", err);
    res.status(500).json({ success: false, message: "Failed to load materials." });
  }
});

/**
 * POST /api/materials/upload
 * Upload study material file and save metadata to JSON
 */
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { courseId, title, type, description } = req.body;
    const file = req.file;

    if (!courseId || !title) {
      return res.status(400).json({ success: false, message: "Course ID and Title are required." });
    }

    const file_name = file ? file.filename : null;
    const original_name = file ? file.originalname : "document.pdf";
    const file_url = file_name ? `http://localhost:5000/api/materials/download/${file_name}` : "#";

    const newMaterial = {
      id: "mat-" + Date.now(),
      course_id: courseId,
      title: title.trim(),
      type: type || "PDF Document",
      description: description || "",
      file_name,
      original_name,
      file_size: file ? file.size : 0,
      file_url,
      uploaded_by: req.user?.name || "Teacher",
      uploaded_at: new Date().toISOString(),
    };

    const materials = readMaterialsJSON();
    materials.unshift(newMaterial);
    writeMaterialsJSON(materials);

    res.status(201).json({
      success: true,
      message: "Material uploaded successfully.",
      data: newMaterial,
    });
  } catch (err) {
    console.error("Upload material error:", err);
    res.status(500).json({ success: false, message: "Failed to upload material." });
  }
});

/**
 * POST /api/materials/publish-comic
 * Save teacher generated comic storyboard into course materials JSON storage
 */
router.post("/publish-comic", async (req, res) => {
  try {
    const { courseId, title, description, comicData } = req.body;

    if (!courseId || !comicData) {
      return res.status(400).json({ success: false, message: "Course ID and comic data are required." });
    }

    // Optional user extraction from Auth header
    let uploadedBy = "Teacher";
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        if (token && token !== "null" && token !== "undefined") {
          const jwtSecret = process.env.JWT_SECRET || "smartcampus_jwt_secret_key_supabase_2026";
          const decoded = jwt.verify(token, jwtSecret);
          if (decoded && decoded.name) {
            uploadedBy = decoded.name;
          }
        }
      }
    } catch (e) {
      // Ignore token parse error, fallback to 'Teacher'
    }

    const newMaterial = {
      id: "mat-comic-" + Date.now(),
      course_id: courseId,
      title: (title || comicData.title || "AI Educational Comic Storyboard").trim(),
      type: "AI Educational Comic",
      description: description || "Educational comic storyboard visually explaining course topics.",
      file_name: null,
      original_name: `${(title || "Comic").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`,
      file_size: 0,
      file_url: comicData.comic_png_url || "#",
      comic_data: comicData,
      uploaded_by: req.user?.name || uploadedBy,
      uploaded_at: new Date().toISOString(),
    };

    const materials = readMaterialsJSON();
    materials.unshift(newMaterial);
    writeMaterialsJSON(materials);

    res.status(201).json({
      success: true,
      message: "Educational Comic published to Course Materials for students!",
      data: newMaterial,
    });
  } catch (err) {
    console.error("Publish comic material error:", err);
    res.status(500).json({ success: false, message: "Failed to publish comic material." });
  }
});

/**
 * DELETE /api/materials/:materialId
 * Delete material from JSON and remove file
 */
router.delete("/:materialId", authenticate, async (req, res) => {
  try {
    const { materialId } = req.params;
    let materials = readMaterialsJSON();

    const targetIndex = materials.findIndex((m) => m.id === materialId);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: "Material not found." });
    }

    const target = materials[targetIndex];

    // Remove file if exists
    if (target.file_name) {
      const filePath = path.join(MATERIALS_DIR, target.file_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    materials.splice(targetIndex, 1);
    writeMaterialsJSON(materials);

    res.status(200).json({ success: true, message: "Material deleted successfully." });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ success: false, message: "Failed to delete material." });
  }
});

/**
 * GET /api/materials/download/:filename
 * Download static file
 */
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(MATERIALS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found.");
    }

    res.download(filePath, filename);
  } catch (err) {
    res.status(500).send("Error downloading file.");
  }
});

export default router;
