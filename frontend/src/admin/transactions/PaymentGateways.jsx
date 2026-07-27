import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from './components'
import { fmtMoney, fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

const GW_META = {
  'VNPay':           { icon: 'credit_card',            from: 'from-blue-600',    to: 'to-blue-400',    light: 'bg-blue-50 text-blue-600' },
  'VNPAY':           { icon: 'credit_card',            from: 'from-blue-600',    to: 'to-blue-400',    light: 'bg-blue-50 text-blue-600' },
  'MoMo':            { icon: 'account_balance_wallet',  from: 'from-pink-600',    to: 'to-pink-400',    light: 'bg-pink-50 text-pink-600' },
  'Bank Transfer':   { icon: 'account_balance',         from: 'from-purple-600',  to: 'to-purple-400',  light: 'bg-purple-50 text-purple-600' },
  'Visa/MasterCard': { icon: 'credit_card',             from: 'from-indigo-600',  to: 'to-indigo-400',  light: 'bg-indigo-50 text-indigo-600' },
  'Internal Wallet': { icon: 'savings',                 from: 'from-emerald-600', to: 'to-emerald-400', light: 'bg-emerald-50 text-emerald-600' },
}

const DEFAULT_META = { icon: 'payments', from: 'from-gray-600', to: 'to-gray-400', light: 'bg-gray-50 text-gray-600' }

function SuccessBar({ rate }) {
  return (
    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${rate}%` }} />
    </div>
  )
}

export default function PaymentGateways({ token }) {
  const [gateways, setGateways] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/payment-gateways`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setGateways(data.gateways || []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Cổng Thanh Toán" subtitle="Giám sát hiệu suất và trạng thái các cổng thanh toán" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Cổng Thanh Toán" subtitle="Giám sát hiệu suất và trạng thái các cổng thanh toán" />

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {gateways.length === 0 && !error ? (
        <EmptyState icon="credit_card" title="Chưa có dữ liệu cổng thanh toán" description="Chưa ghi nhận giao dịch nào theo cổng thanh toán." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {gateways.map(gw => {
              const m = GW_META[gw.name] || DEFAULT_META
              return (
                <div key={gw.name} className={`bg-gradient-to-br ${m.from} ${m.to} rounded-xl p-5 text-white shadow-md`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-[28px]">{m.icon}</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">{gw.status}</span>
                  </div>
                  <p className="text-lg font-bold mb-0.5">{gw.name}</p>
                  <p className="text-sm opacity-80">{gw.transaction_count.toLocaleString('vi-VN')} giao dịch</p>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-2xl font-extrabold">{fmtMoney(gw.total_volume)}</p>
                    <p className="text-xs opacity-70 mt-0.5">Tổng khối lượng</p>
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
                  {['Cổng Thanh Toán', 'Tổng GD', 'Thành Công', 'Thất Bại', 'Tỷ Lệ Thành Công', 'Tổng Khối Lượng', 'GD Cuối', 'Trạng Thái'].map(h => (
                    <th key={h} className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gateways.map(gw => {
                  const m = GW_META[gw.name] || DEFAULT_META
                  return (
                    <tr key={gw.name} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${m.light} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{gw.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm font-semibold text-gray-700">{gw.transaction_count.toLocaleString('vi-VN')}</td>
                      <td className="py-4 px-5 text-sm font-semibold text-emerald-600">{gw.success_count}</td>
                      <td className="py-4 px-5">
                        <span className={`text-sm font-semibold ${gw.failed_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {gw.failed_count}
                        </span>
                      </td>
                      <td className="py-4 px-5 min-w-[140px]">
                        <div className="space-y-1">
                          <span className="text-xs text-emerald-600 font-bold">{gw.success_rate}%</span>
                          <SuccessBar rate={gw.success_rate} />
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm font-bold text-gray-900">{fmtMoney(gw.total_volume)}</td>
                      <td className="py-4 px-5"><span className="text-xs text-gray-400">{fmtDateTime(gw.last_transaction_at)}</span></td>
                      <td className="py-4 px-5">
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
        </>
      )}
    </div>
  )
}
