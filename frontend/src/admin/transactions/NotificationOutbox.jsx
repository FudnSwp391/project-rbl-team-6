import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from './components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const STATUS_CFG = {
  PENDING:    { label: 'Đang chờ',    cls: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-700' },
  RETRYING:   { label: 'Đang thử lại', cls: 'bg-amber-100 text-amber-700' },
  SENT:       { label: 'Đã gửi',      cls: 'bg-emerald-100 text-emerald-700' },
  FAILED:     { label: 'Thất bại',    cls: 'bg-red-100 text-red-700' },
  SKIPPED:    { label: 'Bỏ qua',      cls: 'bg-slate-100 text-slate-600' },
  CANCELLED:  { label: 'Đã hủy',      cls: 'bg-gray-100 text-gray-500' },
}

export default function NotificationOutbox({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterEvent, setFilterEvent]   = useState('')
  const [busyId, setBusyId]     = useState(null)
  const limit = 50

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterStatus)  qs.set('status', filterStatus)
    if (filterChannel) qs.set('channel', filterChannel)
    if (filterEvent)   qs.set('eventType', filterEvent)
    fetch(`${API}/api/admin/notification-outbox?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải hàng đợi thông báo (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, filterStatus, filterChannel, filterEvent])

  useEffect(() => { load() }, [load])

  const retry = async (id) => {
    setBusyId(id)
    try {
      const r = await fetch(`${API}/api/admin/notification-outbox/${id}/retry`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.message || `Thao tác thất bại (${r.status})`); return }
      load()
    } catch (e) {
      alert('Lỗi kết nối máy chủ')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải hàng đợi thông báo...
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
  const eventTypes = [...new Set(items.map(i => i.event_type))].sort()

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Hàng Đợi Thông Báo / Email" subtitle="Theo dõi trạng thái gửi email — outbox với retry tự động, không gửi trùng lặp" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Đang chờ',    value: summary?.pending,    icon: 'hourglass_top', color: 'bg-gray-50 text-gray-600' },
          { label: 'Đang xử lý', value: summary?.processing, icon: 'sync',          color: 'bg-blue-50 text-blue-600' },
          { label: 'Đã gửi',     value: summary?.sent,       icon: 'check_circle',  color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Thất bại',   value: summary?.failed,     icon: 'error',         color: 'bg-red-50 text-red-600' },
          { label: 'Đang thử lại', value: summary?.retrying, icon: 'autorenew',     color: 'bg-amber-50 text-amber-600' },
          { label: 'Bỏ qua',     value: summary?.skipped,    icon: 'block',         color: 'bg-slate-50 text-slate-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Đang chờ</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="RETRYING">Đang thử lại</option>
          <option value="SENT">Đã gửi</option>
          <option value="FAILED">Thất bại</option>
          <option value="SKIPPED">Bỏ qua</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterChannel} onChange={e => { setFilterChannel(e.target.value); setPage(1) }}>
          <option value="">Tất cả kênh</option>
          <option value="EMAIL">Email</option>
          <option value="IN_APP">Trong ứng dụng</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterEvent} onChange={e => { setFilterEvent(e.target.value); setPage(1) }}>
          <option value="">Tất cả sự kiện (trang này)</option>
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} bản ghi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState title="Chưa có bản ghi" description="Hàng đợi thông báo/email trống." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Người nhận', 'Kênh', 'Sự kiện', 'Trạng thái', 'Số lần thử', 'Lỗi', 'Thao tác'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const st = STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
                  const canRetry = ['FAILED', 'SKIPPED', 'RETRYING'].includes(it.status)
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.recipient_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">{it.channel}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-gray-700">{it.event_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{it.attempts} / {it.max_attempts}</td>
                      <td className="py-3 px-4 text-xs text-red-500 max-w-[200px] truncate" title={it.error_message || ''}>
                        {it.error_message || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {canRetry ? (
                          <button
                            onClick={() => retry(it.id)}
                            disabled={busyId === it.id}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >Thử lại</button>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
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
        * Email được gửi bởi cron xử lý hàng đợi (mỗi phút). "Thử lại" chỉ đưa bản ghi vào hàng đợi — không gửi ngay lập tức. SMTP chưa cấu hình sẽ đánh dấu Bỏ qua thay vì lỗi.
      </p>
    </div>
  )
}
