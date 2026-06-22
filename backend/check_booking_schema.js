const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // Check bookings table columns
  const r1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings' ORDER BY ordinal_position");
  console.log('=== bookings table ===');
  r1.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
  
  // Check tutor_profiles availability column type
  const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_profiles' AND column_name = 'availability'");
  console.log('\n=== tutor_profiles.availability ===');
  r2.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
  
  // Check sample availability data
  const r3 = await pool.query("SELECT user_id, availability FROM tutor_profiles WHERE availability IS NOT NULL LIMIT 1");
  console.log('\n=== sample availability ===');
  if (r3.rows.length) {
    console.log('  user_id:', r3.rows[0].user_id);
    console.log('  availability:', JSON.stringify(r3.rows[0].availability).slice(0, 300));
  } else {
    console.log('  No tutor has availability set.');
  }
  
  pool.end();
}
check().catch(e => { console.error(e); pool.end(); });
