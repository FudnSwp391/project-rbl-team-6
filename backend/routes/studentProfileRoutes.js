const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/student/profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, city, picture, is_approved
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[Student Profile] GET error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/student/profile
router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, phone, city, picture } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, phone = $2, city = $3, picture = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, role, phone, city, picture, is_approved`,
      [full_name.trim(), phone || null, city || null, picture || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: result.rows[0], message: "Profile updated successfully" });
  } catch (error) {
    console.error("[Student Profile] PUT error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
