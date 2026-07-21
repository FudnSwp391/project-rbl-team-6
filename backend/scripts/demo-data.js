#!/usr/bin/env node
/*
 * ============================================================================
 *  EduX / Tutor Marketplace — Demo Data Tool (Batch 31)
 * ============================================================================
 *
 *  PURPOSE
 *  -------
 *  Populate a LOCAL/DEV database with clearly-synthetic demo data so the
 *  admin + AI feature pages are not empty during a presentation, and remove
 *  that data again afterwards.
 *
 *  THIS TOOL IS DEMO-ONLY AND SAFE BY DESIGN:
 *    - It is MANUAL. It is never wired into server startup or npm install.
 *    - It DEFAULTS TO DRY-RUN. Nothing is written without --apply plus an
 *      explicit env confirmation (see write-protection below).
 *    - It NEVER moves money. It does not UPDATE wallets/balances, does not
 *      touch the wallet_ledger trigger, does not call payment gateways, does
 *      not send email/SMTP, and does not run refund/commission/escrow logic.
 *      The rows it writes to transactions/disputes/refund_logs/
 *      withdrawal_requests are inert LOG rows only (verified: there is no
 *      money-moving trigger on those tables; trg_wallet_ledger fires only on
 *      UPDATE OF balance/held_balance, which this tool never performs).
 *    - It is IDEMPOTENT. Running seed twice does not duplicate rows.
 *    - It is REVERSIBLE. cleanup removes only rows this tool created, which
 *      are all tagged with a "[DEMO]" / "demo-b31:" / demo_batch=B31 marker
 *      and demo accounts on the reserved @edux.local domain.
 *
 *  USAGE (Windows CMD examples)
 *  ----------------------------
 *    node scripts/demo-data.js --seed                 (dry-run, default)
 *    node scripts/demo-data.js --seed --dry-run       (explicit dry-run)
 *    node scripts/demo-data.js --seed --apply         (writes; needs confirm)
 *    node scripts/demo-data.js --cleanup              (dry-run, default)
 *    node scripts/demo-data.js --cleanup --apply      (deletes; needs confirm)
 *
 *  WRITE PROTECTION (all must be true for --apply to write)
 *  --------------------------------------------------------
 *    1. CLI includes --apply
 *    2. env  DEMO_SEED_CONFIRM = I_UNDERSTAND_THIS_IS_DEMO_DATA
 *    3. NODE_ENV is NOT "production"
 *    4. DATABASE_URL host looks local/dev/test  OR
 *       env DEMO_SEED_ALLOW_REMOTE = true (explicit opt-in for remote DBs)
 * ============================================================================
 */

'use strict';

const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

// ─── CLI / mode parsing ─────────────────────────────────────────────────────
const ARGV = process.argv.slice(2);
const has = (flag) => ARGV.includes(flag);

const MODE = has('--cleanup') ? 'cleanup' : (has('--seed') ? 'seed' : null);
// Dry-run is the default. --apply is the ONLY way to enable writes.
const APPLY = has('--apply') && !has('--dry-run');
const DRY_RUN = !APPLY;
const ALLOW_REMOTE =
  has('--allow-remote') ||
  String(process.env.DEMO_SEED_ALLOW_REMOTE ?? '').toLowerCase() === 'true';

const CONFIRM_TOKEN = 'I_UNDERSTAND_THIS_IS_DEMO_DATA';
const DEMO_BATCH = 'B31';
const DEMO_PASSWORD = 'Demo@123456'; // demo-only; documented, not a real secret

// ─── Tiny logging helpers ───────────────────────────────────────────────────
const line = (s = '') => console.log(s);
const head = (s) => { line(); line('── ' + s + ' ' + '─'.repeat(Math.max(0, 66 - s.length))); };
const plan = (verb, table, detail) =>
  line(`  ${DRY_RUN ? '[plan]' : '[ok]  '} ${verb.padEnd(7)} ${table.padEnd(34)} ${detail || ''}`);
const warn = (s) => line('  ⚠  ' + s);
const note = (s) => line('  •  ' + s);

