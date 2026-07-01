import { PageHeader } from './components'
import { SYSTEM_WALLET } from './mockData'

const fmtM = (n) => 'đ' + Number(n || 0).toLocaleString('vi-VN')

function FlowNode({ icon, label, value, color, sub }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color}`}>
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
      <p className="text-xs font-bold text-center uppercase tracking-wide">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  )
}

export default function SystemWallet() {
  const w = SYSTEM_WALLET
  const f = w.totalFlow

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Ví Hệ Thống" subtitle="Tổng quan ví hệ thống và dòng tiền nền tảng" />

      {/* Balance Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Escrow Balance', value: fmtM(w.escrowBalance), icon: 'lock', color: 'bg-amber-50 text-amber-600', desc: 'Đang giữ trung gian' },
          { label: 'Pending Releases', value: fmtM(w.pendingReleases), icon: 'schedule_send', color: 'bg-blue-50 text-blue-600', desc: 'Chờ giải ngân' },
          { label: 'Refund Reserve', value: fmtM(w.refundReserve), icon: 'undo', color: 'bg-red-50 text-red-600', desc: 'Dự phòng hoàn tiền' },
          { label: 'Platform Revenue', value: fmtM(w.platformRevenueBalance), icon: 'account_balance', color: 'bg-emerald-50 text-emerald-600', desc: 'Doanh thu nền tảng' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Money Flow Diagram */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-6">Sơ Đồ Dòng Tiền (Money Flow)</h3>
        <div className="flex items-center justify-between gap-2">
          <FlowNode icon="person" label="Học Sinh Nạp Tiền" value={fmtM(f.studentPayments)} color="border-blue-200 bg-blue-50 text-blue-700" />
          <div className="flex flex-col items-center">
            <div className="h-px bg-gray-300 w-12" />
            <span className="text-xs text-gray-400">→</span>
          </div>
          <FlowNode icon="lock" label="Escrow (Giữ TG)" value={fmtM(f.escrowHeld)} color="border-amber-200 bg-amber-50 text-amber-700" sub="Đang giữ" />
          <div className="flex flex-col items-center">
            <div className="h-px bg-gray-300 w-12" />
            <span className="text-xs text-gray-400">→</span>
          </div>
          <div className="flex flex-col gap-3">
            <FlowNode icon="school" label="Gia Sư Nhận" value={fmtM(f.tutorReleases)} color="border-emerald-200 bg-emerald-50 text-emerald-700" />
            <FlowNode icon="percent" label="Phí Nền Tảng" value={fmtM(f.platformFees)} color="border-purple-200 bg-purple-50 text-purple-700" />
            <FlowNode icon="undo" label="Hoàn Tiền" value={fmtM(f.refundsIssued)} color="border-red-200 bg-red-50 text-red-700" />
          </div>
        </div>
      </div>

      {/* Flow Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Chi Tiết Dòng Tiền</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Loại Dòng Tiền', 'Giá Trị', 'Tỷ Lệ'].map(h => (
                <th key={h} className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { label: 'Tổng thanh toán học sinh', value: f.studentPayments, color: 'text-blue-600', icon: 'arrow_downward' },
              { label: 'Đang giữ Escrow', value: f.escrowHeld, color: 'text-amber-600', icon: 'lock' },
              { label: 'Đã giải ngân cho gia sư', value: f.tutorReleases, color: 'text-emerald-600', icon: 'arrow_upward' },
              { label: 'Phí nền tảng thu được', value: f.platformFees, color: 'text-purple-600', icon: 'percent' },
              { label: 'Tổng đã hoàn tiền', value: f.refundsIssued, color: 'text-red-600', icon: 'undo' },
            ].map(row => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${row.color}`}>{row.icon}</span>
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </div>
                </td>
                <td className={`py-3.5 px-6 text-sm font-bold ${row.color}`}>{fmtM(row.value)}</td>
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full`} style={{ width: `${(row.value / f.studentPayments) * 100}%`, background: 'currentColor' }} />
                    </div>
                    <span className="text-sm text-gray-500">{((row.value / f.studentPayments) * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
