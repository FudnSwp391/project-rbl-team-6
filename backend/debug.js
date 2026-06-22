const {Pool} = require('pg'); 
require('dotenv').config(); 
const pool = new Pool({connectionString: process.env.DATABASE_URL}); 
pool.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conname = 'tutor_requests_match_status_check'").then(r => console.log(r.rows)).catch(console.error).finally(()=>pool.end())
