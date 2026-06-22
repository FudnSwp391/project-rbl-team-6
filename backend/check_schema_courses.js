const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'courses'
`).then(r => {
  console.log(r.rows.map(row => row.column_name));
}).catch(console.error).finally(() => pool.end());
