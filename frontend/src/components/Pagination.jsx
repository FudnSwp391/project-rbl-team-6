/**
 * Pagination.jsx — Thanh phân trang đơn giản. Ẩn nếu chỉ 1 trang.
 */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  const btn = (key, label, { active = false, disabled = false, onClick } = {}) => (
    <button
      key={key}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 38, height: 38, padding: '0 10px', borderRadius: 10,
        border: active ? '1px solid var(--primary, #00288e)' : '1px solid var(--outline-variant, #d0d3d9)',
        background: active ? 'var(--primary, #00288e)' : '#fff',
        color: active ? '#fff' : 'var(--on-surface-variant, #444653)',
        fontWeight: 700, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all .15s ease',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28, flexWrap: 'wrap' }}>
      {btn('prev', '‹', { disabled: page <= 1, onClick: () => onChange(page - 1) })}
      {pages.map(p => btn(p, p, { active: p === page, onClick: () => onChange(p) }))}
      {btn('next', '›', { disabled: page >= totalPages, onClick: () => onChange(page + 1) })}
    </div>
  )
}
