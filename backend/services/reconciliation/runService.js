// ── Reconciliation Runs (Batch 40, spec Module 13) ───────────────────────────
// GET /api/admin/financial/reconciliation stays passive/unchanged (Batch 37) —
// only an explicit POST .../run persists a snapshot here, so simply viewing
// the page can never inflate run history.
const { computeReconciliation } = require('./computeReconciliation');

async function runReconciliation(pool, performedBy) {
  const startedAt = Date.now();
  const result = await computeReconciliation(pool);
  const durationMs = Date.now() - startedAt;

  const differenceCount = result.checks.filter(c => c.difference !== 0).length;
  const issueCount = result.summary.issue_count;
  const status = (issueCount > 0 || result.summary.unmatched_count > 0) ? 'ISSUES_FOUND' : 'OK';

  const runRes = await pool.query(
    `INSERT INTO reconciliation_runs (status, difference_count, issue_count, duration_ms, performed_by, snapshot)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, status, difference_count, issue_count, duration_ms, created_at`,
    [status, differenceCount, issueCount, durationMs, performedBy, JSON.stringify(result)]
  );
  return { run: runRes.rows[0], result };
}

async function listRuns(pool, { page = 1, perPage = 20 } = {}) {
  const safePerPage = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safePerPage;

  const rows = await pool.query(
    `SELECT r.id, r.status, r.difference_count, r.issue_count, r.duration_ms, r.created_at,
            u.full_name AS performed_by_name, u.email AS performed_by_email
     FROM reconciliation_runs r LEFT JOIN users u ON u.id = r.performed_by
     ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
    [safePerPage, offset]
  );
  const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM reconciliation_runs`);
  return { runs: rows.rows, total: countRes.rows[0].count, page: safePage, per_page: safePerPage };
}

async function getLastRun(pool) {
  const res = await pool.query(
    `SELECT id, status, difference_count, issue_count, duration_ms, created_at FROM reconciliation_runs ORDER BY created_at DESC LIMIT 1`
  );
  return res.rows[0] || null;
}

module.exports = { runReconciliation, listRuns, getLastRun };
