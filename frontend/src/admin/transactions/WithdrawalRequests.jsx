import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const STATUS_CFG = {
  PENDING:   { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
  APPROVED:  { label: 'Đã duyệt',    cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Đã chi',      cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:  { label: 'Từ chối',     cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã hủy',      cls: 'bg-gray-100 text-gray-600' },
}

export default function WithdrawalRequests({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [busyId, setBusyId]     = useState(null)
  const limit = 50

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterStatus) qs.set('status', filterStatus)
    fetch(`${API}/api/admin/wallet/withdraw-requests?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải yêu cầu rút tiền (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, filterStatus])

  useEffect(() => { load() }, [load])

  const act = async (id, action, promptText) => {
    let body = {}
    if (action === 'reject') {
      const reason = window.prompt(promptText || 'Lý do từ chối:')
      if (reason === null) return
      body = { note: reason } // changed rejectReason to note for compatibility
    } else if (!window.confirm(promptText)) {
      return
    }
    setBusyId(id)
    try {
      const r = await fetch(`${API}/api/admin/wallet/withdraw-requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { alert(j.error || j.message || `Thao tác thất bại (${r.status})`); return }
      load()
    } catch (e) {
      alert('Lỗi kết nối máy chủ')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải yêu cầu rút tiền...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { items, pagination, summary } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Duyệt Rút Tiền Gia Sư" subtitle="Chi trả thủ công theo Withdrawal Policy V1 — tiền đã được tạm giữ khi gia sư yêu cầu" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Chờ duyệt</p>
          <p className="text-lg font-bold text-amber-700">{fmtMoney(summary?.pending_amount)}</p>
          <p className="text-[11px] text-gray-400">{summary?.pending_count ?? 0} yêu cầu</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Đã duyệt</p>
          <p className="text-lg font-bold text-blue-700">{fmtMoney(summary?.approved_amount)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">paid</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Đã chi</p>
          <p className="text-lg font-bold text-emerald-700">{fmtMoney(summary?.paid_amount)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">block</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Từ chối / Hủy</p>
          <p className="text-lg font-bold text-gray-700">{fmtMoney(Number(summary?.rejected_amount || 0) + Number(summary?.cancelled_amount || 0))}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="COMPLETED">Đã chi</option>
          <option value="REJECTED">Từ chối</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} yêu cầu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState title="Chưa có yêu cầu" description="Chưa có gia sư nào yêu cầu rút tiền." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Gia sư', 'Số tiền', 'Ngân hàng', 'Trạng thái', 'Ví (khả dụng / giữ)', 'Ghi chú', 'Thao tác'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const st = STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
                  const actionable = it.status === 'PENDING' || it.status === 'APPROVED'
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.tutor_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.tutor_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.amount)}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        <div className="font-medium">{it.bank_name || '—'}</div>
                        <div className="text-gray-400">{it.bank_account_no || ''}</div>
                        <div className="text-gray-400">{it.bank_account_name || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {fmtMoney(it.wallet_balance)} / <span className="text-amber-600">{fmtMoney(it.wallet_held_balance)}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 max-w-[180px] truncate" title={it.admin_note || it.reject_reason || ''}>
                        {it.admin_note || it.reject_reason || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {actionable ? (
                          <div className="flex gap-1.5">
                            {it.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => act(it.id, 'approve', `Duyệt yêu cầu rút ${fmtMoney(it.amount)} của ${it.tutor_name}?`)}
                                  disabled={busyId === it.id}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >Duyệt</button>
                                <button
                                  onClick={() => act(it.id, 'reject', 'Lý do từ chối yêu cầu rút tiền:')}
                                  disabled={busyId === it.id}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                                >Từ chối</button>
                              </>
                            )}
                            {it.status === 'APPROVED' && (
                              <button
                                onClick={() => act(it.id, 'mark-paid', `Xác nhận ĐÃ chuyển khoản ${fmtMoney(it.amount)} cho ${it.tutor_name}? Thao tác này không thể hoàn tác.`)}
                                disabled={busyId === it.id}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              >Đã chi</button>
                            )}
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >← Trước</button>
          <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >Sau →</button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Chi trả thủ công (không có API ngân hàng). Tiền được tạm giữ khi gia sư yêu cầu; "Đã chi" trừ khỏi số dư tạm giữ. Mọi thay đổi ví được ghi vào Sổ Cái Ví.
      </p>
    </div>
  )
}
