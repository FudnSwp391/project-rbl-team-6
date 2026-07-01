import { PageHeader } from './components'
import { PAYMENT_GATEWAYS, fmtMoney, fmtDateTime } from './mockData'

const GW_COLORS = {
  VNPay: { from: 'from-blue-600', to: 'to-blue-400', light: 'bg-blue-50 text-blue-600' },
  MoMo: { from: 'from-pink-600', to: 'to-pink-400', light: 'bg-pink-50 text-pink-600' },
  'Bank Transfer': { from: 'from-purple-600', to: 'to-purple-400', light: 'bg-purple-50 text-purple-600' },
  'Internal Wallet': { from: 'from-emerald-600', to: 'to-emerald-400', light: 'bg-emerald-50 text-emerald-600' },
}

function SuccessBar({ rate }) {
  return (
    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${rate}%` }} />
    </div>
  )
}

export default function PaymentGateways() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Cổng Thanh Toán" subtitle="Giám sát hiệu suất và trạng thái các cổng thanh toán" />

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {PAYMENT_GATEWAYS.map(gw => {
          const c = GW_COLORS[gw.name] || { from: 'from-gray-600', to: 'to-gray-400' }
          return (
            <div key={gw.id} className={`bg-gradient-to-br ${c.from} ${c.to} rounded-xl p-5 text-white shadow-md`}>
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-[28px]">{gw.icon}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{gw.status}</span>
              </div>
              <p className="text-lg font-bold mb-0.5">{gw.name}</p>
              <p className="text-sm opacity-80">{gw.totalTx.toLocaleString('vi-VN')} giao dịch</p>
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-2xl font-extrabold">{fmtMoney(gw.revenue)}</p>
                <p className="text-xs opacity-70 mt-0.5">Tổng doanh thu</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hiệu Suất Chi Tiết</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Cổng Thanh Toán', 'Tổng Giao Dịch', 'Tỷ Lệ Thành Công', 'Tỷ Lệ Thất Bại', 'Doanh Thu', 'Thời Gian XL', 'Cập Nhật', 'Trạng Thái'].map(h => (
                <th key={h} className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {PAYMENT_GATEWAYS.map(gw => {
              const c = GW_COLORS[gw.name] || { light: 'bg-gray-50 text-gray-600' }
              return (
                <tr key={gw.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${c.light} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-[18px]">{gw.icon}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{gw.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-gray-700">{gw.totalTx.toLocaleString('vi-VN')}</td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-emerald-600 font-bold">{gw.successRate}%</span>
                      </div>
                      <SuccessBar rate={gw.successRate} />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-sm font-semibold ${gw.failedRate > 3 ? 'text-red-600' : 'text-amber-600'}`}>{gw.failedRate}%</span>
                  </td>
                  <td className="py-4 px-6 text-sm font-bold text-gray-900">{fmtMoney(gw.revenue)}</td>
                  <td className="py-4 px-6"><span className="text-sm text-gray-600">{gw.avgProcessTime}</span></td>
                  <td className="py-4 px-6"><span className="text-xs text-gray-400">{fmtDateTime(gw.lastChecked)}</span></td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {gw.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
