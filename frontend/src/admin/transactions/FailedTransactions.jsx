import { useState, useEffect } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar,
  Pagination, AvatarCell, ExportButton, EmptyState,
  usePagination, useSearch
} from './components'
import { fmtMoney, fmtDateTime } from './mockData'

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

const GATEWAYS = ['Tất cả', 'MoMo', 'VNPay', 'Bank Transfer', 'Internal Wallet']
const ERROR_CODES = ['Tất cả', 'ERR_INSUFFICIENT_FUNDS', 'ERR_TIMEOUT', 'ERR_INVALID_ACCOUNT', 'ERR_CARD_DECLINED', 'ERR_DUPLICATE', 'ERR_LIMIT_EXCEEDED', 'ERR_WALLET_FROZEN']

const GW_COLORS = {
  MoMo: 'bg-pink-50 text-pink-600',
  VNPay: 'bg-blue-50 text-blue-600',
  'Bank Transfer': 'bg-purple-50 text-purple-600',
  'Internal Wallet': 'bg-emerald-50 text-emerald-600',
}

export default function FailedTransactions({ token }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [gateway, setGateway]           = useState('Tất cả')
  const [errorCode, setErrorCode]       = useState('Tất cả')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/transactions?status=FAILED&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(rows => {
        const mapped = (Array.isArray(rows) ? rows : []).map(r => ({
          id:           r.id,
          amount:       parseFloat(r.amount) || 0,
          gateway:      r.gateway || 'Internal Wallet',
          errorCode:    r.status  || 'FAILED',
          errorMessage: r.description || 'Giao dịch thất bại',
          createdAt:    r.created_at,
          user: {
            name:   r.user_name  || 'Người dùng',
            email:  r.user_email || '',
            avatar: null,
          },
        }))
        setTransactions(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(transactions, ['id', 'user.name', 'errorCode', 'errorMessage', 'gateway'])

  const filtered = searched
    .filter(t => gateway === 'Tất cả' || t.gateway === gateway)
    .filter(t => errorCode === 'Tất cả' || t.errorCode === errorCode)

  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalTimeout     = transactions.filter(t => t.errorCode === 'ERR_TIMEOUT').length
  const totalFraud       = transactions.filter(t => ['ERR_DUPLICATE', 'ERR_WALLET_FROZEN'].includes(t.errorCode)).length
  const todayCount       = transactions.filter(t => {
    if (!t.createdAt) return false
    const d = new Date(t.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Giao Dịch Thất Bại" subtitle="Theo dõi và phân tích các giao dịch thất bại">
        <ExportButton />
      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng thất bại', value: transactions.length, icon: 'error', color: 'bg-red-50 text-red-600' },
          { label: 'Hôm nay', value: todayCount, icon: 'today', color: 'bg-amber-50 text-amber-600' },
          { label: 'Timeout', value: totalTimeout, icon: 'timer_off', color: 'bg-orange-50 text-orange-600' },
          { label: 'Gian lận tiềm năng', value: totalFraud, icon: 'warning', color: 'bg-purple-50 text-purple-600' },
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

      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cổng Thanh Toán</label>
          <select value={gateway} onChange={e => { setGateway(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 bg-white">
            {GATEWAYS.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Mã Lỗi</label>
          <select value={errorCode} onChange={e => { setErrorCode(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 bg-white min-w-[200px]">
            {ERROR_CODES.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm mã GD, người dùng, lỗi..." />

      <DataTable
        headers={['Mã GD', 'Người Dùng', 'Số Tiền', 'Cổng TT', 'Mã Lỗi', 'Thông Báo Lỗi', 'Thời Gian']}
        loading={loading}
        empty={!loading && filtered.length === 0 && <EmptyState icon="check_circle" title="Không có giao dịch thất bại" description="Tuyệt vời! Không tìm thấy giao dịch lỗi." />}
      >
        {paginated.map(t => (
          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-red-600">{t.id}</span></td>
            <td className="py-3.5 px-5"><AvatarCell name={t.user.name} avatar={t.user.avatar} email={t.user.email} /></td>
            <td className="py-3.5 px-5"><span className="text-sm font-bold text-gray-900">{fmtMoney(t.amount)}</span></td>
            <td className="py-3.5 px-5">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${GW_COLORS[t.gateway] || 'bg-gray-100 text-gray-600'}`}>
                {t.gateway}
              </span>
            </td>
            <td className="py-3.5 px-5">
              <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-mono">{t.errorCode}</code>
            </td>
            <td className="py-3.5 px-5 max-w-[250px]">
              <span className="text-sm text-gray-600">{t.errorMessage}</span>
            </td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(t.createdAt)}</span></td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
