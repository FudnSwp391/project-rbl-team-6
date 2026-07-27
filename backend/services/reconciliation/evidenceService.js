// ── Evidence Panel (Batch 38, spec Module 4) ─────────────────────────────────
// Gathers real, queryable evidence for a resolved finding (see findingKey.js).
// Every field is derived from an actual row/count; anything this repo cannot
// derive (e.g. a literal "Last API function name" or captured error message —
// no such columns/log store exist) is returned as null, never invented.
// `notes` are plain-language assertions, each backed by one of the queries
// below — this is what feeds the spec's "Evidence" bullet list.

async function gatherEvidence(pool, resolved) {
  const { findingType, finding } = resolved;
  if (findingType === 'item') {
    return finding.type === 'withdrawal'
      ? gatherWithdrawalItemEvidence(pool, finding)
      : gatherTransactionItemEvidence(pool, finding);
  }
  return gatherCheckEvidence(pool, finding);
}

function emptyBundle(extra = {}) {
  return {
    bookings: [], transactions: [], walletLedger: [], withdrawals: [], disputes: [],
    aggregates: {}, notes: [],
    fields: {
      booking_id: null, lesson_status: null, escrow_status: null,
      wallet_before: null, wallet_after: null, payment_status: null,
      last_api: null, last_event: null, error_message: null,
    },
    ...extra,
  };
}

async function gatherTransactionItemEvidence(pool, item) {
  const bundle = emptyBundle();
  const txRes = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [item.reference_id]);
  const tx = txRes.rows[0];
  if (!tx) { bundle.notes.push('Không tìm thấy giao dịch gốc — có thể đã bị xoá hoặc id sai.'); return bundle; }
  bundle.transactions.push(tx);

  // transactions.reference_id points at a booking id for escrow/payment flows
  // (confirmed usage at server.js callers of setLedgerContext reference_type='booking').
  let booking = null;
  if (tx.reference_id) {
    const bRes = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [tx.reference_id]);
    booking = bRes.rows[0] || null;
  }
  if (booking) bundle.bookings.push(booking);

  const ledgerRes = await pool.query(
    `SELECT * FROM wallet_ledger WHERE transaction_id = $1 ORDER BY created_at ASC LIMIT 20`, [tx.id]);
  bundle.walletLedger = ledgerRes.rows;

  if (booking) {
    const dRes = await pool.query(
      `SELECT * FROM disputes WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 10`, [booking.id]);
    bundle.disputes = dRes.rows;
  }

  // Duplicate-transaction candidates: same wallet+type+amount, excluding itself.
  const dupRes = await pool.query(
    `SELECT id, status, gateway, gateway_transaction_id, created_at FROM transactions
     WHERE wallet_id = $1 AND type = $2 AND amount = $3 AND id != $4
     ORDER BY created_at DESC LIMIT 10`,
    [tx.wallet_id, tx.type, tx.amount, tx.id]
  );
  bundle.aggregates.duplicateCandidates = dupRes.rows;
  bundle.notes.push(dupRes.rows.length > 0
    ? `Phát hiện ${dupRes.rows.length} giao dịch khác cùng ví/loại/số tiền — nghi ngờ trùng lặp.`
    : 'Không có giao dịch trùng lặp cùng ví/loại/số tiền.');

  const firstLedger = bundle.walletLedger[0];
  const lastLedger = bundle.walletLedger[bundle.walletLedger.length - 1];
  bundle.fields = {
    booking_id: booking?.id || null,
    lesson_status: booking?.status || null,
    escrow_status: tx.status === 'HELD_IN_ESCROW' ? 'Held'
      : booking?.escrow_released_at ? 'Released'
      : booking?.escrow_tx_id ? 'Pending' : null,
    wallet_before: firstLedger ? Number(firstLedger.balance_before) : null,
    wallet_after: lastLedger ? Number(lastLedger.balance_after) : null,
    payment_status: tx.status,
    last_api: tx.gateway ? `${tx.gateway} ${tx.type}` : null,
    last_event: lastLedger?.reason_code || null,
    error_message: null, // no error-tracking column exists on transactions
  };

  if (booking?.status && /completed/i.test(booking.status) && !booking.escrow_released_at && booking.escrow_tx_id) {
    bundle.notes.push('Booking đã hoàn thành nhưng escrow chưa được giải ngân.');
  }
  if (bundle.walletLedger.length === 0) {
    bundle.notes.push('Không tìm thấy bản ghi wallet_ledger nào cho giao dịch này — số dư ví có thể chưa được cập nhật.');
  }

  return bundle;
}

