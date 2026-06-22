const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');
const lines = content.split('\n');

// Fix POST /api/reviews - find the INSERT INTO reviews line with reviewer_id
const insertLineIdx = lines.findIndex(l => l.includes('INSERT INTO reviews (reviewer_id'));
console.log('INSERT line index:', insertLineIdx, '->', lines[insertLineIdx].trim());

// Go back to find app.post("/api/reviews"
let postStartIdx = insertLineIdx;
while (postStartIdx > 0 && !lines[postStartIdx].includes('app.post("/api/reviews"')) {
  postStartIdx--;
}
// Include the comment lines above
while (postStartIdx > 0 && lines[postStartIdx - 1].trim().startsWith('//')) {
  postStartIdx--;
}

// Go forward to find the closing });
let postEndIdx = insertLineIdx;
while (postEndIdx < lines.length && !lines[postEndIdx].trim().startsWith('});')) {
  postEndIdx++;
}

console.log('Replacing lines', postStartIdx + 1, 'to', postEndIdx + 1);

const newPostEndpoint = [
  '// ── POST /api/reviews ──────────────────────────────────────────────────────────',
  '// Người dùng đã đăng nhập gửi đánh giá mới',
  'app.post("/api/reviews", verifyToken, async (req, res) => {',
  '  const { rating, content, tutor_id, course_id } = req.body || {};',
  '  if (!rating || !content) {',
  '    return res.status(400).json({ message: "rating và content là bắt buộc." });',
  '  }',
  '  if (rating < 1 || rating > 5) {',
  '    return res.status(400).json({ message: "rating phải từ 1 đến 5." });',
  '  }',
  '  try {',
  '    const result = await pool.query(',
  '      `INSERT INTO reviews (user_id, tutor_id, course_id, rating, comment, review_type, is_visible)',
  '       VALUES ($1, $2, $3, $4, $5, $6, true)',
  '       RETURNING *`,',
  "      [req.user.userId, tutor_id || null, course_id || null, rating, content, tutor_id ? 'tutor' : 'course']",
  '    );',
  '    return res.status(201).json(result.rows[0]);',
  '  } catch (err) {',
  '    console.error("POST /api/reviews error:", err);',
  '    return res.status(500).json({ message: "Server error." });',
  '  }',
  '});',
];

lines.splice(postStartIdx, postEndIdx - postStartIdx + 1, ...newPostEndpoint);
fs.writeFileSync('backend/server.js', lines.join('\n'));

// Verify
const after = fs.readFileSync('backend/server.js', 'utf8');
console.log('Still has reviewer_id in INSERT?', after.includes('INSERT INTO reviews (reviewer_id'));
