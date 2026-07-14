const express = require('express');
const router = express.Router();
const pool = require('../db');

// Basic auth middleware (mocking admin check)
const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // In a real app, verify token and check if role is ADMIN.
  next();
};

// --- GET All Deposit Requests ---
router.get('/deposit-requests', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dr.*, u.email, u.full_name, u.role
      FROM deposit_requests dr
      JOIN wallets w ON dr.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      ORDER BY dr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching deposit requests:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- GET All Withdraw Requests ---
router.get('/withdraw-requests', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wr.*, u.email, u.full_name, u.role
      FROM withdraw_requests wr
      JOIN wallets w ON wr.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      ORDER BY wr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching withdraw requests:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- APPROVE Deposit Request ---
router.patch('/deposit-requests/:id/approve', adminAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock the request
    const reqResult = await client.query('SELECT * FROM deposit_requests WHERE id = $1 FOR UPDATE', [id]);
    if (reqResult.rows.length === 0) throw new Error('Request not found');
    const depositReq = reqResult.rows[0];
    
    if (depositReq.status !== 'PENDING') throw new Error('Request is already processed');

    // Update status
    await client.query(
      'UPDATE deposit_requests SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3',
      ['COMPLETED', note || null, id]
    );

    // Update wallet balance
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [depositReq.amount, depositReq.wallet_id]
    );

    // Create transaction log
    await client.query(
      `INSERT INTO transactions (wallet_id, amount, type, status, gateway, description)
       VALUES ($1, $2, 'DEPOSIT', 'SUCCESS', $3, $4)`,
      [depositReq.wallet_id, depositReq.amount, depositReq.method, `Duyệt nạp tiền qua ${depositReq.method}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Đã duyệt yêu cầu nạp tiền' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error approving deposit:", error);
    res.status(400).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

// --- REJECT Deposit Request ---
router.patch('/deposit-requests/:id/reject', adminAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  
  try {
    const result = await pool.query(
      "UPDATE deposit_requests SET status = 'REJECTED', admin_note = $1, updated_at = NOW() WHERE id = $2 AND status = 'PENDING' RETURNING *",
      [note, id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Request not found or already processed' });
    res.json({ success: true, message: 'Đã từ chối yêu cầu nạp tiền' });
  } catch (error) {
    console.error("Error rejecting deposit:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- APPROVE Withdraw Request ---
router.patch('/withdraw-requests/:id/approve', adminAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock the request
    const reqResult = await client.query('SELECT * FROM withdraw_requests WHERE id = $1 FOR UPDATE', [id]);
    if (reqResult.rows.length === 0) throw new Error('Request not found');
    const withdrawReq = reqResult.rows[0];
    
    if (withdrawReq.status !== 'PENDING') throw new Error('Request is already processed');

    // Note: Wallet balance was already deducted when the request was created.
    // We only need to verify if the wallet still exists.
    const walletResult = await client.query('SELECT id FROM wallets WHERE id = $1', [withdrawReq.wallet_id]);
    
    if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
    }

    // Update status to APPROVED (Wait for tutor confirmation to COMPLETE)
    await client.query(
      'UPDATE withdraw_requests SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3',
      ['APPROVED', note || null, id]
    );

    // Note: We do NOT create a transaction log here. 
    // The transaction log will be created when the tutor confirms receipt.

    await client.query('COMMIT');
    res.json({ success: true, message: 'Đã duyệt yêu cầu rút tiền' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error approving withdrawal:", error);
    res.status(400).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

// --- REJECT Withdraw Request ---
router.patch('/withdraw-requests/:id/reject', adminAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE withdraw_requests SET status = 'REJECTED', admin_note = $1, updated_at = NOW() WHERE id = $2 AND status = 'PENDING' RETURNING *",
      [note, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request not found or already processed' });
    }
    const reqData = result.rows[0];

    // Refund wallet balance
    await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2', [reqData.amount, reqData.wallet_id]);
    
    // Log transaction for refund
    const desc = `Hoàn tiền do từ chối yêu cầu rút (Lý do: ${note || 'Không có'})`;
    await client.query(
      `INSERT INTO transactions (wallet_id, amount, type, status, description)
       VALUES ($1, $2, 'DEPOSIT', 'SUCCESS', $3)`,
      [reqData.wallet_id, reqData.amount, desc]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Đã từ chối yêu cầu rút tiền và hoàn tiền' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error rejecting withdraw:", error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
