const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews' ORDER BY ordinal_position")
  .then(r => {
    r.rows.forEach(row => console.log(row.column_name));
    pool.end();
  })
  .catch(e => { console.error(e); pool.end(); });
