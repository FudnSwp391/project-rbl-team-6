require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const sql = [
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS first_name TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS last_name TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS display_name TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS birthday DATE",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS gender TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS country TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS city TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS phone TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS education TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS language TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2)",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS teaching_style TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS qualifications TEXT",
  "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT",
];

async function run() {
  for (const stmt of sql) {
    await pool.query(stmt);
    console.log('✅', stmt.replace('ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS ', ''));
  }

  const res = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_profiles' ORDER BY ordinal_position"
  );
  console.log('\n📋 Bảng tutor_profiles sau migration:');
  res.rows.forEach(r => console.log('  -', r.column_name, '(' + r.data_type + ')'));
  await pool.end();
}

run().catch(err => { console.error('❌', err.message); pool.end(); });
