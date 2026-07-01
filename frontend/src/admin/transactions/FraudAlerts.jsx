import { useState, useEffect } from 'react'
import { StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs, Pagination, AvatarCell, ExportButton, EmptyState, usePagination, useSearch } from './components'
import { fmtDateTime } from './mockData'

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUS_TABS = [
  { value: 'ALL',  label: 'Tất cả' },
  { value: 'open', label: 'Đang mở' },
]

const ALERT_TYPE_LABELS = {
  RAPID_WITHDRAWAL:           'Rút tiền liên tục',
  REFUND_ABUSE:               'Lạm dụng hoàn tiền',
  LARGE_WITHDRAWAL_NEW_ACCOUNT: 'Rút lớn TK mới',
  PAYMENT_FAILURE_PATTERN:    'Lỗi TT liên tiếp',
  UNUSUAL_ACTIVITY:           'Hoạt động bất thường',
  LARGE_DEPOSIT:              'Nạp tiền lớn',
}

const SEV_COLOR = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-gray-100 text-gray-600',
}

export default function FraudAlerts({ token }) {
  const [alerts,       setAlerts]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/fraud-alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setAlerts(data.alerts || []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(alerts, ['id', 'user_name', 'user_email', 'type', 'description'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(a => a.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const highCount   = alerts.filter(a => a.severity === 'HIGH').length
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').length

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Cảnh Báo Gian Lận" subtitle="Tín hiệu rủi ro từ tranh chấp, hoàn tiền và giao dịch bất thường (chỉ xem)">
        <ExportButton />
      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Rủi ro cao',       value: loading ? '—' : highCount,                          icon: 'warning',      color: 'bg-red-50 text-red-600',     sub: 'Cần xem xét' },
          { label: 'Rủi ro trung bình', value: loading ? '—' : mediumCount,                       icon: 'info',         color: 'bg-amber-50 text-amber-600', sub: 'Đang theo dõi' },
          { label: 'Tổng tín hiệu',    value: loading ? '—' : alerts.length,                      icon: 'shield_check', color: 'bg-blue-50 text-blue-600',   sub: 'Tất cả' },
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

      <FilterTabs
        tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? alerts.length : alerts.filter(a => a.status === t.value).length }))}
        active={statusFilter}
        onChange={v => { setStatusFilter(v); setPage(1) }}
      />
      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm người dùng, loại cảnh báo..." />

      <DataTable
        headers={['Mã Cảnh Báo', 'Người Dùng', 'Loại Tín Hiệu', 'Mức Rủi Ro', 'Điểm Rủi Ro', 'Mô Tả', 'Thời Gian', 'Trạng Thái']}
        loading={loading}
        empty={!loading && filtered.length === 0 && (
          <EmptyState icon="shield" title="Không có cảnh báo" description="Hiện tại không có hoạt động bất thường nào được phát hiện." />
        )}
      >
        {paginated.map(a => (
          <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${a.severity === 'HIGH' ? 'bg-red-50/30' : ''}`}>
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-orange-600">{a.id.slice(0, 16)}</span></td>
            <td className="py-3.5 px-5">
              <AvatarCell name={a.user_name || a.user_email} email={a.user_email} avatar={null} />
            </td>
            <td className="py-3.5 px-5">
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-semibold">
                {ALERT_TYPE_LABELS[a.type] || a.type}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEV_COLOR[a.severity] || 'bg-gray-100 text-gray-600'}`}>
                {a.severity}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${a.risk_score >= 70 ? 'bg-red-400' : a.risk_score >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                    style={{ width: `${a.risk_score}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-600">{a.risk_score}</span>
              </div>
            </td>
            <td className="py-3.5 px-5 max-w-[260px]">
              <span className="text-sm text-gray-600 line-clamp-2">{a.description}</span>
            </td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(a.created_at)}</span></td>
            <td className="py-3.5 px-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {a.status === 'open' ? 'Đang mở' : a.status}
              </span>
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
