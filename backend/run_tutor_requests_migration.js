require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'tutor_requests_migration.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Created tutor_requests table successfully.');

    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_requests' ORDER BY ordinal_position"
    );
    console.log('\n📋 Bảng tutor_requests sau migration:');
    res.rows.forEach(r => console.log('  -', r.column_name, '(' + r.data_type + ')'));
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
  } finally {
    pool.end();
  }
}

run();
