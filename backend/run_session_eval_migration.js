/**
 * run_session_eval_migration.js
 * Tạo bảng session_evaluations trong database
 * Chạy: node run_session_eval_migration.js
 */
const pool = require('./db')

async function run() {
  const client = await pool.connect()
  try {
    console.log('🔄 Đang tạo bảng session_evaluations...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_evaluations (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id            UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        tutor_id              UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        student_id            UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        score_attendance      SMALLINT CHECK (score_attendance  BETWEEN 1 AND 5),
        score_attitude        SMALLINT CHECK (score_attitude    BETWEEN 1 AND 5),
        score_comprehension   SMALLINT CHECK (score_comprehension BETWEEN 1 AND 5),
        score_focus           SMALLINT CHECK (score_focus       BETWEEN 1 AND 5),
        score_homework        SMALLINT CHECK (score_homework    BETWEEN 1 AND 5),
        comments              TEXT,
        parent_recommendation TEXT,
        status                TEXT NOT NULL DEFAULT 'submitted'
                              CHECK (status IN ('draft', 'submitted', 'locked')),
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (booking_id)
      )
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_evals_booking  ON session_evaluations(booking_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_evals_tutor    ON session_evaluations(tutor_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_session_evals_student  ON session_evaluations(student_id)`)

    // Trigger updated_at (reuse existing function)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_session_evals_updated_at'
        ) THEN
          CREATE TRIGGER set_session_evals_updated_at
          BEFORE UPDATE ON session_evaluations
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        END IF;
      END
      $$
    `)

    console.log('✅ Bảng session_evaluations đã được tạo thành công!')
  } catch (err) {
    console.error('❌ Lỗi:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
