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
const {
  validateFile,
  uploadToSupabase,
  getFileType,
  formatFileSize,
} = require("../services/storageService");

const router = express.Router({ mergeParams: true }); // mergeParams để nhận :classId từ parent

// ── Multer: lưu file vào memory buffer (không lưu disk) ─────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── UUID v4 regex ────────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Mock data fallback ──────────────────────────────────────────────────────
const MOCK_MATERIALS = [
  {
    id: "m0000001-0000-0000-0000-000000000001",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Course Syllabus 2026",
    description: "Course overview and weekly plan",
    file_url: "https://example.com/files/syllabus.pdf",
    file_type: "pdf",
    file_size: "2.4 MB",
    uploaded_by: "00000000-0000-0000-0000-000000000001",
    uploader_name: "Jane Doe",
    created_at: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "m0000002-0000-0000-0000-000000000002",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Design Principles Slides",
    description: "Slides for Module 1",
    file_url: "https://example.com/files/slides.ppt",
    file_type: "ppt",
    file_size: "15.3 MB",
    uploaded_by: "00000000-0000-0000-0000-000000000001",
    uploader_name: "Jane Doe",
    created_at: "2026-01-18T10:30:00.000Z",
  },
  {
    id: "m0000003-0000-0000-0000-000000000003",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Mobile UI Kit v2.sketch",
    description: "Sketch file for hands-on exercises",
    file_url: "https://example.com/files/ui-kit.sketch",
    file_type: "docx",
    file_size: "45.8 MB",
    uploaded_by: "00000000-0000-0000-0000-000000000001",
    uploader_name: "Jane Doe",
    created_at: "2026-01-20T14:00:00.000Z",
  },
  {
    id: "m0000004-0000-0000-0000-000000000004",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Figma Component Library",
    description: "Online Figma file for prototyping",
    file_url: "https://figma.com/file/example",
    file_type: "link",
    file_size: "Online",
    uploaded_by: "00000000-0000-0000-0000-000000000001",
    uploader_name: "Jane Doe",
    created_at: "2026-01-22T09:00:00.000Z",
  },
  {
    id: "m0000005-0000-0000-0000-000000000005",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Color Theory Workshop Recording",
    description: "Video recording of live session",
    file_url: "https://example.com/files/color-theory.mp4",
    file_type: "video",
    file_size: "320 MB",
    uploaded_by: "00000000-0000-0000-0000-000000000001",
    uploader_name: "Jane Doe",
    created_at: "2026-01-25T16:00:00.000Z",
  },
];

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
router.get("/", async (req, res) => {
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
    const mockForClass = MOCK_MATERIALS.filter((m) => m.class_id === classId);
    return res.json({
      success: true,
      data: mockForClass.length > 0 ? mockForClass : MOCK_MATERIALS,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/materials
// Tạo metadata tài liệu (JSON body, không upload file)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { classId } = req.params;
  const { title, description, file_url, file_type, file_size, uploaded_by } =
    req.body || {};

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
router.post("/upload", upload.single("file"), async (req, res) => {
  const { classId } = req.params;
  const { title, description, uploaded_by } = req.body || {};
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
