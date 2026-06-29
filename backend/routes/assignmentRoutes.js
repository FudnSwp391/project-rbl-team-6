/**
 * Assignment Routes — Person 4 / Part 5: Assignments
 *
 * GET  /api/classes/:classId/assignments  → Danh sách bài tập của class
 * GET  /api/assignments/:assignmentId      → Chi tiết một bài tập
 * POST /api/classes/:classId/assignments  → Tạo bài tập mới
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
    return null; // DB error — cannot determine
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId/assignments
// Lấy danh sách bài tập của một class
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/classes/:classId/assignments", requireAuth, requireClassMember, async (req, res) => {
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
      `SELECT * FROM assignments
       WHERE class_id = $1
       ORDER BY created_at DESC`,
      [classId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[Assignments] GET list error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assignments/:assignmentId
// Lấy chi tiết một bài tập
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/assignments/:assignmentId", requireAuth, async (req, res) => {
  const { assignmentId } = req.params;
  const userId = req.user.userId;

  if (!isValidUUID(assignmentId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid assignment id" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM assignments WHERE id = $1`,
      [assignmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    
    const assignment = result.rows[0];
    
    // Check membership
    const memRes = await pool.query(
      `SELECT 1 FROM class_members WHERE class_id = $1 AND student_id = $2
       UNION
       SELECT 1 FROM classes WHERE id = $1 AND tutor_id = $2`,
      [assignment.class_id, userId]
    );
    if (memRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: "403 Forbidden: Bạn không có quyền truy cập lớp học này." });
    }

    return res.json({ success: true, data: assignment });
  } catch (error) {
    console.error("[Assignments] GET detail error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/assignments
// Tạo bài tập mới
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/classes/:classId/assignments", requireAuth, requireClassMember, async (req, res) => {
  const { classId } = req.params;
  const { title, description, due_date, created_by } = req.body || {};

  // Validate classId
  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  // Validate required fields
  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }
  if (!due_date || !due_date.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Due date is required" });
  }
  if (!created_by || !isValidUUID(created_by)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid created_by (user id) is required" });
  }

  try {
    // Check class exists
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Insert new assignment
    const result = await pool.query(
      `INSERT INTO assignments
         (class_id, title, description, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [classId, title.trim(), description || null, due_date.trim(), created_by]
    );

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[Assignments] POST error:", error.message);
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
