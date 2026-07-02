import { useState, useEffect } from 'react'
import { StatusBadge, PageHeader, EmptyState } from './components'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'

export default function PromotionTransactions({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/promotion-transactions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải dữ liệu khuyến mãi (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  const summary   = data?.summary     || {}
  const promos    = data?.promotions  || []
  const txList    = data?.transactions || []

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Khuyến Mãi" subtitle="Danh sách mã giảm giá và giao dịch có sử dụng khuyến mãi (chỉ xem)" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng mã khuyến mãi', value: summary.total_promotions ?? '—', icon: 'local_offer',  color: 'bg-blue-50 text-blue-600' },
          { label: 'Đang hoạt động',      value: summary.active_promotions ?? '—', icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Lượt dùng phát hiện', value: summary.total_usage ?? '—',       icon: 'people',       color: 'bg-purple-50 text-purple-600' },
          { label: 'Tổng giảm giá',       value: fmtMoney(summary.total_discount_amount), icon: 'discount', color: 'bg-red-50 text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </div>
        ))}
      </div>

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
        <>
          {/* Promotions / Coupons table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Mã Khuyến Mãi ({promos.length})</h3>
            </div>
            {promos.length === 0 ? (
              <div className="p-8">
                <EmptyState title="Không có mã khuyến mãi" description="Chưa có mã giảm giá nào trong hệ thống." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Mã', 'Mô Tả', 'Loại', 'Giá Trị', 'Giảm Tối Đa', 'Đơn Tối Thiểu', 'Trạng Thái', 'Hết Hạn'].map(h => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {promos.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono font-bold">{p.code}</code>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate" title={p.name}>{p.name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.type === 'percent' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.type === 'percent' ? 'Phần trăm' : 'Cố định'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-red-600">
                          {p.type === 'percent' ? `${p.value}%` : fmtMoney(p.value)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{p.max_discount ? fmtMoney(p.max_discount) : '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{p.min_order ? fmtMoney(p.min_order) : '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.active ? 'Đang hoạt động' : 'Không hoạt động'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{p.expires_at ? fmtDate(p.expires_at) : 'Không giới hạn'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Discount transactions table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                Giao Dịch Có Giảm Giá ({txList.length})
                <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                  — phát hiện từ mô tả giao dịch (không có bảng coupon_usages)
                </span>
              </h3>
            </div>
            {txList.length === 0 ? (
              <div className="p-8">
                <EmptyState title="Không tìm thấy giao dịch giảm giá" description="Không có dữ liệu sử dụng mã giảm giá trong hệ thống." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Người Dùng', 'Mô Tả', 'Gốc (Ước Tính)', 'Giảm Giá', 'Thanh Toán', 'Trạng Thái', 'Ngày'].map(h => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {txList.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900">{t.user_name || '—'}</div>
                          <div className="text-xs text-gray-400">{t.user_email || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={t.promotion_name}>{t.promotion_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 line-through">{fmtMoney(t.original_amount)}</td>
                        <td className="py-3 px-4 font-bold text-red-600">-{fmtMoney(t.discount_amount)}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{fmtMoney(t.final_amount)}</td>
                        <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(t.used_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
