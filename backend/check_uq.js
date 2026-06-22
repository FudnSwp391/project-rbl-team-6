const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT indexdef FROM pg_indexes WHERE indexname = 'uq_bookings_active_slot'")
  .then(r => {
    console.log(r.rows);
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
