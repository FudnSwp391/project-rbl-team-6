const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');
const lines = content.split('\n');

// Find the line with r.reviewer_id and replace the entire block
const targetLineIdx = lines.findIndex(l => l.includes('r.reviewer_id'));
console.log('Target line index:', targetLineIdx, '-> content:', lines[targetLineIdx].trim());

// Go backwards to find the start of this endpoint block (the comment line)
let startIdx = targetLineIdx;
while (startIdx > 0 && !lines[startIdx].includes('GET /api/reviews/featured')) {
  startIdx--;
}
// Go one more back if there's a comment line before
if (startIdx > 0 && lines[startIdx - 1].trim().startsWith('//')) {
  startIdx--;
}

// Go forward to find the end (the closing });)
let endIdx = targetLineIdx;
while (endIdx < lines.length && !lines[endIdx].trim().startsWith('});')) {
  endIdx++;
}

console.log('Replacing lines', startIdx + 1, 'to', endIdx + 1);
console.log('First line:', lines[startIdx].trim());
console.log('Last line:', lines[endIdx].trim());

const replacement = [
  '// ── GET /api/reviews/featured ─────────────────────────────────────────────────',
  '// Trả về các đánh giá 5 sao mới nhất để hiển thị trên trang chủ (không cần auth)',
  'app.get("/api/reviews/featured", async (req, res) => {',
  '  const limit = Math.min(parseInt(req.query.limit) || 12, 30);',
  '  try {',
  '    const result = await pool.query(',
  '      `SELECT r.id, r.rating, r.comment AS content, r.review_type, r.created_at,',
  '              u.full_name AS reviewer_name, u.role AS reviewer_role, u.picture AS reviewer_picture,',
  '              u.picture AS user_picture',
  '       FROM reviews r',
  '       LEFT JOIN users u ON u.id = r.user_id',
  '       WHERE r.rating = 5 AND r.is_visible = true',
  '       ORDER BY r.created_at DESC',
  '       LIMIT $1`,',
  '      [limit]',
  '    );',
  '    return res.json(result.rows);',
  '  } catch (err) {',
  '    console.error("GET /api/reviews/featured error:", err);',
  '    return res.status(500).json({ message: "Server error." });',
  '  }',
  '});',
];

lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
fs.writeFileSync('backend/server.js', lines.join('\n'));

// Verify
const after = fs.readFileSync('backend/server.js', 'utf8');
console.log('Still has r.reviewer_id?', after.includes('r.reviewer_id'));
console.log('Has r.user_id?', after.includes('r.user_id'));
