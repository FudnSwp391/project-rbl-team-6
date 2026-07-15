require('dotenv').config();
const pool = require('./db');
pool.query("SELECT id, full_name, role FROM users WHERE full_name ILIKE '%Tân%' OR full_name ILIKE '%Phạm%'").then(r => {
  console.log(r.rows);
  pool.end();
}).catch(console.error);
