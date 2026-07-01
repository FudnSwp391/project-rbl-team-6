import { useState } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, ExportButton, EmptyState,
  usePagination, useSearch
} from './components'
import { COURSE_TRANSACTIONS, fmtMoney, fmtDateTime } from './mockData'

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'REFUNDED', label: 'Hoàn tiền' },
]

export default function CourseTransactions() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const { search, setSearch, filtered: searched } = useSearch(COURSE_TRANSACTIONS, ['id', 'student.name', 'course', 'tutor.name'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(t => t.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalRevenue = COURSE_TRANSACTIONS.reduce((s, t) => s + t.platformRevenue, 0)
  const totalTutorRevenue = COURSE_TRANSACTIONS.reduce((s, t) => s + t.tutorRevenue, 0)
  const totalDiscount = COURSE_TRANSACTIONS.reduce((s, t) => s + t.discount, 0)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Giao Dịch Khóa Học" subtitle="Quản lý tất cả giao dịch mua khóa học">
        <ExportButton />
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng giao dịch', value: COURSE_TRANSACTIONS.length, icon: 'school', color: 'bg-blue-50 text-blue-600' },
          { label: 'Doanh thu nền tảng', value: fmtMoney(totalRevenue), icon: 'percent', color: 'bg-purple-50 text-purple-600' },
          { label: 'Gia sư nhận', value: fmtMoney(totalTutorRevenue), icon: 'person_check', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Tổng giảm giá', value: fmtMoney(totalDiscount), icon: 'discount', color: 'bg-amber-50 text-amber-600' },
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

      <FilterTabs tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? COURSE_TRANSACTIONS.length : COURSE_TRANSACTIONS.filter(ct => ct.status === t.value).length }))} active={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} />
      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm mã GD, học sinh, khóa học, gia sư..." />

      <DataTable
        headers={['Mã GD', 'Học Sinh', 'Khóa Học', 'Gia Sư', 'Giá Gốc', 'Giảm Giá', 'Nền Tảng', 'Gia Sư Nhận', 'Trạng Thái', 'Ngày Mua']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="school" title="Không có giao dịch" description="Không tìm thấy giao dịch khóa học phù hợp." />}
      >
        {paginated.map(tx => (
          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{tx.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={tx.student.name} avatar={tx.student.avatar} sub={tx.student.grade} /></td>
            <td className="py-3.5 px-5">
              <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{tx.course}</p>
            </td>
            <td className="py-3.5 px-5"><AvatarCell name={tx.tutor.name} avatar={tx.tutor.avatar} sub={tx.tutor.subject} /></td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-gray-900">{fmtMoney(tx.price)}</span></td>
            <td className="py-3.5 px-5">
              {tx.discount > 0
                ? <span className="text-sm font-semibold text-red-500">-{fmtMoney(tx.discount)}</span>
                : <span className="text-gray-300">—</span>
              }
            </td>
            <td className="py-3.5 px-5"><span className="text-sm text-purple-600 font-semibold">{fmtMoney(tx.platformRevenue)}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm text-emerald-600 font-semibold">{fmtMoney(tx.tutorRevenue)}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={tx.status} /></td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(tx.purchaseDate)}</span></td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