async function gatherWithdrawalItemEvidence(pool, item) {
  const bundle = emptyBundle();
  const wrRes = await pool.query(`SELECT * FROM withdrawal_requests WHERE id = $1`, [item.withdrawal_request_id]);
  const wr = wrRes.rows[0];
  if (!wr) { bundle.notes.push('Không tìm thấy yêu cầu rút tiền gốc.'); return bundle; }
  bundle.withdrawals.push(wr);

  const ledgerRes = await pool.query(
    `SELECT * FROM wallet_ledger WHERE reference_type = 'withdrawal' AND reference_id = $1 ORDER BY created_at ASC LIMIT 20`,
    [wr.id]
  );
  bundle.walletLedger = ledgerRes.rows;

  const firstLedger = bundle.walletLedger[0];
  const lastLedger = bundle.walletLedger[bundle.walletLedger.length - 1];
  const ageHours = wr.requested_at ? (Date.now() - new Date(wr.requested_at).getTime()) / 3600000 : null;
  bundle.aggregates.ageHours = ageHours;

  bundle.fields = {
    booking_id: null,
    lesson_status: null,
    escrow_status: null,
    wallet_before: firstLedger ? Number(firstLedger.balance_before) : null,
    wallet_after: lastLedger ? Number(lastLedger.balance_after) : null,
    payment_status: wr.status,
    last_api: 'withdrawal_requests',
    last_event: lastLedger?.reason_code || null,
    error_message: null,
  };

  if (ageHours != null) {
    bundle.notes.push(ageHours >= 48
      ? `Yêu cầu rút tiền đã chờ ${Math.round(ageHours)} giờ — vượt ngưỡng 48h.`
      : `Yêu cầu rút tiền đã chờ ${Math.round(ageHours)} giờ.`);
  }
  return bundle;
}

const CHECK_EVIDENCE = {
  async 'escrow-vs-held'(pool) {
    const bundle = emptyBundle();
    const openRes = await pool.query(`
      SELECT b.id, b.status, b.created_at, b.escrow_tx_id, b.escrow_released_at, b.auto_release_at, b.lesson_fee,
             t.status AS tx_status, t.amount AS tx_amount
      FROM bookings b LEFT JOIN transactions t ON t.id = b.escrow_tx_id
      WHERE b.escrow_tx_id IS NOT NULL AND b.escrow_released_at IS NULL
      ORDER BY b.created_at DESC LIMIT 20
    `);
    bundle.bookings = openRes.rows;
    const completedStuck = openRes.rows.filter(r => /completed/i.test(r.status || ''));
    bundle.aggregates.completedNotReleased = completedStuck;
    bundle.notes.push(completedStuck.length > 0
      ? `${completedStuck.length} booking đã hoàn thành nhưng escrow vẫn ở trạng thái giữ (chưa giải ngân).`
      : 'Không có booking đã hoàn thành nào còn bị giữ escrow.');
    bundle.notes.push(`${openRes.rows.length} booking đang có escrow mở (chưa giải ngân) trên tổng số.`);
    return bundle;
  },
  async 'wallet-vs-transactions'(pool) {
    const bundle = emptyBundle();
    // Pinpoint exactly which wallets don't sum to their own ledger history —
    // same per-wallet math as GET /api/admin/wallet-integrity. This is the
    // direct cause of a nonzero check now (see computeReconciliation.js);
    // the reason-code breakdown below is a secondary, indirect lead.
    const discrepantRes = await pool.query(`
      SELECT w.id AS wallet_id, w.user_id, u.full_name AS owner_name, u.email AS owner_email,
             w.balance::numeric AS actual_balance, COALESCE(b.expected,0)::numeric AS expected_balance,
             (w.balance::numeric - COALESCE(b.expected,0)::numeric) AS diff
      FROM wallets w
      LEFT JOIN users u ON u.id = w.user_id
      LEFT JOIN (
        SELECT wallet_id, SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END) AS expected
        FROM wallet_ledger WHERE balance_type='balance' GROUP BY wallet_id
      ) b ON b.wallet_id = w.id
      WHERE ABS(w.balance::numeric - COALESCE(b.expected,0)::numeric) > 0.001
      ORDER BY ABS(w.balance::numeric - COALESCE(b.expected,0)::numeric) DESC
      LIMIT 20
    `);
    bundle.aggregates.discrepantWallets = discrepantRes.rows;

    const summaryRes = await pool.query(`
      SELECT reason_code, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS total
      FROM wallet_ledger WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY reason_code ORDER BY count DESC LIMIT 15
    `);
    bundle.aggregates.ledgerReasonSummary = summaryRes.rows;
    bundle.walletLedger = summaryRes.rows;

    bundle.notes.push(discrepantRes.rows.length > 0
      ? `${discrepantRes.rows.length} ví có số dư thực tế lệch với tổng cộng dồn từ wallet_ledger — đây là các thay đổi balance không hề được ghi log (khác với nhóm reason_code UNKNOWN_WALLET_UPDATE, vốn CÓ ghi log nhưng thiếu lý do).`
      : 'Mọi ví đều khớp chính xác với wallet_ledger — không có thay đổi balance nào bị thiếu log.');
    bundle.notes.push(`${summaryRes.rows.length} nhóm lý do thay đổi số dư (reason_code) khác nhau trong 30 ngày qua (bối cảnh tham khảo thêm, không chắc là nguyên nhân trực tiếp).`);
    return bundle;
  },
  async 'transaction-integrity'(pool) {
    const bundle = emptyBundle();
    const [orphanTx, orphanWallet, badAmount] = await Promise.all([
      pool.query(`SELECT t.* FROM transactions t LEFT JOIN wallets w ON w.id=t.wallet_id WHERE w.id IS NULL LIMIT 20`),
      pool.query(`SELECT w.* FROM wallets w LEFT JOIN users u ON u.id=w.user_id WHERE u.id IS NULL LIMIT 20`),
      pool.query(`SELECT * FROM transactions WHERE amount IS NULL OR amount = 0 LIMIT 20`),
    ]);
    bundle.transactions = [...orphanTx.rows, ...badAmount.rows];
    bundle.aggregates = { orphanTx: orphanTx.rows, orphanWallet: orphanWallet.rows, badAmount: badAmount.rows };
    bundle.notes.push(`${orphanTx.rows.length} giao dịch không gắn với ví nào.`);
    bundle.notes.push(`${orphanWallet.rows.length} ví không gắn với người dùng nào.`);
    bundle.notes.push(`${badAmount.rows.length} giao dịch có số tiền null hoặc bằng 0.`);
    return bundle;
  },
  async 'pending-withdrawals'(pool) {
    const bundle = emptyBundle();
    const res = await pool.query(`
      SELECT * FROM withdrawal_requests WHERE status IN ('PENDING','APPROVED')
      ORDER BY requested_at ASC LIMIT 20
    `);
    bundle.withdrawals = res.rows;
    const now = Date.now();
    const overdue = res.rows.filter(r => r.requested_at && (now - new Date(r.requested_at).getTime()) / 3600000 >= 48);
    bundle.aggregates.overdue = overdue;
    bundle.notes.push(overdue.length > 0
      ? `${overdue.length} yêu cầu rút tiền đã chờ quá 48 giờ.`
      : 'Không có yêu cầu rút tiền nào chờ quá 48 giờ.');
    return bundle;
  },
  async 'refund-dispute-check'(pool) {
    const bundle = emptyBundle();
    const disputesRes = await pool.query(`
      SELECT * FROM disputes WHERE status = 'RESOLVED_REFUND' ORDER BY resolved_at DESC LIMIT 20
    `);
    bundle.disputes = disputesRes.rows;
    let unmatchedCount = 0;
    for (const d of disputesRes.rows) {
      if (!d.booking_id) { unmatchedCount++; continue; }
      const refundTx = await pool.query(
        `SELECT id FROM transactions WHERE type = 'REFUND' AND reference_id = $1 LIMIT 1`, [d.booking_id]);
      if (!refundTx.rows.length) unmatchedCount++;
    }
    bundle.aggregates.unmatchedRefundCount = unmatchedCount;
    bundle.notes.push(unmatchedCount > 0
      ? `${unmatchedCount} tranh chấp RESOLVED_REFUND không có giao dịch REFUND tương ứng.`
      : 'Mọi tranh chấp RESOLVED_REFUND đều có giao dịch REFUND tương ứng.');
    return bundle;
  },
};

