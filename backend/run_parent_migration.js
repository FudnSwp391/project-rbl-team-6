require('dotenv').config();
const pool = require('./db');
const fs = require('fs');
const sql = fs.readFileSync('./parent_migration.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('✅ Parent migration OK');
  pool.end();
}).catch(e => {
  console.error('❌ Migration error:', e.message);
  pool.end();
  process.exit(1);
});
