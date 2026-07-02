import { useState, useEffect } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, EmptyState,
  usePagination, useSearch
} from './components'
import { fmtMoney, fmtDateTime } from './mockData'

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUS_TABS = [
  { value: 'ALL',      label: 'Tất cả' },
  { value: 'PENDING',  label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function mapRow(r) {
  return {
    id:          r.id,
    tutor:       { name: r.tutor_name || 'Gia sư', email: r.tutor_email || '', avatar: null },
    amount:      parseFloat(r.amount) || 0,
    bank:        r.bank_name    || r.method || '—',
    bankAccount: r.bank_account_masked || '',
    requestDate: r.created_at,
    status:      (r.status || 'PENDING').toUpperCase(),
    note:        r.admin_note || '',
  }
}

export default function TutorWithdrawals({ token }) {
  const [withdrawals,   setWithdrawals]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('ALL')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/transactions/withdrawals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setWithdrawals((data.withdrawals || []).map(mapRow))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(withdrawals, ['id', 'tutor.name', 'bank', 'bankAccount'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(w => w.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalPending  = withdrawals.filter(w => w.status === 'PENDING').reduce((s, w) => s + w.amount, 0)
  const totalApproved = withdrawals.filter(w => w.status === 'APPROVED').reduce((s, w) => s + w.amount, 0)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Gia Sư Rút Tiền" subtitle="Danh sách yêu cầu rút tiền của gia sư (chỉ xem)">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Số dư chờ duyệt',     value: loading ? '—' : fmtMoney(totalPending),  icon: 'schedule',     color: 'bg-amber-50 text-amber-600',   sub: `${withdrawals.filter(w => w.status === 'PENDING').length} yêu cầu` },
          { label: 'Đã giải ngân',         value: loading ? '—' : fmtMoney(totalApproved), icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600', sub: `${withdrawals.filter(w => w.status === 'APPROVED').length} yêu cầu` },
          { label: 'Bị từ chối',           value: loading ? '—' : withdrawals.filter(w => w.status === 'REJECTED').length, icon: 'cancel', color: 'bg-red-50 text-red-600', sub: 'Yêu cầu bị từ chối' },
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
        tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? withdrawals.length : withdrawals.filter(w => w.status === t.value).length }))}
        active={statusFilter}
        onChange={v => { setStatusFilter(v); setPage(1) }}
      />
      <SearchFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1) }}
        placeholder="Tìm mã, gia sư, ngân hàng..."
      />

      <DataTable
        headers={['Mã YC', 'Gia Sư', 'Số Tiền', 'Ngân Hàng', 'Số TK', 'Ngày YC', 'Trạng Thái', 'Ghi Chú']}
        loading={loading}
        empty={!loading && filtered.length === 0 && (
          <EmptyState icon="account_balance" title="Không có yêu cầu" description="Không có yêu cầu rút tiền nào phù hợp." />
        )}
      >
        {paginated.map(w => (
          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{w.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={w.tutor.name} email={w.tutor.email} avatar={w.tutor.avatar} /></td>
            <td className="py-3.5 px-5"><span className="text-base font-bold text-gray-900">{fmtMoney(w.amount)}</span></td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-gray-400">account_balance</span>
                <span className="text-sm text-gray-700">{w.bank}</span>
              </div>
            </td>
            <td className="py-3.5 px-5">
              <span className="text-xs font-mono text-gray-500">{w.bankAccount || '—'}</span>
            </td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(w.requestDate)}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={w.status} /></td>
            <td className="py-3.5 px-5 max-w-[200px]">
              {w.note ? <span className="text-xs text-gray-500 italic">{w.note}</span> : <span className="text-gray-300">—</span>}
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
