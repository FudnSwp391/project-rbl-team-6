import { EmptyState } from '../components'

const fmtDateTime = iso => (iso ? new Date(iso).toLocaleString('vi-VN') : '—')

const ACTION_LABEL = {
  DRAWER_OPENED: 'Mở điều tra',
  VIEWED_AGAIN: 'Xem lại',
  MARKED_REVIEWED: 'Đánh dấu đã xem xét',
  REOPENED: 'Mở lại điều tra',
  INCIDENT_CREATED: 'Tạo sự cố',
  INCIDENT_UPDATED: 'Cập nhật sự cố',
  RESOLVED: 'Đã giải quyết',
}

// Module 11: raw admin-action audit trail (Admin / Time / Action / IP) —
// distinct from the merged business-events Timeline above it.
export default function AuditHistory({ logs }) {
  const rows = logs || []
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState icon="history" title="Chưa có lịch sử kiểm toán" description="Chưa có admin nào thao tác trên mục này." />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Admin', 'Hành động', 'Trạng thái', 'Lý do', 'IP', 'Thời gian'].map(h => (
              <th key={h} className="py-2.5 px-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="py-2.5 px-3 text-gray-800">{r.admin_name || r.admin_email || '—'}</td>
              <td className="py-2.5 px-3 font-medium text-gray-900">{ACTION_LABEL[r.action] || r.action}</td>
              <td className="py-2.5 px-3 text-xs text-gray-500">
                {r.previous_status && r.new_status ? `${r.previous_status} → ${r.new_status}` : '—'}
              </td>
              <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={r.reason}>{r.reason || '—'}</td>
              <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{r.ip_address || '—'}</td>
              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-500">{fmtDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
