/**
 * Class Routes — Person 4: Class Workspace
 *
 * GET /api/classes/student/:studentId  → Danh sách classes của student
 * GET /api/classes/:classId            → Chi tiết 1 class
 *
 * Nếu DB query lỗi → trả mock data fallback để frontend vẫn test được.
 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

// ── Mock data fallback (dùng khi DB chưa có data hoặc query lỗi) ────────────
const MOCK_CLASSES = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "UI/UX Advanced Mobile App Design",
    description:
      "This advanced course covers the essential principles and modern techniques of UI/UX design for mobile applications.",
    tutor_id: "00000000-0000-0000-0000-000000000001",
    tutor_name: "Jane Doe",
    meet_link: "https://meet.google.com/abc-defg-hij",
    start_date: "2026-01-15",
    end_date: "2026-05-20",
    status: "active",
    progress: 45,
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    title: "Introduction to Web Development",
    description:
      "Learn the fundamentals of HTML, CSS, and JavaScript to build modern web applications.",
    tutor_id: "00000000-0000-0000-0000-000000000002",
    tutor_name: "Prof. Adrian Sterling",
    meet_link: "https://meet.google.com/xyz-abcd-efg",
    start_date: "2026-02-01",
    end_date: "2026-06-15",
    status: "active",
    progress: 20,
  },
];

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
         c.created_at
       FROM class_members cm
       JOIN classes c ON c.id = cm.class_id
       LEFT JOIN users u ON u.id = c.tutor_id
       WHERE cm.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );

    // Nếu DB trả về data thật → dùng luôn
    if (result.rows.length > 0) {
      // Thêm mock progress (chưa có bảng progress riêng cho classes)
      const data = result.rows.map((row) => ({
        ...row,
        progress: 0, // TODO: tính từ bảng progress khi có
      }));

      return res.json({ success: true, data });
    }

    // Nếu DB trống (chưa seed data) → trả mock
    console.log(
      `[Classes] No classes found for student ${studentId} — returning mock data`
    );
    return res.json({ success: true, data: MOCK_CLASSES });
  } catch (error) {
    console.error("[Classes] Error fetching student classes:", error.message);

    // DB lỗi (bảng chưa tạo, connection fail...) → trả mock
    return res.json({ success: true, data: MOCK_CLASSES });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classes/:classId
// Trả về chi tiết một class
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:classId", async (req, res) => {
  const { classId } = req.params;

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
         c.created_at
       FROM classes c
       LEFT JOIN users u ON u.id = c.tutor_id
       WHERE c.id = $1`,
      [classId]
    );

    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0] });
    }

    // Nếu không tìm thấy trong DB → thử tìm trong mock
    const mock = MOCK_CLASSES.find((c) => c.id === classId);
    if (mock) {
      console.log(
        `[Classes] Class ${classId} not in DB — returning mock data`
      );
      return res.json({ success: true, data: mock });
    }

    // Không tìm thấy ở đâu cả
    return res
      .status(404)
      .json({ success: false, message: "Class not found." });
  } catch (error) {
    console.error("[Classes] Error fetching class detail:", error.message);

    // DB lỗi → thử trả mock
    const mock = MOCK_CLASSES.find((c) => c.id === classId);
    if (mock) {
      return res.json({ success: true, data: mock });
    }

    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
