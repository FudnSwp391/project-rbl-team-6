require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const mockTutors = [
  {
    email: 'mocktutor1@edux.vn', full_name: 'Nguyễn Văn A', city: 'Hà Nội',
    subjects: 'Toán Học, Vật Lý', method: ['online', 'offline'],
    levels: '["Cấp 2", "Cấp 3"]', price: 150000, exp: 3,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', bio: 'Thủ khoa Đại học Bách Khoa Hà Nội, chuyên luyện thi Đại học khối A.'
  },
  {
    email: 'mocktutor2@edux.vn', full_name: 'Trần Thị B', city: 'TP.HCM',
    subjects: 'Tiếng Anh, Luyện Thi IELTS', method: ['online'],
    levels: '["Cấp 3", "Đại học"]', price: 200000, exp: 5,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', bio: 'IELTS 8.5, giảng viên ngôn ngữ Anh tại ĐH KHXH&NV TP.HCM.'
  },
  {
    email: 'mocktutor3@edux.vn', full_name: 'Lê Hoàng C', city: 'Đà Nẵng',
    subjects: 'Lập Trình, Toán Học', method: ['offline'],
    levels: '["Cấp 1", "Cấp 2"]', price: 120000, exp: 2,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', bio: 'Sinh viên IT đam mê giảng dạy, thân thiện và kiên nhẫn với trẻ em.'
  },
  {
    email: 'mocktutor4@edux.vn', full_name: 'Phạm Minh D', city: 'Hải Phòng',
    subjects: 'Văn Học, Lịch Sử', method: ['online', 'offline'],
    levels: '["Cấp 2", "Cấp 3"]', price: 100000, exp: 4,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704a', bio: 'Giáo viên trường chuyên với nhiều năm kinh nghiệm bồi dưỡng HSG.'
  },
  {
    email: 'mocktutor5@edux.vn', full_name: 'Vũ Thanh E', city: 'Hà Nội',
    subjects: 'Hóa Học', method: ['online'],
    levels: '["Cấp 3"]', price: 180000, exp: 6,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704b', bio: 'Thạc sĩ Hóa học, phương pháp dạy trực quan dễ hiểu.'
  },
  {
    email: 'mocktutor6@edux.vn', full_name: 'Đặng Thái F', city: 'TP.HCM',
    subjects: 'Lập Trình', method: ['online', 'offline'],
    levels: '["Đại học"]', price: 300000, exp: 7,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e29026704c', bio: 'Senior Developer tại công ty công nghệ lớn, kèm mentor định hướng nghề.'
  },
  {
    email: 'mocktutor7@edux.vn', full_name: 'Bùi Lan G', city: 'Cần Thơ',
    subjects: 'Tiếng Anh', method: ['offline'],
    levels: '["Cấp 1"]', price: 90000, exp: 1,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e290267041', bio: 'Sinh viên sư phạm tiếng Anh loại giỏi, nhiệt tình và năng động.'
  },
  {
    email: 'mocktutor8@edux.vn', full_name: 'Đinh Quang H', city: 'Đồng Nai',
    subjects: 'Vật Lý', method: ['online', 'offline'],
    levels: '["Cấp 2", "Cấp 3"]', price: 160000, exp: 5,
    pic: 'https://i.pravatar.cc/150?u=a042581f4e290267042', bio: 'Giáo viên Lý cấp 3, chuyên dạy bù đắp kiến thức hổng.'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    for (const t of mockTutors) {
      // check if exists
      const exist = await client.query('SELECT id FROM users WHERE email = $1', [t.email]);
      if (exist.rows.length > 0) continue;

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, picture) VALUES ($1, $2, $3, 'tutor', $4) RETURNING id`,
        [t.email, passwordHash, t.full_name, t.pic]
      );
      const userId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO tutor_profiles 
         (user_id, status, city, subjects, hourly_rate, experience_years, bio, teaching_methods, suitable_students, avg_rating, review_count, first_name, last_name)
         VALUES ($1, 'approved', $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)`,
        [
          userId, t.city, t.subjects, t.price, t.exp, t.bio, 
          t.method, // array will be mapped to text[]
          t.levels, 
          (Math.random() * 1 + 4).toFixed(1), // avg_rating 4.0-5.0
          Math.floor(Math.random() * 50) + 10, // 10-60 reviews
          t.full_name.split(' ').slice(-1)[0],
          t.full_name.split(' ').slice(0, -1).join(' ')
        ]
      );
      console.log('Seeded tutor:', t.full_name);
    }
    console.log('Done seeding mock tutors!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
