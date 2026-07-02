/**
 * Material Routes — Person 4: Class Workspace
 *
 * GET  /api/classes/:classId/materials         → Danh sách materials của class
 * POST /api/classes/:classId/materials         → Tạo mới metadata tài liệu (JSON)
 * POST /api/classes/:classId/materials/upload  → Upload file lên Supabase Storage + lưu metadata
 *
 * Nếu DB lỗi → trả mock data fallback.
 */
const express = require("express");
const multer = require("multer");
const pool = require("../db");
const { requireAuth, requireClassMember } = require("../middleware/auth");
const {
  validateFile,
  uploadToSupabase,
  getFileType,
  formatFileSize,
} = require("../services/storageService");

const router = express.Router({ mergeParams: true });

// ── Multer: lưu file vào memory buffer (không lưu disk) ─────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── UUID v4 regex ────────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



// ── Helper: validate UUID ───────────────────────────────────────────────────
function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

// ── Helper: check class exists ──────────────────────────────────────────────
async function classExists(classId) {
  try {
    const result = await pool.query(
      `SELECT id FROM classes WHERE id = $1`,
      [classId]
    );
    return result.rows.length > 0;
  } catch {
    return null; // DB error — cannot determine
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId/materials
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, requireClassMember, async (req, res) => {
  const { classId } = req.params;

  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const result = await pool.query(
      `SELECT
         m.id,
         m.class_id,
         m.title,
         m.description,
         m.file_url,
         m.file_type,
         m.file_size,
         m.uploaded_by,
         u.full_name AS uploader_name,
         m.created_at,
         m.updated_at
       FROM materials m
       LEFT JOIN users u ON u.id = m.uploaded_by
       WHERE m.class_id = $1
       ORDER BY m.created_at DESC`,
      [classId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[Materials] GET error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/materials
// Tạo metadata tài liệu (JSON body, không upload file)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireClassMember, async (req, res) => {
  const { classId } = req.params;
  const { title, description, file_url, file_type, file_size } = req.body || {};
  const uploaded_by = req.user.userId; // Override with authenticated user

  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }
  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }
  if (!file_url || !file_url.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "File URL is required" });
  }
  if (!uploaded_by) {
    return res
      .status(400)
      .json({ success: false, message: "uploaded_by (user id) is required" });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const result = await pool.query(
      `INSERT INTO materials
         (class_id, title, description, file_url, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        classId,
        title.trim(),
        description || null,
        file_url.trim(),
        file_type || null,
        file_size || null,
        uploaded_by,
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Material created successfully",
    });
  } catch (error) {
    console.error("[Materials] POST error:", error.message);
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ success: false, message: "Referenced user or class does not exist" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/materials/upload
// Upload file thật lên Supabase Storage + lưu metadata vào DB
//
// FormData fields:
//   file         — binary file (required)
//   title        — tên tài liệu (optional, defaults to filename)
//   description  — mô tả (optional)
//   uploaded_by  — UUID of uploader (required)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", requireAuth, requireClassMember, upload.single("file"), async (req, res) => {
  const { classId } = req.params;
  const { title, description } = req.body || {};
  const uploaded_by = req.user.userId;
  const file = req.file;

  // Validate UUID
  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  // Validate file exists
  if (!file) {
    return res
      .status(400)
      .json({ success: false, message: "No file provided. Use form field name 'file'" });
  }

  // Validate file type & size
  const validation = validateFile(file);
  if (!validation.valid) {
    return res
      .status(400)
      .json({ success: false, message: validation.message });
  }

  // Validate uploaded_by
  if (!uploaded_by) {
    return res
      .status(400)
      .json({ success: false, message: "uploaded_by (user id) is required" });
  }

  try {
    // Check class exists
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabase(file, classId);

    if (!uploadResult) {
      // Supabase chưa cấu hình — lưu metadata với placeholder URL
      console.warn("[Materials] Supabase not configured — saving metadata only");

      const fileType = getFileType(file.originalname);
      const fileSize = formatFileSize(file.size);
      const placeholderUrl = `https://placeholder.storage/course-materials/${classId}/${file.originalname}`;

      const result = await pool.query(
        `INSERT INTO materials
           (class_id, title, description, file_url, file_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          classId,
          (title || file.originalname).trim(),
          description || null,
          placeholderUrl,
          fileType,
          fileSize,
          uploaded_by,
        ]
      );

      return res.status(201).json({
        success: true,
        message: "File metadata saved (Supabase Storage not configured — file not uploaded to cloud)",
        data: result.rows[0],
      });
    }

    // Upload thành công → lưu metadata với real Supabase URL
    const result = await pool.query(
      `INSERT INTO materials
         (class_id, title, description, file_url, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        classId,
        (title || file.originalname).trim(),
        description || null,
        uploadResult.fileUrl,
        uploadResult.fileType,
        uploadResult.fileSize,
        uploaded_by,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[Materials] Upload error:", error.message);

    if (error.code === "23503") {
      return res
        .status(400)
        .json({ success: false, message: "Referenced user or class does not exist" });
    }

    return res
      .status(500)
      .json({ success: false, message: `Upload failed: ${error.message}` });
  }
});

module.exports = router;
