const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const MOCK_COURSES = [
  { title: 'Cấp tốc FE PRF192 / MAE101 - FA25', description: 'Ôn tập kiến thức FE PRF192 với 100 câu bài tập phân hóa đa dạng, kĩ năng bấm máy (trick casio) và phân tích để chọn nhanh đáp án FE MAE101.', subject: 'Toán Học', level: 'Khóa đại học', price: 123000, original_price: 200000, avg_rating: 5.0, review_count: 128, total_lessons: 24 },
  { title: 'CSD201 - CTDL và Giải Thuật cùng Java (Video Only)', description: 'Làm việc trực tiếp với Java: mảng, danh sách liên kết, ngăn xếp, hàng đợi, cây, đồ thị và các thuật toán sắp xếp, tìm kiếm, đệ quy.', subject: 'Kỹ Thuật Phần Mềm', level: 'Khóa đại học', price: 299000, original_price: 400000, avg_rating: 5.0, review_count: 95, total_lessons: 40 },
  { title: 'Lập trình OOP với Java', description: 'Nền tảng lập trình hướng đối tượng: class, kế thừa, đa hình, đóng gói — kèm dự án thực hành cuối khóa.', subject: 'Kỹ Thuật Phần Mềm', level: 'Khóa đại học', price: 199000, original_price: 350000, avg_rating: 4.8, review_count: 73, total_lessons: 32 },
  { title: 'IELTS 6.5+ Cấp tốc 8 tuần', description: 'Lộ trình luyện 4 kỹ năng Listening - Reading - Writing - Speaking, chữa đề thực chiến, cam kết đầu ra 6.5+.', subject: 'Ngoại Ngữ', level: 'Khóa học sinh', price: 499000, original_price: 800000, avg_rating: 4.9, review_count: 210, total_lessons: 48 },
  { title: 'Giải tích 1 - Cơ bản đến nâng cao', description: 'Giới hạn, đạo hàm, tích phân và ứng dụng — giảng giải trực quan, nhiều ví dụ và bài tập có lời giải.', subject: 'Toán Học', level: 'Khóa đại học', price: 0, original_price: 0, avg_rating: 4.7, review_count: 64, total_lessons: 28 },
  { title: 'Thiết kế Vi mạch số cơ bản (Verilog)', description: 'Nhập môn thiết kế mạch số với Verilog HDL: cổng logic, FSM, mô phỏng và tổng hợp trên FPGA.', subject: 'Vi Mạch', level: 'Khóa đại học', price: 350000, original_price: 500000, avg_rating: 4.6, review_count: 31, total_lessons: 36 },
  { title: 'Tiếng Anh giao tiếp cho người mới', description: 'Phản xạ giao tiếp hằng ngày, phát âm chuẩn, từ vựng và mẫu câu thông dụng — học là nói được.', subject: 'Ngoại Ngữ', level: 'Khóa học sinh', price: 0, original_price: 0, avg_rating: 4.8, review_count: 156, total_lessons: 30 },
  { title: 'Python cho người mới bắt đầu', description: 'Từ cú pháp cơ bản đến xử lý dữ liệu, viết script tự động hóa và mini-project thực tế.', subject: 'Kỹ Thuật Phần Mềm', level: 'Khóa học sinh', price: 149000, original_price: 250000, avg_rating: 4.9, review_count: 188, total_lessons: 26 },
  { title: 'Đại số tuyến tính - MAS291', description: 'Ma trận, định thức, hệ phương trình, không gian vector và trị riêng — trọng tâm thi cử.', subject: 'Toán Học', level: 'Khóa đại học', price: 199000, original_price: 300000, avg_rating: 4.5, review_count: 42, total_lessons: 22 },
];

async function seed() {
  try {
    let tutor = await pool.query(`SELECT id FROM users WHERE role = 'tutor' LIMIT 1`);
    if (tutor.rowCount === 0) {
      console.log("No tutor found. Creating a dummy tutor...");
      const dummyTutorRes = await pool.query(`
        INSERT INTO users (full_name, email, role, password_hash)
        VALUES ('Dummy Tutor', 'dummy_tutor@example.com', 'tutor', 'hashed_pass')
        RETURNING id
      `);
      tutor = dummyTutorRes;
    }
    const tutorId = tutor.rows[0].id;

    console.log("Seeding mock courses into DB...");
    for (const c of MOCK_COURSES) {
      // Check if course already exists
      const existing = await pool.query(`SELECT id FROM courses WHERE title = $1`, [c.title]);
      if (existing.rowCount === 0) {
        await pool.query(`
          INSERT INTO courses (tutor_id, title, description, subject, level, price, original_price, avg_rating, review_count, total_lessons, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'published')
        `, [
          tutorId, c.title, c.description, c.subject, c.level, c.price, c.original_price, c.avg_rating, c.review_count, c.total_lessons
        ]);
        console.log(`+ Added: ${c.title}`);
      } else {
        console.log(`- Exists: ${c.title}`);
      }
    }
    console.log("Done!");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    pool.end();
  }
}

seed();
