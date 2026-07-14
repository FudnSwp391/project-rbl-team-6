import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from './components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const EVENT_CFG = {
  EARNED:   { label: 'Đã thu', cls: 'bg-emerald-100 text-emerald-700' },
  REVERSED: { label: 'Hoàn lại', cls: 'bg-red-100 text-red-700' },
  ADJUSTED: { label: 'Điều chỉnh', cls: 'bg-amber-100 text-amber-700' },
}

export default function CommissionLogs({ token }) {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [page, setPage]               = useState(1)
  const [filterEvent, setFilterEvent] = useState('')
  const [filterReason, setFilterReason] = useState('')
  const limit = 50

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterEvent)  qs.set('eventType',   filterEvent)
    if (filterReason) qs.set('reasonCode',  filterReason)
    fetch(`${API}/api/admin/commission-logs?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải nhật ký hoa hồng (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, filterEvent, filterReason])

  useEffect(() => { load() }, [load])

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải nhật ký hoa hồng...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { items, pagination, summary } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))
  const reasonCodes = [...new Set(items.map(i => i.reason_code))].sort()

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Nhật Ký Hoa Hồng" subtitle="Bản ghi kinh doanh append-only — hoa hồng nền tảng theo Commission Policy V1" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">payments</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Tổng doanh thu gộp</p>
          <p className="text-lg font-bold text-gray-900">{fmtMoney(summary?.gross_earned)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hoa hồng đã thu</p>
          <p className="text-lg font-bold text-emerald-700">{fmtMoney(summary?.commission_earned)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">trending_down</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hoa hồng hoàn lại</p>
          <p className="text-lg font-bold text-red-600">{fmtMoney(summary?.commission_reversed)}</p>
        </div>
        <div className={`rounded-xl p-5 shadow-sm border ${summary?.net_commission >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hoa hồng ròng</p>
          <p className={`text-lg font-bold ${summary?.net_commission >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtMoney(summary?.net_commission)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterEvent}
          onChange={e => { setFilterEvent(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả loại</option>
          <option value="EARNED">Đã thu</option>
          <option value="REVERSED">Hoàn lại</option>
          <option value="ADJUSTED">Điều chỉnh</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterReason}
          onChange={e => { setFilterReason(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả lý do (trang này)</option>
          {reasonCodes.map(rc => <option key={rc} value={rc}>{rc}</option>)}
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} bản ghi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState title="Chưa có nhật ký" description="Hoa hồng sẽ được ghi tự động khi có giao dịch giải ngân/hoàn tiền." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Loại', 'Lý do', 'Học sinh', 'Gia sư', 'Doanh thu gộp', 'Hoa hồng (10%)', 'Gia sư nhận', 'Nguồn'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const ev = EVENT_CFG[it.event_type] || { label: it.event_type, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ev.cls}`}>{ev.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-gray-700">{it.reason_code}</span>
                        {it.source_type && <div className="text-[10px] text-gray-400">{it.source_type}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.student_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.student_email || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.tutor_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.tutor_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.gross_amount)}</td>
                      <td className={`py-3 px-4 text-sm font-bold whitespace-nowrap ${it.event_type === 'REVERSED' ? 'text-red-600' : 'text-emerald-700'}`}>
                        {it.event_type === 'REVERSED' ? '-' : '+'}{fmtMoney(it.commission_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">{fmtMoney(it.tutor_amount)}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{it.decision_by}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >← Trước</button>
          <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >Sau →</button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Nhật ký append-only theo Commission Policy V1. Hoa hồng nền tảng 10% được ghi tự động khi giải ngân/hoàn tiền.
      </p>
    </div>
  )
}
