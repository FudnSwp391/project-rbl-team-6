import { useState, useEffect } from 'react'
import { StatusBadge, PageHeader, EmptyState } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'

const SOURCE_LABEL = { course: 'Khóa học', lesson: 'Đặt lịch', payment: 'Thanh toán' }
const SOURCE_COLOR = {
  course:  'bg-blue-50 text-blue-700',
  lesson:  'bg-purple-50 text-purple-700',
  payment: 'bg-gray-50 text-gray-600',
}

export default function CommissionManagement({ token }) {
  const [summary, setSummary]     = useState(null)
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/commissions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setSummary(data.summary); setRows(data.commissions || []) })
      .catch(e => setError(`Không thể tải dữ liệu hoa hồng (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  const isTracked = summary?.source === 'commission_logs'

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Quản Lý Hoa Hồng"
        subtitle={isTracked
          ? 'Dữ liệu hoa hồng thực từ commission_logs (chỉ xem)'
          : 'Dữ liệu hoa hồng ước tính từ giao dịch thực — tỷ lệ 10% cố định (chỉ xem)'}
      />

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(isTracked ? [
            { label: 'Tổng doanh thu',            value: fmtMoney(summary.total_gross_earned),       icon: 'payments',      color: 'bg-blue-50 text-blue-600' },
            { label: 'Hoa hồng nền tảng',         value: fmtMoney(summary.net_platform_commission),  icon: 'percent',       color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Thu nhập gia sư',           value: fmtMoney(summary.total_tutor_earned),        icon: 'account_balance_wallet', color: 'bg-purple-50 text-purple-600' },
            { label: 'Số giao dịch',              value: summary.total_events,                        icon: 'receipt_long',  color: 'bg-amber-50 text-amber-600' },
          ] : [
            { label: 'Tổng doanh thu',            value: fmtMoney(summary.total_gross_revenue),            icon: 'payments',      color: 'bg-blue-50 text-blue-600' },
            { label: 'Hoa hồng nền tảng (~10%)',  value: fmtMoney(summary.estimated_platform_commission), icon: 'percent',       color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Thu nhập gia sư (~90%)',    value: fmtMoney(summary.estimated_tutor_earnings),       icon: 'account_balance_wallet', color: 'bg-purple-50 text-purple-600' },
            { label: 'Số giao dịch',              value: summary.total_payment_count,                      icon: 'receipt_long',  color: 'bg-amber-50 text-amber-600' },
          ]).map(c => (
            <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
              <p className="text-lg font-bold text-gray-900">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Đang tải...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 uppercase">
              Chi Tiết Giao Dịch ({rows.length})
              <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                — hoa hồng ước tính, không có bảng commission thực tế
              </span>
            </h3>
          </div>

          {rows.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Không có giao dịch" description="Chưa có giao dịch thanh toán nào." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Học Sinh', 'Khoá / Mô Tả', 'Loại', 'Doanh Thu', 'Hoa Hồng (~10%)', 'Gia Sư nhận (~90%)', 'Trạng Thái', 'Ngày'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(cm => (
                    <tr key={cm.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{cm.student_name || '—'}</div>
                        <div className="text-xs text-gray-400">{cm.student_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-sm text-gray-700 line-clamp-2" title={cm.course_title}>{cm.course_title || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLOR[cm.source] || 'bg-gray-50 text-gray-600'}`}>
                          {SOURCE_LABEL[cm.source] || cm.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(cm.gross_amount)}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">{fmtMoney(cm.platform_commission)}</td>
                      <td className="py-3 px-4 font-semibold text-blue-600 whitespace-nowrap">{fmtMoney(cm.tutor_earning)}</td>
                      <td className="py-3 px-4"><StatusBadge status={cm.status} /></td>
                      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(cm.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
