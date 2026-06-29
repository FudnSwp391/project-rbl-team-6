const pool = require('./db');

async function verifyItem3() {
  try {
    const tutorId = '968d1ce5-4604-46b9-ba32-28bb11f0fca6';

    console.log('=== KIỂM TRA 1: AVATAR ===');
    const uRes = await pool.query('SELECT picture FROM users WHERE id = $1', [tutorId]);
    console.log('users.picture:', uRes.rows[0]?.picture);

    const tpRes = await pool.query('SELECT profile_photo_url FROM tutor_profiles WHERE user_id = $1', [tutorId]);
    console.log('tutor_profiles.profile_photo_url:', tpRes.rows[0]?.profile_photo_url);

    console.log('\n=== KIỂM TRA 2: REVIEWS ===');
    const countRes = await pool.query('SELECT COUNT(*) FROM reviews');
    console.log('Total reviews in DB:', countRes.rows[0].count);

    if (parseInt(countRes.rows[0].count) > 0) {
      const revRes = await pool.query('SELECT * FROM reviews LIMIT 5');
      console.log('First 5 reviews:', JSON.stringify(revRes.rows, null, 2));
    }
    
    // Test the specific tutor reviews
    const revTutorRes = await pool.query('SELECT COUNT(*) FROM reviews WHERE tutor_id = $1', [tutorId]);
    console.log(`Reviews for tutor ${tutorId}:`, revTutorRes.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

verifyItem3();
