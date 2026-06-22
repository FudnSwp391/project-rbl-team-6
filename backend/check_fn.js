const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`SELECT proname, prosrc FROM pg_proc WHERE proname='release_escrow'`)
  .then(res => {
    console.log(res.rows);
    process.exit();
  })
  .catch(console.error);
