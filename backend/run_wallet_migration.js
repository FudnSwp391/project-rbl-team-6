const fs = require('fs');
const pool = require('./db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('wallet_requests_migration.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

runMigration();