// ─── Demo identity constants (stable across runs → idempotent) ───────────────
const DEMO_USERS = [
  { key: 'admin',    email: 'demo.admin@edux.local',    full_name: 'Admin Demo',           role: 'admin'   },
  { key: 'student1', email: 'demo.student1@edux.local', full_name: 'Nguyen Student Demo',  role: 'student' },
  { key: 'student2', email: 'demo.student2@edux.local', full_name: 'Tran Student Demo',    role: 'student' },
  { key: 'tutor1',   email: 'demo.tutor1@edux.local',   full_name: 'Le Tutor Demo',        role: 'tutor'   },
  { key: 'tutor2',   email: 'demo.tutor2@edux.local',   full_name: 'Pham Tutor Demo',      role: 'tutor'   },
  { key: 'tutor3',   email: 'demo.tutor3@edux.local',   full_name: 'Vo Tutor Demo',        role: 'tutor'   },
];
const DEMO_EMAILS = DEMO_USERS.map((u) => u.email);
// Stable synthetic UUIDs (recognisable "db31..." prefix) for FK-less targets.
const demoUuid = (n) => `db310000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ─── Schema-introspection helpers (defensive; never assume columns) ──────────
async function tableExists(db, table) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [table]
  );
  return r.rowCount > 0;
}
async function getColumns(db, table) {
  const r = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return new Set(r.rows.map((x) => x.column_name));
}
async function columnExists(db, table, col) {
  return (await getColumns(db, table)).has(col);
}
async function countWhere(db, table, whereSql, params = []) {
  try {
    const r = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${whereSql}`, params);
    return r.rows[0].n;
  } catch { return 0; }
}

// ─── Write-protection gate ──────────────────────────────────────────────────
function describeDbHost() {
  const url = process.env.DATABASE_URL || '';
  try {
    const u = new URL(url);
    return { host: u.hostname || '(unknown)', raw: url };
  } catch {
    // Fall back to a loose host match if URL parsing fails.
    const m = url.match(/@([^:/?]+)/);
    return { host: m ? m[1] : '(unparalseable)', raw: url };
  }
}
function hostLooksLocal(host) {
  const h = String(host || '').toLowerCase();
  return (
    h === 'localhost' || h === '127.0.0.1' || h === '::1' ||
    h.endsWith('.local') || h.endsWith('.localhost') ||
    h.includes('dev') || h.includes('test') || h === 'db' || h === 'postgres'
  );
}
function evaluateWriteProtection() {
  const reasons = [];
  if (!APPLY) reasons.push('no --apply flag (dry-run is the default)');
  if (String(process.env.DEMO_SEED_CONFIRM ?? '') !== CONFIRM_TOKEN)
    reasons.push(`env DEMO_SEED_CONFIRM must equal ${CONFIRM_TOKEN}`);
  if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production')
    reasons.push('NODE_ENV is "production" (refusing to write)');
  const { host } = describeDbHost();
  if (!hostLooksLocal(host) && !ALLOW_REMOTE)
    reasons.push(`DATABASE_URL host "${host}" is not local/dev/test; set DEMO_SEED_ALLOW_REMOTE=true to override`);
  return { ok: reasons.length === 0, reasons, host };
}

// ─── Demo content definitions ───────────────────────────────────────────────
// Each definition below is pure data; the seed routine wires FKs at runtime.

function buildSemanticReports(ids) {
  return [
    {
      source_id: 'demo-b31:sem:1', source_type: 'CHAT_MESSAGE', tutor_id: ids.tutor1,
      severity: 'CRITICAL', status: 'OPEN', categories: ['EXTERNAL_PAYMENT_ATTEMPT'],
      scores: { external_payment_risk: 92, toxicity_risk: 5 },
      summary: '[DEMO] Phát hiện: giao dịch ngoài nền tảng. Mức rủi ro nghiêm trọng.',
    },
    {
      source_id: 'demo-b31:sem:2', source_type: 'REVIEW', tutor_id: ids.tutor2,
      severity: 'LOW', status: 'OPEN', categories: ['POSITIVE_TEACHING_SIGNAL'],
      scores: { teaching_quality: 88, friendliness: 90 },
      summary: '[DEMO] Nội dung tích cực về gia sư, không có rủi ro. Mức rủi ro thấp.',
    },
    {
      source_id: 'demo-b31:sem:3', source_type: 'CHAT_MESSAGE', tutor_id: ids.tutor3,
      severity: 'MEDIUM', status: 'OPEN', categories: ['PRIVACY_RISK'],
      scores: { privacy_risk: 45 },
      summary: '[DEMO] Phát hiện: lộ thông tin cá nhân. Mức rủi ro trung bình.',
    },
  ];
}

