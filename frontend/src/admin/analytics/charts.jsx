// Hand-rolled chart primitives (no chart library in this repo — see other
// admin pages for the same div/SVG convention). Step 10: auto-selected
// visualization by chart.type, dispatched from the backend's per-template
// chartType (leaderboard/line/pie/heatmap/bar).
const PALETTE = ['#00288e', '#0ea5a4', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f472b6', '#64748b']

const fmtVal = v => (typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? '—'))

export function Sparkline({ values = [], positive = true, width = 88, height = 28 }) {
  if (!values.length) return null
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : 0
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ')
  const color = positive ? '#10b981' : '#ef4444'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BarRows({ chart, ranked }) {
  const maxVal = chart.values.length ? Math.max(...chart.values, 1) : 1
  return (
    <div className="space-y-2">
      {chart.labels.map((lb, i) => (
        <div key={i} className="flex items-center gap-3">
          {ranked && <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600 truncate max-w-[70%]">{lb || '—'}</span><span className="font-semibold text-gray-800">{fmtVal(chart.values[i])}</span></div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(chart.values[i] / maxVal) * 100}%` }} /></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ chart }) {
  const W = 640, H = 220, PAD = 32
  const values = chart.values
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = (max - min) || 1
  const innerW = W - PAD * 2, innerH = H - PAD * 2
  const step = values.length > 1 ? innerW / (values.length - 1) : 0
  const pts = values.map((v, i) => [PAD + i * step, PAD + innerH - ((v - min) / range) * innerH])
  const linePoints = pts.map(p => p.join(',')).join(' ')
  const areaPoints = `${PAD},${PAD + innerH} ${linePoints} ${PAD + innerW},${PAD + innerH}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <polygon points={areaPoints} fill="#00288e" fillOpacity="0.08" />
      <polyline points={linePoints} fill="none" stroke="#00288e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#00288e" />)}
      {chart.labels.map((lb, i) => (
        <text key={i} x={PAD + i * step} y={H - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{lb}</text>
      ))}
    </svg>
  )
}

function PieChart({ chart }) {
  const total = chart.values.reduce((s, v) => s + v, 0) || 1
  let acc = 0
  const stops = chart.values.map((v, i) => {
    const start = (acc / total) * 360
    acc += v
    const end = (acc / total) * 360
    return `${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`
  })
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="w-36 h-36 rounded-full shrink-0" style={{ background: `conic-gradient(${stops.join(', ')})` }} />
      <div className="space-y-1.5 min-w-[160px]">
        {chart.labels.map((lb, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-gray-600 truncate">{lb || '—'}</span>
            <span className="font-semibold text-gray-800 ml-auto whitespace-nowrap">{fmtVal(chart.values[i])} ({Math.round((chart.values[i] / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatmapChart({ chart }) {
  const flat = chart.matrix.flat()
  const max = Math.max(...flat, 1)
  return (
    <div className="overflow-x-auto">
      <table className="text-xs" style={{ borderSpacing: 4, borderCollapse: 'separate' }}>
        <thead>
          <tr>
            <th></th>
            {chart.colLabels.map((c, i) => <th key={i} className="text-gray-500 font-semibold px-2 pb-1 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {chart.rowLabels.map((r, ri) => (
            <tr key={ri}>
              <td className="text-gray-600 font-medium pr-2 whitespace-nowrap">{r}</td>
              {chart.matrix[ri].map((v, ci) => {
                const intensity = v / max
                return (
                  <td key={ci} className="w-12 h-10 text-center rounded-lg font-bold align-middle"
                    style={{ background: `rgba(239,68,68,${0.08 + intensity * 0.72})`, color: intensity > 0.5 ? '#fff' : '#7f1d1d' }}>{v || ''}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsChart({ chart }) {
  if (!chart || !chart.type) return null
  if (chart.type === 'heatmap') return chart.matrix?.length ? <HeatmapChart chart={chart} /> : null
  if (!chart.values?.length) return null
  if (chart.type === 'pie') return <PieChart chart={chart} />
  if (chart.type === 'line') return <LineChart chart={chart} />
  return <BarRows chart={chart} ranked={chart.type === 'leaderboard'} />
}
