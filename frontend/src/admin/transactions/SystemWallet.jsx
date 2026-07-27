import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from './components'
import { fmtMoney, fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

function StatCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center mb-3`}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

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

function Arrow() {
  return (
    <div className="flex items-center justify-center text-gray-300">
      <span className="material-symbols-outlined text-[32px]">arrow_forward</span>
    </div>
  )
}

const TX_TYPE_COLOR = {
  DEPOSIT: 'bg-blue-100 text-blue-700',
  PAYMENT: 'bg-amber-100 text-amber-700',
}

export default function SystemWallet({ token }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/system-wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Ví Hệ Thống" subtitle="Tổng quan số dư và dòng tiền toàn hệ thống" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-48 bg-gray-50 rounded-xl animate-pulse mb-6" />
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Ví Hệ Thống" subtitle="Tổng quan số dư và dòng tiền toàn hệ thống" />
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const recent = data.recent_transactions || []

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Ví Hệ Thống" subtitle="Tổng quan số dư và dòng tiền toàn hệ thống" />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon="account_balance_wallet" label="Tổng số dư hệ thống" value={fmtMoney(data.total_wallet_balance)} sub={`${data.wallet_count} ví`} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard icon="school" label="Số dư học sinh" value={fmtMoney(data.student_wallet_balance)} sub={data.by_role?.student ? `${data.by_role.student.wallet_count} ví` : ''} colorClass="bg-blue-50 text-blue-600" />
        <StatCard icon="person_pin" label="Số dư gia sư" value={fmtMoney(data.tutor_wallet_balance)} sub={data.by_role?.tutor ? `${data.by_role.tutor.wallet_count} ví` : ''} colorClass="bg-purple-50 text-purple-600" />
        <StatCard icon="lock" label="Đang giữ escrow" value={fmtMoney(data.escrow_held)} sub="HELD_IN_ESCROW" colorClass="bg-amber-50 text-amber-600" />
      </div>

      {/* Flow Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon="arrow_downward" label="Tổng nạp tiền" value={fmtMoney(data.total_deposits)} sub={`${data.deposit_count} giao dịch`} colorClass="bg-emerald-50 text-emerald-600" />
        <StatCard icon="arrow_upward" label="Tổng thanh toán" value={fmtMoney(data.total_payments)} sub={`${data.payment_count} giao dịch`} colorClass="bg-rose-50 text-rose-600" />
        <StatCard icon="receipt_long" label="Tổng giao dịch" value={data.total_tx_count.toLocaleString('vi-VN')} sub="DEPOSIT + PAYMENT" colorClass="bg-gray-50 text-gray-600" />
      </div>

      {/* Money Flow Diagram */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-6">Sơ Đồ Dòng Tiền</h3>
        <div className="flex items-center justify-between gap-2">
          <FlowNode icon="person" label="Học Sinh" value={fmtMoney(data.student_wallet_balance)} color="border-blue-200 text-blue-700 bg-blue-50" sub="Số dư hiện tại" />
          <Arrow />
          <FlowNode icon="payments" label="Nạp Tiền" value={fmtMoney(data.total_deposits)} color="border-emerald-200 text-emerald-700 bg-emerald-50" sub={`${data.deposit_count} GD`} />
          <Arrow />
          <FlowNode icon="lock_clock" label="Escrow" value={fmtMoney(data.escrow_held)} color="border-amber-200 text-amber-700 bg-amber-50" sub="Đang giữ" />
          <Arrow />
          <FlowNode icon="school" label="Gia Sư" value={fmtMoney(data.tutor_wallet_balance)} color="border-purple-200 text-purple-700 bg-purple-50" sub="Số dư hiện tại" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Giao Dịch Gần Đây</h3>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon="receipt_long" title="Chưa có giao dịch" description="Chưa ghi nhận giao dịch nào trong hệ thống." />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Người Dùng', 'Vai Trò', 'Loại', 'Trạng Thái', 'Số Tiền', 'Cổng', 'Mô Tả', 'Thời Gian'].map(h => (
                  <th key={h} className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="text-sm font-semibold text-gray-800">{tx.user_name || '—'}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-xs text-gray-400 capitalize">{tx.user_role}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TX_TYPE_COLOR[tx.type] || 'bg-gray-100 text-gray-600'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-xs font-semibold ${tx.status === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{fmtMoney(tx.amount)}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-xs text-gray-400">{tx.gateway}</span>
                  </td>
                  <td className="py-3.5 px-5 max-w-[180px]">
                    <span className="text-xs text-gray-500 truncate block">{tx.description || '—'}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-xs text-gray-400">{fmtDateTime(tx.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