function buildFraudReports(ids) {
  return [
    {
      dwk: 'demo-b31:fraud:1', entity_key: 'demo:pair:tutor1-student1',
      report_type: 'EXTERNAL_PAYMENT_COLLUSION', severity: 'CRITICAL', risk_score: 91, confidence: 80,
      tutor_id: ids.tutor1, student_id: ids.student1,
      title: '[DEMO] Nghi vấn cấu kết thanh toán ngoài nền tảng',
      summary: '[DEMO] Cặp gia sư–học sinh có nhiều tín hiệu rủ chuyển khoản ngoài app.',
      reason_summary: '[DEMO] EXTERNAL_PAYMENT_COLLUSION (advisory).',
      risk_flags: ['EXTERNAL_PAYMENT', 'REPEATED_CONTACT'],
    },
    {
      dwk: 'demo-b31:fraud:2', entity_key: 'demo:tutor:tutor2',
      report_type: 'WITHDRAWAL_RISK', severity: 'HIGH', risk_score: 72, confidence: 70,
      tutor_id: ids.tutor2, student_id: null,
      title: '[DEMO] Rủi ro rút tiền bất thường',
      summary: '[DEMO] Gia sư có yêu cầu rút tiền kèm tín hiệu rủi ro.',
      reason_summary: '[DEMO] WITHDRAWAL_RISK (advisory).',
      risk_flags: ['WITHDRAWAL_SPIKE'],
    },
    {
      dwk: 'demo-b31:fraud:3', entity_key: 'demo:student:student1',
      report_type: 'REFUND_ABUSE', severity: 'MEDIUM', risk_score: 55, confidence: 60,
      tutor_id: ids.tutor3, student_id: ids.student1,
      title: '[DEMO] Nghi vấn lạm dụng hoàn tiền',
      summary: '[DEMO] Học sinh có tần suất hoàn tiền cao trong 30 ngày.',
      reason_summary: '[DEMO] REFUND_ABUSE (advisory).',
      risk_flags: ['ABNORMAL_REFUND_RATE'],
    },
  ];
}

function buildAiCases(ids) {
  return [
    {
      marker: '[DEMO-B31-1] AI đề xuất hoàn tiền — cần admin xem xét.',
      student_id: ids.student1, tutor_id: ids.tutor1,
      status: 'NEED_HUMAN_REVIEW', severity: 'HIGH', confidence: 65,
      money_action: 'REFUND_TO_STUDENT', recommendation: 'REFUND_RECOMMENDATION',
      risk_flags: ['HIGH_REFUND_FREQUENCY'],
    },
    {
      marker: '[DEMO-B31-2] Phân tích khiếu nại — cần thêm bằng chứng.',
      student_id: ids.student2, tutor_id: ids.tutor2,
      status: 'NEED_HUMAN_REVIEW', severity: 'MEDIUM', confidence: 40,
      money_action: 'NO_ACTION', recommendation: 'DISPUTE_ANALYSIS_NEED_MORE_EVIDENCE',
      risk_flags: ['INSUFFICIENT_EVIDENCE'],
    },
  ];
}

function buildCopilotReports(ids) {
  return [
    {
      entity_id: 'demo-b31:copilot:1', entity_type: 'TUTOR', page_key: 'sm-fraud',
      risk_level: 'HIGH', confidence: 72,
      summary: '[DEMO] Gia sư Le Tutor Demo có tín hiệu giao dịch ngoài nền tảng; đề nghị rà soát.',
      key_findings: ['[DEMO] 1 báo cáo kiểm duyệt EXTERNAL_PAYMENT_ATTEMPT', '[DEMO] 1 báo cáo gian lận CRITICAL'],
      recommendations: ['[DEMO] Chuyển admin xem xét', '[DEMO] Đưa vào danh sách theo dõi'],
      ref: ids.tutor1,
    },
    {
      entity_id: 'demo-b31:copilot:2', entity_type: 'STUDENT', page_key: 'tx-ai-cases',
      risk_level: 'MEDIUM', confidence: 55,
      summary: '[DEMO] Học sinh Nguyen Student Demo có tần suất hoàn tiền cao; theo dõi thêm.',
      key_findings: ['[DEMO] 3 hoàn tiền trong 30 ngày'],
      recommendations: ['[DEMO] Yêu cầu thêm bằng chứng'],
      ref: ids.student1,
    },
  ];
}

// refund_logs — inert audit rows only (NO wallet change). Spread over ~40 days
// so both top_refund_tutors_30d and monthly_refund_summary have data.
function buildRefundLogs(ids) {
  return [
    { n: 1, student_id: ids.student1, tutor_id: ids.tutor1, amount: 300000, days_ago: 3,  reason: 'TUTOR_NO_SHOW' },
    { n: 2, student_id: ids.student1, tutor_id: ids.tutor1, amount: 250000, days_ago: 9,  reason: 'TUTOR_LATE' },
    { n: 3, student_id: ids.student2, tutor_id: ids.tutor1, amount: 200000, days_ago: 15, reason: 'QUALITY_ISSUE' },
    { n: 4, student_id: ids.student2, tutor_id: ids.tutor2, amount: 180000, days_ago: 6,  reason: 'SCHEDULE_CONFLICT' },
    { n: 5, student_id: ids.student1, tutor_id: ids.tutor3, amount: 150000, days_ago: 34, reason: 'QUALITY_ISSUE' },
  ];
}