async function gatherCheckEvidence(pool, check) {
  const handler = CHECK_EVIDENCE[check.id];
  if (!handler) return emptyBundle({ notes: ['Không có logic thu thập bằng chứng cho loại kiểm tra này.'] });
  return handler(pool);
}

// ── System Logs (Batch 38, spec Module 12) ───────────────────────────────────
// This repo has no centralized app-log aggregator, so "logs" here honestly
// means the real append-only ledger/log tables filtered to this finding's
// entities: wallet_ledger (already in the bundle), commission_logs, refund_logs.
async function gatherSystemLogs(pool, _resolved, bundle) {
  const bookingIds = [...new Set((bundle.bookings || []).map(b => b.id).filter(Boolean))];
  const txIds = [...new Set((bundle.transactions || []).map(t => t.id).filter(Boolean))];

  const [commissionRes, refundRes] = await Promise.all([
    (bookingIds.length || txIds.length)
      ? pool.query(
          `SELECT event_type, reason_code, gross_amount, commission_amount, tutor_amount, booking_id, transaction_id, created_at
           FROM commission_logs WHERE booking_id = ANY($1::uuid[]) OR transaction_id = ANY($2::uuid[])
           ORDER BY created_at DESC LIMIT 20`,
          [bookingIds.length ? bookingIds : [null], txIds.length ? txIds : [null]]
        ).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
    bookingIds.length
      ? pool.query(
          `SELECT target_type, reason_code, original_amount, refund_amount, target_id, created_at
           FROM refund_logs WHERE target_id = ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 20`,
          [bookingIds]
        ).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ]);

  const walletLedgerLogs = (bundle.walletLedger || [])
    .filter(l => l.created_at && l.reason_code && l.source)
    .map(l => ({
      reason_code: l.reason_code, source: l.source, direction: l.direction,
      amount: l.amount != null ? Number(l.amount) : null, created_at: l.created_at,
    }));

  return {
    wallet_ledger: walletLedgerLogs,
    commission_logs: commissionRes.rows,
    refund_logs: refundRes.rows,
  };
}

module.exports = { gatherEvidence, gatherSystemLogs };
