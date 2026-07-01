import { StatusBadge, PageHeader, DataTable, SearchFilterBar, Pagination, AvatarCell, EmptyState, usePagination, useSearch } from './components'
import { NOTIFICATIONS, fmtDateTime } from './mockData'

const NT_TYPE_LABELS = {
  PAYMENT_SUCCESS: 'Thanh toán thành công',
  WITHDRAWAL_APPROVED: 'Rút tiền được duyệt',
  REFUND_PROCESSED: 'Hoàn tiền xử lý',
  FRAUD_ALERT: 'Cảnh báo gian lận',
  DISPUTE_OPENED: 'Mở tranh chấp',
  WITHDRAWAL_PENDING: 'Rút tiền chờ duyệt',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  COMMISSION_UPDATED: 'Cập nhật hoa hồng',
}

const NT_ICONS = {
  PAYMENT_SUCCESS: { icon: 'check_circle', color: 'text-emerald-600 bg-emerald-50' },
  WITHDRAWAL_APPROVED: { icon: 'account_balance', color: 'text-blue-600 bg-blue-50' },
  REFUND_PROCESSED: { icon: 'undo', color: 'text-sky-600 bg-sky-50' },
  FRAUD_ALERT: { icon: 'warning', color: 'text-red-600 bg-red-50' },
  DISPUTE_OPENED: { icon: 'gavel', color: 'text-orange-600 bg-orange-50' },
  WITHDRAWAL_PENDING: { icon: 'schedule', color: 'text-amber-600 bg-amber-50' },
  PAYMENT_FAILED: { icon: 'error', color: 'text-red-600 bg-red-50' },
  COMMISSION_UPDATED: { icon: 'percent', color: 'text-purple-600 bg-purple-50' },
}

export default function NotificationCenter() {
  const { search, setSearch, filtered } = useSearch(NOTIFICATIONS, ['id', 'recipient.name', 'type', 'channel'])
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Trung Tâm Thông Báo" subtitle="Lịch sử thông báo liên quan đến giao dịch" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng thông báo', value: NOTIFICATIONS.length, icon: 'notifications', color: 'bg-blue-50 text-blue-600' },
          { label: 'Đã gửi', value: NOTIFICATIONS.filter(n => n.status === 'DELIVERED').length, icon: 'mark_email_read', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Thất bại', value: NOTIFICATIONS.filter(n => n.status === 'FAILED').length, icon: 'error', color: 'bg-red-50 text-red-600' },
          { label: 'Chờ gửi', value: NOTIFICATIONS.filter(n => n.status === 'PENDING').length, icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
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

      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm người nhận, loại thông báo, kênh..." />

      <DataTable
        headers={['Mã', 'Người Nhận', 'Loại Thông Báo', 'Kênh', 'Trạng Thái', 'Thời Gian Gửi']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="notifications_off" title="Không có thông báo" />}
      >
        {paginated.map(n => {
          const cfg = NT_ICONS[n.type] || { icon: 'notifications', color: 'text-gray-600 bg-gray-50' }
          return (
            <tr key={n.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-gray-500">{n.id}</span></td>
              <td className="py-3.5 px-5"><AvatarCell name={n.recipient.name} avatar={n.recipient.avatar} email={n.recipient.email} /></td>
              <td className="py-3.5 px-5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${cfg.color} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[14px]`}>{cfg.icon}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{NT_TYPE_LABELS[n.type] || n.type}</span>
                </div>
              </td>
              <td className="py-3.5 px-5"><span className="text-sm text-gray-600">{n.channel}</span></td>
              <td className="py-3.5 px-5"><StatusBadge status={n.status} /></td>
              <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(n.sentTime)}</span></td>
            </tr>
          )
        })}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