// Demo transactions (inert log rows) + disputes that reference them.
function buildDisputeChain(ids) {
  return [
    { n: 1, student_id: ids.student1, tutor_id: ids.tutor1, amount: 300000, tx_status: 'DISPUTED', dispute_status: 'OPEN',            days_ago: 2,  reason: '[DEMO] Gia sư không tham gia buổi học.' },
    { n: 2, student_id: ids.student2, tutor_id: ids.tutor2, amount: 250000, tx_status: 'REFUNDED', dispute_status: 'RESOLVED_REFUND',  days_ago: 12, reason: '[DEMO] Đã hoàn tiền cho học sinh.' },
    { n: 3, student_id: ids.student1, tutor_id: ids.tutor3, amount: 200000, tx_status: 'RELEASED', dispute_status: 'RESOLVED_RELEASE', days_ago: 20, reason: '[DEMO] Đã giải ngân cho gia sư.' },
  ];
}

// ─── SEED (apply) ───────────────────────────────────────────────────────────
async function seedApply(db) {
  const counts = { inserted: 0, skipped: 0, tables: {} };
  const bump = (t, key) => { counts.tables[t] = counts.tables[t] || { inserted: 0, skipped: 0 }; counts.tables[t][key]++; counts[key]++; };

  // 1) Users (idempotent via UNIQUE email). Wallets auto-create via trigger.
  const hasPw = await columnExists(db, 'users', 'password_hash');
  const pwHash = hasPw ? await bcrypt.hash(DEMO_PASSWORD, 10) : null;
  const ids = {};
  for (const u of DEMO_USERS) {
    const before = await countWhere(db, 'users', 'email=$1', [u.email]);
    const cols = ['full_name', 'email', 'role'];
    const vals = [u.full_name, u.email, u.role];
    if (hasPw) { cols.push('password_hash'); vals.push(pwHash); }
    const ph = vals.map((_, i) => `$${i + 1}`).join(',');
    const upd = hasPw
      ? 'full_name=EXCLUDED.full_name, role=EXCLUDED.role, password_hash=EXCLUDED.password_hash'
      : 'full_name=EXCLUDED.full_name, role=EXCLUDED.role';
    const r = await db.query(
      `INSERT INTO users (${cols.join(',')}) VALUES (${ph})
       ON CONFLICT (email) DO UPDATE SET ${upd} RETURNING id`, vals);
    ids[u.key] = r.rows[0].id;
    bump('users', before ? 'skipped' : 'inserted');
    plan(before ? 'skip' : 'insert', 'users', u.email);
  }

  // 2) tutor_profiles for demo tutors (approved) — only columns that exist.
  if (await tableExists(db, 'tutor_profiles')) {
    const tpCols = await getColumns(db, 'tutor_profiles');
    for (const key of ['tutor1', 'tutor2', 'tutor3']) {
      const exists = await countWhere(db, 'tutor_profiles', 'user_id=$1', [ids[key]]);
      if (exists) { bump('tutor_profiles', 'skipped'); plan('skip', 'tutor_profiles', key); continue; }
      const col = ['user_id'], val = [ids[key]];
      const put = (c, v) => { if (tpCols.has(c)) { col.push(c); val.push(v); } };
      put('bio', '[DEMO] Gia sư demo phục vụ trình diễn.');
      put('subjects', 'Toán, Lý');
      put('experience_years', 3);
      put('status', 'approved');
      put('headline', '[DEMO] Tutor');
      const ph = val.map((_, i) => `$${i + 1}`).join(',');
      await db.query(`INSERT INTO tutor_profiles (${col.join(',')}) VALUES (${ph})`, val);
      bump('tutor_profiles', 'inserted'); plan('insert', 'tutor_profiles', key);
    }
  } else { warn('tutor_profiles missing — skipped'); }

  // 3) semantic_moderation_reports
  if (await tableExists(db, 'semantic_moderation_reports')) {
    for (const s of buildSemanticReports(ids)) {
      const exists = await countWhere(db, 'semantic_moderation_reports', 'source_id=$1', [s.source_id]);
      if (exists) { bump('semantic_moderation_reports', 'skipped'); plan('skip', 'semantic_moderation_reports', s.source_id); continue; }
      await db.query(
        `INSERT INTO semantic_moderation_reports
           (source_type, source_id, tutor_id, severity, status, categories, scores, summary, model_used, rule_version)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,'RULE_BASED','SEMANTIC_MODERATION_V1')`,
        [s.source_type, s.source_id, s.tutor_id, s.severity, s.status,
         JSON.stringify(s.categories), JSON.stringify(s.scores), s.summary]);
      bump('semantic_moderation_reports', 'inserted'); plan('insert', 'semantic_moderation_reports', `${s.source_id} ${s.severity}`);
    }
  } else { warn('semantic_moderation_reports missing — skipped'); }

  // 4) fraud_intel_reports (idempotent via UNIQUE detection_window_key)
  if (await tableExists(db, 'fraud_intel_reports')) {
    for (const f of buildFraudReports(ids)) {
      const before = await countWhere(db, 'fraud_intel_reports', 'detection_window_key=$1', [f.dwk]);
      await db.query(
        `INSERT INTO fraud_intel_reports
           (report_type, status, severity, risk_score, confidence, tutor_id, student_id,
            entity_key, detection_window_key, title, summary, reason_summary, risk_flags, model_used, rule_version)
         VALUES ($1,'OPEN',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'RULE_BASED','FRAUD_INTEL_V1')
         ON CONFLICT (detection_window_key) DO NOTHING`,
        [f.report_type, f.severity, f.risk_score, f.confidence, f.tutor_id, f.student_id,
         f.entity_key, f.dwk, f.title, f.summary, f.reason_summary, JSON.stringify(f.risk_flags)]);
      bump('fraud_intel_reports', before ? 'skipped' : 'inserted');
      plan(before ? 'skip' : 'insert', 'fraud_intel_reports', `${f.dwk} ${f.severity}`);
    }
  } else { warn('fraud_intel_reports missing — skipped'); }

  // 5) ai_case_resolutions (dry_run=true, executed=false — never moves money)
  if (await tableExists(db, 'ai_case_resolutions')) {
    for (const c of buildAiCases(ids)) {
      const exists = await countWhere(db, 'ai_case_resolutions', 'reason_summary=$1', [c.marker]);
      if (exists) { bump('ai_case_resolutions', 'skipped'); plan('skip', 'ai_case_resolutions', c.marker.slice(0, 24)); continue; }
      await db.query(
        `INSERT INTO ai_case_resolutions
           (student_id, tutor_id, status, severity, confidence, money_action, recommendation,
            reason_summary, risk_flags, dry_run, executed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb, TRUE, FALSE)`,
        [c.student_id, c.tutor_id, c.status, c.severity, c.confidence, c.money_action,
         c.recommendation, c.marker, JSON.stringify(c.risk_flags)]);
      bump('ai_case_resolutions', 'inserted'); plan('insert', 'ai_case_resolutions', c.status);
    }
  } else { warn('ai_case_resolutions missing — skipped'); }

  // 6) admin_copilot_reports
  if (await tableExists(db, 'admin_copilot_reports')) {
    for (const c of buildCopilotReports(ids)) {
      const exists = await countWhere(db, 'admin_copilot_reports', 'entity_id=$1', [c.entity_id]);
      if (exists) { bump('admin_copilot_reports', 'skipped'); plan('skip', 'admin_copilot_reports', c.entity_id); continue; }
      await db.query(
        `INSERT INTO admin_copilot_reports
           (entity_type, entity_id, page_key, summary, confidence, risk_level,
            key_findings, recommendations, model_used, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,'RULE_BASED',$9)`,
        [c.entity_type, c.entity_id, c.page_key, c.summary, c.confidence, c.risk_level,
         JSON.stringify(c.key_findings), JSON.stringify(c.recommendations), ids.admin]);
      bump('admin_copilot_reports', 'inserted'); plan('insert', 'admin_copilot_reports', c.entity_id);
    }
  } else { warn('admin_copilot_reports missing — skipped'); }

  // 7) refund_logs — inert audit rows (idempotent via UNIQUE target,student)
  if (await tableExists(db, 'refund_logs')) {
    for (const r of buildRefundLogs(ids)) {
      const target_id = demoUuid(100 + r.n);
      const before = await countWhere(db, 'refund_logs', 'target_type=$1 AND target_id=$2 AND student_id=$3', ['booking', target_id, r.student_id]);
      await db.query(
        `INSERT INTO refund_logs
           (target_type, target_id, student_id, tutor_id, original_amount, refund_rate,
            refund_amount, non_refunded_amount, reason_code, decision_by, note, metadata, created_at)
         VALUES ('booking',$1,$2,$3,$4,1.0,$4,0,$5,'admin','[DEMO] refund log',
                 $6::jsonb, NOW() - make_interval(days => $7::int))
         ON CONFLICT (target_type, target_id, student_id) DO NOTHING`,
        [target_id, r.student_id, r.tutor_id, r.amount, r.reason,
         JSON.stringify({ demo_batch: DEMO_BATCH, demo: true }), r.days_ago]);
      bump('refund_logs', before ? 'skipped' : 'inserted');
      plan(before ? 'skip' : 'insert', 'refund_logs', `#${r.n} ${r.amount}`);
    }
  } else { warn('refund_logs missing — skipped'); }

  // 8+9) transactions (inert log rows) + disputes referencing them
  const canTx = await tableExists(db, 'transactions');
  const canDisp = await tableExists(db, 'disputes');
  if (canTx && canDisp) {
    // Demo student wallet (auto-created by trigger) for the tx wallet_id link.
    for (const d of buildDisputeChain(ids)) {
      const gtx = `demo-b31:tx:${d.n}`;
      const w = await db.query('SELECT id FROM wallets WHERE user_id=$1 LIMIT 1', [d.student_id]);
      const walletId = w.rows[0] ? w.rows[0].id : null;
      const txBefore = await db.query('SELECT id FROM transactions WHERE gateway_transaction_id=$1', [gtx]);
      let txId;
      if (txBefore.rows[0]) { txId = txBefore.rows[0].id; bump('transactions', 'skipped'); plan('skip', 'transactions', gtx); }
      else {
        const r = await db.query(
          `INSERT INTO transactions
             (wallet_id, amount, type, status, gateway, gateway_transaction_id, reference_id, description, created_at)
           VALUES ($1,$2,'PAYMENT',$3,'SYSTEM',$4,$5,$6, NOW() - make_interval(days => $7::int))
           RETURNING id`,
          [walletId, d.amount, d.tx_status, gtx, demoUuid(200 + d.n), '[DEMO] demo transaction (no money moved)', d.days_ago]);
        txId = r.rows[0].id; bump('transactions', 'inserted'); plan('insert', 'transactions', `${gtx} ${d.tx_status}`);
      }
      // dispute referencing this demo tx (idempotent: one dispute per demo tx)
      const dispBefore = await countWhere(db, 'disputes', 'transaction_id=$1', [txId]);
      if (dispBefore) { bump('disputes', 'skipped'); plan('skip', 'disputes', `tx ${d.n}`); continue; }
      const dispCols = await getColumns(db, 'disputes');
      const col = ['transaction_id', 'raised_by', 'reason', 'status'];
      const val = [txId, d.student_id, d.reason, d.dispute_status];
      const put = (c, v) => { if (dispCols.has(c)) { col.push(c); val.push(v); } };
      put('tutor_id', d.tutor_id);
      put('target_type', 'booking');
      const ph = val.map((_, i) => `$${i + 1}`).join(',');
      // Back-date created_at (as a literal interval) only if the column exists.
      const createdCol = dispCols.has('created_at') ? ', created_at' : '';
      const createdVal = dispCols.has('created_at') ? `, NOW() - make_interval(days => ${Number(d.days_ago)}::int)` : '';
      await db.query(`INSERT INTO disputes (${col.join(',')}${createdCol}) VALUES (${ph}${createdVal})`, val);
      bump('disputes', 'inserted'); plan('insert', 'disputes', `${d.dispute_status}`);
    }
  } else { warn('transactions/disputes missing — dispute chain skipped'); }

  // 10) withdrawal_requests — 1 PENDING (inert; no wallet balance change)
  if (await tableExists(db, 'withdrawal_requests')) {
    const idk = 'demo-b31:wd:1';
    const before = await countWhere(db, 'withdrawal_requests', 'idempotency_key=$1', [idk]);
    const w = await db.query('SELECT id FROM wallets WHERE user_id=$1 LIMIT 1', [ids.tutor1]);
    if (!w.rows[0]) { warn('tutor1 wallet not found — withdrawal skipped'); }
    else {
      await db.query(
        `INSERT INTO withdrawal_requests
           (tutor_id, wallet_id, amount, fee_amount, net_amount, status, payout_method,
            bank_name, bank_account_no, bank_account_name, payout_note, idempotency_key, metadata)
         VALUES ($1,$2,$3,0,$3,'PENDING','BANK_TRANSFER','[DEMO] Bank','0000000000','LE TUTOR DEMO',
                 '[DEMO] demo withdrawal (no money moved)',$4,$5::jsonb)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [ids.tutor1, w.rows[0].id, 500000, idk, JSON.stringify({ demo_batch: DEMO_BATCH, demo: true })]);
      bump('withdrawal_requests', before ? 'skipped' : 'inserted');
      plan(before ? 'skip' : 'insert', 'withdrawal_requests', idk);
    }
  } else { warn('withdrawal_requests missing — skipped'); }

  // 11) admin_analytics_queries — a few history rows (optional, nice-to-have)
  if (await tableExists(db, 'admin_analytics_queries')) {
    const histories = [
      { q: '[DEMO] Top gia sư có refund nhiều nhất 30 ngày', intent: 'top_refund_tutors_30d', status: 'SUCCESS', count: 3 },
      { q: '[DEMO] Gia sư nào có rủi ro gian lận cao nhất',   intent: 'fraud_high_risk_tutors', status: 'SUCCESS', count: 2 },
      { q: '[DEMO] DROP TABLE users',                          intent: null,                    status: 'BLOCKED', count: 0 },
    ];
    for (const h of histories) {
      const before = await countWhere(db, 'admin_analytics_queries', 'question=$1', [h.q]);
      if (before) { bump('admin_analytics_queries', 'skipped'); plan('skip', 'admin_analytics_queries', h.status); continue; }
      await db.query(
        `INSERT INTO admin_analytics_queries
           (question, detected_intent, template_key, status, result_count, created_by, model_used)
         VALUES ($1,$2,$2,$3,$4,$5,'TEMPLATE_RULE_BASED')`,
        [h.q, h.intent, h.status, h.count, ids.admin]);
      bump('admin_analytics_queries', 'inserted'); plan('insert', 'admin_analytics_queries', h.status);
    }
  } else { warn('admin_analytics_queries missing — skipped'); }

  // 12) notification_outbox — SKIPPED demo rows (never queues real email/SMTP)
  if (await tableExists(db, 'notification_outbox')) {
    for (const n of [1, 2]) {
      const idk = `demo-b31:outbox:${n}`;
      const before = await countWhere(db, 'notification_outbox', 'idempotency_key=$1', [idk]);
      await db.query(
        `INSERT INTO notification_outbox
           (user_id, channel, event_type, template_key, title, body, status, idempotency_key, metadata)
         VALUES ($1,'IN_APP','demo_seed','demo_seed','[DEMO] Thông báo demo',
                 '[DEMO] Đây là bản ghi outbox demo, không gửi email.','SKIPPED',$2,$3::jsonb)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [ids.admin, idk, JSON.stringify({ demo_batch: DEMO_BATCH, demo: true })]);
      bump('notification_outbox', before ? 'skipped' : 'inserted');
      plan(before ? 'skip' : 'insert', 'notification_outbox', idk);
    }
  } else { warn('notification_outbox missing — skipped'); }

  return counts;
}

