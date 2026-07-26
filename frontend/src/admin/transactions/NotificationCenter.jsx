import { useState, useEffect } from 'react'
import { PageHeader, EmptyState, ModalOverlay } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtDate = iso =>
  iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' +
        new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const RAW_TYPE_LABEL = {
  // Lịch học / buổi học
  lesson_reminder:        'Nhắc lịch học',
  upcoming_lesson:        'Sắp đến giờ học',
  booking_request:        'Yêu cầu đặt lịch',
  booking_approved:       'Đã duyệt lịch học',
  booking_declined:       'Từ chối lịch học',
  cancellation:           'Hủy lịch học',
  attendance:             'Điểm danh',
  lesson_completed:       'Buổi học hoàn thành',
  student_absent:         'Học sinh báo vắng',
  session_info:           'Thông tin buổi học',
  method_change:          'Đổi hình thức dạy',
  instant_accepted:       'Gia sư nhận Học Ngay',
  reschedule_requested:   'Yêu cầu đổi lịch',
  reschedule_accepted:    'Đã đồng ý đổi lịch',
  // Tranh chấp
  dispute_opened:          'Mở tranh chấp',
  dispute_tutor_responded: 'Gia sư phản hồi tranh chấp',
  dispute_resolved_release: 'Tranh chấp: giải ngân gia sư',
  dispute_resolved_refund: 'Tranh chấp: hoàn tiền học sinh',
  dispute_withdrawn:       'Rút tranh chấp',
  // Khiếu nại dịch vụ
  new_complaint:      'Khiếu nại mới',
  complaint_update:   'Cập nhật khiếu nại',
  complaint_penalty:  'Khiếu nại: xử phạt',
  // Hỗ trợ
  support_request: 'Yêu cầu hỗ trợ',
  // Khóa học
  course_enrollment: 'Đăng ký khóa học',
  course_purchased:  'Mua khóa học',
  course_refund:     'Hoàn tiền khóa học',
  // Tiền / ví
  escrow_hold:      'Giữ tiền Escrow',
  escrow_released:  'Đã giải ngân Escrow',
  refund:           'Hoàn tiền',
  wallet_topup:     'Nạp tiền ví',
  // Khác
  new_message:            'Tin nhắn mới',
  welcome:                'Chào mừng',
  admin_alert:            'Cảnh báo admin',
  tutor_profile_approved: 'Duyệt hồ sơ gia sư',
  generic:                'Thông báo chung',
}

const RAW_TYPE_ICON = {
  lesson_reminder:        { icon: 'alarm',            color: 'text-blue-600 bg-blue-50' },
  upcoming_lesson:        { icon: 'schedule',          color: 'text-blue-600 bg-blue-50' },
  booking_request:        { icon: 'event_available',   color: 'text-indigo-600 bg-indigo-50' },
  booking_approved:       { icon: 'event_available',   color: 'text-emerald-600 bg-emerald-50' },
  booking_declined:       { icon: 'event_busy',        color: 'text-red-600 bg-red-50' },
  cancellation:           { icon: 'cancel',            color: 'text-red-600 bg-red-50' },
  attendance:             { icon: 'fact_check',        color: 'text-emerald-600 bg-emerald-50' },
  lesson_completed:       { icon: 'check_circle',      color: 'text-emerald-600 bg-emerald-50' },
  student_absent:         { icon: 'event_busy',        color: 'text-amber-600 bg-amber-50' },
  session_info:           { icon: 'info',              color: 'text-gray-600 bg-gray-50' },
  method_change:          { icon: 'swap_horiz',        color: 'text-purple-600 bg-purple-50' },
  instant_accepted:       { icon: 'bolt',              color: 'text-amber-600 bg-amber-50' },
  reschedule_requested:   { icon: 'event_repeat',      color: 'text-indigo-600 bg-indigo-50' },
  reschedule_accepted:    { icon: 'event_repeat',      color: 'text-emerald-600 bg-emerald-50' },
  dispute_opened:          { icon: 'gavel',            color: 'text-red-600 bg-red-50' },
  dispute_tutor_responded: { icon: 'forum',            color: 'text-amber-600 bg-amber-50' },
  dispute_resolved_release:{ icon: 'gavel',            color: 'text-emerald-600 bg-emerald-50' },
  dispute_resolved_refund: { icon: 'gavel',            color: 'text-sky-600 bg-sky-50' },
  dispute_withdrawn:       { icon: 'undo',             color: 'text-gray-600 bg-gray-50' },
  new_complaint:      { icon: 'report_problem', color: 'text-amber-600 bg-amber-50' },
  complaint_update:   { icon: 'report_problem', color: 'text-amber-600 bg-amber-50' },
  complaint_penalty:  { icon: 'gavel',          color: 'text-red-600 bg-red-50' },
  support_request: { icon: 'support_agent', color: 'text-violet-600 bg-violet-50' },
  course_enrollment: { icon: 'school', color: 'text-blue-600 bg-blue-50' },
  course_purchased:  { icon: 'shopping_cart', color: 'text-blue-600 bg-blue-50' },
  course_refund:     { icon: 'undo', color: 'text-sky-600 bg-sky-50' },
  escrow_hold:      { icon: 'savings',           color: 'text-purple-600 bg-purple-50' },
  escrow_released:  { icon: 'lock_open',         color: 'text-emerald-600 bg-emerald-50' },
  refund:           { icon: 'currency_exchange', color: 'text-amber-600 bg-amber-50' },
  wallet_topup:     { icon: 'account_balance_wallet', color: 'text-emerald-600 bg-emerald-50' },
  new_message:            { icon: 'chat',      color: 'text-gray-600 bg-gray-50' },
  welcome:                { icon: 'celebration', color: 'text-pink-600 bg-pink-50' },
  admin_alert:            { icon: 'warning',    color: 'text-red-600 bg-red-50' },
  tutor_profile_approved: { icon: 'verified',   color: 'text-emerald-600 bg-emerald-50' },
  generic:                { icon: 'notifications', color: 'text-gray-600 bg-gray-50' },
}

