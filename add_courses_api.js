const fs = require('fs');

let s = fs.readFileSync('backend/server.js', 'utf8');

if (!s.includes('app.get("/api/courses"')) {
  const newEndpoint = `
// ── GET /api/courses ──────────────────────────────────────────────────────────
// Lấy danh sách khóa học cho marketplace
app.get("/api/courses", async (req, res) => {
  try {
    const result = await pool.query(
      \`SELECT c.*, u.full_name AS tutor_name, u.picture AS tutor_picture 
       FROM courses c
       JOIN users u ON c.tutor_id = u.id
       WHERE c.status = 'approved' OR c.status = 'published' OR c.status = 'active'
       ORDER BY c.created_at DESC\`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/courses error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});
`;

  // Insert before the first tutor endpoint
  s = s.replace('// ── GET /api/tutors', newEndpoint + '\n// ── GET /api/tutors');
  fs.writeFileSync('backend/server.js', s);
  console.log('Added /api/courses to server.js');
} else {
  console.log('/api/courses already exists');
}
