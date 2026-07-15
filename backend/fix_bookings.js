const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrdnebeulfdgfeermghj:cungnhauthukhoa@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres' });
async function run() {
  try {
    await pool.query('BEGIN');
    
    // Xóa constraint cũ
    await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check');
    
    // Thêm constraint mới hỗ trợ đầy đủ các trạng thái
    await pool.query(`ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('Pending', 'Approved', 'Declined', 'Rejected', 'Cancelled', 'Timeout', 'InProgress', 'Completed'))`);
    
    // Hủy các booking Instant đang kẹt (timeout) và hoàn tiền
    const result = await pool.query(`
      SELECT id, student_id, tutor_id, lesson_fee, payer_wallet_id
      FROM bookings
      WHERE booking_type = 'Instant' AND status = 'Pending'
    `);
    
    for (const b of result.rows) {
        let payer = b.payer_wallet_id;
        if (!payer) {
            const wRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [b.student_id]);
            if (wRes.rows.length) payer = wRes.rows[0].id;
        }
        await pool.query("UPDATE bookings SET status = 'Timeout', updated_at = NOW() WHERE id = $1", [b.id]);
        if (payer) {
            await pool.query('UPDATE wallets SET balance = balance + $1, frozen_balance = GREATEST(frozen_balance - $1, 0) WHERE id = $2', [b.lesson_fee, payer]);
        }
        console.log(`Timed out booking ${b.id}`);
    }
    
    await pool.query('COMMIT');
    console.log('Successfully updated constraint and cleared pending bookings!');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
