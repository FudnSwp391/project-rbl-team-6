const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// 1. Add auto-release hold balance logic to the existing cron job
const releaseEscrowSql = 'await pool.query(`\\n            UPDATE tutor_profiles SET completed_lessons_count = completed_lessons_count + 1\\n            WHERE user_id = $1\\n          `, [row.tutor_id]);';

const autoReleaseHoldLogic = `await pool.query(\`
            UPDATE tutor_profiles SET completed_lessons_count = completed_lessons_count + 1
            WHERE user_id = $1
          \`, [row.tutor_id]);

          // Nhả cọc nếu đạt 3 buổi
          const tutorProf = await pool.query('SELECT completed_lessons_count FROM tutor_profiles WHERE user_id=$1', [row.tutor_id]);
          if (tutorProf.rows.length && tutorProf.rows[0].completed_lessons_count === 3) {
            await pool.query(\`
              UPDATE wallets 
              SET balance = balance + held_balance, held_balance = 0 
              WHERE user_id = $1 AND held_balance > 0
            \`, [row.tutor_id]);
            
            await pool.query(\`
              INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
              VALUES ($1,'hold_released','Tiền cọc đã được nhả','Bạn đã hoàn thành đủ số buổi học, toàn bộ tiền cọc ảo đã được chuyển vào số dư khả dụng.','verified_user',$1,'system')
            \`, [row.tutor_id]);
          }
`;

code = code.replace(releaseEscrowSql, autoReleaseHoldLogic);

// 2. Add API Admin nhả cọc thủ công
// We will insert it before `app.patch("/api/admin/tutors/:id/approve"`
const approveEndpoint = 'app.patch("/api/admin/tutors/:id/approve"';
const manualReleaseEndpoint = `
// POST /api/admin/tutors/:id/release-hold — Admin thủ công nhả cọc cho gia sư
app.post("/api/admin/tutors/:id/release-hold", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // id này có thể là profile id hoặc user_id, ta check cả hai
    const profileRes = await client.query('SELECT user_id FROM tutor_profiles WHERE id=$1 OR user_id=$1 LIMIT 1', [id]);
    if (!profileRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Không tìm thấy gia sư." });
    }
    const userId = profileRes.rows[0].user_id;

    const walletRes = await client.query('SELECT id, held_balance FROM wallets WHERE user_id=$1', [userId]);
    if (!walletRes.rows.length || Number(walletRes.rows[0].held_balance) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Gia sư không có tiền trong ví cọc ảo." });
    }

    const heldAmount = Number(walletRes.rows[0].held_balance);
    await client.query('UPDATE wallets SET balance = balance + held_balance, held_balance = 0 WHERE id=$1', [walletRes.rows[0].id]);
    
    await client.query(\`
      INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
      VALUES ($1,'hold_released','Admin đã nhả cọc',$2,'verified_user',$1,'system')
    \`, [userId, \`Admin đã thủ công nhả \${heldAmount.toLocaleString('vi-VN')}đ tiền cọc vào số dư khả dụng của bạn.\`]);

    await client.query('COMMIT');
    return res.json({ success: true, message: "Đã nhả cọc thành công." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Release hold error:", err);
    return res.status(500).json({ message: "Server error." });
  } finally {
    client.release();
  }
});

app.patch("/api/admin/tutors/:id/approve"`;

code = code.replace(approveEndpoint, manualReleaseEndpoint);

// 3. Add Cron Job: Tự động Hủy lịch sau 24h không duyệt
// We will insert it at the end, right before `app.listen(port`
const listenLine = '  app.listen(port, () => {';
const autoRefundCron = `
  // ── Cron: Tự động hủy lịch nếu Gia sư không duyệt sau 24h ───────────────
  setInterval(async () => {
    try {
      // Tìm bookings Pending > 24h
      const dueBookings = await pool.query(\`
        SELECT b.id, b.student_id, b.tutor_id, b.escrow_tx_id, b.payer_wallet_id, b.lesson_fee
        FROM bookings b
        WHERE b.status = 'Pending'
          AND b.created_at <= NOW() - INTERVAL '24 hours'
      \`);

      for (const row of dueBookings.rows) {
        try {
          if (row.escrow_tx_id && Number(row.lesson_fee) > 0) {
            // Hoàn tiền cho học sinh
            await pool.query('SELECT refund_escrow($1,$2,$3)', [
              row.escrow_tx_id, row.payer_wallet_id, row.lesson_fee
            ]);
            await pool.query(\`UPDATE bookings SET status='Cancelled', escrow_released_at=NOW() WHERE id=$1\`, [row.id]);
          } else {
            // Hủy không hoàn tiền
            await pool.query(\`UPDATE bookings SET status='Cancelled' WHERE id=$1\`, [row.id]);
          }

          // Thông báo cho Học sinh
          await pool.query(\`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'refund','Lịch học đã bị hủy do gia sư không phản hồi',$2,'undo',$3,'booking')
          \`, [row.student_id, \`Hệ thống đã hủy lịch học và hoàn lại \${Number(row.lesson_fee||0).toLocaleString('vi-VN')}đ vì gia sư không duyệt trong 24h.\`, row.id]);

          // Thông báo cho Gia sư
          await pool.query(\`
            INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
            VALUES ($1,'cancellation','Lịch học bị hủy tự động',$2,'event_busy',$3,'booking')
          \`, [row.tutor_id, \`Một lịch học đã bị hủy vì bạn không phản hồi trong 24h.\`, row.id]);

          console.log(\`✅ Auto-cancelled unapproved booking \${row.id}\`);
        } catch (innerErr) {
          console.error(\`❌ Auto-cancel failed for booking \${row.id}:\`, innerErr.message);
        }
      }
    } catch (err) {
      console.error('❌ Cron auto-cancel error:', err.message);
    }
  }, 10 * 60 * 1000); // chạy mỗi 10 phút

  app.listen(port, () => {`;

code = code.replace(listenLine, autoRefundCron);

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Patched server.js');
