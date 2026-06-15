/**
 * CourseProgress Model
 * Truy vấn bảng `course_progress` trong Supabase PostgreSQL.
 * Mỗi student chỉ có 1 record tiến độ cho mỗi course (UNIQUE constraint).
 */
const pool = require("../db");

const CourseProgress = {
  // ── Lấy tiến độ của 1 student trong 1 course ──
  async findByStudentAndCourse(studentId, courseId) {
    const result = await pool.query(
      `SELECT * FROM course_progress
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    return result.rows[0] || null;
  },

  // ── Lấy tất cả courses progress của 1 student ──
  async findByStudentId(studentId) {
    const result = await pool.query(
      `SELECT cp.*, c.title AS course_title, c.image_url, c.instructor_name
       FROM course_progress cp
       JOIN courses c ON c.id = cp.course_id
       WHERE cp.student_id = $1
       ORDER BY cp.updated_at DESC`,
      [studentId]
    );
    return result.rows;
  },

  // ── Lấy tất cả students progress trong 1 course ──
  async findByCourseId(courseId) {
    const result = await pool.query(
      `SELECT cp.*, u.full_name, u.email, u.picture
       FROM course_progress cp
       JOIN users u ON u.id = cp.student_id
       WHERE cp.course_id = $1
       ORDER BY cp.progress_percent DESC`,
      [courseId]
    );
    return result.rows;
  },

  // ── Tạo hoặc cập nhật tiến độ (UPSERT) ──
  async upsert({ courseId, studentId, completedLessons, totalLessons, progressPercent, xpPoints }) {
    const result = await pool.query(
      `INSERT INTO course_progress
         (course_id, student_id, completed_lessons, total_lessons, progress_percent, xp_points)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (course_id, student_id)
       DO UPDATE SET
         completed_lessons = EXCLUDED.completed_lessons,
         total_lessons     = EXCLUDED.total_lessons,
         progress_percent  = EXCLUDED.progress_percent,
         xp_points         = EXCLUDED.xp_points
       RETURNING *`,
      [courseId, studentId, completedLessons, totalLessons, progressPercent || 0, xpPoints || 0]
    );
    return result.rows[0];
  },

  // ── Tính lại progress từ bảng lessons (tự động) ──
  async recalculate(courseId, studentId) {
    // Đếm lessons completed vs total
    const countResult = await pool.query(
      `SELECT
         COUNT(*)                                     AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM lessons
       WHERE course_id = $1`,
      [courseId]
    );

    const total = Number(countResult.rows[0].total);
    const completed = Number(countResult.rows[0].completed);
    const percent = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

    return this.upsert({
      courseId,
      studentId,
      completedLessons: completed,
      totalLessons: total,
      progressPercent: percent,
    });
  },

  // ── Xóa progress record ──
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM course_progress WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = CourseProgress;
