require('dotenv').config();
const pool = require('./db');
pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'").then(r => {
  console.log(r.rows);
  pool.end();
}).catch(console.error);
