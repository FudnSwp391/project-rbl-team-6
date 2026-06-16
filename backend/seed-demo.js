// Seed dữ liệu DEMO cho gia sư Võ Thị Mai → để 3 thẻ thống kê hiện số.
// Idempotent: chạy lại không nhân đôi. Dữ liệu demo có note/email gắn 'DEMO'.
require("dotenv").config();
const pool = require("./db");

async function main() {
  const tutor = (await pool.query(
    `SELECT tp.id AS profile_id, u.id AS user_id, u.full_name
     FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id
     WHERE u.email = 'mai@giasu.vn'`
  )).rows[0];
  if (!tutor) { console.log("Không tìm thấy gia sư mai@giasu.vn"); process.exit(1); }
  console.log("Gia sư:", tutor.full_name);

  // 1. Đảm bảo có 1 khóa học published của Mai
  let course = (await pool.query(
    `SELECT id, price FROM courses WHERE tutor_id=$1 AND status='published' LIMIT 1`,
    [tutor.profile_id]
  )).rows[0];
  if (!course) {
    course = (await pool.query(
      `INSERT INTO courses (tutor_id, title, description, subject, level, price, original_price, total_lessons, duration_hours, status, published_at)
       VALUES ($1,'Toán 12 — Luyện thi THPT Quốc gia','Khóa luyện thi cấp tốc, bám sát đề.','Toán','Cấp 3',599000,899000,24,18,'published',NOW())
       RETURNING id, price`,
      [tutor.profile_id]
    )).rows[0];
    console.log("→ Đã tạo khóa published cho Mai");
  }

  // 2. Tạo 3 học sinh demo
  const students = [];
  for (const n of [1, 2, 3]) {
    const s = (await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, 'x', 'student')
       ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name
       RETURNING id`,
      [`Học sinh Demo ${n}`, `demo-hs${n}@edux.vn`]
    )).rows[0];
    students.push(s.id);
  }

  // 3. Bookings confirmed (Mai là gia sư) — xóa demo cũ rồi tạo lại
  await pool.query(`DELETE FROM bookings WHERE tutor_id=$1 AND note LIKE 'DEMO%'`, [tutor.user_id]);
  const slots = [
    { sid: students[0], date: "2026-06-16", time: "14:00", subj: "Toán", note: "DEMO - ôn hàm số" },
    { sid: students[0], date: "2026-06-18", time: "09:30", subj: "Toán", note: "DEMO - luyện đề" },
    { sid: students[1], date: "2026-06-19", time: "17:00", subj: "Vật lý", note: "DEMO - dao động" },
    { sid: students[2], date: "2026-06-20", time: "19:00", subj: "Toán", note: "DEMO - hình học" },
    { sid: students[1], date: "2026-06-12", time: "15:30", subj: "Toán", note: "DEMO - đã học" },
  ];
  for (const b of slots) {
    await pool.query(
      `INSERT INTO bookings (student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Approved')`,
      [b.sid, tutor.user_id, tutor.full_name, b.subj, b.date, b.time, b.note]
    );
  }

  // 4. Enrollments vào khóa của Mai (có paid_amount = doanh thu)
  for (const sid of students) {
    await pool.query(
      `INSERT INTO enrollments (user_id, course_id, paid_amount, progress_percent)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [sid, course.id, course.price, sid === students[0] ? 60 : 20]
    );
  }
  // cập nhật enrollment_count khớp thực tế
  await pool.query(
    `UPDATE courses SET enrollment_count = (SELECT COUNT(*) FROM enrollments WHERE course_id=$1) WHERE id=$1`,
    [course.id]
  );

  // 5. In kết quả thống kê
  const stats = (await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM bookings WHERE tutor_id=$1 AND status='Approved')::int AS lessons,
      (SELECT COUNT(DISTINCT student_id) FROM bookings WHERE tutor_id=$1 AND status='Approved')::int AS students,
      (SELECT COALESCE(SUM(e.paid_amount),0) FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.tutor_id=$2)::bigint AS revenue
  `, [tutor.user_id, tutor.profile_id])).rows[0];
  console.log("\n=== Thống kê sau seed (đăng nhập mai@giasu.vn sẽ thấy) ===");
  console.log("  💰 Doanh thu:", Number(stats.revenue).toLocaleString("vi-VN"), "đ");
  console.log("  🎓 Học sinh đang dạy:", stats.students);
  console.log("  📅 Buổi học đã nhận:", stats.lessons);
  await pool.end();
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
