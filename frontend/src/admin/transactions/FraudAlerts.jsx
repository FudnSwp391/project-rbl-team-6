import { useState } from 'react'
import { StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs, Pagination, AvatarCell, ExportButton, EmptyState, usePagination, useSearch } from './components'
import { FRAUD_ALERTS, fmtDateTime } from './mockData'

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'INVESTIGATING', label: 'Đang điều tra' },
  { value: 'RESOLVED', label: 'Đã giải quyết' },
]

const ALERT_TYPE_LABELS = {
  RAPID_WITHDRAWAL: 'Rút tiền liên tục',
  REFUND_ABUSE: 'Lạm dụng hoàn tiền',
  LARGE_WITHDRAWAL_NEW_ACCOUNT: 'Rút lớn TK mới',
  PAYMENT_FAILURE_PATTERN: 'Lỗi TT liên tiếp',
  UNUSUAL_ACTIVITY: 'Hoạt động bất thường',
}

export default function FraudAlerts() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(FRAUD_ALERTS)
  const { search, setSearch, filtered: searched } = useSearch(data, ['id', 'user.name', 'alertType', 'reason'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(a => a.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const handleResolve = (id) => {
    setData(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a))
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Cảnh Báo Gian Lận" subtitle="Phát hiện và xử lý các hoạt động bất thường">
        <ExportButton />
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Rủi ro cao', value: data.filter(a => a.riskLevel === 'HIGH' && a.status !== 'RESOLVED').length, icon: 'warning', color: 'bg-red-50 text-red-600', sub: 'Cần xử lý ngay' },
          { label: 'Rủi ro trung bình', value: data.filter(a => a.riskLevel === 'MEDIUM').length, icon: 'info', color: 'bg-amber-50 text-amber-600', sub: 'Đang theo dõi' },
          { label: 'Đã giải quyết', value: data.filter(a => a.status === 'RESOLVED').length, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600', sub: 'Tổng cộng' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <FilterTabs tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? data.length : data.filter(a => a.status === t.value).length }))} active={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />
      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm mã, người dùng, loại cảnh báo..." />

      <DataTable
        headers={['Mã Cảnh Báo', 'Người Dùng', 'Loại Cảnh Báo', 'Mức Rủi Ro', 'Lý Do', 'Thời Gian', 'Trạng Thái', 'Hành Động']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="shield" title="Không có cảnh báo" description="Hiện tại không có hoạt động bất thường." />}
      >
        {paginated.map(a => (
          <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${a.riskLevel === 'HIGH' && a.status !== 'RESOLVED' ? 'bg-red-50/40' : ''}`}>
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-orange-600">{a.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={a.user.name} avatar={a.user.avatar} email={a.user.email} /></td>
            <td className="py-3.5 px-5">
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-semibold">{ALERT_TYPE_LABELS[a.alertType] || a.alertType}</span>
            </td>
            <td className="py-3.5 px-5"><StatusBadge status={a.riskLevel} /></td>
            <td className="py-3.5 px-5 max-w-[220px]"><span className="text-sm text-gray-600">{a.reason}</span></td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(a.createdAt)}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={a.status} /></td>
            <td className="py-3.5 px-5">
              {a.status !== 'RESOLVED' && (
                <button onClick={() => handleResolve(a.id)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                  Giải quyết
                </button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
