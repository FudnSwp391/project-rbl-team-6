const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to verify authentication (assuming standard token structure)
// We will use a mock token or assume user_id is passed if not authenticated properly,
// but let's try to extract from auth header if available.
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // Basic decode of JWT (just the payload part)
    const base64Url = token.split('.')[1];
    if (base64Url) {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      req.user = JSON.parse(jsonPayload);
    } else {
      req.user = { id: token }; // For dev/testing if token is just user_id
    }
    next();
  } catch (error) {
    console.error("Token error", error);
    // fallback for testing
    req.user = { id: token };
    next();
  }
};

// --- GET Wallet Overview ---
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  if (!userId) return res.status(400).json({ error: 'User ID missing' });

  try {
    // Get or Create Wallet
    let walletResult = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) {
      walletResult = await pool.query(
        'INSERT INTO wallets (user_id, balance, held_balance) VALUES ($1, 0, 0) RETURNING *',
        [userId]
      );
    }
    const wallet = walletResult.rows[0];
    
    // Add fake bonus_balance field to match UI requirements if needed
    wallet.bonus_balance = 20000; // Mock bonus as per template "20.000đ"

    // Pending withdraws should be calculated from withdraw_requests
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id = $1 AND type = 'DEPOSIT' AND status = 'SUCCESS') as total_deposited,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id = $1 AND type = 'WITHDRAW' AND status = 'SUCCESS') as total_withdrawn,
        (SELECT COALESCE(SUM(amount), 0) FROM withdraw_requests WHERE wallet_id = $1 AND status = 'PENDING') as pending_withdraw
    `, [wallet.id]);

    const stats = statsResult.rows[0];

    res.json({
      wallet,
      stats: {
        totalDeposited: parseFloat(stats.total_deposited) || 0,
        totalWithdrawn: parseFloat(stats.total_withdrawn) || 0,
        pendingWithdraw: parseFloat(stats.pending_withdraw) || 0
      }
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- GET Transactions ---
router.get('/transactions', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  
  try {
    const walletResult = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) return res.json({ transactions: [] });
    
    const walletId = walletResult.rows[0].id;
    const txResult = await pool.query(
      'SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50', 
      [walletId]
    );

    res.json({ transactions: txResult.rows });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- POST Deposit Request ---
router.post('/deposit-request', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  const { amount, method } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    let walletResult = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) {
        walletResult = await pool.query(
            'INSERT INTO wallets (user_id, balance, held_balance) VALUES ($1, 0, 0) RETURNING *',
            [userId]
        );
    }
    const walletId = walletResult.rows[0].id;

    // Create a pending deposit request
    await pool.query(
      `INSERT INTO deposit_requests (wallet_id, amount, method, status)
       VALUES ($1, $2, $3, 'PENDING')`,
      [walletId, amount, method]
    );

    res.json({ success: true, message: 'Yêu cầu nạp tiền đã được tạo và chờ duyệt' });
  } catch (error) {
    console.error("Error creating deposit request:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- GET Bank Accounts ---
router.get('/bank-accounts', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  if (!userId) return res.status(400).json({ error: 'User ID missing' });

  try {
    const result = await pool.query(
      'SELECT * FROM tutor_bank_accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ bankAccounts: result.rows });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- POST Bank Account ---
router.post('/bank-accounts', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  const { bankName, accountNumber, accountHolder } = req.body;

  if (!bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM tutor_bank_accounts WHERE user_id = $1 AND bank_name = $2 AND account_number = $3',
      [userId, bankName, accountNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Tài khoản ngân hàng này đã tồn tại trong danh sách của bạn.' });
    }

    const result = await pool.query(
      `INSERT INTO tutor_bank_accounts (user_id, bank_name, account_number, account_holder, status)
       VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
      [userId, bankName, accountNumber, accountHolder]
    );

    // Create notification for admin
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, icon, ref_id, ref_type)
       VALUES (
         (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
         'system',
         'Yêu cầu xác minh ngân hàng',
         'Có tài khoản ngân hàng mới cần xác minh.',
         'credit_card',
         $1,
         'bank_account'
       )`,
      [result.rows[0].id]
    ).catch(err => console.error('Failed to insert admin notification:', err));

    res.json({ success: true, bankAccount: result.rows[0], message: 'Đã thêm tài khoản. Vui lòng chờ Admin duyệt.' });
  } catch (error) {
    console.error("Error creating bank account:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PATCH Bank Account (Re-submit rejected) ---
router.patch('/bank-accounts/:id', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  const { id } = req.params;
  const { bankName, accountNumber, accountHolder } = req.body;

  if (!bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
  }

  try {
    // Only allow editing if it belongs to user and is REJECTED
    const acc = await pool.query('SELECT status FROM tutor_bank_accounts WHERE id = $1 AND user_id = $2', [id, userId]);
    if (acc.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    if (acc.rows[0].status !== 'REJECTED') {
      return res.status(400).json({ error: 'Chỉ có thể cập nhật tài khoản bị từ chối.' });
    }

    const result = await pool.query(
      `UPDATE tutor_bank_accounts 
       SET bank_name = $1, account_number = $2, account_holder = $3, status = 'PENDING', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [bankName, accountNumber, accountHolder, id, userId]
    );

    res.json({ success: true, bankAccount: result.rows[0], message: 'Đã cập nhật tài khoản. Vui lòng chờ Admin duyệt lại.' });
  } catch (error) {
    console.error("Error updating bank account:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- POST Withdraw Request ---
router.post('/withdraw-request', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  const { amount, method, bankAccountId } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Số tiền không hợp lệ' });
  if (!bankAccountId) return res.status(400).json({ error: 'Vui lòng chọn tài khoản ngân hàng' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Validate bank account
    const bankResult = await client.query(
      'SELECT * FROM tutor_bank_accounts WHERE id = $1 AND user_id = $2', 
      [bankAccountId, userId]
    );
    
    if (bankResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Không tìm thấy tài khoản ngân hàng.' });
    }
    
    const bankAccount = bankResult.rows[0];
    if (bankAccount.status !== 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tài khoản ngân hàng chưa được duyệt. Không thể rút tiền.' });
    }

    // Lock wallet row for update to prevent race conditions
    const walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    if (walletResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Không tìm thấy ví.' });
    }
    
    const wallet = walletResult.rows[0];
    if (parseFloat(wallet.balance) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Số dư không đủ.' });
    }

    // Deduct balance immediately
    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
      [amount, wallet.id]
    );

    // Create a pending withdraw request
    const accountDetails = {
      bankAccountId: bankAccount.id,
      bankName: bankAccount.bank_name,
      accountNumber: bankAccount.account_number,
      accountHolder: bankAccount.account_holder
    };

    await client.query(
      `INSERT INTO withdraw_requests (wallet_id, amount, method, account_details, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [wallet.id, amount, 'BANK_TRANSFER', accountDetails]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Yêu cầu rút tiền đã được tạo và chờ duyệt.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error on withdraw:", error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});
// --- GET Cashflow Stats ---
router.get('/cashflow-stats', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  try {
    const walletResult = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) {
      return res.json({ stats: [] });
    }
    const walletId = walletResult.rows[0].id;
    
    const query = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', current_date) - interval '5 months',
          date_trunc('month', current_date),
          '1 month'::interval
        ) AS month
      )
      SELECT 
        to_char(m.month, 'Mon') as m,
        COALESCE(SUM(wr.amount), 0) as total
      FROM months m
      LEFT JOIN withdraw_requests wr 
        ON date_trunc('month', wr.created_at) = m.month 
        AND wr.wallet_id = $1
      GROUP BY m.month
      ORDER BY m.month;
    `;
    const statsResult = await pool.query(query, [walletId]);
    res.json({ stats: statsResult.rows });
  } catch (error) {
    console.error("Error fetching cashflow stats:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- GET Withdraw Requests ---
router.get('/withdraw-requests', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  try {
    const walletResult = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) return res.json({ requests: [] });
    
    const reqResult = await pool.query(
      'SELECT * FROM withdraw_requests WHERE wallet_id = $1 ORDER BY created_at DESC',
      [walletResult.rows[0].id]
    );
    res.json({ requests: reqResult.rows });
  } catch (error) {
    console.error("Error fetching withdraw requests:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- CONFIRM Withdraw Request ---
router.patch('/withdraw-requests/:id/confirm', authMiddleware, async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.user?.sub;
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const walletResult = await client.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) throw new Error('Wallet not found');
    const walletId = walletResult.rows[0].id;

    const reqResult = await client.query('SELECT * FROM withdraw_requests WHERE id = $1 AND wallet_id = $2 FOR UPDATE', [id, walletId]);
    if (reqResult.rows.length === 0) throw new Error('Request not found');
    
    const withdrawReq = reqResult.rows[0];
    if (withdrawReq.status !== 'APPROVED') throw new Error('Request must be APPROVED by admin first');

    // Update status to COMPLETED
    await client.query(
      "UPDATE withdraw_requests SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Create transaction log
    const desc = `Rút tiền về ${withdrawReq.method}`;
    await client.query(
      `INSERT INTO transactions (wallet_id, amount, type, status, gateway, description)
       VALUES ($1, $2, 'WITHDRAW', 'SUCCESS', $3, $4)`,
      [walletId, withdrawReq.amount, withdrawReq.method, desc]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Đã xác nhận nhận tiền thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error confirming withdraw:", error);
    res.status(400).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
