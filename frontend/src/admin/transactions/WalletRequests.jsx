import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, EmptyState, KpiCard } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const WITHDRAW_STATUS_CFG = {
  PENDING:   { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
  APPROVED:  { label: 'Đã duyệt',    cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Đã chi',      cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:  { label: 'Từ chối',     cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã hủy',      cls: 'bg-gray-100 text-gray-600' },
}
const DEPOSIT_STATUS_CFG = {
  PENDING:   { label: 'Chờ duyệt',   cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Đã duyệt',    cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:  { label: 'Từ chối',     cls: 'bg-red-100 text-red-700' },
}

const TABS = [
  { id: 'withdraw', label: 'Yêu cầu Rút tiền', icon: 'account_balance' },
  { id: 'deposit',  label: 'Yêu cầu Nạp tiền',  icon: 'payments' },
  { id: 'bank-accounts', label: 'Tài khoản Ngân hàng', icon: 'credit_card' },
]

export default function WalletRequests({ token }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem('admin_wallet_tab') || 'withdraw')

  useEffect(() => {
    sessionStorage.setItem('admin_wallet_tab', tab)
  }, [tab])

  useEffect(() => {
    const handleTabChange = () => {
      const stored = sessionStorage.getItem('admin_wallet_tab')
      if (stored && stored !== tab) setTab(stored)
    }
    window.addEventListener('admin_wallet_tab_changed', handleTabChange)
    return () => window.removeEventListener('admin_wallet_tab_changed', handleTabChange)
  }, [tab])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Duyệt giao dịch Ví" subtitle="Duyệt yêu cầu nạp/rút tiền thủ công của học sinh và gia sư" />

      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'withdraw' ? <WithdrawTab token={token} /> : tab === 'deposit' ? <DepositTab token={token} /> : <BankAccountsTab token={token} />}
    </div>
  )
}

// ═══ Rút tiền (withdraw_requests, server-paginated + server-summarized) ═══════
function WithdrawTab({ token }) {
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
      body = { note: reason }
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
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="hourglass_top" label="Chờ duyệt" value={fmtMoney(summary?.pending_amount)} subtitle={`${summary?.pending_count ?? 0} yêu cầu`} color="amber" />
        <KpiCard icon="task_alt" label="Đã duyệt" value={fmtMoney(summary?.approved_amount)} color="blue" />
        <KpiCard icon="paid" label="Đã chi" value={fmtMoney(summary?.paid_amount)} color="green" />
        <KpiCard icon="block" label="Từ chối / Hủy" value={fmtMoney(Number(summary?.rejected_amount || 0) + Number(summary?.cancelled_amount || 0))} color="red" />
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
                  const st = WITHDRAW_STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
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
    </>
  )
}

