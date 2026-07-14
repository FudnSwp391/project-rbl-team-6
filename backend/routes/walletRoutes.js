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
  const userId = req.user?.id || req.user?.sub;
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
  const userId = req.user?.id || req.user?.sub;
  
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
  const userId = req.user?.id || req.user?.sub;
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

// --- POST Withdraw Request ---
router.post('/withdraw-request', authMiddleware, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  const { amount, method, accountDetails } = req.body;

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const walletResult = await pool.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
    if (walletResult.rows.length === 0) return res.status(400).json({ error: 'Wallet not found' });
    
    const wallet = walletResult.rows[0];
    if (parseFloat(wallet.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    // Create a pending withdraw request
    await pool.query(
      `INSERT INTO withdraw_requests (wallet_id, amount, method, account_details, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [wallet.id, amount, method, accountDetails]
    );

    res.json({ success: true, message: 'Yêu cầu rút tiền đã được tạo và chờ duyệt' });
  } catch (error) {
    console.error("Error on withdraw:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
