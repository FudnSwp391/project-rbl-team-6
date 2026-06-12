require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    // All tutor profiles with user email
    const res = await pool.query(`
      SELECT tp.id, u.email, u.full_name, tp.status, tp.created_at,
             tp.certificate_url IS NOT NULL AS has_cert,
             tp.cccd_url IS NOT NULL AS has_cccd
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      ORDER BY tp.created_at DESC
      LIMIT 10
    `);
    console.log('All tutor profiles:');
    res.rows.forEach(r => {
      console.log(`  [${r.status.toUpperCase()}] ${r.full_name} <${r.email}> cert=${r.has_cert} cccd=${r.has_cccd} at=${r.created_at}`);
    });

    // Users with role=tutor or who registered as tutor
    console.log('\nAll users:');
    const users = await pool.query(`SELECT id, full_name, email, role FROM users ORDER BY created_at DESC LIMIT 10`);
    users.rows.forEach(r => {
      console.log(`  [${r.role}] ${r.full_name} <${r.email}>`);
    });

  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
run();
