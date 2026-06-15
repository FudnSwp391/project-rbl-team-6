/**
 * Assignment Model
 * Truy vấn bảng `assignments` trong Supabase PostgreSQL.
 */
const pool = require("../db");

const Assignment = {
  // ── Lấy tất cả assignments của một course ──
  async findByCourseId(courseId) {
    const result = await pool.query(
      `SELECT * FROM assignments
       WHERE course_id = $1
       ORDER BY due_date ASC NULLS LAST`,
      [courseId]
    );
    return result.rows;
  },

  // ── Lấy assignments theo status ──
  async findByCourseIdAndStatus(courseId, status) {
    const result = await pool.query(
      `SELECT * FROM assignments
       WHERE course_id = $1 AND status = $2
       ORDER BY due_date ASC NULLS LAST`,
      [courseId, status]
    );
    return result.rows;
  },

  // ── Lấy thống kê assignments cho 1 course ──
  async getStatsByCourseId(courseId) {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                    AS total,
         COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
         COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
         COUNT(*) FILTER (WHERE status = 'graded')    AS graded,
         COUNT(*) FILTER (WHERE status = 'locked')    AS locked
       FROM assignments
       WHERE course_id = $1`,
      [courseId]
    );
    const row = result.rows[0];
    return {
      total:     Number(row.total),
      pending:   Number(row.pending),
      submitted: Number(row.submitted),
      graded:    Number(row.graded),
      locked:    Number(row.locked),
    };
  },

  // ── Lấy assignment theo ID ──
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM assignments WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // ── Tạo assignment mới ──
  async create({ courseId, title, description, dueDate, points, status }) {
    const result = await pool.query(
      `INSERT INTO assignments (course_id, title, description, due_date, points, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseId, title, description, dueDate, points || 0, status || "locked"]
    );
    return result.rows[0];
  },

  // ── Cập nhật assignment ──
  async update(id, { title, description, dueDate, points, status, score }) {
    const result = await pool.query(
      `UPDATE assignments
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date    = COALESCE($3, due_date),
           points      = COALESCE($4, points),
           status      = COALESCE($5, status),
           score       = COALESCE($6, score)
       WHERE id = $7
       RETURNING *`,
      [title, description, dueDate, points, status, score, id]
    );
    return result.rows[0] || null;
  },

  // ── Cập nhật status ──
  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE assignments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  },

  // ── Xóa assignment ──
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM assignments WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Assignment;
