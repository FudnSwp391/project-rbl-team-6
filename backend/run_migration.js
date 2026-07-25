const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres.qrdnebeulfdgfeermghj:cungnhauthukhoa@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'reschedule_requests_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Migration ran successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

run();
