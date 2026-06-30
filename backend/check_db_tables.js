require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function run() {
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('tutor_requests','tutor_request_matches')"
    );
    const tables = res.rows.map(r => r.table_name);
    console.log('Existing tables:', tables);

    if (!tables.includes('tutor_requests')) {
      console.log('tutor_requests table is MISSING. Creating...');
      const sql = fs.readFileSync(path.join(__dirname, 'tutor_requests_migration.sql'), 'utf8');
      await pool.query(sql);
      console.log('Created tutor_requests OK');
    } else {
      console.log('tutor_requests OK');
    }

    if (!tables.includes('tutor_request_matches')) {
      console.log('tutor_request_matches table is MISSING. Creating...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tutor_request_matches (
          id SERIAL PRIMARY KEY,
          request_id INTEGER REFERENCES tutor_requests(id) ON DELETE CASCADE,
          tutor_id INTEGER,
          match_score NUMERIC DEFAULT 0,
          match_tier VARCHAR(50),
          is_interested BOOLEAN DEFAULT FALSE,
          is_selected BOOLEAN DEFAULT FALSE,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(request_id, tutor_id)
        );
      `);
      console.log('Created tutor_request_matches OK');
    } else {
      console.log('tutor_request_matches OK');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
