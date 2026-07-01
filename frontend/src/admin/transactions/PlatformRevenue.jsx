import { useState } from 'react'
import { PageHeader, ExportButton } from './components'
import { REVENUE_BY_MONTH, REVENUE_BY_SUBJECT } from './mockData'

const fmtM = (n) => 'đ' + Number(n || 0).toLocaleString('vi-VN')

function RevenueSummaryCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function PlatformRevenue() {
  const [activeTab, setActiveTab] = useState('monthly')
  const totalRevenue = REVENUE_BY_MONTH.reduce((s, m) => s + m.revenue, 0)
  const totalNet = REVENUE_BY_MONTH.reduce((s, m) => s + m.net, 0)
  const totalRefunds = REVENUE_BY_MONTH.reduce((s, m) => s + m.refunds, 0)
  const maxMonthRev = Math.max(...REVENUE_BY_MONTH.map(m => m.revenue))
  const maxSubjectRev = Math.max(...REVENUE_BY_SUBJECT.map(s => s.revenue))

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Doanh Thu Nền Tảng" subtitle="Theo dõi doanh thu nền tảng theo nhiều chiều phân tích">
        <ExportButton label="Xuất Báo Cáo" />
      </PageHeader>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <RevenueSummaryCard label="Tổng Doanh Thu" value={fmtM(totalRevenue)} sub="6 tháng gần nhất" icon="payments" color="bg-blue-50 text-blue-600" />
        <RevenueSummaryCard label="Doanh Thu Ròng" value={fmtM(totalNet)} sub="Sau hoàn tiền" icon="trending_up" color="bg-emerald-50 text-emerald-600" />
        <RevenueSummaryCard label="Tổng Hoàn Tiền" value={fmtM(totalRefunds)} sub="Đã xử lý" icon="undo" color="bg-red-50 text-red-600" />
        <RevenueSummaryCard label="Tháng Tốt Nhất" value={fmtM(Math.max(...REVENUE_BY_MONTH.map(m => m.net)))} sub="T6/2024" icon="emoji_events" color="bg-amber-50 text-amber-600" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        {[['monthly', 'Theo Tháng'], ['subject', 'Theo Môn Học']].map(([v, l]) => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Doanh Thu Theo Tháng</h3>
          </div>
          <div className="p-6">
            {/* Bar chart */}
            <div className="flex items-end gap-3 h-48 mb-4">
              {REVENUE_BY_MONTH.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col-reverse" style={{ height: '160px' }}>
                    <div className="w-full bg-red-100 rounded-b" style={{ height: `${(m.refunds / maxMonthRev) * 160}px` }} title={`Hoàn tiền: ${fmtM(m.refunds)}`} />
                    <div className="w-full bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors rounded-t" style={{ height: `${((m.revenue - m.refunds) / maxMonthRev) * 160}px` }} title={`Doanh thu: ${fmtM(m.revenue)}`} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Tháng', 'Doanh Thu', 'Hoàn Tiền', 'Doanh Thu Ròng', 'Tăng Trưởng'].map(h => (
                  <th key={h} className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {REVENUE_BY_MONTH.map((m, i) => {
                const prev = REVENUE_BY_MONTH[i - 1]
                const growth = prev ? (((m.net - prev.net) / prev.net) * 100).toFixed(1) : null
                return (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="py-3.5 px-6 text-sm font-semibold text-gray-900">{m.month}</td>
                    <td className="py-3.5 px-6 text-sm font-bold text-blue-600">{fmtM(m.revenue)}</td>
                    <td className="py-3.5 px-6 text-sm font-semibold text-red-500">-{fmtM(m.refunds)}</td>
                    <td className="py-3.5 px-6 text-sm font-bold text-emerald-600">{fmtM(m.net)}</td>
                    <td className="py-3.5 px-6">
                      {growth !== null && (
                        <span className={`text-sm font-bold ${Number(growth) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {Number(growth) >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'subject' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Doanh Thu Theo Môn Học</h3>
          </div>
          <div className="p-6 space-y-4">
            {REVENUE_BY_SUBJECT.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">{s.subject}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{fmtM(s.revenue)}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.txCount} GD</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.revenue / maxSubjectRev) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
