require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const mockTutors = [
  {
    email: 'mocktutor10@edux.vn', full_name: 'Hoàng Bảo Long', city: 'Hà Nội',
    subjects: 'Toán Học, Tin Học', method: ['online', 'offline'],
    levels: '["Cấp 1", "Cấp 2"]', price: 160000, exp: 4,
    pic: 'https://i.pravatar.cc/150?u=baolong', bio: 'Tốt nghiệp ĐH Sư Phạm Hà Nội, yêu trẻ và có phương pháp dạy Toán tư duy sinh động cho học sinh Tiểu học và THCS.'
  },
  {
    email: 'mocktutor11@edux.vn', full_name: 'Lê Thảo Nhi', city: 'TP.HCM',
    subjects: 'Tiếng Anh, Luyện Thi IELTS', method: ['online'],
    levels: '["Cấp 3", "Đại học"]', price: 250000, exp: 6,
    pic: 'https://i.pravatar.cc/150?u=thaonhi', bio: 'Cựu du học sinh Anh, IELTS 8.5, chuyên luyện thi chứng chỉ quốc tế và giao tiếp nâng cao.'
  },
  {
    email: 'mocktutor12@edux.vn', full_name: 'Trần Quang Dũng', city: 'Đà Nẵng',
    subjects: 'Vật Lý, Hóa Học', method: ['offline'],
    levels: '["Cấp 2", "Cấp 3"]', price: 180000, exp: 8,
    pic: 'https://i.pravatar.cc/150?u=quangdung', bio: 'Giáo viên trường THPT chuyên. Kinh nghiệm luyện thi Đại học khối A với điểm số trung bình môn trên 8.5.'
  },
  {
    email: 'mocktutor13@edux.vn', full_name: 'Nguyễn Bích Ngọc', city: 'Hải Phòng',
    subjects: 'Văn Học, Lịch Sử', method: ['online', 'offline'],
    levels: '["Cấp 1", "Cấp 2", "Cấp 3"]', price: 130000, exp: 5,
    pic: 'https://i.pravatar.cc/150?u=bichngoc', bio: 'Thạc sĩ Ngữ Văn. Truyền đạt kiến thức cảm thụ văn học từ cơ bản đến chuyên sâu luyện thi học sinh giỏi.'
  },
  {
    email: 'mocktutor14@edux.vn', full_name: 'Phạm Tấn Tài', city: 'Hà Nội',
    subjects: 'Lập Trình', method: ['online'],
    levels: '["Cấp 3", "Đại học"]', price: 220000, exp: 5,
    pic: 'https://i.pravatar.cc/150?u=tantai', bio: 'Senior React Developer. Chuyên hướng dẫn làm dự án thực tế, thiết kế UI/UX và phỏng vấn xin việc.'
  },
  {
    email: 'mocktutor15@edux.vn', full_name: 'Vũ Đức Minh', city: 'TP.HCM',
    subjects: 'Toán Học', method: ['online', 'offline'],
    levels: '["Đại học"]', price: 300000, exp: 7,
    pic: 'https://i.pravatar.cc/150?u=ducminh', bio: 'Giảng viên khoa Toán - Tin, chuyên luyện thi Olympic sinh viên và hỗ trợ môn Đại số tuyến tính, Vi tích phân.'
  },
  {
    email: 'mocktutor16@edux.vn', full_name: 'Đinh Mai Hoa', city: 'Cần Thơ',
    subjects: 'Âm Nhạc, Nghệ Thuật', method: ['offline'],
    levels: '["Cấp 1"]', price: 110000, exp: 3,
    pic: 'https://i.pravatar.cc/150?u=maihoa', bio: 'Nhạc viện Cần Thơ. Chuyên dạy Thanh nhạc và Organ căn bản cho học sinh lứa tuổi mầm non và tiểu học.'
  },
  {
    email: 'mocktutor17@edux.vn', full_name: 'Bùi Tuấn Kiệt', city: 'Đồng Nai',
    subjects: 'Khoa Học', method: ['online', 'offline'],
    levels: '["Cấp 2"]', price: 140000, exp: 4,
    pic: 'https://i.pravatar.cc/150?u=tuankiet', bio: 'Dạy Khoa học tự nhiên tích hợp theo chương trình GDPT mới. Giúp các em hiểu bài bằng thí nghiệm thực tế.'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    for (const t of mockTutors) {
      // check if exists
      const exist = await client.query('SELECT id FROM users WHERE email = $1', [t.email]);
      if (exist.rows.length > 0) {
        console.log(`Bỏ qua: ${t.full_name} đã tồn tại`);
        continue;
      }

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
          Math.floor(Math.random() * 80) + 20, // reviews
          t.full_name.split(' ').slice(-1)[0],
          t.full_name.split(' ').slice(0, -1).join(' ')
        ]
      );
      console.log('Seeded new tutor:', t.full_name);
    }
    console.log('Done seeding more mock tutors!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
