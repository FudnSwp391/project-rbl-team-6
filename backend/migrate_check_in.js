require('dotenv').config();
const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS tutor_check_in_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS notified_tutor_before_lesson BOOLEAN DEFAULT false;
    `);
    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
