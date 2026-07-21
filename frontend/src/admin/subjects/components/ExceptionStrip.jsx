// Aggregates outstanding work across every subject into one line. Renders null
// when there is nothing to do — an always-present amber bar would train admins
// to ignore it, which defeats the purpose.
export default function ExceptionStrip({ subjects, onReview }) {
  const withPending = subjects.filter(s => (s.pending_count || 0) > 0)
  if (!withPending.length) return null

  const total = withPending.reduce((n, s) => n + s.pending_count, 0)
  const names = withPending.slice(0, 3).map(s => s.name).join(', ')
  const more  = withPending.length - 3

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl
                    bg-amber-50 border border-amber-200 text-sm">
      <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">
        pending_actions
      </span>
      <p className="text-amber-900 min-w-0">
        <b className="font-semibold">{total} khóa học</b> đang chờ duyệt ở{' '}
        <b className="font-semibold">{withPending.length} môn</b>
        <span className="text-amber-700"> — {names}{more > 0 ? ` và ${more} môn khác` : ''}</span>
      </p>
      <button
        onClick={onReview}
        className="ml-auto shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg
                   text-amber-900 hover:bg-amber-100 transition-colors
                   flex items-center gap-1"
      >
        Xem tất cả
        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
      </button>
    </div>
  )
}
