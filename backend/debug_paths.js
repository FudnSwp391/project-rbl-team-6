require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query(
      `SELECT id, user_id, status,
              profile_photo_url, certificate_url, cccd_url
       FROM tutor_profiles
       ORDER BY created_at DESC
       LIMIT 10`
    );
    console.log('📋 tutor_profiles (latest 10):');
    res.rows.forEach((r, i) => {
      console.log(`\n[${i+1}] id=${r.id} user_id=${r.user_id} status=${r.status}`);
      console.log('    profile_photo_url:', r.profile_photo_url);
      console.log('    certificate_url  :', r.certificate_url);
      console.log('    cccd_url         :', r.cccd_url);
    });

    // Also test signed URL generation for first row with a cert
    const withCert = res.rows.find(r => r.certificate_url);
    if (withCert) {
      console.log('\n🔐 Testing createSignedUrl for:', withCert.certificate_url);
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
      const path = withCert.certificate_url;
      const url = `${SUPABASE_URL}/storage/v1/object/sign/tutor-documents/${path}`;
      console.log('   POST to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      const data = await response.json();
      console.log('   Response status:', response.status);
      console.log('   Response body:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    await pool.end();
  }
}

run();
