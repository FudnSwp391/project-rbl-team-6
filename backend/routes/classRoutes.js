/**
 * Class Routes — Person 4: Class Workspace
 *
 * GET /api/classes/student/:studentId  → Danh sách classes của student
 * GET /api/classes/:classId            → Chi tiết 1 class (with lessons, materials, upcoming session)
 *
 * All data comes from the real database. No mock/fallback data.
 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/student/:studentId
// Trả về danh sách classes mà student đã tham gia (qua class_members)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/student/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.title,
         c.description,
         c.tutor_id,
         u.full_name AS tutor_name,
         c.meet_link,
         c.start_date,
         c.end_date,
         c.status,
         c.created_at,
         (SELECT COUNT(*) FROM lessons l WHERE l.class_id = c.id)::int AS total_lessons
       FROM class_members cm
       JOIN classes c ON c.id = cm.class_id
       LEFT JOIN users u ON u.id = c.tutor_id
       WHERE cm.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const data = result.rows.map((row) => ({
      ...row,
      progress: 0, // No lesson_completions table yet — show 0
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[Classes] Error fetching student classes:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId
// Trả về chi tiết một class, kèm:
//   - total_lessons, tutor_name
//   - materials[] (2 gần nhất cho sidebar Quick Materials)
//   - upcoming_session (buổi học sắp tới nếu có trong schedule_sessions)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:classId", async (req, res) => {
  const { classId } = req.params;

  try {
    // 1) Fetch class detail + tutor name + lesson counts
    const classResult = await pool.query(
      `SELECT
         c.id,
         c.title,
         c.description,
         c.tutor_id,
         u.full_name AS tutor_name,
         u.picture   AS tutor_picture,
         c.meet_link,
         c.start_date,
         c.end_date,
         c.status,
         c.created_at,
         (SELECT COUNT(*) FROM lessons l WHERE l.class_id = c.id)::int AS total_lessons
       FROM classes c
       LEFT JOIN users u ON u.id = c.tutor_id
       WHERE c.id = $1`,
      [classId]
    );

    if (classResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found." });
    }

    const classData = classResult.rows[0];

    // 2) Fetch recent materials (limit 2 for sidebar Quick Materials)
    let materials = [];
    try {
      const matResult = await pool.query(
        `SELECT
           m.id,
           m.title,
           m.file_type,
           m.file_size,
           m.file_url,
           m.created_at
         FROM materials m
         WHERE m.class_id = $1
         ORDER BY m.created_at DESC
         LIMIT 2`,
        [classId]
      );
      materials = matResult.rows;
    } catch (matErr) {
      console.warn("[Classes] Could not fetch materials:", matErr.message);
    }

    // 3) Fetch upcoming session from schedule_sessions (if table exists)
    let upcomingSession = null;
    try {
      const sessResult = await pool.query(
        `SELECT
           id, title, start_time, end_time, tutor_name,
           meeting_platform, meeting_url, status
         FROM schedule_sessions
         WHERE class_id = $1
           AND start_time > NOW()
           AND status IN ('upcoming', 'ongoing')
         ORDER BY start_time ASC
         LIMIT 1`,
        [classId]
      );
      if (sessResult.rows.length > 0) {
        upcomingSession = sessResult.rows[0];
      }
    } catch (sessErr) {
      // schedule_sessions table might not exist — that's fine
      console.warn("[Classes] Could not fetch upcoming session:", sessErr.message);
    }

    // 4) Combine and return
    return res.json({
      success: true,
      data: {
        ...classData,
        materials,
        upcoming_session: upcomingSession,
      },
    });
  } catch (error) {
    console.error("[Classes] Error fetching class detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
