import { StatusBadge, PageHeader, DataTable, SearchFilterBar, Pagination, ExportButton, EmptyState, usePagination, useSearch } from './components'
import { PROMOTION_TRANSACTIONS, fmtMoney } from './mockData'

const fmtM = (n) => 'đ' + Number(n || 0).toLocaleString('vi-VN')

export default function PromotionTransactions() {
  const { search, setSearch, filtered } = useSearch(PROMOTION_TRANSACTIONS, ['id', 'promotionName', 'voucherCode'])
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalDiscount = PROMOTION_TRANSACTIONS.reduce((s, p) => s + p.discountAmount, 0)
  const totalUsage = PROMOTION_TRANSACTIONS.reduce((s, p) => s + p.usageCount, 0)
  const activeCount = PROMOTION_TRANSACTIONS.filter(p => p.status === 'ACTIVE').length

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Khuyến Mãi" subtitle="Quản lý giao dịch và tác động của khuyến mãi">
        <ExportButton />
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng khuyến mãi', value: PROMOTION_TRANSACTIONS.length, icon: 'local_offer', color: 'bg-blue-50 text-blue-600' },
          { label: 'Đang hoạt động', value: activeCount, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Tổng lượt dùng', value: totalUsage, icon: 'people', color: 'bg-purple-50 text-purple-600' },
          { label: 'Tổng giảm giá', value: fmtM(totalDiscount), icon: 'discount', color: 'bg-red-50 text-red-600' },
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

      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm tên chương trình, mã voucher..." />

      <DataTable
        headers={['Mã', 'Tên Chương Trình', 'Mã Voucher', 'Số Tiền Giảm', 'Lượt Dùng', 'Tác Động Doanh Thu', 'Trạng Thái']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="local_offer" title="Không có khuyến mãi" description="Chưa có dữ liệu khuyến mãi." />}
      >
        {paginated.map(p => (
          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{p.id}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm font-semibold text-gray-900">{p.promotionName}</span></td>
            <td className="py-3.5 px-5">
              <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono font-bold">{p.voucherCode}</code>
            </td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-red-600">-{fmtM(p.discountAmount)}</span></td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{p.usageCount}</span>
                <span className="text-xs text-gray-400">lượt</span>
              </div>
            </td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-red-500">{fmtM(p.revenueImpact)}</span></td>
            <td className="py-3.5 px-5"><StatusBadge status={p.status} /></td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
