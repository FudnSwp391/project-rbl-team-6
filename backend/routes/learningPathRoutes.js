/**
 * AI Learning Path Routes — Person 4 / Part 9: AI Learning Path
 *
 * GET  /api/classes/:classId/learning-path/:studentId  → Lấy learning path của học sinh trong class
 * POST /api/classes/:classId/learning-path/generate    → Tạo learning path mới
 */
const express = require("express");
const pool = require("../db");
const { generatePlan } = require("../services/learningPathService");

const router = express.Router();

// ── UUID v4 regex ────────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === "string" && UUID_REGEX.test(str);
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
// GET /api/classes/:classId/learning-path/:studentId
// Lấy learning path hiện tại của học sinh trong class
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/classes/:classId/learning-path/:studentId", async (req, res) => {
  const { classId, studentId } = req.params;

  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  if (!isValidUUID(studentId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid student id" });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Query learning path
    const pathResult = await pool.query(
      `SELECT * FROM learning_paths 
       WHERE class_id = $1 AND student_id = $2`,
      [classId, studentId]
    );

    if (pathResult.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const learningPath = pathResult.rows[0];

    // Query steps
    const stepsResult = await pool.query(
      `SELECT * FROM learning_path_steps
       WHERE learning_path_id = $1
       ORDER BY step_order ASC`,
      [learningPath.id]
    );

    return res.json({
      success: true,
      data: {
        ...learningPath,
        steps: stepsResult.rows
      }
    });
  } catch (error) {
    console.error("[LearningPath] GET error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classes/:classId/learning-path/generate
// Tạo learning path mới cho học sinh
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/classes/:classId/learning-path/generate", async (req, res) => {
  const { classId } = req.params;
  const { student_id, current_level, target_level, goal, duration_weeks } = req.body || {};

  if (!isValidUUID(classId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class id" });
  }

  if (!student_id || !isValidUUID(student_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid student_id is required" });
  }

  if (!goal || !goal.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Goal description is required" });
  }

  const duration = duration_weeks ? parseInt(duration_weeks, 10) : 8;
  if (isNaN(duration) || duration <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Duration weeks must be a positive integer" });
  }

  try {
    const exists = await classExists(classId);
    if (exists === false) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    // Call service to generate steps plan (via Gemini or Rule-based)
    const plan = await generatePlan(
      classId,
      student_id,
      current_level,
      target_level,
      goal.trim(),
      duration
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Transaction step 1: delete old learning path for this class/student (will cascade delete steps)
      await client.query(
        `DELETE FROM learning_paths 
         WHERE class_id = $1 AND student_id = $2`,
        [classId, student_id]
      );

      // Transaction step 2: insert new path record
      const pathResult = await client.query(
        `INSERT INTO learning_paths
           (class_id, student_id, current_level, target_level, goal, duration_weeks, generated_plan)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          classId,
          student_id,
          current_level || null,
          target_level || null,
          goal.trim(),
          duration,
          JSON.stringify(plan)
        ]
      );

      const newPath = pathResult.rows[0];
      const stepsInserted = [];

      // Transaction step 3: insert steps
      for (const step of plan.steps) {
        const stepResult = await client.query(
          `INSERT INTO learning_path_steps
             (learning_path_id, lesson_id, step_order, title, description, estimated_week)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            newPath.id,
            step.lesson_id || null,
            step.step_order,
            step.title,
            step.description || null,
            step.estimated_week
          ]
        );
        stepsInserted.push(stepResult.rows[0]);
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Learning path generated successfully",
        data: {
          ...newPath,
          steps: stepsInserted
        }
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[LearningPath] Generate error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
