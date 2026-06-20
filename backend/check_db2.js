const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'classes'`).then(r => {
  console.log('classes:', r.rows.map(x=>x.column_name).join(', '));
  return pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'courses'`);
}).then(r2 => {
  console.log('courses:', r2.rows.map(x=>x.column_name).join(', '));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
