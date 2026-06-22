require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db.js');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'payment_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running payment migration...');
    await pool.query(sql);
    console.log('✅ Payment migration applied successfully.');

    // Print table status
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('wallets', 'transactions', 'disputes')"
    );
    console.log('📋 Tables created:');
    res.rows.forEach(r => console.log('  -', r.table_name));

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

run();
