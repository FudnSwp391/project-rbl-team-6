import { useState, useEffect } from 'react'
import { PageHeader, StatusBadge, EmptyState } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'

const TYPE_LABEL   = { DEPOSIT: 'Nạp tiền', PAYMENT: 'Thanh toán', REFUND: 'Hoàn tiền' }
const STATUS_LABEL = { SUCCESS: 'Thành công', HELD_IN_ESCROW: 'Đang giữ Escrow', FAILED: 'Thất bại' }

export default function FinancialReports({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/financial/reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải báo cáo tài chính (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải báo cáo tài chính...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { summary, monthly, by_type, by_status, top_transactions } = data
  const maxMonthly = Math.max(1, ...monthly.map(m => Math.max(m.deposits, m.payments)))

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Báo Cáo Tài Chính" subtitle="Tổng hợp tài chính từ dữ liệu giao dịch thực (chỉ xem)" />

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Doanh thu (Thanh toán)', value: fmtMoney(summary.total_revenue),  icon: 'payments',     color: 'bg-blue-50 text-blue-600' },
          { label: 'Tổng nạp tiền',           value: fmtMoney(summary.total_deposits), icon: 'account_balance', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Hoa hồng ước tính (~10%)', value: fmtMoney(summary.total_commission_estimate), icon: 'percent', color: 'bg-purple-50 text-purple-600' },
          { label: 'Giảm giá ước tính',       value: fmtMoney(summary.total_discount_estimate), icon: 'discount', color: 'bg-red-50 text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng giao dịch', value: summary.transaction_count },
          { label: 'Lượt thanh toán', value: summary.payment_count },
          { label: 'Lượt nạp tiền',  value: summary.deposit_count },
          { label: 'Tranh chấp hoàn tiền', value: summary.refund_count },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{s.value ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-6 italic">
        * Hoa hồng và giảm giá là số liệu <strong>ước tính</strong> (không có bảng commission / coupon_usages thực tế).
        Hoàn tiền tính theo số lượng tranh chấp RESOLVED_REFUND (số tiền không được lưu trên tranh chấp).
      </p>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Theo Tháng</h3>
        </div>
        {monthly.length === 0 ? (
          <div className="p-8"><EmptyState title="Không có dữ liệu" description="Chưa có giao dịch nào." /></div>
        ) : (
          <div className="p-6 space-y-4">
            {monthly.map(m => (
              <div key={m.month}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700">{m.month}</span>
                  <span className="text-gray-400">{m.transaction_count} giao dịch</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-emerald-600 w-16">Nạp</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded" style={{ width: `${(m.deposits / maxMonthly) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-28 text-right">{fmtMoney(m.deposits)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 w-16">Thanh toán</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-blue-400 rounded" style={{ width: `${(m.payments / maxMonthly) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-28 text-right">{fmtMoney(m.payments)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type & status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Theo Loại Giao Dịch</h3>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {by_type.map(r => (
                <tr key={r.type}>
                  <td className="py-3 px-6 text-sm font-medium text-gray-700">{TYPE_LABEL[r.type] || r.type}</td>
                  <td className="py-3 px-6 text-sm text-gray-400">{r.count} GD</td>
                  <td className="py-3 px-6 text-sm font-bold text-gray-900 text-right">{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Theo Trạng Thái</h3>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {by_status.map(r => (
                <tr key={r.status}>
                  <td className="py-3 px-6"><StatusBadge status={r.status} /></td>
                  <td className="py-3 px-6 text-sm text-gray-400">{r.count} GD</td>
                  <td className="py-3 px-6 text-sm font-bold text-gray-900 text-right">{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Giao Dịch Gần Nhất ({top_transactions.length})</h3>
        </div>
        {top_transactions.length === 0 ? (
          <div className="p-8"><EmptyState title="Không có giao dịch" description="Chưa có giao dịch nào." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Người Dùng', 'Loại', 'Mô Tả', 'Số Tiền', 'Trạng Thái', 'Ngày'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {top_transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">{tx.user_name || '—'}</div>
                      <div className="text-xs text-gray-400">{tx.user_email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{TYPE_LABEL[tx.type] || tx.type}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={tx.description}>{tx.description || '—'}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(tx.amount)}</td>
                    <td className="py-3 px-4"><StatusBadge status={tx.status} /></td>
                    <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
