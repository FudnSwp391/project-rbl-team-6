import { StatusBadge, PageHeader, DataTable, ExportButton, Pagination, EmptyState, usePagination } from './components'
import { RECONCILIATION_DATA, fmtMoney, fmtDateTime } from './mockData'

export default function Reconciliation() {
  const matched = RECONCILIATION_DATA.filter(r => r.status === 'MATCHED')
  const unmatched = RECONCILIATION_DATA.filter(r => r.status === 'UNMATCHED')
  const missing = RECONCILIATION_DATA.filter(r => r.status === 'MISSING')
  const { page, setPage, totalPages, paginated } = usePagination(RECONCILIATION_DATA, 10)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Đối Soát" subtitle="Đối soát giao dịch giữa cổng thanh toán, database và ví hệ thống">
        <ExportButton />
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Khớp (Đúng)', value: matched.length, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600', sub: 'Gateway = DB = Wallet' },
          { label: 'Không khớp', value: unmatched.length, icon: 'compare_arrows', color: 'bg-red-50 text-red-600', sub: 'Cần kiểm tra ngay' },
          { label: 'Thiếu GD', value: missing.length, icon: 'search_off', color: 'bg-amber-50 text-amber-600', sub: 'GD trên GW nhưng không có trong DB' },
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

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-1">Đối soát 3 chiều</p>
          <p className="text-sm text-blue-700">Hệ thống so sánh số liệu giữa: <strong>Payment Gateway</strong> (MoMo/VNPay) ↔ <strong>Database</strong> ↔ <strong>System Wallet</strong>. Không khớp cần xử lý thủ công.</p>
        </div>
      </div>

      <DataTable
        headers={['Mã GD', 'Gateway', 'Giá Trị Gateway', 'Giá Trị DB', 'Giá Trị Wallet', 'Trạng Thái', 'Ngày', 'Ghi Chú']}
        loading={false}
        empty={RECONCILIATION_DATA.length === 0 && <EmptyState icon="compare_arrows" title="Không có dữ liệu" />}
      >
        {paginated.map(r => (
          <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.status !== 'MATCHED' ? 'bg-red-50/30' : ''}`}>
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{r.txId}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm font-semibold text-gray-700">{r.gateway}</span></td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-gray-900">{fmtMoney(r.gatewayAmount)}</span></td>
            <td className="py-3.5 px-5">
              <span className={`text-sm font-bold ${r.dbAmount !== r.gatewayAmount ? 'text-red-600' : 'text-gray-900'}`}>
                {fmtMoney(r.dbAmount)}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <span className={`text-sm font-bold ${r.walletAmount !== r.gatewayAmount ? 'text-red-600' : 'text-gray-900'}`}>
                {fmtMoney(r.walletAmount)}
              </span>
            </td>
            <td className="py-3.5 px-5"><StatusBadge status={r.status} /></td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(r.date)}</span></td>
            <td className="py-3.5 px-5 max-w-[200px]">
              {r.note ? <span className="text-xs text-red-600 font-semibold">⚠️ {r.note}</span> : <span className="text-gray-300">—</span>}
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