// ═══ Nạp tiền (deposit_requests — low volume, fetched flat + summarized client-side) ═══
function DepositTab({ token }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [busyId, setBusyId]   = useState(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    fetch(`${API}/api/admin/wallet/deposit-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(e => setError(`Không thể tải yêu cầu nạp tiền (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const summary = useMemo(() => {
    const s = { pending_amount: 0, pending_count: 0, completed_amount: 0, rejected_amount: 0 }
    for (const it of items) {
      const amt = Number(it.amount || 0)
      if (it.status === 'PENDING')   { s.pending_amount += amt; s.pending_count += 1 }
      if (it.status === 'COMPLETED') s.completed_amount += amt
      if (it.status === 'REJECTED')  s.rejected_amount += amt
    }
    return s
  }, [items])

  const visible = filterStatus ? items.filter(it => it.status === filterStatus) : items

  const act = async (id, action, promptText) => {
    let body = {}
    if (action === 'reject') {
      const reason = window.prompt(promptText || 'Lý do từ chối:')
      if (reason === null) return
      body = { note: reason }
    } else if (!window.confirm(promptText)) {
      return
    }
    setBusyId(id)
    try {
      const r = await fetch(`${API}/api/admin/wallet/deposit-requests/${id}/${action}`, {
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

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải yêu cầu nạp tiền...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard icon="hourglass_top" label="Chờ duyệt" value={fmtMoney(summary.pending_amount)} subtitle={`${summary.pending_count} yêu cầu`} color="amber" />
        <KpiCard icon="task_alt" label="Đã duyệt" value={fmtMoney(summary.completed_amount)} color="green" />
        <KpiCard icon="block" label="Từ chối" value={fmtMoney(summary.rejected_amount)} color="red" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="COMPLETED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{visible.length} yêu cầu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-10"><EmptyState title="Chưa có yêu cầu" description="Chưa có yêu cầu nạp tiền nào." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Người dùng', 'Số tiền', 'Phương thức', 'Trạng thái', 'Số dư ví', 'Ghi chú', 'Thao tác'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(it => {
                  const st = DEPOSIT_STATUS_CFG[it.status] || { label: it.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.full_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.amount)}</td>
                      <td className="py-3 px-4 text-xs text-gray-600 font-medium">{it.method || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtMoney(it.wallet_balance)}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 max-w-[180px] truncate" title={it.admin_note || ''}>
                        {it.admin_note || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {it.status === 'PENDING' ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => act(it.id, 'approve', `Duyệt yêu cầu nạp ${fmtMoney(it.amount)} cho ${it.full_name}?`)}
                              disabled={busyId === it.id}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >Duyệt</button>
                            <button
                              onClick={() => act(it.id, 'reject', 'Lý do từ chối yêu cầu nạp tiền:')}
                              disabled={busyId === it.id}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >Từ chối</button>
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
      </div>

      <p className="text-xs text-gray-400 mt-4 italic">
        * Luồng nạp tiền thủ công (chuyển khoản/ví điện tử tự khai báo) — không phải luồng VNPay chính, vốn cộng tiền tự động qua webhook không cần duyệt.
      </p>
    </>
  )
}
// ═══ Tài khoản ngân hàng (Bank Accounts) ═══════
function BankAccountsTab({ token }) {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busyId, setBusyId]     = useState(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    fetch(`${API}/api/admin/wallet/bank-accounts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d.bankAccounts || []))
      .catch(e => setError(`Không thể tải tài khoản ngân hàng (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const act = async (id, action, promptText) => {
    let body = {}
    if (action === 'reject') {
      const reason = window.prompt(promptText || 'Lý do từ chối:')
      if (reason === null) return
      body = { note: reason }
    } else if (!window.confirm(promptText)) {
      return
    }
    setBusyId(id)
    try {
      const r = await fetch(`${API}/api/admin/wallet/bank-accounts/${id}/${action}`, {
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

  if (loading && !data.length) return <div className="text-center p-8 text-gray-500">Đang tải tài khoản ngân hàng...</div>
  if (error) return <div className="text-center p-8 text-red-500 font-medium">{error}</div>

  const pending = data.filter(a => a.status === 'PENDING')
  const others = data.filter(a => a.status !== 'PENDING')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard title="Đang chờ duyệt" value={pending.length} icon="hourglass_empty" colorClass="text-amber-600 bg-amber-50" />
        <KpiCard title="Đã duyệt" value={others.filter(a => a.status === 'APPROVED').length} icon="check_circle" colorClass="text-blue-600 bg-blue-50" />
        <KpiCard title="Bị từ chối" value={others.filter(a => a.status === 'REJECTED').length} icon="cancel" colorClass="text-red-600 bg-red-50" />
      </div>

      {!data.length ? (
        <EmptyState icon="credit_card" title="Chưa có tài khoản ngân hàng nào" desc="Hiện không có yêu cầu xác minh tài khoản nào trong hệ thống." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Tutor</th>
                <th className="px-4 py-3 font-semibold">Ngân hàng</th>
                <th className="px-4 py-3 font-semibold">Số tài khoản</th>
                <th className="px-4 py-3 font-semibold">Chủ tài khoản</th>
                <th className="px-4 py-3 font-semibold">Thời gian thêm</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(req => {
                const cfg = WITHDRAW_STATUS_CFG[req.status] || { label: req.status, cls: 'bg-gray-100' }
                return (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{req.tutor_name || '—'}</div>
                      <div className="text-xs text-gray-500">{req.tutor_email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{req.bank_name}</td>
                    <td className="px-4 py-3 text-gray-700">{req.account_number}</td>
                    <td className="px-4 py-3 text-gray-700">{req.account_holder}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(req.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                      {req.rejection_reason && (
                        <div className="mt-1 text-[10px] text-red-500 max-w-[150px] truncate" title={req.rejection_reason}>
                          Lý do: {req.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              disabled={busyId === req.id}
                              onClick={() => act(req.id, 'approve', 'Duyệt tài khoản này?')}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              Duyệt
                            </button>
                            <button
                              disabled={busyId === req.id}
                              onClick={() => act(req.id, 'reject', 'Nhập lý do từ chối tài khoản này:')}
                              className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                        {req.status !== 'PENDING' && <span className="text-gray-400 text-xs italic">Không có thao tác</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
