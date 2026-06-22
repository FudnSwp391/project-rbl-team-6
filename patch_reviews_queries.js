const fs = require('fs');
let s = fs.readFileSync('backend/server.js', 'utf8');

// Replace the query in GET /api/reviews/featured
const oldFeaturedQuery = `      \`SELECT r.id, r.reviewer_name, r.reviewer_role, r.reviewer_picture,
              r.rating, r.subject, r.content, r.created_at,
              u.picture AS user_picture, u.full_name AS user_full_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.reviewer_id
       WHERE r.rating = 5
       ORDER BY r.created_at DESC
       LIMIT $1\``;

const newFeaturedQuery = `      \`SELECT 
          r.id, 
          u.full_name AS reviewer_name, 
          u.role AS reviewer_role, 
          u.picture AS reviewer_picture,
          r.rating, 
          'EduX Platform' AS subject, 
          r.comment AS content, 
          r.created_at,
          u.picture AS user_picture, 
          u.full_name AS user_full_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.rating = 5
       ORDER BY r.created_at DESC
       LIMIT $1\``;

s = s.replace(oldFeaturedQuery, newFeaturedQuery);

// Replace the query in POST /api/reviews
const oldPostQuery = `      \`INSERT INTO reviews (reviewer_id, reviewer_name, reviewer_role, reviewer_picture, rating, subject, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *\``;

const newPostQuery = `      \`INSERT INTO reviews (user_id, rating, comment)
       VALUES ($1, $2, $3)
       RETURNING *\``;

s = s.replace(oldPostQuery, newPostQuery);
s = s.replace(
  '[req.user.userId, u.full_name, u.role, u.picture || null, rating, subject || null, content]',
  '[req.user.userId, rating, content]'
);

fs.writeFileSync('backend/server.js', s);
console.log('Successfully patched reviews queries.');
