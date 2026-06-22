const pool = require('./db');
pool.query("UPDATE tutor_profiles SET subjects = 'toan', bio = 'Chuyên dạy lớp 10 đại số' WHERE user_id = (SELECT user_id FROM tutor_profiles WHERE status='approved' LIMIT 1)").then(r => {
  console.log('Updated tutor profile');
  pool.end();
});
