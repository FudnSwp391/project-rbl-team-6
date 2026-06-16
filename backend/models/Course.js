/**
 * Course Model
 * Truy vấn bảng `courses` trong Supabase PostgreSQL.
 */
const pool = require("../db");

const Course = {
  // ── Lấy tất cả courses ──
  async findAll() {
    const result = await pool.query(
      `SELECT * FROM courses ORDER BY created_at DESC`
    );
    return result.rows;
  },

  // ── Lấy course theo ID ──
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM courses WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── Tìm courses theo category ──
  async findByCategory(category) {
    const result = await pool.query(
      `SELECT * FROM courses WHERE category = $1 ORDER BY created_at DESC`,
      [category]
    );
    return result.rows;
  },

  // ── Tạo course mới ──
  async create({ title, description, instructorName, category, imageUrl, meetLink, startDate, endDate }) {
    const result = await pool.query(
      `INSERT INTO courses (title, description, instructor_name, category, image_url, meet_link, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, instructorName, category, imageUrl, meetLink, startDate, endDate]
    );
    return result.rows[0];
  },

  // ── Cập nhật course ──
  async update(id, { title, description, instructorName, category, imageUrl, meetLink, startDate, endDate }) {
    const result = await pool.query(
      `UPDATE courses
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           instructor_name = COALESCE($3, instructor_name),
           category = COALESCE($4, category),
           image_url = COALESCE($5, image_url),
           meet_link = COALESCE($6, meet_link),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date)
       WHERE id = $9
       RETURNING *`,
      [title, description, instructorName, category, imageUrl, meetLink, startDate, endDate, id]
    );
    return result.rows[0] || null;
  },

  // ── Xóa course ──
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM courses WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Course;