// ─── CLEANUP (apply) ─────────────────────────────────────────────────────────
// FK-safe order: children first, demo wallets before demo users last.
async function cleanupApply(db) {
  const counts = { deleted: 0, tables: {} };
  const del = async (table, whereSql, params = [], label = '') => {
    if (!(await tableExists(db, table))) { warn(`${table} missing — skipped`); return; }
    try {
      const r = await db.query(`DELETE FROM ${table} WHERE ${whereSql}`, params);
      counts.tables[table] = r.rowCount; counts.deleted += r.rowCount;
      plan('delete', table, `${r.rowCount} row(s) ${label}`);
    } catch (e) { warn(`${table} delete failed (non-fatal): ${e.message}`); }
  };

  await del('notification_outbox', `idempotency_key LIKE 'demo-b31:%'`);
  await del('admin_analytics_queries', `question LIKE '[DEMO]%'`);
  await del('admin_copilot_reports', `entity_id LIKE 'demo-b31:%'`);
  await del('fraud_intel_reports', `detection_window_key LIKE 'demo-b31:%'`);
  await del('semantic_moderation_reports', `source_id LIKE 'demo-b31:%'`);
  await del('ai_case_resolutions', `reason_summary LIKE '[DEMO-B31-%'`);
  await del('refund_logs', `metadata->>'demo_batch' = '${DEMO_BATCH}'`);
  await del('withdrawal_requests', `idempotency_key LIKE 'demo-b31:%'`);
  // disputes before transactions (dispute.transaction_id → transactions)
  await del('disputes', `transaction_id IN (SELECT id FROM transactions WHERE gateway_transaction_id LIKE 'demo-b31:%')`);
  await del('transactions', `gateway_transaction_id LIKE 'demo-b31:%'`);
  // demo profiles, then demo wallets (no cascade), then demo users last
  await del('tutor_profiles', `user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [DEMO_EMAILS]);
  await del('wallets', `user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [DEMO_EMAILS]);
  await del('users', `email = ANY($1)`, [DEMO_EMAILS], '(demo accounts)');

  return counts;
}

