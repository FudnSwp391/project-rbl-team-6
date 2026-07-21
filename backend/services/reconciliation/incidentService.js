// ── Incident Management (Batch 40, spec Module 10) ───────────────────────────
// Plain CRUD over reconciliation_incidents / reconciliation_incident_comments
// (Batch 37). Never touches wallets/transactions — incidents are a tracking
// record only, per the "suggest, never modify balances" requirement.

async function createIncident(pool, {
  findingKey, title, description, differenceAmount, rootCause,
  relatedBookingId, relatedTransactionIds, severity, assignedDeveloper, createdBy,
}) {
  const res = await pool.query(
    `INSERT INTO reconciliation_incidents
       (finding_key, title, description, difference_amount, root_cause,
        related_booking_id, related_transaction_ids, severity, assigned_developer, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [findingKey || null, title, description || null, differenceAmount ?? null, rootCause || null,
     relatedBookingId || null, relatedTransactionIds || [], severity || 'MEDIUM', assignedDeveloper || null, createdBy]
  );
  return res.rows[0];
}

async function listIncidents(pool, { status, severity, findingKey, page = 1, perPage = 20 } = {}) {
  const conds = []; const params = []; let i = 1;
  if (status)     { conds.push(`status = $${i++}`);      params.push(status); }
  if (severity)   { conds.push(`severity = $${i++}`);    params.push(severity); }
  if (findingKey) { conds.push(`finding_key = $${i++}`); params.push(findingKey); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const safePerPage = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safePerPage;

  const rows = await pool.query(
    `SELECT * FROM reconciliation_incidents ${where} ORDER BY created_at DESC LIMIT ${safePerPage} OFFSET ${offset}`,
    params
  );
  const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM reconciliation_incidents ${where}`, params);
  return { incidents: rows.rows, total: countRes.rows[0].count, page: safePage, per_page: safePerPage };
}

async function getIncident(pool, id) {
  const incRes = await pool.query(`SELECT * FROM reconciliation_incidents WHERE id = $1`, [id]);
  if (!incRes.rows.length) return null;
  const commentsRes = await pool.query(
    `SELECT c.id, c.content, c.admin_id, u.full_name AS admin_name, c.created_at
     FROM reconciliation_incident_comments c JOIN users u ON u.id = c.admin_id
     WHERE c.incident_id = $1 ORDER BY c.created_at ASC`,
    [id]
  );
  return { incident: incRes.rows[0], comments: commentsRes.rows };
}

const PATCHABLE_FIELDS = [
  'title', 'description', 'difference_amount', 'root_cause',
  'related_booking_id', 'related_transaction_ids', 'severity', 'assigned_developer', 'status',
];

async function updateIncident(pool, id, patch) {
  const sets = []; const params = [id]; let i = 2;
  for (const key of PATCHABLE_FIELDS) {
    if (patch[key] !== undefined) { sets.push(`${key} = $${i++}`); params.push(patch[key]); }
  }
  if (sets.length === 0) {
    const current = await pool.query(`SELECT * FROM reconciliation_incidents WHERE id = $1`, [id]);
    return current.rows[0] || null;
  }
  sets.push('updated_at = NOW()');
  const res = await pool.query(
    `UPDATE reconciliation_incidents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function addComment(pool, incidentId, adminId, content) {
  const res = await pool.query(
    `INSERT INTO reconciliation_incident_comments (incident_id, admin_id, content) VALUES ($1,$2,$3) RETURNING *`,
    [incidentId, adminId, content]
  );
  return res.rows[0];
}

module.exports = { createIncident, listIncidents, getIncident, updateIncident, addComment };
