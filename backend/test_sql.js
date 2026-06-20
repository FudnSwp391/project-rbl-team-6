const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const id = '1';
const query = `
       SELECT
         u.id, u.full_name, u.picture, u.email,
         tp.bio, tp.subjects, tp.experience_years,
         tp.hourly_rate, tp.profile_photo_url, tp.city, tp.country,
         tp.education, tp.language, tp.teaching_style, tp.qualifications,
         tp.first_name, tp.last_name, tp.display_name, tp.phone,
         tp.headline, tp.teaching_methods, tp.suitable_students,
         COALESCE(
           (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.tutor_id = u.id),
           0
         ) AS avg_r,
         COALESCE(
           (SELECT COUNT(*) FROM reviews r WHERE r.tutor_id = u.id),
           0
         ) AS review_count
       FROM tutor_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE u.id = $1 AND tp.status = 'approved'
       LIMIT 1
`;

pool.query(query, [id]).then(r => {
  console.log(r.rows);
}).catch(console.error).finally(() => pool.end());
