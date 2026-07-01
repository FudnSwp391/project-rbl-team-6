import { useState } from 'react'
import { PageHeader, ExportButton } from './components'

const REPORTS = [
  {
    id: 'revenue', icon: 'payments', title: 'Revenue Report', desc: 'Tổng doanh thu theo tháng, quý, năm và theo loại giao dịch.',
    color: 'from-blue-500 to-blue-600', metrics: ['Đ182.5M doanh thu', '6 tháng dữ liệu', '+18.2% MoM'],
  },
  {
    id: 'refund', icon: 'undo', title: 'Refund Report', desc: 'Phân tích các khoản hoàn tiền, lý do và xu hướng.',
    color: 'from-red-500 to-red-600', metrics: ['6 yêu cầu', 'đ12.4M hoàn', '3.2% refund rate'],
  },
  {
    id: 'withdrawal', icon: 'account_balance', title: 'Withdrawal Report', desc: 'Lịch sử rút tiền, trạng thái và gia sư liên quan.',
    color: 'from-emerald-500 to-emerald-600', metrics: ['7 yêu cầu', 'đ26.7M giải ngân', '3 chờ duyệt'],
  },
  {
    id: 'dispute', icon: 'gavel', title: 'Dispute Report', desc: 'Báo cáo tranh chấp, thời gian giải quyết và kết quả.',
    color: 'from-orange-500 to-orange-600', metrics: ['3 tranh chấp', '2 đang mở', '1 đã giải quyết'],
  },
  {
    id: 'promotion', icon: 'local_offer', title: 'Promotion Report', desc: 'Hiệu quả khuyến mãi, mã giảm giá và tác động doanh thu.',
    color: 'from-purple-500 to-purple-600', metrics: ['5 chương trình', 'đ66.3M giảm', '1119 lượt dùng'],
  },
]

export default function FinancialReports() {
  const [active, setActive] = useState(null)
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-06-30' })

  const handleExport = (type, format) => {
    alert(`Đang xuất ${type} dưới dạng ${format}... (Demo mode)`)
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Báo Cáo Tài Chính" subtitle="Trung tâm báo cáo tài chính toàn diện" />

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Từ Ngày</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Đến Ngày</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="pt-5">
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90">
              Áp dụng
            </button>
          </div>
          <div className="flex-1 flex items-end justify-end gap-2 pt-5">
            {['T7 ngày', 'T30 ngày', 'Q1', 'Q2', 'Năm 2024'].map(p => (
              <button key={p} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors">{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-3 gap-5">
        {REPORTS.map(r => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`bg-gradient-to-r ${r.color} p-5`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[20px]">{r.icon}</span>
                </div>
                <h3 className="text-base font-bold text-white">{r.title}</h3>
              </div>
              <p className="text-sm text-white/80">{r.desc}</p>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {r.metrics.map(m => (
                  <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">{m}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {['Excel', 'CSV', 'PDF'].map(fmt => (
                  <button key={fmt} onClick={() => handleExport(r.title, fmt)}
                    className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Custom Report */}
      <div className="mt-6 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Tạo Báo Cáo Tùy Chỉnh</h3>
          <p className="text-sm text-gray-400">Chọn bất kỳ kết hợp dữ liệu và xuất ra định dạng bạn muốn.</p>
        </div>
        <button className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
          ✨ Tạo báo cáo
        </button>
      </div>
    </div>
  )
}
