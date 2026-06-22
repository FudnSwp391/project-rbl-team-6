const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Cập nhật hàm release_escrow để hỗ trợ cọc ảo
    // Chú ý: Ta cần truyền thêm tham số p_tutor_id để check profile, nhưng vì hàm cũ đang dùng ở nhiều nơi
    // nên ta thay vì truyền p_tutor_id, ta có thể suy ra tutor_id từ p_tutor_wallet_id.
    const sql = `
      CREATE OR REPLACE FUNCTION release_escrow(
          p_tx_id UUID,
          p_payer_wallet_id UUID,
          p_tutor_wallet_id UUID,
          p_admin_wallet_id UUID,
          p_amount NUMERIC,
          p_commission_rate NUMERIC
      ) RETURNS BOOLEAN AS $$
      DECLARE
          v_commission_amount NUMERIC;
          v_tutor_amount NUMERIC;
          v_completed_count INTEGER := 0;
          v_tutor_id UUID;
      BEGIN
          v_commission_amount := p_amount * p_commission_rate;
          v_tutor_amount := p_amount - v_commission_amount;

          -- 1. Trừ tiền khỏi held_balance của người gửi (học sinh)
          UPDATE wallets SET held_balance = held_balance - p_amount WHERE id = p_payer_wallet_id;

          -- 2. Tìm số buổi đã hoàn thành của gia sư
          SELECT user_id INTO v_tutor_id FROM wallets WHERE id = p_tutor_wallet_id LIMIT 1;
          
          IF v_tutor_id IS NOT NULL THEN
              SELECT completed_lessons_count INTO v_completed_count 
              FROM tutor_profiles WHERE user_id = v_tutor_id LIMIT 1;
          END IF;

          -- Nếu chưa đủ 2 buổi, cộng tiền vào held_balance của Gia sư (Cọc ảo)
          -- Ngược lại, cộng vào balance có thể rút
          IF v_completed_count < 2 THEN
              UPDATE wallets SET held_balance = held_balance + v_tutor_amount WHERE id = p_tutor_wallet_id;
          ELSE
              UPDATE wallets SET balance = balance + v_tutor_amount WHERE id = p_tutor_wallet_id;
          END IF;

          -- 3. Cộng tiền hoa hồng cho Admin
          UPDATE wallets SET balance = balance + v_commission_amount WHERE id = p_admin_wallet_id;

          -- 4. Cập nhật Transaction gốc thành RELEASED
          UPDATE transactions SET status = 'RELEASED', updated_at = NOW() WHERE id = p_tx_id;

          -- 5. Ghi log Commission
          INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
          VALUES (p_admin_wallet_id, v_commission_amount, 'COMMISSION', 'SUCCESS', 'SYSTEM', p_tx_id, 'Phí hoa hồng từ giải ngân');

          -- 6. Ghi log Nhận Tiền
          INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
          VALUES (p_tutor_wallet_id, v_tutor_amount, 'PAYMENT', 'SUCCESS', 'SYSTEM', p_tx_id, 'Giải ngân thanh toán lớp học');

          RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await client.query(sql);
    console.log("Updated release_escrow procedure successfully.");

  } catch (err) {
    console.error("Failed to update SQL:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
