// Hand-rolled SVG bars. Deliberately bars and not an area/line chart: real
// growth data here contains single-day spikes, and a smoothed curve overshoots
// below zero on those. No dependency, no smoothing, no guessing between points.
export default function BarChart({
  data = [],           // [{ label, value }]
  format = v => v,
  barClass = 'fill-primary',
  height = 160,
  emptyText = 'Chưa có dữ liệu',
}) {
  const total = data.reduce((n, d) => n + (d.value || 0), 0)
  if (!data.length || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center"
           style={{ height }}>
        <span className="material-symbols-outlined text-[28px] text-outline">bar_chart</span>
        <p className="text-xs text-on-surface-variant">{emptyText}</p>
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.value || 0))
  const plot = height - 28   // leave room for the label row

  return (
    <div style={{ height }} className="flex items-end gap-2">
      {data.map((d, i) => {
        const v = d.value || 0
        // Non-zero values keep a 2px stub so "small" never reads as "none".
        const h = v === 0 ? 0 : Math.max(2, Math.round((v / max) * plot))
        return (
          <div key={d.label || i} className="flex-1 flex flex-col items-center justify-end gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold text-on-surface tabular-nums leading-none">
              {v === 0 ? '' : format(v)}
            </span>
            <div
              className={`w-full rounded-t ${barClass} transition-[height] duration-500 ease-out
                          motion-reduce:transition-none`}
              style={{ height: h }}
              title={`${d.label}: ${format(v)}`}
            />
            {/* No truncate: a clipped "16/06" renders as "16/..." and reads as a bug. */}
            <span className="text-[10px] text-on-surface-variant whitespace-nowrap leading-none">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
