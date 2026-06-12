require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await pool.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('tutor-documents', 'tutor-documents', false)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✅ Bucket 'tutor-documents' created successfully or already exists.");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();
