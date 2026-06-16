/**
 * Discussion Routes — Person 4 / Part 6: Discussions
 *
 * GET  /api/classes/:classId/discussions  → Danh sách bài thảo luận của class
 * POST /api/classes/:classId/discussions  → Tạo bài thảo luận mới
 * GET  /api/discussions/:discussionId     → Chi tiết một bài thảo luận
 * GET  /api/discussions/:discussionId/replies → Danh sách replies của discussion
 * POST /api/discussions/:discussionId/replies → Tạo reply mới
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
const MOCK_DISCUSSIONS = [
  {
    id: "d0000001-0000-0000-0000-000000000001",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    user_id: "00000000-0000-0000-0000-000000000001",
    title: "Welcome to UI/UX Advanced Mobile App Design!",
    content: "Please introduce yourselves in this thread.",
    discussion_type: "announcement",
    created_at: "2026-06-15T08:00:00.000Z",
    updated_at: "2026-06-15T08:00:00.000Z",
    user_name: "Jane Doe",
    user_role: "tutor",
    user_avatar: "https://lh3.googleusercontent.com/a/default-user",
  },
  {
    id: "d0000002-0000-0000-0000-000000000002",
    class_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    user_id: "00000000-0000-0000-0000-000000000001",
    title: "Question about Auto Layout",
    content: "I do not understand how to use Auto Layout in Figma.",
    discussion_type: "question",
    created_at: "2026-06-16T10:00:00.000Z",
    updated_at: "2026-06-16T10:00:00.000Z",
    user_name: "Jane Doe",
    user_role: "tutor",
    user_avatar: "https://lh3.googleusercontent.com/a/default-user",
  },
];

const MOCK_REPLIES = [
  {
    id: "r0000001-0000-0000-0000-000000000001",
    discussion_id: "d0000002-0000-0000-0000-000000000002",
    user_id: "00000000-0000-0000-0000-000000000001",
    content: "Please review the Week 2 materials.",
    created_at: "2026-06-16T11:00:00.000Z",
    updated_at: "2026-06-16T11:00:00.000Z",
    user_name: "Jane Doe",
    user_role: "tutor",
    user_avatar: "https://lh3.googleusercontent.com/a/default-user",
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

// ── Helper: check discussion exists ─────────────────────────────────────────
async function discussionExists(discussionId) {
  try {
    const result = await pool.query(
      `SELECT id FROM discussions WHERE id = $1`,
      [discussionId]
    );
    return result.rows.length > 0;
  } catch {
    return null; // DB error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId/discussions
// Lấy danh sách bài thảo luận của một class
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/classes/:classId/discussions", async (req, res) => {
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
         d.id,
         d.class_id,
         d.user_id,
         d.title,
         d.content,
         d.discussion_type,
         d.created_at,
         d.updated_at,
         u.full_name AS user_name,
         u.role AS user_role,
         u.picture AS user_avatar
       FROM discussions d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.class_id = $1
       ORDER BY d.created_at DESC`,
      [classId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[Discussions] GET list error:", error.message);
    const mockForClass = MOCK_DISCUSSIONS.filter((d) => d.class_id === classId);
    return res.json({
      success: true,
      data: mockForClass.length > 0 ? mockForClass : MOCK_DISCUSSIONS,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/discussions
// Tạo bài thảo luận mới
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/classes/:classId/discussions", async (req, res) => {
  const { classId } = req.params;
  const { user_id, title, content, discussion_type } = req.body || {};

  // Validate classId
  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  // Validate required fields
  if (!user_id || !isValidUUID(user_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid user_id (user id) is required" });
  }
  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }
  if (!content || !content.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Content is required" });
  }

  // Validate discussion type
  const allowedTypes = ["question", "announcement", "discussion"];
  if (!discussion_type || !allowedTypes.includes(discussion_type)) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Invalid discussion type. Allowed: ${allowedTypes.join(", ")}`,
      });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Insert new discussion
    const result = await pool.query(
      `INSERT INTO discussions
         (class_id, user_id, title, content, discussion_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [classId, user_id, title.trim(), content.trim(), discussion_type]
    );

    // Fetch user details for the response payload
    const userResult = await pool.query(
      `SELECT full_name AS user_name, role AS user_role, picture AS user_avatar FROM users WHERE id = $1`,
      [user_id]
    );
    const userInfo = userResult.rows[0] || {};

    return res.status(201).json({
      success: true,
      message: "Discussion created successfully",
      data: {
        ...result.rows[0],
        ...userInfo
      },
    });
  } catch (error) {
    console.error("[Discussions] POST error:", error.message);
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ success: false, message: "Referenced user does not exist" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/discussions/:discussionId
// Lấy chi tiết một bài thảo luận
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/discussions/:discussionId", async (req, res) => {
  const { discussionId } = req.params;

  if (!isValidUUID(discussionId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid discussion id" });
  }

  try {
    const result = await pool.query(
      `SELECT 
         d.id,
         d.class_id,
         d.user_id,
         d.title,
         d.content,
         d.discussion_type,
         d.created_at,
         d.updated_at,
         u.full_name AS user_name,
         u.role AS user_role,
         u.picture AS user_avatar
       FROM discussions d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [discussionId]
    );

    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0] });
    }

    const mock = MOCK_DISCUSSIONS.find((d) => d.id === discussionId);
    if (mock) {
      return res.json({ success: true, data: mock });
    }

    return res
      .status(404)
      .json({ success: false, message: "Discussion not found" });
  } catch (error) {
    console.error("[Discussions] GET detail error:", error.message);
    const mock = MOCK_DISCUSSIONS.find((d) => d.id === discussionId);
    if (mock) {
      return res.json({ success: true, data: mock });
    }
    return res
      .status(404)
      .json({ success: false, message: "Discussion not found" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/discussions/:discussionId/replies
// Lấy danh sách replies của một discussion
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/discussions/:discussionId/replies", async (req, res) => {
  const { discussionId } = req.params;

  if (!isValidUUID(discussionId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid discussion id" });
  }

  try {
    const exists = await discussionExists(discussionId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Discussion not found" });
    }

    const result = await pool.query(
      `SELECT 
         r.id,
         r.discussion_id,
         r.user_id,
         r.content,
         r.created_at,
         r.updated_at,
         u.full_name AS user_name,
         u.role AS user_role,
         u.picture AS user_avatar
       FROM discussion_replies r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.discussion_id = $1
       ORDER BY r.created_at ASC`,
      [discussionId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[Discussions] GET replies error:", error.message);
    const mockForDisc = MOCK_REPLIES.filter((r) => r.discussion_id === discussionId);
    return res.json({
      success: true,
      data: mockForDisc.length > 0 ? mockForDisc : MOCK_REPLIES,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/discussions/:discussionId/replies
// Tạo reply mới
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/discussions/:discussionId/replies", async (req, res) => {
  const { discussionId } = req.params;
  const { user_id, content } = req.body || {};

  // Validate discussionId
  if (!isValidUUID(discussionId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid discussion id" });
  }

  // Validate required fields
  if (!user_id || !isValidUUID(user_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid user_id (user id) is required" });
  }
  if (!content || !content.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Content is required" });
  }

  try {
    const exists = await discussionExists(discussionId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Discussion not found" });
    }

    // Insert new reply
    const result = await pool.query(
      `INSERT INTO discussion_replies
         (discussion_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [discussionId, user_id, content.trim()]
    );

    // Fetch user details for response payload
    const userResult = await pool.query(
      `SELECT full_name AS user_name, role AS user_role, picture AS user_avatar FROM users WHERE id = $1`,
      [user_id]
    );
    const userInfo = userResult.rows[0] || {};

    return res.status(201).json({
      success: true,
      message: "Reply created successfully",
      data: {
        ...result.rows[0],
        ...userInfo
      },
    });
  } catch (error) {
    console.error("[Discussions] POST reply error:", error.message);
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ success: false, message: "Referenced user does not exist" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
