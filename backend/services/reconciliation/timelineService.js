// ── Timeline (Batch 38, spec Module 7) ───────────────────────────────────────
// Merges real timestamp columns already present on the evidence bundle's rows
// (transactions/bookings/withdrawal_requests/disputes/wallet_ledger) with this
// finding's own reconciliation_audit_logs rows, sorted chronologically — same
// "merge business events + audit rows, sort by time" idiom already used by
// GET /api/admin/fraud-alerts/:id/timeline (Batch 35). Only real, existing
// timestamp columns are used; nothing is inferred or backfilled.

const TX_TYPE_LABEL = {
  DEPOSIT: 'Nạp tiền', WITHDRAW: 'Rút tiền', PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền', COMMISSION: 'Hoa hồng',
};

const AUDIT_ACTION_LABEL = {
  DRAWER_OPENED: 'Admin mở điều tra',
  VIEWED_AGAIN: 'Admin xem lại',
  MARKED_REVIEWED: 'Đánh dấu đã xem xét',
  REOPENED: 'Mở lại điều tra',
  INCIDENT_CREATED: 'Tạo sự cố',
  INCIDENT_UPDATED: 'Cập nhật sự cố',
  RESOLVED: 'Đã giải quyết',
};

function pushIfTime(events, time, label, done = true) {
  if (!time) return;
  events.push({ label, time: new Date(time).toISOString(), done });
}

async function buildTimeline(pool, resolved, bundle) {
  const events = [];

  for (const tx of bundle.transactions || []) {
    pushIfTime(events, tx.created_at, `${TX_TYPE_LABEL[tx.type] || tx.type} (${tx.status})`);
  }
  for (const b of bundle.bookings || []) {
    pushIfTime(events, b.created_at, `Booking ${b.id} được tạo`);
    pushIfTime(events, b.escrow_released_at, `Booking ${b.id}: escrow đã giải ngân`);
  }
  for (const wr of bundle.withdrawals || []) {
    pushIfTime(events, wr.requested_at, `Yêu cầu rút tiền ${wr.id} được tạo`);
    pushIfTime(events, wr.approved_at, `Yêu cầu rút tiền ${wr.id} được duyệt`);
    pushIfTime(events, wr.rejected_at, `Yêu cầu rút tiền ${wr.id} bị từ chối`);
    pushIfTime(events, wr.paid_at, `Yêu cầu rút tiền ${wr.id} đã chi trả`);
    pushIfTime(events, wr.cancelled_at, `Yêu cầu rút tiền ${wr.id} bị huỷ`);
  }
  for (const d of bundle.disputes || []) {
    pushIfTime(events, d.created_at, `Tranh chấp ${d.id} được tạo`);
    pushIfTime(events, d.resolved_at, `Tranh chấp ${d.id} được giải quyết`);
  }
  for (const l of bundle.walletLedger || []) {
    if (l.created_at && l.reason_code) pushIfTime(events, l.created_at, `Ledger: ${l.reason_code}`);
  }

  const auditRes = await pool.query(
    `SELECT action, admin_id, reason, created_at FROM reconciliation_audit_logs WHERE finding_key = $1 ORDER BY created_at ASC LIMIT 50`,
    [resolved.findingKey]
  );
  for (const a of auditRes.rows) {
    pushIfTime(events, a.created_at, AUDIT_ACTION_LABEL[a.action] || a.action);
  }

  // The moment this specific computation ran is itself a real, honest event —
  // it's the actual generated_at of the live snapshot the finding was resolved from.
  pushIfTime(events, resolved.computed?.summary?.generated_at, 'Chênh lệch được phát hiện (đối soát)');

  events.sort((a, b) => new Date(a.time) - new Date(b.time));
  return { events };
}

module.exports = { buildTimeline };
