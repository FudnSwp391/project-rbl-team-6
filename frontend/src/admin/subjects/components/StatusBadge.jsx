import { statusMeta } from '../subjectMeta'

export default function StatusBadge({ status, size = 'sm' }) {
  const m = statusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md ring-1 font-medium whitespace-nowrap
        ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${m.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}
