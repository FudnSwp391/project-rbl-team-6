import { useState } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, ExportButton, EmptyState,
  usePagination, useSearch
} from './components'
import { REFUNDS, fmtMoney, fmtDateTime } from './mockData'

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
]

export default function RefundManagement() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(REFUNDS)
  const { search, setSearch, filtered: searched } = useSearch(data, ['id', 'student.name', 'tutor.name', 'reason'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(r => r.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalPending = data.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.amount, 0)
  const totalApproved = data.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.amount, 0)

  const handleAction = (id, newStatus) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, processedBy: 'Admin EduX' } : r))
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Quản Lý Hoàn Tiền" subtitle="Xử lý các yêu cầu hoàn tiền từ học sinh">
        <ExportButton />
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng yêu cầu', value: data.length, icon: 'undo', color: 'bg-blue-50 text-blue-600' },
          { label: 'Chờ duyệt', value: data.filter(r => r.status === 'PENDING').length, icon: 'schedule', color: 'bg-amber-50 text-amber-600' },
          { label: 'Đã hoàn tiền', value: fmtMoney(totalApproved), icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Đang xử lý', value: fmtMoney(totalPending), icon: 'hourglass', color: 'bg-purple-50 text-purple-600' },
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

      <FilterTabs tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? data.length : data.filter(r => r.status === t.value).length }))} active={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />
      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm mã, học sinh, gia sư, lý do..." />

      <DataTable
        headers={['Mã YC', 'Học Sinh', 'Gia Sư', 'Lý Do', 'Số Tiền', 'Ngày YC', 'Xử Lý Bởi', 'Trạng Thái', 'Bằng Chứng', 'Thao Tác']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="undo" title="Không có yêu cầu hoàn tiền" description="Không tìm thấy yêu cầu phù hợp." />}
      >
        {paginated.map(r => (
          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{r.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={r.student.name} avatar={r.student.avatar} sub={r.student.grade} /></td>
            <td className="py-3.5 px-5"><AvatarCell name={r.tutor.name} avatar={r.tutor.avatar} sub={r.tutor.subject} /></td>
            <td className="py-3.5 px-5 max-w-[200px]"><span className="text-sm text-gray-700 line-clamp-2">{r.reason}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-red-600">-{fmtMoney(r.amount)}</span></td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(r.requestDate)}</span></td>
            <td className="py-3.5 px-5">
              {r.processedBy
                ? <span className="text-xs text-gray-600">{r.processedBy}</span>
                : <span className="text-xs text-amber-500 font-semibold">Chờ xử lý</span>
              }
            </td>
            <td className="py-3.5 px-5"><StatusBadge status={r.status} /></td>
            <td className="py-3.5 px-5">
              {r.evidenceUrl
                ? <a href={r.evidenceUrl} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">attach_file</span> Xem</a>
                : <span className="text-gray-300">—</span>
              }
            </td>
            <td className="py-3.5 px-5">
              {r.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(r.id, 'APPROVED')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'REJECTED')}
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
    </div>
  )
}
