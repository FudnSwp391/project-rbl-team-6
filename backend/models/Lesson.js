/**
 * Lesson Model
 * Truy vấn bảng `lessons` trong Supabase PostgreSQL.
 */
const pool = require("../db");

const Lesson = {
  // ── Lấy tất cả lessons của một course (sắp xếp theo module + thứ tự) ──
  async findByCourseId(courseId) {
    const result = await pool.query(
      `SELECT * FROM lessons
       WHERE course_id = $1
       ORDER BY module_title ASC, lesson_order ASC`,
      [courseId]
    );
    return result.rows;
  },

  // ── Lấy lessons nhóm theo module ──
  async findByCourseIdGrouped(courseId) {
    const rows = await this.findByCourseId(courseId);
    const modules = {};

    rows.forEach((lesson) => {
      if (!modules[lesson.module_title]) {
        modules[lesson.module_title] = [];
      }
      modules[lesson.module_title].push(lesson);
    });

    return Object.entries(modules).map(([moduleTitle, lessons]) => ({
      moduleTitle,
      lessonsCount: lessons.length,
      lessons,
    }));
  },

  // ── Lấy lesson theo ID ──
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM lessons WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── Tạo lesson mới ──
  async create({ courseId, moduleTitle, lessonTitle, lessonOrder, duration, status, videoUrl }) {
    const result = await pool.query(
      `INSERT INTO lessons (course_id, module_title, lesson_title, lesson_order, duration, status, video_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, moduleTitle, lessonTitle, lessonOrder || 0, duration, status || "locked", videoUrl]
    );
    return result.rows[0];
  },

  // ── Cập nhật lesson ──
  async update(id, { moduleTitle, lessonTitle, lessonOrder, duration, status, videoUrl }) {
    const result = await pool.query(
      `UPDATE lessons
       SET module_title = COALESCE($1, module_title),
           lesson_title = COALESCE($2, lesson_title),
           lesson_order = COALESCE($3, lesson_order),
           duration     = COALESCE($4, duration),
           status       = COALESCE($5, status),
           video_url    = COALESCE($6, video_url)
       WHERE id = $7
       RETURNING *`,
      [moduleTitle, lessonTitle, lessonOrder, duration, status, videoUrl, id]
    );
    return result.rows[0] || null;
  },

  // ── Cập nhật status của lesson ──
  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE lessons SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  },

  // ── Xóa lesson ──
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM lessons WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── Đếm lessons theo course ──
  async countByCourseId(courseId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM lessons
       WHERE course_id = $1`,
      [courseId]
    );
    return {
      total: Number(result.rows[0].total),
      completed: Number(result.rows[0].completed),
    };
  },
};

module.exports = Lesson;
