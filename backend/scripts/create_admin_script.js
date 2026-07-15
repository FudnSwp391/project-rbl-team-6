require('dotenv').config();
const { Pool } = require('pg');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const email = 'admin@edux.com';
    const query = `
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Admin EduX', $1, $2, 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $2
      RETURNING id, email, role;
    `;
    const res = await pool.query(query, [email, hashedPassword]);
    console.log('✅ Đã tạo/khôi phục tài khoản Admin thành công:');
    console.log('- Email:', res.rows[0].email);
    console.log('- Role:', res.rows[0].role);
    console.log('- Mật khẩu: admin123');
  } catch (err) {
    console.error('❌ Lỗi khi tạo admin:', err);
  } finally {
    pool.end();
  }
}
createAdmin();
