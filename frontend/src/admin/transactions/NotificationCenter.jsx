import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from './components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtDate = iso =>
  iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' +
        new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const RAW_TYPE_LABEL = {
  course_enrollment: 'Đăng ký khóa học',
  course_refund:     'Hoàn tiền khóa học',
  lesson_completed:  'Buổi học hoàn thành',
  escrow_hold:       'Giữ tiền Escrow',
  cancellation:      'Hủy lịch học',
  new_message:       'Tin nhắn mới',
  refund:            'Hoàn tiền',
}

const RAW_TYPE_ICON = {
  course_enrollment: { icon: 'school',           color: 'text-blue-600 bg-blue-50' },
  course_refund:     { icon: 'undo',             color: 'text-sky-600 bg-sky-50' },
  lesson_completed:  { icon: 'check_circle',     color: 'text-emerald-600 bg-emerald-50' },
  escrow_hold:       { icon: 'savings',          color: 'text-purple-600 bg-purple-50' },
  cancellation:      { icon: 'cancel',           color: 'text-red-600 bg-red-50' },
  new_message:       { icon: 'chat',             color: 'text-gray-600 bg-gray-50' },
  refund:            { icon: 'currency_exchange', color: 'text-amber-600 bg-amber-50' },
}

const STATUS_CFG = {
  read:    { label: 'Đã đọc',   cls: 'bg-emerald-100 text-emerald-700' },
  unread:  { label: 'Chưa đọc', cls: 'bg-amber-100 text-amber-700' },
  unknown: { label: '—',        cls: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_CFG = {
  high:   { label: 'Cao',        cls: 'bg-red-100 text-red-700' },
  medium: { label: 'Trung bình', cls: 'bg-amber-100 text-amber-700' },
  low:    { label: 'Thấp',       cls: 'bg-gray-100 text-gray-500' },
}

const ROLE_LABEL = { student: 'Học sinh', tutor: 'Gia sư', admin: 'Admin' }

export default function NotificationCenter({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filterType, setFilterType]     = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/notifications?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải thông báo (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải thông báo...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { summary, notifications } = data

  const rawTypes = Object.keys(summary.type_counts || {})

  const filtered = notifications.filter(n => {
    if (filterType !== 'all' && n.raw_type !== filterType) return false
    if (filterStatus !== 'all' && n.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (n.title || '').toLowerCase().includes(q) ||
        (n.recipient_name || '').toLowerCase().includes(q) ||
        (n.recipient_email || '').toLowerCase().includes(q) ||
        (n.raw_type || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Trung Tâm Thông Báo"
        subtitle="Lịch sử thông báo hệ thống — chỉ xem, không gửi"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng thông báo', value: summary.total,        icon: 'notifications',   color: 'bg-blue-50 text-blue-600' },
          { label: 'Chưa đọc',       value: summary.unread_count,  icon: 'mark_email_unread', color: 'bg-amber-50 text-amber-600' },
          { label: 'Đã đọc',         value: summary.read_count,    icon: 'mark_email_read', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Loại thông báo', value: rawTypes.length,       icon: 'category',        color: 'bg-purple-50 text-purple-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(summary.type_counts || {}).map(([t, cnt]) => (
          <span key={t} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
            {RAW_TYPE_LABEL[t] || t}: {cnt}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Tìm tiêu đề, người nhận..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Tất cả loại</option>
          {rawTypes.map(t => (
            <option key={t} value={t}>{RAW_TYPE_LABEL[t] || t}</option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="unread">Chưa đọc</option>
          <option value="read">Đã đọc</option>
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{filtered.length} thông báo</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState title="Không có thông báo" description="Không tìm thấy thông báo phù hợp." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Loại', 'Tiêu Đề / Nội Dung', 'Người Nhận', 'Trạng Thái', 'Ưu Tiên', 'Thời Gian'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(n => {
                  const icfg = RAW_TYPE_ICON[n.raw_type] || { icon: 'notifications', color: 'text-gray-600 bg-gray-50' }
                  const scfg = STATUS_CFG[n.status]   || STATUS_CFG.unknown
                  const pcfg = PRIORITY_CFG[n.priority] || PRIORITY_CFG.low
                  return (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${icfg.color} flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined text-[14px]">{icfg.icon}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                            {RAW_TYPE_LABEL[n.raw_type] || n.raw_type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-sm font-semibold text-gray-900 truncate" title={n.title}>{n.title}</div>
                        <div className="text-xs text-gray-400 truncate" title={n.message}>{n.message}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{n.recipient_name || '—'}</div>
                        <div className="text-xs text-gray-400">{n.recipient_email || ''}</div>
                        {n.recipient_role && (
                          <span className="text-[10px] text-gray-400">{ROLE_LABEL[n.recipient_role] || n.recipient_role}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${scfg.cls}`}>
                          {scfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${pcfg.cls}`}>
                          {pcfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(n.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Dữ liệu từ bảng <code>notifications</code>. Hệ thống không gửi, tạo, xóa hay cập nhật thông báo từ trang này.
      </p>
    </div>
  )
}
