const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tutor_profiles'`).then(r => {
  console.log('Columns:', r.rows.map(x=>x.column_name).join(', '));
  process.exit(0);
});
