require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function run() {
  try {
    // Check tutor_requests schema
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_requests' ORDER BY ordinal_position"
    );
    console.log('\n📋 tutor_requests columns:');
    cols.rows.forEach(r => console.log('  -', r.column_name, '(' + r.data_type + ')'));

    // Check tutor_request_matches schema
    const cols2 = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tutor_request_matches' ORDER BY ordinal_position"
    );
    console.log('\n📋 tutor_request_matches columns:');
    cols2.rows.forEach(r => console.log('  -', r.column_name, '(' + r.data_type + ')'));

    // Test POST a dummy request
    const result = await pool.query(`
      INSERT INTO tutor_requests (
        student_id, subject, match_status, matched_tutor_count, request_source
      ) VALUES (
        NULL, 'Toán', 'pending', 0, 'guest'
      ) RETURNING id, subject, match_status
    `);
    const row = result.rows[0];
    console.log('\n✅ Test INSERT OK:', row);

    // Clean up
    await pool.query('DELETE FROM tutor_requests WHERE id = $1', [row.id]);
    console.log('✅ Test cleanup OK');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
