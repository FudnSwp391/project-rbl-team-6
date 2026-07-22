// A KPI whose value is null means "no data", not "zero". Those render an em
// dash and a muted note rather than a confident 0, so an admin never mistakes
// an empty dataset for a real measurement.
export default function KpiCard({ label, value, unit, icon, hint, tone = 'default', onClick }) {
  const empty = value === null || value === undefined
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-xl border p-4 transition
        ${tone === 'warn' && !empty
          ? 'border-amber-300 ring-1 ring-amber-100'
          : 'border-outline-variant'}
        ${onClick ? 'hover:border-outline hover:shadow-sm cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`material-symbols-outlined text-[16px]
          ${tone === 'warn' && !empty ? 'text-amber-600' : 'text-on-surface-variant'}`}>
          {icon}
        </span>
        <span className="text-[11px] font-medium text-on-surface-variant">{label}</span>
      </div>

      {empty ? (
        <>
          <p className="text-2xl font-bold text-outline leading-none">—</p>
          <p className="text-[11px] text-on-surface-variant mt-1.5">Chưa có dữ liệu</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-on-surface leading-none tabular-nums">
            {value}
            {unit && <span className="text-sm font-semibold text-on-surface-variant ml-1">{unit}</span>}
          </p>
          {hint && <p className="text-[11px] text-on-surface-variant mt-1.5">{hint}</p>}
        </>
      )}
    </Tag>
  )
}
