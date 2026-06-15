/**
 * Material Model
 * Truy vấn bảng `materials` trong Supabase PostgreSQL.
 */
const pool = require("../db");

const Material = {
  // ── Lấy tất cả materials của một course ──
  async findByCourseId(courseId) {
    const result = await pool.query(
      `SELECT * FROM materials
       WHERE course_id = $1
       ORDER BY created_at DESC`,
      [courseId]
    );
    return result.rows;
  },

  // ── Lấy material theo ID ──
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM materials WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── Lấy materials theo file type ──
  async findByFileType(courseId, fileType) {
    const result = await pool.query(
      `SELECT * FROM materials
       WHERE course_id = $1 AND file_type = $2
       ORDER BY created_at DESC`,
      [courseId, fileType]
    );
    return result.rows;
  },

  // ── Tạo material mới ──
  async create({ courseId, title, fileUrl, fileType, fileSize }) {
    const result = await pool.query(
      `INSERT INTO materials (course_id, title, file_url, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, title, fileUrl, fileType, fileSize]
    );
    return result.rows[0];
  },

  // ── Cập nhật material ──
  async update(id, { title, fileUrl, fileType, fileSize }) {
    const result = await pool.query(
      `UPDATE materials
       SET title     = COALESCE($1, title),
           file_url  = COALESCE($2, file_url),
           file_type = COALESCE($3, file_type),
           file_size = COALESCE($4, file_size)
       WHERE id = $5
       RETURNING *`,
      [title, fileUrl, fileType, fileSize, id]
    );
    return result.rows[0] || null;
  },

  // ── Xóa material ──
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM materials WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Material;
