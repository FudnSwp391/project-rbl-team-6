require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const sql = fs.readFileSync('rls_and_storage.sql', 'utf8');
    await pool.query(sql);
    console.log("✅ rls_and_storage.sql executed successfully.");
  } catch (error) {
    console.error("❌ Error executing rls_and_storage.sql:", error.message);
  } finally {
    await pool.end();
  }
}

run();
