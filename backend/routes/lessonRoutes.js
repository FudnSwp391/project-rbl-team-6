/**
 * Lesson Routes — Person 4 / Part 7: Lessons
 *
 * GET  /api/classes/:classId/lessons  → Danh sách bài học của class (sorted by lesson_order ASC)
 * GET  /api/lessons/:lessonId         → Chi tiết một bài học
 * POST /api/classes/:classId/lessons  → Tạo bài học mới
 *
 * Nếu DB lỗi hoặc chưa tạo bảng → trả mock data fallback.
 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

// ── UUID v4 regex ────────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

// ── Mock data fallback ──────────────────────────────────────────────────────
const MOCK_LESSONS = [
  {
    id: "l0000001-0000-0000-0000-000000000001",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Introduction to UI/UX",
    description: "Basic principles of user interface and user experience design.",
    lesson_order: 1,
    duration_minutes: 45,
    video_url: "https://example.com/video1.mp4",
    material_id: null,
    status: "published",
    created_at: "2026-06-15T08:00:00.000Z",
    updated_at: "2026-06-15T08:00:00.000Z",
  },
  {
    id: "l0000002-0000-0000-0000-000000000002",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Wireframing & Prototyping",
    description: "How to design low-fidelity and high-fidelity wireframes.",
    lesson_order: 2,
    duration_minutes: 60,
    video_url: "https://example.com/video2.mp4",
    material_id: null,
    status: "published",
    created_at: "2026-06-16T09:00:00.000Z",
    updated_at: "2026-06-16T09:00:00.000Z",
  },
];

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
router.get("/api/classes/:classId/lessons", async (req, res) => {
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
    const mockForClass = MOCK_LESSONS.filter((l) => l.class_id === classId);
    return res.json({
      success: true,
      data: mockForClass.length > 0 ? mockForClass : MOCK_LESSONS,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lessons/:lessonId
// Lấy chi tiết một lesson
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/lessons/:lessonId", async (req, res) => {
  const { lessonId } = req.params;

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

    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0] });
    }

    // Không tìm thấy trong DB → tìm trong mock data
    const mock = MOCK_LESSONS.find((l) => l.id === lessonId);
    if (mock) {
      return res.json({ success: true, data: mock });
    }

    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  } catch (error) {
    console.error("[Lessons] GET detail error:", error.message);
    const mock = MOCK_LESSONS.find((l) => l.id === lessonId);
    if (mock) {
      return res.json({ success: true, data: mock });
    }
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/lessons
// Tạo lesson mới
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/classes/:classId/lessons", async (req, res) => {
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
