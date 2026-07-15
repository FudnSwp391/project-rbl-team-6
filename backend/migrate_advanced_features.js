const pool = require('./db');

async function runMigration() {
  try {
    console.log('Bắt đầu chạy migration Advanced Features...');

    // 1. Tạo hoặc Sửa lesson_feedbacks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_feedbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lesson_id UUID NOT NULL, 
          tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subject_name VARCHAR(255),
          focus_rating SMALLINT NOT NULL CHECK (focus_rating >= 1 AND focus_rating <= 5),
          understanding_level VARCHAR(50) NOT NULL CHECK (understanding_level IN ('Tốt', 'Tạm', 'Kém')),
          homework_status VARCHAR(50) NOT NULL CHECK (homework_status IN ('Có', 'Làm một nửa', 'Không', 'Không có bài tập')),
          tutor_note TEXT,
          milestone_id UUID, -- Sẽ link tới bảng milestones
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Bảng lesson_feedbacks đã sẵn sàng.');

    // 2. Bảng milestones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          target_date DATE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Bảng milestones đã sẵn sàng.');

    // Thêm khóa ngoại cho milestone_id trong lesson_feedbacks
    await pool.query(`
      ALTER TABLE lesson_feedbacks
      DROP CONSTRAINT IF EXISTS fk_lesson_feedbacks_milestone;
      
      ALTER TABLE lesson_feedbacks
      ADD CONSTRAINT fk_lesson_feedbacks_milestone
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;
    `);

    // 3. Bảng evidences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_type TEXT,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Bảng evidences đã sẵn sàng.');

    // 4. Bảng parent_feedbacks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_feedbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id UUID,
          evaluation VARCHAR(50) NOT NULL CHECK (evaluation IN ('Có', 'Không đổi', 'Kém đi')),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Bảng parent_feedbacks đã sẵn sàng.');

    // 5. Bảng disputes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS disputes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID,
          parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
          held_amount NUMERIC DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          resolved_at TIMESTAMPTZ
      );
    `);
    console.log('✅ Bảng disputes đã sẵn sàng.');

    // 6. Cập nhật tutor_profiles
    await pool.query(`
      ALTER TABLE tutor_profiles
      ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_degree_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS test_passed BOOLEAN DEFAULT false;
    `);
    console.log('✅ Bảng tutor_profiles đã được cập nhật cờ KYC.');

    console.log('🎉 Migration hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
  } finally {
    pool.end();
  }
}

runMigration();
