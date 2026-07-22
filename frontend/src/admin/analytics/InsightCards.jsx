import { useEffect, useState } from 'react'
import { Sparkline } from './charts'
import { API_BASE_URL as API } from '../../config'

// Step 2.2 — fixed KPI cards shown above query results, independent of what
// the admin asked. "Up" doesn't always mean "good": more revenue is good,
// more refunds/complaints/fraud is bad — GOOD_UP encodes that per card so the
// color/arrow reads correctly instead of always painting "up" green.
const GOOD_UP = { revenue: true, refund: false, complaints: false, fraud: false }
const ICONS = { revenue: 'payments', refund: 'currency_exchange', complaints: 'report', fraud: 'gpp_maybe' }
const RISK_CFG = {
  LOW: { label: 'Rủi ro thấp', cls: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { label: 'Rủi ro trung bình', cls: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'Rủi ro cao', cls: 'bg-red-100 text-red-700' },
}

function fmtCardValue(v, type) {
  const n = Number(v) || 0
  return type === 'currency' ? n.toLocaleString('vi-VN') + 'đ' : n.toLocaleString('vi-VN')
}

export default function InsightCards({ token }) {
  const [cards, setCards] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/admin/analytics/insight-cards`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => setCards(d.cards || []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-28 animate-pulse" />)}
      </div>
    )
  }
  if (!cards || !cards.length) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => {
        const hasTrend = c.trend_pct != null
        const up = hasTrend && c.trend_pct >= 0
        const goodUp = GOOD_UP[c.key] !== false
        const isGood = hasTrend ? (up === goodUp) : null
        const trendCls = isGood === null ? 'text-gray-400' : isGood ? 'text-emerald-600' : 'text-red-600'
        const risk = c.risk_level ? RISK_CFG[c.risk_level] : null
        return (
          <div key={c.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase truncate">
                <span className="material-symbols-outlined text-[16px] text-primary">{ICONS[c.key] || 'analytics'}</span>{c.label}
              </span>
              {risk && <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${risk.cls}`}>{risk.label}</span>}
            </div>
            <p className="text-xl font-bold text-gray-900">{fmtCardValue(c.value, c.value_type)}</p>
            <div className="flex items-end justify-between mt-1.5">
              <div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${trendCls}`}>
                  {hasTrend && <span className="material-symbols-outlined text-[14px]">{up ? 'arrow_upward' : 'arrow_downward'}</span>}
                  {hasTrend ? `${Math.abs(c.trend_pct)}%` : '—'}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{c.comparison_label}</p>
              </div>
              <Sparkline values={c.sparkline} positive={isGood !== false} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
