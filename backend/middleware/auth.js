const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập." });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Token không hợp lệ." });
    req.user = decoded;
    next();
  });
};

const requireClassMember = async (req, res, next) => {
  const { classId } = req.params;
  const userId = req.user.userId;
  if (!classId) return next();
  try {
    const result = await pool.query(
      `SELECT 1 FROM class_members WHERE class_id = $1 AND student_id = $2
       UNION
       SELECT 1 FROM classes WHERE id = $1 AND tutor_id = $2`,
      [classId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: "403 Forbidden: Bạn không có quyền truy cập lớp học này." });
    }
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { requireAuth, requireClassMember };
