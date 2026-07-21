// Minimal table shared by the list tabs. Deliberately not generic beyond what
// these three tabs need.
export default function DataTable({ columns, rows, empty, emptyIcon = 'inbox' }) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-low grid place-items-center mb-3">
          <span className="material-symbols-outlined text-[28px] text-outline">{emptyIcon}</span>
        </div>
        <p className="text-sm text-on-surface-variant">{empty}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-outline-variant">
            {columns.map(c => (
              <th key={c.key}
                className={`py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide
                            text-on-surface-variant ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}
                className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low/60 transition-colors">
              {columns.map(c => (
                <td key={c.key}
                  className={`py-3 px-4 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