const STATUS_CFG = {
  read:    { label: 'Đã đọc',   cls: 'bg-emerald-100 text-emerald-700' },
  unread:  { label: 'Chưa đọc', cls: 'bg-amber-100 text-amber-700' },
  unknown: { label: '—',        cls: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_CFG = {
  critical: { label: 'Khẩn cấp',   cls: 'bg-red-100 text-red-700' },
  high:     { label: 'Cao',        cls: 'bg-orange-100 text-orange-700' },
  normal:   { label: 'Bình thường', cls: 'bg-blue-50 text-blue-600' },
  medium:   { label: 'Trung bình', cls: 'bg-amber-100 text-amber-700' },
  low:      { label: 'Thấp',       cls: 'bg-gray-100 text-gray-500' },
}

const ROLE_LABEL = { student: 'Học sinh', tutor: 'Gia sư', admin: 'Admin' }

export default function NotificationCenter({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filterType, setFilterType]     = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch]     = useState('')
  const [viewing, setViewing]   = useState(null)

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
                    <tr key={n.id} onClick={() => setViewing(n)} className="hover:bg-gray-50 transition-colors cursor-pointer">
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
                        <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                        <div className="text-xs text-gray-400 truncate">{n.message}</div>
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

      {viewing && (() => {
        const icfg = RAW_TYPE_ICON[viewing.raw_type] || { icon: 'notifications', color: 'text-gray-600 bg-gray-50' }
        const scfg = STATUS_CFG[viewing.status]   || STATUS_CFG.unknown
        const pcfg = PRIORITY_CFG[viewing.priority] || PRIORITY_CFG.low
        return (
          <ModalOverlay onClose={() => setViewing(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-w-[90vw] max-h-[85vh] flex flex-col">
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${icfg.color} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]">{icfg.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase">{RAW_TYPE_LABEL[viewing.raw_type] || viewing.raw_type}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{viewing.title}</p>
                  </div>
                </div>
                <button onClick={() => setViewing(null)} className="w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${scfg.cls}`}>{scfg.label}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${pcfg.cls}`}>Ưu tiên: {pcfg.label}</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Nội dung đầy đủ</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{viewing.message || '(Không có nội dung)'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Người nhận</p>
                  <p className="text-sm text-gray-800">{viewing.recipient_name || '—'} {viewing.recipient_email ? `(${viewing.recipient_email})` : ''}</p>
                  {viewing.recipient_role && <p className="text-xs text-gray-400">{ROLE_LABEL[viewing.recipient_role] || viewing.recipient_role}</p>}
                </div>
                {(viewing.ref_type || viewing.ref_id) && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Liên kết tới</p>
                    <p className="text-sm text-gray-800 font-mono">{viewing.ref_type}{viewing.ref_id ? ` #${String(viewing.ref_id).slice(0, 8)}` : ''}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Thời gian</p>
                  <p className="text-sm text-gray-800">{fmtDate(viewing.created_at)}</p>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )
      })()}

      <p className="text-xs text-gray-400 mt-4 italic">
        * Dữ liệu từ bảng <code>notifications</code>. Hệ thống không gửi, tạo, xóa hay cập nhật thông báo từ trang này.
      </p>
    </div>
  )
}
