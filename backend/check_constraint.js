const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT pg_get_constraintdef(oid) AS constraint_def FROM pg_constraint WHERE conname = 'bookings_status_check'")
  .then(r => {
    console.log(r.rows);
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
