/**
 * Badges.jsx — Task 1.2
 * Reusable badge components for the Violation Queue UI.
 * Covers: SeverityBadge, InvestigationStatusBadge.
 * No AI score is ever rendered here.
 */

const SEVERITY_CONFIG = {
  critical: { label: 'Nghiêm trọng', bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', dot: '#dc2626' },
  high:     { label: 'Cao',          bg: '#fff7ed', color: '#9a3412', border: '#fdba74', dot: '#ea580c' },
  medium:   { label: 'Trung bình',   bg: '#fefce8', color: '#854d0e', border: '#fde047', dot: '#ca8a04' },
  low:      { label: 'Thấp',         bg: '#f0fdf4', color: '#166534', border: '#86efac', dot: '#16a34a' },
};

const INV_STATUS_CONFIG = {
  OPEN:             { label: 'Mở',               bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  INVESTIGATING:    { label: 'Đang điều tra',     bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  WAITING_TUTOR:    { label: 'Chờ gia sư',        bg: '#fff7ed', color: '#9a3412', border: '#fdba74' },
  WAITING_STUDENT:  { label: 'Chờ học sinh',      bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  RESOLVED:         { label: 'Đã giải quyết',     bg: '#f0fdf4', color: '#14532d', border: '#4ade80' },
  CLOSED:           { label: 'Đã đóng',           bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};

/** Severity badge — renders a coloured pill with a dot indicator. */
export function SeverityBadge({ severity }) {
  const key = (severity || 'low').toLowerCase();
  const cfg = SEVERITY_CONFIG[key] || SEVERITY_CONFIG.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

/** Investigation status badge — renders a coloured pill without a dot. */
export function InvestigationStatusBadge({ status }) {
  const key = (status || 'OPEN').toUpperCase();
  const cfg = INV_STATUS_CONFIG[key] || INV_STATUS_CONFIG.OPEN;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}
