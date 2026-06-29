const {Pool} = require('pg'); 
require('dotenv').config(); 
const pool = new Pool({connectionString: process.env.DATABASE_URL}); 
async function fix() {
  await pool.query("ALTER TABLE tutor_requests DROP CONSTRAINT IF EXISTS tutor_requests_match_status_check");
  await pool.query("ALTER TABLE tutor_requests ADD CONSTRAINT tutor_requests_match_status_check CHECK (match_status IN ('pending', 'matching', 'waiting_tutor_response', 'matched', 'closed'))");
  console.log("Constraint updated");
  pool.end();
}
fix();
