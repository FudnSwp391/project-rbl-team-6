// ── Reconciliation computation (Batch 37) ────────────────────────────────────
// Extracted verbatim from the former inline body of
// GET /api/admin/financial/reconciliation (CAP-8.2) so the Investigation
// Center (findingKey.resolveFinding, reconciliation_runs snapshots) can call
// the exact same read-only logic the page itself uses. Response shape and
// values are unchanged — this function performs NO writes/fixes/settlements.
// Where exact matching is impossible (internal transfers, no per-tx ledger
// link) checks are marked "review_only" or "warning" — never a fake "matched".

const LARGE_THRESHOLD = 1000000; // 1M VND — flagged for manual review only

async function computeReconciliation(pool) {
  const [
    walletRes,
    txAggRes,
    escrowRes,
    integrityRes,
    refundRes,
    largeRes,
  ] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(balance),0)::numeric AS balance, COALESCE(SUM(held_balance),0)::numeric AS held FROM wallets`),
    pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type='DEPOSIT' AND status='SUCCESS' AND amount>0),0)::numeric      AS deposits,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type='PAYMENT' AND status='SUCCESS' AND amount<0),0)::numeric AS payments
      FROM transactions
    `),
    pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(ABS(amount)),0)::numeric AS amount FROM transactions WHERE status='HELD_IN_ESCROW'`),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM transactions t LEFT JOIN wallets w ON w.id=t.wallet_id WHERE w.id IS NULL) AS orphan_tx,
        (SELECT COUNT(*)::int FROM wallets w LEFT JOIN users u ON u.id=w.user_id WHERE u.id IS NULL)          AS orphan_wallet,
        (SELECT COUNT(*)::int FROM transactions WHERE amount IS NULL OR amount=0)                             AS bad_amount
    `),
    pool.query(`SELECT COUNT(*)::int AS count FROM disputes WHERE status='RESOLVED_REFUND'`),
    pool.query(`
      SELECT t.id::text, t.type, t.status, ABS(t.amount)::numeric AS amount, t.description, t.created_at
      FROM transactions t
      WHERE ABS(t.amount) >= ${LARGE_THRESHOLD}
      ORDER BY ABS(t.amount) DESC
      LIMIT 20
    `),
  ]);

  const wallet    = walletRes.rows[0];
  const txAgg     = txAggRes.rows[0];
  const escrow    = escrowRes.rows[0];
  const integ     = integrityRes.rows[0];
  const refundCnt = refundRes.rows[0].count;

  // ── Withdrawal reconciliation (Batch 19.1): prefer new withdrawal_requests,
  //    fall back to the legacy withdraw_requests only if the new table is absent.
  let withdraw = { pending_amount: 0, pending_count: 0, paid_amount: 0, rejected_amount: 0, cancelled_amount: 0 };
  let withdrawalSource = 'withdrawal_requests';
  let withdrawalItems  = [];
  try {
    const wagg = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING','APPROVED')),0)::numeric AS pending_amount,
        COUNT(*) FILTER (WHERE status IN ('PENDING','APPROVED'))::int                    AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status='PAID'),0)::numeric                    AS paid_amount,
        COALESCE(SUM(amount) FILTER (WHERE status='REJECTED'),0)::numeric                AS rejected_amount,
        COALESCE(SUM(amount) FILTER (WHERE status='CANCELLED'),0)::numeric               AS cancelled_amount
      FROM withdrawal_requests
    `);
    withdraw = wagg.rows[0];
    const witems = await pool.query(`
      SELECT wr.id::text AS withdrawal_request_id, wr.tutor_id::text AS tutor_id,
             wr.amount::numeric AS amount, wr.status, wr.requested_at, wr.paid_at, wr.policy_version,
             u.full_name AS tutor_name, u.email AS tutor_email
      FROM withdrawal_requests wr
      LEFT JOIN users u ON u.id = wr.tutor_id
      WHERE wr.status IN ('PENDING','APPROVED')
      ORDER BY wr.requested_at DESC
      LIMIT 20
    `);
    withdrawalItems = witems.rows;
  } catch (e) {
    // New table missing → fall back to legacy withdraw_requests (pending only).
    withdrawalSource = 'legacy_withdraw_requests';
    const leg = await pool.query(`
      SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','PENDING')),0)::numeric AS pending_amount,
             COUNT(*) FILTER (WHERE status IN ('pending','PENDING'))::int                     AS pending_count
      FROM withdraw_requests
    `).catch(() => ({ rows: [{ pending_amount: 0, pending_count: 0 }] }));
    withdraw = { ...withdraw, pending_amount: leg.rows[0].pending_amount, pending_count: leg.rows[0].pending_count };
  }

  const walletBalance = Number(wallet.balance);
  const walletHeld    = Number(wallet.held);
  const deposits      = Number(txAgg.deposits);
  const payments      = Number(txAgg.payments);
  const escrowAmount  = Number(escrow.amount);
  const netFlow       = deposits - payments; // gross expected liquid balance

  const checks = [];

  // 1. Escrow (transactions) vs wallet held_balance
  const escrowDiff = escrowAmount - walletHeld;
  checks.push({
    id: 'escrow-vs-held',
    name: 'Escrow giao dịch vs Số dư tạm giữ ví',
    status: escrowDiff === 0 ? 'matched' : 'warning',
    expected_amount: Math.round(walletHeld),
    actual_amount: Math.round(escrowAmount),
    difference: Math.round(escrowDiff),
    description: 'So sánh tổng giao dịch HELD_IN_ESCROW với tổng held_balance của ví. Chỉ kiểm tra, không điều chỉnh.',
  });

  // 2. Wallet balance vs net transaction flow (review only — internal transfers exist)
  const flowDiff = walletBalance - netFlow;
  checks.push({
    id: 'wallet-vs-transactions',
    name: 'Số dư ví vs Dòng tiền giao dịch',
    status: 'review_only',
    expected_amount: Math.round(netFlow),
    actual_amount: Math.round(walletBalance),
    difference: Math.round(flowDiff),
    description: 'Nạp trừ Thanh toán so với tổng số dư ví. Chênh lệch dự kiến do chuyển khoản nội bộ / giải ngân escrow không lưu theo từng giao dịch — chỉ để xem.',
  });

  // 3. Transaction integrity
  const integrityIssues = integ.orphan_tx + integ.orphan_wallet + integ.bad_amount;
  checks.push({
    id: 'transaction-integrity',
    name: 'Toàn vẹn giao dịch',
    status: integrityIssues === 0 ? 'matched' : 'issue',
    expected_amount: 0,
    actual_amount: integrityIssues,
    difference: integrityIssues,
    description: `Giao dịch không có ví: ${integ.orphan_tx}; ví không có người dùng: ${integ.orphan_wallet}; số tiền null/0: ${integ.bad_amount}.`,
  });

  // 4. Pending withdrawals (Batch 19.1: PENDING + APPROVED from withdrawal_requests)
  checks.push({
    id: 'pending-withdrawals',
    name: 'Yêu cầu rút tiền đang chờ',
    status: Number(withdraw.pending_amount) === 0 ? 'matched' : 'review_only',
    expected_amount: 0,
    actual_amount: Math.round(Number(withdraw.pending_amount)),
    difference: Math.round(Number(withdraw.pending_amount)),
    description: `${withdraw.pending_count} yêu cầu rút tiền đang chờ/đã duyệt (nguồn: ${withdrawalSource}). Chỉ xem, không duyệt.`,
  });

  // 5. Refund disputes vs refund transactions
  checks.push({
    id: 'refund-dispute-check',
    name: 'Tranh chấp hoàn tiền vs Giao dịch hoàn tiền',
    status: refundCnt === 0 ? 'matched' : 'warning',
    expected_amount: refundCnt,
    actual_amount: 0,
    difference: refundCnt,
    description: `${refundCnt} tranh chấp RESOLVED_REFUND. Không có bảng giao dịch hoàn tiền để đối chiếu số tiền — cần kiểm tra thủ công.`,
  });

  // Build review items
  const items = [];
  // Pending/approved withdrawals awaiting manual payout (Batch 19.1)
  for (const w of withdrawalItems) {
    items.push({
      id: `wd-${w.withdrawal_request_id}`,
      type: 'withdrawal',
      severity: Number(w.amount) >= 5000000 ? 'medium' : 'low',
      status: 'review_only',
      title: `Rút tiền chờ chi: ${w.tutor_name || w.tutor_email || w.tutor_id}`,
      description: `Trạng thái ${w.status} — chờ admin chuyển khoản thủ công (${w.policy_version}).`,
      amount: Math.round(Number(w.amount)),
      reference_id: w.withdrawal_request_id,
      created_at: w.requested_at,
      // extra fields (ignored by the generic frontend table, useful for API consumers)
      withdrawal_request_id: w.withdrawal_request_id,
      tutor_id: w.tutor_id,
      tutor_name: w.tutor_name,
      tutor_email: w.tutor_email,
      withdrawal_status: w.status,
      requested_at: w.requested_at,
      paid_at: w.paid_at,
      policy_version: w.policy_version,
    });
  }
  for (const r of largeRes.rows) {
    const amt = Number(r.amount);
    items.push({
      id: r.id,
      type: 'transaction',
      severity: amt >= 5000000 ? 'medium' : 'low',
      status: 'review_only',
      title: `Giao dịch lớn: ${r.type}`,
      description: r.description || `${r.type} — ${r.status}`,
      amount: Math.round(amt),
      reference_id: r.id,
      created_at: r.created_at,
    });
  }

  const issueCount   = checks.filter(c => c.status === 'issue').length;
  const unmatchedCnt = checks.filter(c => c.status === 'warning' || c.status === 'issue').length;

  return {
    summary: {
      wallet_total_balance:      Math.round(walletBalance),
      wallet_total_held_balance: Math.round(walletHeld),
      successful_deposits:       Math.round(deposits),
      successful_payments:       Math.round(payments),
      escrow_transactions:       escrow.count,
      escrow_amount:             Math.round(escrowAmount),
      withdraw_pending_amount:   Math.round(Number(withdraw.pending_amount)), // kept for backward-compat
      // Batch 19.1: withdrawal metrics from withdrawal_requests
      withdrawal_source:            withdrawalSource,
      withdrawal_pending_amount:    Math.round(Number(withdraw.pending_amount)),
      withdrawal_pending_count:     Number(withdraw.pending_count) || 0,
      withdrawal_paid_amount:       Math.round(Number(withdraw.paid_amount)),
      withdrawal_rejected_amount:   Math.round(Number(withdraw.rejected_amount)),
      withdrawal_cancelled_amount:  Math.round(Number(withdraw.cancelled_amount)),
      unmatched_count:           unmatchedCnt,
      issue_count:               issueCount,
      generated_at:              new Date().toISOString(),
    },
    checks,
    items,
  };
}

module.exports = { computeReconciliation, LARGE_THRESHOLD };
