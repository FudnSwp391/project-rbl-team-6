const bcrypt = require('bcryptjs');
const pool = require('./db');

async function run() {
  const hash = await bcrypt.hash('12345678', 12);
  await pool.query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Học sinh Test', 'student_test@gmail.com', $1, 'student') ON CONFLICT (email) DO UPDATE SET password_hash = $1",
    [hash]
  );
  console.log('Done');
  pool.end();
}

run();
