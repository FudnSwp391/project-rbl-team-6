import { useState, useEffect, useCallback } from 'react'
import { PageHeader, EmptyState } from './components'

import { API_BASE_URL as API } from '../../config'

const fmtMoney = n => 'đ' + Number(n || 0).toLocaleString('vi-VN')
const fmtDate  = iso => iso
  ? new Date(iso).toLocaleDateString('vi-VN') + ' ' + new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const BALANCE_LABEL = { balance: 'Số dư', held_balance: 'Tạm giữ' }

const DIRECTION_CFG = {
  credit: { label: '+ Cộng', cls: 'bg-emerald-100 text-emerald-700' },
  debit:  { label: '− Trừ',  cls: 'bg-red-100 text-red-700' },
}

export default function WalletLedger({ token }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [page, setPage]         = useState(1)
  const [filterReason, setFilterReason] = useState('')
  const [filterDir, setFilterDir]       = useState('')

  const [integrity, setIntegrity]         = useState(null)
  const [integrityLoading, setIntegrityLoading] = useState(false)
  const limit = 50

  const load = useCallback(() => {
    if (!token) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filterReason) qs.set('reasonCode', filterReason)
    if (filterDir)    qs.set('direction', filterDir)
    fetch(`${API}/api/admin/wallet-ledger?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải sổ cái ví (${e})`))
      .finally(() => setLoading(false))
  }, [token, page, filterReason, filterDir])

  useEffect(() => { load() }, [load])

  const checkIntegrity = () => {
    setIntegrityLoading(true)
    fetch(`${API}/api/admin/wallet-integrity`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setIntegrity(d))
      .catch(e => setIntegrity({ error: `Lỗi kiểm tra (${e})` }))
      .finally(() => setIntegrityLoading(false))
  }

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải sổ cái ví...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { items, pagination } = data
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / limit))
  const reasonCodes = [...new Set(items.map(i => i.reason_code))].sort()

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Sổ Cái Ví" subtitle="Nhật ký bất biến mọi thay đổi số dư ví — chỉ đọc, ghi tự động bằng trigger" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Tổng bút toán</p>
          <p className="text-lg font-bold text-gray-900">{pagination?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[18px]">category</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Loại lý do (trang này)</p>
          <p className="text-lg font-bold text-gray-900">{reasonCodes.length}</p>
        </div>
        <div className={`rounded-xl p-5 shadow-sm border ${integrity && !integrity.error ? (integrity.summary.discrepancies > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200') : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">balance</span>
            </div>
            <button
              onClick={checkIntegrity}
              disabled={integrityLoading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {integrityLoading ? 'Đang kiểm tra...' : 'Kiểm tra toàn vẹn'}
            </button>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Chênh lệch ví/sổ cái</p>
          {integrity
            ? integrity.error
              ? <p className="text-sm font-bold text-red-600">{integrity.error}</p>
              : <p className={`text-lg font-bold ${integrity.summary.discrepancies > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {integrity.summary.discrepancies} / {integrity.summary.wallets_checked} ví lệch
                </p>
            : <p className="text-sm text-gray-400">Chưa kiểm tra</p>}
        </div>
      </div>

      {/* Integrity discrepancy detail */}
      {integrity && !integrity.error && integrity.items.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-bold text-red-800 mb-2">Ví có chênh lệch ({integrity.items.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-red-700">
                  {['Chủ ví', 'Số dư thực', 'Số dư kỳ vọng', 'Lệch', 'Tạm giữ thực', 'Tạm giữ kỳ vọng', 'Lệch'].map(h => (
                    <th key={h} className="py-1 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {integrity.items.map(it => (
                  <tr key={it.wallet_id} className="border-t border-red-100">
                    <td className="py-1 px-2">{it.owner_name || it.wallet_id.slice(0, 8)}</td>
                    <td className="py-1 px-2">{fmtMoney(it.actual_balance)}</td>
                    <td className="py-1 px-2">{fmtMoney(it.expected_balance)}</td>
                    <td className="py-1 px-2 font-bold text-red-700">{fmtMoney(it.diff_balance)}</td>
                    <td className="py-1 px-2">{fmtMoney(it.actual_held_balance)}</td>
                    <td className="py-1 px-2">{fmtMoney(it.expected_held_balance)}</td>
                    <td className="py-1 px-2 font-bold text-red-700">{fmtMoney(it.diff_held_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterReason}
          onChange={e => { setFilterReason(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả lý do (trang này)</option>
          {reasonCodes.map(rc => <option key={rc} value={rc}>{rc}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filterDir}
          onChange={e => { setFilterDir(e.target.value); setPage(1) }}
        >
          <option value="">Cộng & Trừ</option>
          <option value="credit">Chỉ Cộng</option>
          <option value="debit">Chỉ Trừ</option>
        </select>
        <span className="ml-auto self-center text-xs text-gray-400">{pagination?.total ?? 0} bút toán</span>
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10"><EmptyState title="Chưa có bút toán" description="Sổ cái ví chưa ghi nhận thay đổi nào." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Thời gian', 'Chủ ví', 'Loại', 'Chiều', 'Số tiền', 'Trước → Sau', 'Lý do', 'Nguồn'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => {
                  const dir = DIRECTION_CFG[it.direction] || { label: it.direction, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{it.owner_name || '—'}</div>
                        <div className="text-xs text-gray-400">{it.owner_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">{BALANCE_LABEL[it.balance_type] || it.balance_type}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${dir.cls}`}>{dir.label}</span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">{fmtMoney(it.amount)}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtMoney(it.balance_before)} → {fmtMoney(it.balance_after)}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono text-gray-700">{it.reason_code}</span>
                        {it.reference_type && <div className="text-[10px] text-gray-400">{it.reference_type}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{it.source}</td>
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
        * Mỗi thay đổi số dư/tạm giữ ví được ghi tự động bằng DB trigger (append-only). Số dư mở đầu được gắn nhãn <code>OPENING_BALANCE</code>.
      </p>
    </div>
  )
}
