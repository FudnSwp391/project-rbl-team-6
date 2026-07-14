const fs = require('fs');

const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add GET /api/courses/:id
const coursesEndpoint = `
// ── GET /api/courses/:id — Chi tiết khóa học ──────────────────────────────
app.get("/api/courses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const courseRes = await pool.query(
      \`SELECT c.*, 
              u.full_name as tutor_name, u.picture as tutor_picture, u.email as tutor_email,
              tp.bio as tutor_bio, tp.experience_years as tutor_experience
       FROM courses c
       JOIN users u ON c.tutor_id = u.id
       JOIN tutor_profiles tp ON u.id = tp.user_id
       WHERE c.id = $1\`,
      [id]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseRes.rows[0];

    const lessonsRes = await pool.query(
      \`SELECT id, title, description, duration_minutes, lesson_order as "order" 
       FROM lessons WHERE class_id = $1 ORDER BY lesson_order ASC\`,
      [id]
    );

    course.tutor = {
      id: course.tutor_id,
      name: course.tutor_name,
      picture: course.tutor_picture,
      email: course.tutor_email,
      bio: course.tutor_bio,
      experience_years: course.tutor_experience
    };

    course.thumbnailUrl = course.thumbnail_url;
    course.thumbnailPreviewUrl = course.thumbnail_url;
    course.learningOutcomes = course.learning_outcomes;
    course.originalPrice = course.original_price;
    course.avgRating = course.avg_rating;
    course.reviewCount = course.review_count;
    course.estimatedHours = course.estimated_hours;

    course.lessons = lessonsRes.rows;
    course.isEnrolled = false;

    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded && decoded.userId) {
          const enrollRes = await pool.query(
            "SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2 AND status = 'active'",
            [id, decoded.userId]
          );
          if (enrollRes.rows.length > 0) course.isEnrolled = true;
        }
      } catch(e) {}
    }

    return res.json(course);
  } catch (e) {
    console.error("GET /api/courses/:id:", e.message);
    return res.status(500).json({ message: "Server error." });
  }
});
`;

if (!content.includes('app.get("/api/courses/:id"')) {
  // Find where app.post("/api/ai-suggest" is, and insert before it
  content = content.replace(/\/\/ ── POST \/api\/ai-suggest \(TV3\)/, coursesEndpoint + '\n// ── POST /api/ai-suggest (TV3)');
}

// 2. Remove the duplicated POST and GET /api/bookings
const rxPost = /\/\/ ── Đặt lịch học với gia sư \(TV3\)[\s\S]*?POST \/api\/bookings — học sinh tạo yêu cầu đặt lịch[\s\S]*?\}\);/g;
const rxGet = /\/\/ GET \/api\/bookings — danh sách lịch học của học sinh đang đăng nhập[\s\S]*?\}\);/g;

content = content.replace(rxPost, '');
content = content.replace(rxGet, '');

// Clean up duplicate empty lines
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(file, content, 'utf8');
console.log("Fix applied successfully.");
