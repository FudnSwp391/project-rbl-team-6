const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT id, student_id, tutor_id, lesson_date, time_slot, status FROM bookings ORDER BY created_at DESC LIMIT 5")
  .then(r => {
    console.log(r.rows);
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
