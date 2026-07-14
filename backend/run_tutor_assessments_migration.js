require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'tutor_assessments_migration.sql'), 'utf-8');
  await pool.query(sql);
  console.log('✅ Tutor assessments migration executed successfully.');
  
  const tables = ['tutor_exams', 'tutor_exam_questions', 'tutor_homework', 'tutor_homework_submissions'];
  for (const table of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n📋 Bảng ${table}:`);
    res.rows.forEach(r => console.log('  -', r.column_name, '(' + r.data_type + ')'));
  }
  await pool.end();
}

run().catch(err => { console.error('❌', err.message); pool.end(); });
