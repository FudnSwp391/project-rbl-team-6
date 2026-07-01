import { useState } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, ExportButton, Drawer, Timeline, EmptyState,
  usePagination, useSearch
} from './components'
import { LESSON_PAYMENTS, fmtMoney, fmtDateTime } from './mockData'

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'RELEASED', label: 'Đã giải ngân' },
  { value: 'PENDING_ESCROW', label: 'Đang Escrow' },
  { value: 'REFUNDED', label: 'Hoàn tiền' },
  { value: 'DISPUTED', label: 'Tranh chấp' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const METHOD_ICONS = {
  'MoMo': { icon: 'account_balance_wallet', color: 'text-pink-600', bg: 'bg-pink-50' },
  'VNPay': { icon: 'credit_card', color: 'text-blue-600', bg: 'bg-blue-50' },
  'Internal Wallet': { icon: 'savings', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Bank Transfer': { icon: 'account_balance', color: 'text-purple-600', bg: 'bg-purple-50' },
}

export default function LessonPayments() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTx, setSelectedTx] = useState(null)
  const { search, setSearch, filtered: searched } = useSearch(LESSON_PAYMENTS, ['id', 'bookingId', 'student.name', 'tutor.name', 'subject'])

  const filtered = statusFilter === 'ALL' ? searched : searched.filter(t => t.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalAmount = LESSON_PAYMENTS.reduce((s, t) => s + t.amount, 0)
  const completedAmount = LESSON_PAYMENTS.filter(t => t.status === 'COMPLETED' || t.status === 'RELEASED').reduce((s, t) => s + t.platformFee, 0)

  const getTimeline = (tx) => [
    { label: 'Học sinh thanh toán', done: true, time: fmtDateTime(tx.createdAt) },
    { label: 'Escrow được tạo', done: tx.status !== 'CANCELLED', time: tx.status !== 'CANCELLED' ? fmtDateTime(tx.createdAt) : null },
    { label: 'Buổi học hoàn thành', done: ['COMPLETED', 'RELEASED', 'REFUNDED', 'DISPUTED'].includes(tx.status) },
    { label: 'Gia sư nhận tiền', done: tx.status === 'RELEASED' || tx.status === 'COMPLETED' },
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Thanh Toán Buổi Học" subtitle="Quản lý tất cả giao dịch thanh toán buổi học">
        <ExportButton />
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng giao dịch', value: LESSON_PAYMENTS.length, icon: 'receipt_long', color: 'bg-blue-50 text-blue-600' },
          { label: 'Tổng giá trị', value: fmtMoney(totalAmount), icon: 'payments', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Phí nền tảng', value: fmtMoney(completedAmount), icon: 'percent', color: 'bg-purple-50 text-purple-600' },
          { label: 'Tranh chấp', value: LESSON_PAYMENTS.filter(t => t.status === 'DISPUTED').length, icon: 'gavel', color: 'bg-red-50 text-red-600' },
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

      <FilterTabs
        tabs={STATUS_TABS.map(t => ({
          ...t,
          count: t.value === 'ALL' ? LESSON_PAYMENTS.length : LESSON_PAYMENTS.filter(lp => lp.status === t.value).length
        }))}
        active={statusFilter}
        onChange={v => { setStatusFilter(v); setPage(1) }}
      />

      <SearchFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1) }}
        placeholder="Tìm mã GD, booking, học sinh, gia sư, môn học..."
      />

      <DataTable
        headers={['Mã GD / Booking', 'Học Sinh', 'Gia Sư', 'Môn Học', 'Số Tiền', 'Phí Sàn', 'GS Nhận', 'Phương Thức', 'Trạng Thái', 'Ngày', 'Chi Tiết']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="receipt_long" title="Không có giao dịch" description="Không tìm thấy giao dịch phù hợp với bộ lọc." />}
      >
        {paginated.map(tx => {
          const m = METHOD_ICONS[tx.paymentMethod] || { icon: 'payments', color: 'text-gray-600', bg: 'bg-gray-50' }
          return (
            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3.5 px-5">
                <p className="text-xs font-mono font-bold text-blue-600">{tx.id}</p>
                <p className="text-xs text-gray-400">{tx.bookingId}</p>
              </td>
              <td className="py-3.5 px-5"><AvatarCell name={tx.student.name} avatar={tx.student.avatar} sub={tx.student.grade} /></td>
              <td className="py-3.5 px-5"><AvatarCell name={tx.tutor.name} avatar={tx.tutor.avatar} sub={tx.tutor.subject} /></td>
              <td className="py-3.5 px-5"><span className="text-sm text-gray-700">{tx.subject}</span></td>
              <td className="py-3.5 px-5"><span className="text-sm font-bold text-gray-900">{fmtMoney(tx.amount)}</span></td>
              <td className="py-3.5 px-5"><span className="text-sm text-purple-600 font-semibold">{fmtMoney(tx.platformFee)}</span></td>
              <td className="py-3.5 px-5"><span className="text-sm text-emerald-600 font-semibold">{fmtMoney(tx.tutorEarnings)}</span></td>
              <td className="py-3.5 px-5">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${m.bg}`}>
                  <span className={`material-symbols-outlined text-[14px] ${m.color}`}>{m.icon}</span>
                  <span className={`text-xs font-semibold ${m.color}`}>{tx.paymentMethod}</span>
                </div>
              </td>
              <td className="py-3.5 px-5"><StatusBadge status={tx.status} /></td>
              <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(tx.createdAt)}</span></td>
              <td className="py-3.5 px-5">
                <button
                  onClick={() => setSelectedTx(tx)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span> Chi tiết
                </button>
              </td>
            </tr>
          )
        })}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {/* Detail Drawer */}
      {selectedTx && (
        <Drawer open={!!selectedTx} onClose={() => setSelectedTx(null)} title={`Chi Tiết Giao Dịch ${selectedTx.id}`} width="w-[540px]">
          <div className="space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-sm font-semibold text-gray-600">Trạng thái</span>
              <StatusBadge status={selectedTx.status} />
            </div>

            {/* Info Grid */}
            {[
              ['Mã Giao Dịch', selectedTx.id],
              ['Mã Booking', selectedTx.bookingId],
              ['Môn Học', selectedTx.subject],
              ['Số Tiền', fmtMoney(selectedTx.amount)],
              ['Phí Nền Tảng (15%)', fmtMoney(selectedTx.platformFee)],
              ['Gia Sư Nhận', fmtMoney(selectedTx.tutorEarnings)],
              ['Phương Thức', selectedTx.paymentMethod],
              ['Ngày Tạo', fmtDateTime(selectedTx.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}

            {/* Participants */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">Học Sinh</p>
              <AvatarCell name={selectedTx.student.name} email={selectedTx.student.email} avatar={selectedTx.student.avatar} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">Gia Sư</p>
              <AvatarCell name={selectedTx.tutor.name} email={selectedTx.tutor.email} avatar={selectedTx.tutor.avatar} />
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-4">Timeline Giao Dịch</p>
              <Timeline steps={getTimeline(selectedTx)} />
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
