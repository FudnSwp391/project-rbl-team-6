import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

const CHECK_STATUS = {
  matched:     { label: 'Khớp',           cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: 'check_circle' },
  warning:     { label: 'Cảnh báo',        cls: 'bg-amber-100 text-amber-700 border border-amber-200',       icon: 'warning' },
  issue:       { label: 'Có vấn đề',       cls: 'bg-red-100 text-red-700 border border-red-200',             icon: 'error' },
  review_only: { label: 'Chỉ để xem',     cls: 'bg-sky-100 text-sky-700 border border-sky-200',             icon: 'visibility' },
}

const SEV_COLOR = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-600',
}

function CheckBadge({ status }) {
  const cfg = CHECK_STATUS[status] || CHECK_STATUS.review_only
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

export default function Reconciliation({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/financial/reconciliation`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải dữ liệu đối soát (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang thực hiện đối soát...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { summary, checks, items } = data

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Đối Soát" subtitle="Kiểm tra đối soát tài chính — chỉ đọc, không điều chỉnh dữ liệu" />

      {/* Read-only notice */}
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-sky-500 text-[20px] mt-0.5">info</span>
        <div>
          <p className="text-sm font-semibold text-sky-800 mb-1">Chế độ chỉ xem</p>
          <p className="text-sm text-sky-700">
            Các kiểm tra dưới đây chỉ đọc dữ liệu để đối chiếu — hệ thống <strong>không</strong> tự sửa số dư, giải ngân escrow,
            duyệt rút tiền hay xử lý hoàn tiền. Chênh lệch cần xử lý thủ công.
          </p>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng số dư ví',       value: fmtMoney(summary.wallet_total_balance),      icon: 'account_balance_wallet', color: 'bg-blue-50 text-blue-600' },
          { label: 'Số dư tạm giữ',        value: fmtMoney(summary.wallet_total_held_balance), icon: 'lock',        color: 'bg-purple-50 text-purple-600' },
          { label: 'Escrow (giao dịch)',   value: fmtMoney(summary.escrow_amount),             icon: 'savings',     color: 'bg-sky-50 text-sky-600' },
          { label: 'Rút tiền chờ duyệt',   value: fmtMoney(summary.withdraw_pending_amount),   icon: 'schedule',    color: 'bg-amber-50 text-amber-600' },
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

      {/* Issue/warning summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          Nạp thành công: {fmtMoney(summary.successful_deposits)}
        </span>
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          Thanh toán thành công: {fmtMoney(summary.successful_payments)}
        </span>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${summary.issue_count > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          Vấn đề: {summary.issue_count}
        </span>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${summary.unmatched_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          Cần xem xét: {summary.unmatched_count}
        </span>
      </div>

      {/* Checks cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Kiểm Tra Đối Soát ({checks.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Kiểm Tra', 'Dự Kiến', 'Thực Tế', 'Chênh Lệch', 'Trạng Thái'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {checks.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400 max-w-md">{c.description}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{fmtMoney(c.expected_amount)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{fmtMoney(c.actual_amount)}</td>
                  <td className={`py-3 px-4 text-sm font-bold whitespace-nowrap ${c.difference !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtMoney(c.difference)}
                  </td>
                  <td className="py-3 px-4"><CheckBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 uppercase">
            Mục Cần Xem Xét ({items.length})
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">— giao dịch giá trị lớn, chỉ để xem</span>
          </h3>
        </div>
        {items.length === 0 ? (
          <div className="p-8"><EmptyState title="Không có mục cần xem xét" description="Không phát hiện giao dịch bất thường." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Tiêu Đề', 'Loại', 'Mô Tả', 'Số Tiền', 'Mức Độ', 'Trạng Thái', 'Ngày'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{it.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{it.type}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={it.description}>{it.description}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SEV_COLOR[it.severity] || 'bg-gray-100 text-gray-600'}`}>
                        {it.severity === 'high' ? 'Cao' : it.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                      </span>
                    </td>
                    <td className="py-3 px-4"><CheckBadge status={it.status} /></td>
                    <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(it.created_at)}</td>
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
