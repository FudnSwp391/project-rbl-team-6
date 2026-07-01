import { useState } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, ExportButton, ModalOverlay, EmptyState,
  usePagination, useSearch
} from './components'
import { TUTOR_WITHDRAWALS, fmtMoney, fmtDateTime } from './mockData'

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

export default function TutorWithdrawals() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [data, setData] = useState(TUTOR_WITHDRAWALS)

  const { search, setSearch, filtered: searched } = useSearch(data, ['id', 'tutor.name', 'bank'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(w => w.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalPending = data.filter(w => w.status === 'PENDING').reduce((s, w) => s + w.amount, 0)
  const totalApproved = data.filter(w => w.status === 'APPROVED').reduce((s, w) => s + w.amount, 0)

  const handleApprove = () => {
    setData(prev => prev.map(w => w.id === approveTarget.id ? { ...w, status: 'APPROVED' } : w))
    setApproveTarget(null)
  }
  const handleReject = () => {
    if (!rejectNote.trim()) return
    setData(prev => prev.map(w => w.id === rejectTarget.id ? { ...w, status: 'REJECTED', note: rejectNote } : w))
    setRejectTarget(null)
    setRejectNote('')
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Gia Sư Rút Tiền" subtitle="Quản lý yêu cầu rút tiền của gia sư">
        <ExportButton />
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Số dư chờ duyệt', value: fmtMoney(totalPending), icon: 'schedule', color: 'bg-amber-50 text-amber-600', sub: `${data.filter(w => w.status === 'PENDING').length} yêu cầu` },
          { label: 'Đã giải ngân tháng này', value: fmtMoney(totalApproved), icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600', sub: `${data.filter(w => w.status === 'APPROVED').length} yêu cầu` },
          { label: 'Bị từ chối', value: data.filter(w => w.status === 'REJECTED').length, icon: 'cancel', color: 'bg-red-50 text-red-600', sub: 'Yêu cầu bị từ chối' },
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

      <FilterTabs tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? data.length : data.filter(w => w.status === t.value).length }))} active={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />
      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm mã, gia sư, ngân hàng..." />

      <DataTable
        headers={['Mã YC', 'Gia Sư', 'Số Tiền', 'Ngân Hàng', 'Ngày YC', 'Mức Rủi Ro', 'Trạng Thái', 'Ghi Chú', 'Thao Tác']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="account_balance" title="Không có yêu cầu" description="Không có yêu cầu rút tiền nào phù hợp." />}
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
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(w.requestDate)}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={w.riskLevel} /></td>
            <td className="py-3.5 px-5"><StatusBadge status={w.status} /></td>
            <td className="py-3.5 px-5 max-w-[160px]">
              {w.note ? <span className="text-xs text-gray-500 italic">{w.note}</span> : <span className="text-gray-300">—</span>}
            </td>
            <td className="py-3.5 px-5">
              {w.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setApproveTarget(w)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => { setRejectTarget(w); setRejectNote('') }}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    Từ chối
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Đã xử lý</span>
              )}
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {/* Approve Modal */}
      {approveTarget && (
        <ModalOverlay onClose={() => setApproveTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận duyệt rút tiền</h3>
                <p className="text-sm text-gray-500">{approveTarget.tutor.name}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Số tiền</span>
                <span className="text-lg font-bold text-gray-900">{fmtMoney(approveTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Ngân hàng</span>
                <span className="text-sm font-semibold text-gray-700">{approveTarget.bank}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5">Vui lòng xác nhận bạn đã chuyển khoản thành công trước khi duyệt.</p>
            <div className="flex gap-3">
              <button onClick={handleApprove} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">Xác nhận duyệt</button>
              <button onClick={() => setApproveTarget(null)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Hủy</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <ModalOverlay onClose={() => setRejectTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-[28px]">cancel</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Từ chối yêu cầu rút tiền</h3>
                <p className="text-sm text-gray-500">{rejectTarget.tutor.name} — {fmtMoney(rejectTarget.amount)}</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do từ chối *</label>
              <textarea
                className="w-full h-28 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Nhập lý do từ chối..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!rejectNote.trim()} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">Xác nhận từ chối</button>
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Hủy</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
