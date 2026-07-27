const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

// Middleware bắt buộc đăng nhập
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập." });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Token không hợp lệ." });
    req.user = decoded;
    next();
  });
};

// GET /api/tutor-interaction/:tutorId
router.get("/api/tutor-interaction/:tutorId", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { tutorId } = req.params;

    // Lấy thông tin cơ bản của gia sư
    const tutorResult = await pool.query(`
      SELECT 
        u.id AS tutor_id,
        COALESCE(
          NULLIF(TRIM(COALESCE(tp.display_name, '')), ''),
          NULLIF(TRIM(COALESCE(tp.first_name,'') || ' ' || COALESCE(tp.last_name,'')), ''),
          u.full_name
        ) AS tutor_name,
        COALESCE(tp.profile_photo_url, u.picture) AS tutor_avatar,
        tp.experience_years,
        tp.bio,
        COALESCE(
          (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.tutor_id = tp.id),
          0
        ) AS tutor_rating
      FROM users u
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      WHERE u.id = $1
    `, [tutorId]);

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy gia sư." });
    }

    // Lấy thông tin tương tác
    const interactionResult = await pool.query(`
      SELECT is_favorite, notes, updated_at
      FROM student_tutor_interactions
      WHERE student_id = $1 AND tutor_id = $2
    `, [studentId, tutorId]);

    let interaction = { is_favorite: false, notes: '' };
    if (interactionResult.rows.length > 0) {
      interaction = interactionResult.rows[0];
    }

    return res.json({
      success: true,
      data: {
        tutor: tutorResult.rows[0],
        interaction
      }
    });
  } catch (error) {
    console.error("[TutorInteraction] GET error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-interaction/:tutorId/favorite
router.post("/api/tutor-interaction/:tutorId/favorite", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { tutorId } = req.params;

    // Upsert logic
    const result = await pool.query(`
      INSERT INTO student_tutor_interactions (student_id, tutor_id, is_favorite)
      VALUES ($1, $2, true)
      ON CONFLICT (student_id, tutor_id) 
      DO UPDATE SET 
        is_favorite = NOT student_tutor_interactions.is_favorite,
        updated_at = CURRENT_TIMESTAMP
      RETURNING is_favorite;
    `, [studentId, tutorId]);

    return res.json({ success: true, is_favorite: result.rows[0].is_favorite });
  } catch (error) {
    console.error("[TutorInteraction] POST favorite error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/tutor-interaction/:tutorId/note
router.post("/api/tutor-interaction/:tutorId/note", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { tutorId } = req.params;
    const { notes } = req.body;

    const result = await pool.query(`
      INSERT INTO student_tutor_interactions (student_id, tutor_id, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (student_id, tutor_id) 
      DO UPDATE SET 
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING notes;
    `, [studentId, tutorId, notes]);

    return res.json({ success: true, notes: result.rows[0].notes, message: "Đã lưu ghi chú." });
  } catch (error) {
    console.error("[TutorInteraction] POST note error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