// ─── Dry-run reporting (read-only) ───────────────────────────────────────────
async function report(db) {
  head('Current demo-data footprint (read-only)');
  const checks = [
    ['users', `email = ANY($1)`, [DEMO_EMAILS]],
    ['semantic_moderation_reports', `source_id LIKE 'demo-b31:%'`, []],
    ['fraud_intel_reports', `detection_window_key LIKE 'demo-b31:%'`, []],
    ['ai_case_resolutions', `reason_summary LIKE '[DEMO-B31-%'`, []],
    ['admin_copilot_reports', `entity_id LIKE 'demo-b31:%'`, []],
    ['refund_logs', `metadata->>'demo_batch' = '${DEMO_BATCH}'`, []],
    ['transactions', `gateway_transaction_id LIKE 'demo-b31:%'`, []],
    ['disputes', `transaction_id IN (SELECT id FROM transactions WHERE gateway_transaction_id LIKE 'demo-b31:%')`, []],
    ['withdrawal_requests', `idempotency_key LIKE 'demo-b31:%'`, []],
    ['admin_analytics_queries', `question LIKE '[DEMO]%'`, []],
    ['notification_outbox', `idempotency_key LIKE 'demo-b31:%'`, []],
  ];
  for (const [t, w, p] of checks) {
    if (!(await tableExists(db, t))) { note(`${t.padEnd(30)} : table missing`); continue; }
    note(`${t.padEnd(30)} : ${await countWhere(db, t, w, p)} demo row(s)`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  line('════════════════════════════════════════════════════════════════════');
  line('  EduX Demo Data Tool (Batch 31)');
  line('════════════════════════════════════════════════════════════════════');

  if (!MODE) {
    warn('No mode given. Use --seed or --cleanup (add --apply to write).');
    process.exitCode = 2; return;
  }
  const gate = evaluateWriteProtection();
  line(`  Mode        : ${MODE}`);
  line(`  Write mode  : ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY (writes enabled)'}`);
  line(`  DB host     : ${gate.host}`);
  line(`  NODE_ENV    : ${process.env.NODE_ENV || '(unset)'}`);

  if (!process.env.DATABASE_URL) { warn('DATABASE_URL is not set — cannot connect.'); process.exitCode = 2; return; }

  if (APPLY && !gate.ok) {
    head('WRITE REFUSED — safety conditions not met');
    gate.reasons.forEach((r) => warn(r));
    line();
    note('Fix the above and re-run, or run in dry-run to preview safely.');
    process.exitCode = 1; return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
  const db = await pool.connect();
  try {
    await report(db);

    if (DRY_RUN) {
      head(`Planned ${MODE.toUpperCase()} operations (DRY-RUN — nothing written)`);
      if (MODE === 'seed') {
        note('Would upsert 6 demo users (@edux.local) + wallets (auto-trigger, balance 0)');
        note('Would ensure 3 approved demo tutor_profiles');
        note('Would add 3 semantic reports (EXTERNAL_PAYMENT/CRITICAL, POSITIVE/LOW, PRIVACY/MEDIUM)');
        note('Would add 3 fraud reports (EXTERNAL_PAYMENT_COLLUSION/CRITICAL, WITHDRAWAL_RISK/HIGH, REFUND_ABUSE/MEDIUM)');
        note('Would add 2 ai_case_resolutions (NEED_HUMAN_REVIEW, dry_run=true, executed=false)');
        note('Would add 2 admin_copilot_reports (advisory)');
        note('Would add 5 refund_logs (inert audit rows; NO wallet change)');
        note('Would add 3 transactions + 3 disputes (OPEN / RESOLVED_REFUND / RESOLVED_RELEASE; inert log rows)');
        note('Would add 1 PENDING withdrawal_request (inert; NO wallet change)');
        note('Would add 3 admin_analytics_queries history rows + 2 SKIPPED notification_outbox rows');
      } else {
        note('Would delete only rows tagged demo-b31 / [DEMO] / demo_batch=B31 and @edux.local accounts');
        note('Delete order is FK-safe: children → demo wallets → demo users last');
      }
      line();
      note('To actually write:  add --apply  AND  set DEMO_SEED_CONFIRM=' + CONFIRM_TOKEN);
      if (!hostLooksLocal(gate.host)) note('Remote DB detected — also set DEMO_SEED_ALLOW_REMOTE=true');
    } else {
      head(`Executing ${MODE.toUpperCase()} (writes enabled)`);
      await db.query('BEGIN');
      try {
        const result = MODE === 'seed' ? await seedApply(db) : await cleanupApply(db);
        await db.query('COMMIT');
        head('Summary');
        if (MODE === 'seed') line(`  Inserted: ${result.inserted}   Skipped (already present): ${result.skipped}`);
        else line(`  Deleted: ${result.deleted}`);
        line('  ✅ Committed.');
      } catch (e) {
        await db.query('ROLLBACK');
        head('ERROR — rolled back, no changes written');
        warn(e.message);
        process.exitCode = 1;
      }
    }
  } finally {
    db.release();
    await pool.end();
  }
  line();
}

main().catch((e) => { console.error('Fatal:', e.message); process.exitCode = 1; });
