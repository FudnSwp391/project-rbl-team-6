// ── Root Cause Analyzer (Batch 38, spec Module 5) ────────────────────────────
// Each rule is a pure function over (resolved, evidenceBundle) from
// evidenceService.gatherEvidence() — no rule issues its own queries, so every
// conclusion is traceable to a specific evidence row already gathered.
// The orchestrator keeps the single highest-confidence match; ties/none fall
// back to Unknown (spec: "If unable to determine → Manual Investigation Required").

function hasBalanceType(rows) {
  return Array.isArray(rows) && rows.some(r => typeof r?.balance_type === 'string');
}

function ruleEscrowReleaseFailed(_resolved, bundle) {
  const stuck = bundle.aggregates?.completedNotReleased
    || bundle.bookings.filter(b => /completed/i.test(b.status || '') && b.escrow_tx_id && !b.escrow_released_at);
  if (!stuck || stuck.length === 0) return null;
  return {
    cause: 'Escrow Release Failed',
    confidence: Math.min(95, 55 + stuck.length * 10),
    evidence: stuck.slice(0, 5).map(b => `Booking ${b.id} đã hoàn thành nhưng escrow chưa giải ngân.`),
    recommendation: ['Retry Escrow Release', 'Review Booking', 'Run Reconciliation Again'],
  };
}

function ruleWalletEscrowMismatch(_resolved, bundle) {
  const ledger = bundle.walletLedger || [];
  if (!hasBalanceType(ledger)) return null;
  const hasBalance = ledger.some(l => l.balance_type === 'balance');
  const hasHeld = ledger.some(l => l.balance_type === 'held_balance');
  if (hasBalance && !hasHeld) {
    return {
      cause: 'Wallet Updated but Escrow Not Updated',
      confidence: 60,
      evidence: ['wallet_ledger có thay đổi balance nhưng không có thay đổi held_balance tương ứng.'],
      recommendation: ['Review Transaction', 'Retry Escrow Release'],
    };
  }
  if (hasHeld && !hasBalance) {
    return {
      cause: 'Escrow Updated but Wallet Not Updated',
      confidence: 60,
      evidence: ['wallet_ledger có thay đổi held_balance nhưng không có thay đổi balance tương ứng.'],
      recommendation: ['Review Transaction', 'Run Reconciliation Again'],
    };
  }
  return null;
}

function ruleDuplicateDeposit(_resolved, bundle) {
  const tx = bundle.transactions?.[0];
  const dups = bundle.aggregates?.duplicateCandidates;
  if (!tx || !Array.isArray(dups) || tx.type !== 'DEPOSIT' || dups.length === 0) return null;
  return {
    cause: 'Duplicate Deposit',
    confidence: Math.min(90, 50 + dups.length * 15),
    evidence: [`${dups.length} giao dịch DEPOSIT khác cùng ví và cùng số tiền.`],
    recommendation: ['Open Transaction', 'Review Booking'],
  };
}

function ruleDuplicatePayment(_resolved, bundle) {
  const tx = bundle.transactions?.[0];
  const dups = bundle.aggregates?.duplicateCandidates;
  if (!tx || !Array.isArray(dups) || tx.type !== 'PAYMENT' || dups.length === 0) return null;
  return {
    cause: 'Duplicate Payment',
    confidence: Math.min(90, 50 + dups.length * 15),
    evidence: [`${dups.length} giao dịch PAYMENT khác cùng ví và cùng số tiền.`],
    recommendation: ['Open Transaction', 'Review Booking'],
  };
}

function ruleFailedWithdrawal(_resolved, bundle) {
  const wr = bundle.withdrawals?.[0];
  if (!wr || wr.status !== 'REJECTED') return null;
  return {
    cause: 'Failed Withdrawal',
    confidence: 70,
    evidence: [`Yêu cầu rút tiền ${wr.id} có trạng thái REJECTED.`],
    recommendation: ['Retry Withdrawal', 'View Wallet'],
  };
}

function ruleRefundNotApplied(_resolved, bundle) {
  const unmatched = bundle.aggregates?.unmatchedRefundCount;
  if (typeof unmatched === 'number') {
    if (unmatched === 0) return null;
    return {
      cause: 'Refund Not Applied',
      confidence: Math.min(90, 50 + unmatched * 10),
      evidence: [`${unmatched} tranh chấp RESOLVED_REFUND không có giao dịch REFUND tương ứng.`],
      recommendation: ['Review Booking', 'Create Incident'],
    };
  }
  const resolvedRefundDisputes = (bundle.disputes || []).filter(d => d.status === 'RESOLVED_REFUND');
  if (resolvedRefundDisputes.length === 0) return null;
  return {
    cause: 'Refund Not Applied',
    confidence: 55,
    evidence: [`${resolvedRefundDisputes.length} tranh chấp RESOLVED_REFUND liên quan đến booking này.`],
    recommendation: ['Review Booking', 'Create Incident'],
  };
}

function rulePendingWithdrawalTooLong(_resolved, bundle) {
  const overdue = bundle.aggregates?.overdue;
  if (Array.isArray(overdue)) {
    if (overdue.length === 0) return null;
    return {
      cause: 'Pending Withdrawal Too Long',
      confidence: Math.min(85, 50 + overdue.length * 5),
      evidence: [`${overdue.length} yêu cầu rút tiền đã chờ quá 48 giờ.`],
      recommendation: ['Retry Withdrawal', 'Review Booking'],
    };
  }
  const ageHours = bundle.aggregates?.ageHours;
  if (typeof ageHours === 'number' && ageHours >= 48) {
    return {
      cause: 'Pending Withdrawal Too Long',
      confidence: 75,
      evidence: [`Yêu cầu rút tiền đã chờ ${Math.round(ageHours)} giờ.`],
      recommendation: ['Retry Withdrawal'],
    };
  }
  return null;
}

