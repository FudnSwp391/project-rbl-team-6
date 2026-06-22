const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
SELECT 
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
LIMIT 12
`).then(r => {
  console.log(r.rows);
}).catch(console.error).finally(() => pool.end());
