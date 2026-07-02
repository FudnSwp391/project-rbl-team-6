import { useState, useEffect } from 'react'
import { PageHeader } from './components'

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'
const VALID_RANGES = ['6m', '12m', 'ytd']
const RANGE_LABELS  = { '6m': '6 Tháng', '12m': '12 Tháng', 'ytd': 'Năm Nay' }

const fmtM = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')

function RevenueSummaryCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function PlatformRevenue({ token }) {
  const [activeTab, setActiveTab] = useState('monthly')
  const [range,     setRange]     = useState('6m')
  const [series,    setSeries]    = useState([])
  const [bySubject, setBySubject] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/financial/revenue-series?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setSeries(data.series || [])
        setBySubject(data.by_subject || [])
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token, range])

  const totalRevenue  = series.reduce((s, m) => s + m.revenue, 0)
  const totalNet      = series.reduce((s, m) => s + m.net, 0)
  const totalRefunds  = series.reduce((s, m) => s + m.refunds, 0)
  const bestMonth     = series.reduce((best, m) => m.net > (best?.net ?? -1) ? m : best, null)
  const maxMonthRev   = series.length ? Math.max(...series.map(m => m.revenue), 1) : 1
  const maxSubjectRev = bySubject.length ? Math.max(...bySubject.map(s => s.revenue), 1) : 1

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Doanh Thu Nền Tảng" subtitle="Theo dõi doanh thu nền tảng theo nhiều chiều phân tích">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <RevenueSummaryCard label="Tổng Doanh Thu"  value={loading ? '—' : fmtM(totalRevenue)} sub={`${RANGE_LABELS[range]} gần nhất`} icon="payments"      color="bg-blue-50 text-blue-600" />
        <RevenueSummaryCard label="Doanh Thu Ròng"  value={loading ? '—' : fmtM(totalNet)}     sub="Sau hoàn tiền"                     icon="trending_up"  color="bg-emerald-50 text-emerald-600" />
        <RevenueSummaryCard label="Tổng Hoàn Tiền"  value={loading ? '—' : fmtM(totalRefunds)} sub="Đã xử lý"                           icon="undo"         color="bg-red-50 text-red-600" />
        <RevenueSummaryCard label="Tháng Tốt Nhất"  value={loading ? '—' : fmtM(bestMonth?.net ?? 0)} sub={bestMonth?.label ?? '—'}    icon="emoji_events" color="bg-amber-50 text-amber-600" />
      </div>

      {/* Range selector + tab switcher */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {[['monthly', 'Theo Tháng'], ['subject', 'Theo Môn Học']].map(([v, l]) => (
            <button key={v} onClick={() => setActiveTab(v)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {VALID_RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Doanh Thu Theo Tháng</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
            ) : series.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu doanh thu.</div>
            ) : (
              <div className="flex items-end gap-3 h-48 mb-4">
                {series.map(m => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col-reverse" style={{ height: '160px' }}>
                      <div className="w-full bg-red-100 rounded-b"
                        style={{ height: `${(m.refunds / maxMonthRev) * 160}px` }}
                        title={`Hoàn tiền: ${fmtM(m.refunds)}`} />
                      <div className="w-full bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors rounded-t"
                        style={{ height: `${Math.max(0, ((m.revenue - m.refunds) / maxMonthRev) * 160)}px` }}
                        title={`Doanh thu: ${fmtM(m.revenue)}`} />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!loading && series.length > 0 && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Tháng', 'Doanh Thu', 'Hoàn Tiền', 'Doanh Thu Ròng', 'Tăng Trưởng'].map(h => (
                    <th key={h} className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {series.map((m, i) => {
                  const prev   = series[i - 1]
                  const growth = prev && prev.net > 0 ? (((m.net - prev.net) / prev.net) * 100).toFixed(1) : null
                  return (
                    <tr key={m.label} className="hover:bg-gray-50">
                      <td className="py-3.5 px-6 text-sm font-semibold text-gray-900">{m.label}</td>
                      <td className="py-3.5 px-6 text-sm font-bold text-blue-600">{fmtM(m.revenue)}</td>
                      <td className="py-3.5 px-6 text-sm font-semibold text-red-500">{m.refunds > 0 ? `-${fmtM(m.refunds)}` : '—'}</td>
                      <td className="py-3.5 px-6 text-sm font-bold text-emerald-600">{fmtM(m.net)}</td>
                      <td className="py-3.5 px-6">
                        {growth !== null && (
                          <span className={`text-sm font-bold ${Number(growth) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {Number(growth) >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'subject' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Doanh Thu Theo Môn Học</h3>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)
            ) : bySubject.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">Chưa có dữ liệu doanh thu theo môn học.</div>
            ) : (
              bySubject.map(s => (
                <div key={s.subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700">{s.subject}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{fmtM(s.revenue)}</span>
                      <span className="text-xs text-gray-400 ml-2">{s.txCount} GD</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.revenue / maxSubjectRev) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