function ruleBookingCompletedNoSettlement(_resolved, bundle) {
  const candidates = (bundle.bookings || []).filter(b => /completed/i.test(b.status || '') && !b.escrow_tx_id);
  if (candidates.length === 0) return null;
  return {
    cause: 'Booking Completed Without Settlement',
    confidence: Math.min(85, 50 + candidates.length * 10),
    evidence: [`${candidates.length} booking đã hoàn thành nhưng chưa từng được đưa vào escrow.`],
    recommendation: ['Review Booking', 'Create Incident'],
  };
}

function rulePaymentCallbackMissing(_resolved, bundle) {
  const tx = bundle.transactions?.[0];
  if (!tx || tx.status !== 'PENDING' || !['DEPOSIT', 'PAYMENT'].includes(tx.type) || tx.gateway !== 'VNPAY') return null;
  const ageMin = tx.created_at ? (Date.now() - new Date(tx.created_at).getTime()) / 60000 : 0;
  if (ageMin < 30) return null;
  return {
    cause: 'Payment Callback Missing',
    confidence: 65,
    evidence: [`Giao dịch ${tx.id} (VNPAY) vẫn ở trạng thái PENDING sau ${Math.round(ageMin)} phút.`],
    recommendation: ['Retry Escrow Release', 'Open Transaction'],
  };
}

function ruleManualAdjustment(_resolved, bundle) {
  const manualRows = (bundle.walletLedger || []).filter(l => l.source === 'admin' || l.source === 'manual');
  if (manualRows.length === 0) return null;
  return {
    cause: 'Manual Adjustment',
    confidence: 60,
    evidence: [`${manualRows.length} bản ghi wallet_ledger được tạo thủ công bởi admin (source='${manualRows[0].source}').`],
    recommendation: ['Review Transaction'],
  };
}

// Chỉ khớp với evidence của check 'wallet-vs-transactions' (evidenceService.js
// gom bundle.aggregates.ledgerReasonSummary = SUM(amount) theo reason_code,
// 30 ngày gần nhất). Không có rule nào khác trong file này đọc field đó, nên
// trước đây check này LUÔN rơi vào nhánh "Unknown/0%" của analyzeRootCause dù
// dữ liệu breakdown thật đã được thu thập sẵn — không phải vì không có gì để
// nói, mà vì không rule nào từng đọc nó. Đây không phải rule "tìm 1 nguyên
// nhân duy nhất" (check này về bản chất do NHIỀU nhóm lý do hợp lệ cộng lại,
// xem computeReconciliation.js) — mục tiêu là thay "Unknown" bằng breakdown
// thật để admin tự đối chiếu, và gọi tên riêng UNKNOWN_WALLET_UPDATE nếu nhóm
// đó chiếm phần đáng kể (nghĩa là có code path cập nhật ví không gắn lý do).
function ruleWalletLedgerReasonBreakdown(_resolved, bundle) {
  const rows = bundle.aggregates?.ledgerReasonSummary;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const breakdown = rows.map(r => `${r.reason_code}: ${r.count} lần, tổng đ${Number(r.total).toLocaleString('vi-VN')}`);
  const unknown = rows.find(r => r.reason_code === 'UNKNOWN_WALLET_UPDATE');

  if (unknown && Number(unknown.count) > 0) {
    return {
      cause: 'Có thay đổi số dư không gắn lý do (UNKNOWN_WALLET_UPDATE)',
      confidence: 40,
      evidence: [
        `${unknown.count} thay đổi số dư (tổng đ${Number(unknown.total).toLocaleString('vi-VN')}) được ghi nhận với reason_code mặc định UNKNOWN_WALLET_UPDATE — nghĩa là có (các) đoạn code cập nhật wallets mà không khai báo lý do qua setLedgerContext() trước khi chạy.`,
        ...breakdown,
      ],
      recommendation: ['Review Transaction'],
    };
  }

  return {
    cause: 'Tổng hợp nhiều loại thay đổi số dư hợp lệ (xem breakdown)',
    confidence: 30,
    evidence: breakdown,
    recommendation: ['Review Transaction'],
  };
}

const RULES = [
  ruleEscrowReleaseFailed,
  ruleWalletEscrowMismatch,
  ruleDuplicateDeposit,
  ruleDuplicatePayment,
  ruleFailedWithdrawal,
  ruleRefundNotApplied,
  rulePendingWithdrawalTooLong,
  ruleBookingCompletedNoSettlement,
  rulePaymentCallbackMissing,
  ruleManualAdjustment,
  ruleWalletLedgerReasonBreakdown,
];

function analyzeRootCause(resolved, bundle) {
  let best = null;
  for (const rule of RULES) {
    let result;
    try { result = rule(resolved, bundle); } catch { result = null; }
    if (result && (!best || result.confidence > best.confidence)) best = result;
  }
  if (!best) {
    return {
      cause: 'Unknown',
      confidence: 0,
      evidence: ['Không tìm thấy nguyên nhân rõ ràng từ dữ liệu hiện có.'],
      recommendation: ['Manual Investigation Required'],
    };
  }
  return best;
}

module.exports = { analyzeRootCause };
