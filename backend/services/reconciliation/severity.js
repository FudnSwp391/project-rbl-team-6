// ── Severity classification (Batch 37, spec Module 8) ────────────────────────
// Thresholds are in absolute VND. Extends the shared StatusBadge/STATUS_CONFIG
// system on the frontend (frontend/src/admin/transactions/components.jsx)
// rather than introducing a second parallel badge scheme.
const THRESHOLDS = [
  { max: 10000,    level: 'INFO' },
  { max: 100000,   level: 'LOW' },
  { max: 500000,   level: 'MEDIUM' },
  { max: 1000000,  level: 'HIGH' },
];

function computeSeverity(amount) {
  const abs = Math.abs(Number(amount) || 0);
  for (const t of THRESHOLDS) {
    if (abs < t.max) return t.level;
  }
  return 'CRITICAL';
}

module.exports = { computeSeverity };
