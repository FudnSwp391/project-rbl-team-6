import { useEffect, useState, useCallback } from 'react'
import AnalyticsChart from './charts'
import { API_BASE_URL as API } from '../../config'

// Step 12 — each pin stores only {template_key, params}; the widget is
// re-run live on every load (via GET /pins -> runAnalyticsTemplate) so it
// never shows stale numbers, unlike a stored snapshot would.
export default function PinnedWidgets({ token, refreshKey }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API}/api/admin/analytics/pins`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load, refreshKey])

  const unpin = async (id) => {
    await fetch(`${API}/api/admin/analytics/pins/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  if (loading) return null
  if (!items || !items.length) return null

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[15px] text-primary">push_pin</span>Đã ghim
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(({ pin, result }) => (
          <div key={pin.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-gray-800">{pin.label || pin.template_key}</p>
              <button onClick={() => unpin(pin.id)} title="Bỏ ghim" className="text-gray-300 hover:text-red-500 shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{result?.summary}</p>
            {result?.chart?.type && (result.chart.values?.length > 0 || result.chart.matrix?.length > 0) && (
              <AnalyticsChart chart={result.chart} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
