/**
 * Lesson Routes — Person 4 / Part 7: Lessons
 *
 * GET  /api/classes/:classId/lessons  → Danh sách bài học của class (sorted by lesson_order ASC)
 * GET  /api/lessons/:lessonId         → Chi tiết một bài học
 * POST /api/classes/:classId/lessons  → Tạo bài học mới
 *
 * Nếu DB lỗi hoặc chưa tạo bảng → trả mock data fallback.
 */
const pool = require("../db");
const { requireAuth, requireClassMember } = require("../middleware/auth");

const express = require("express");
const router = express.Router();

// ── UUID v4 regex ────────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return null; // DB error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId/lessons
// Lấy danh sách lessons của một class, sort theo lesson_order ASC
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/classes/:classId/lessons", requireAuth, requireClassMember, async (req, res) => {
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
      `SELECT * FROM lessons
       WHERE class_id = $1
       ORDER BY lesson_order ASC`,
      [classId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[Lessons] GET list error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lessons/:lessonId
// Lấy chi tiết một lesson
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/lessons/:lessonId", requireAuth, async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.userId;

  if (!isValidUUID(lessonId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid lesson id" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM lessons WHERE id = $1`,
      [lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }
    
    const lesson = result.rows[0];
    
    // Check membership
    const memRes = await pool.query(
      `SELECT 1 FROM class_members WHERE class_id = $1 AND student_id = $2
       UNION
       SELECT 1 FROM classes WHERE id = $1 AND tutor_id = $2`,
      [lesson.class_id, userId]
    );
    if (memRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "403 Forbidden: Bạn không có quyền truy cập lớp học này." });
    }

    return res.json({ success: true, data: lesson });
  } catch (error) {
    console.error("[Lessons] GET detail error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/lessons
// Tạo lesson mới
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/classes/:classId/lessons", requireAuth, requireClassMember, async (req, res) => {
  const { classId } = req.params;
  const {
    title,
    description,
    lesson_order,
    duration_minutes,
    video_url,
    material_id,
    status,
  } = req.body || {};

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

  if (material_id && !isValidUUID(material_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid material id" });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Tự động tính lesson_order nếu không truyền
    let finalOrder = lesson_order;
    if (finalOrder === undefined || finalOrder === null) {
      const orderRes = await pool.query(
        `SELECT MAX(lesson_order) as max_order FROM lessons WHERE class_id = $1`,
        [classId]
      );
      const maxOrder = orderRes.rows[0]?.max_order;
      finalOrder = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 1;
    }

    const result = await pool.query(
      `INSERT INTO lessons
         (class_id, title, description, lesson_order, duration_minutes, video_url, material_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        classId,
        title.trim(),
        description || null,
        finalOrder,
        duration_minutes || null,
        video_url || null,
        material_id || null,
        status || "published",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[Lessons] POST error:", error.message);
    if (error.code === "23503") {
      // Khoá ngoại lỗi (ví dụ class_id hoặc material_id không tồn tại thực tế)
      if (error.constraint && error.constraint.includes("material_id")) {
        return res
          .status(400)
          .json({ success: false, message: "Referenced material does not exist" });
      }
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
