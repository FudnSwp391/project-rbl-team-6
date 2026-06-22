const pool = require('./db');

async function runChecks() {
  try {
    // 1. Kiểm tra 1: Tutor tồn tại thật
    const tutorId = '968d1ce5-4604-46b9-ba32-28bb11f0fca6';
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [tutorId]);
    const profileRes = await pool.query('SELECT * FROM tutor_profiles WHERE user_id = $1', [tutorId]);
    
    console.log('=== KIỂM TRA 1: DỮ LIỆU TUTOR TỪ DB ===');
    console.log('User Record:', JSON.stringify(userRes.rows[0], null, 2));
    console.log('Tutor Profile Record:', JSON.stringify(profileRes.rows[0], null, 2));

    // 3. Kiểm tra 3: Chạy 2 Request khác nhau
    // Request A: Toán, Lớp 10
    const reqARes = await pool.query(`
      INSERT INTO tutor_requests (subject, grade_level, topics, match_status, matched_tutor_count)
      VALUES ('toán', '10', '["Đại số"]', 'pending', 0)
      RETURNING id;
    `);
    const reqAId = reqARes.rows[0].id;

    // Request B: Tiếng Anh, Lớp 5
    const reqBRes = await pool.query(`
      INSERT INTO tutor_requests (subject, grade_level, topics, match_status, matched_tutor_count)
      VALUES ('tiếng anh', '5', '["Giao tiếp"]', 'pending', 0)
      RETURNING id;
    `);
    const reqBId = reqBRes.rows[0].id;
    
    console.log('\n=== KIỂM TRA 3: IDS ===');
    console.log('Request A ID:', reqAId);
    console.log('Request B ID:', reqBId);

    // 4. Kiểm tra 4: Thống kê DB
    const totalTutors = await pool.query("SELECT COUNT(*) FROM tutor_profiles WHERE status = 'approved'");
    console.log('\n=== KIỂM TRA 4: THỐNG KÊ ===');
    console.log('Tổng số approved tutors trong DB:', totalTutors.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

runChecks();
