const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_tutor_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_favorite BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, tutor_id)
      );
    `);
    console.log("Table student_tutor_interactions created successfully.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    pool.end();
  }
}
migrate();
