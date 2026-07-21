import { useState, useEffect } from 'react'
import { StatusBadge, PageHeader, DataTable, SearchFilterBar, Pagination, EmptyState, usePagination, useSearch } from './components'
import { fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

const ACTION_TYPES = ['Tất cả', 'LOGIN', 'SUSPICIOUS_LOGIN']

const ACTION_ICONS = {
  LOGIN:            'login',
  SUSPICIOUS_LOGIN: 'warning',
  PAYMENT_FAILED:   'error',
  VIEW_WITHDRAWAL:  'visibility',
}

const ROLE_LABEL = {
  admin:   'Quản trị',
  tutor:   'Gia sư',
  student: 'Học sinh',
  parent:  'Phụ huynh',
}

export default function AuditLogs({ token }) {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [actionFilter, setActionFilter] = useState('Tất cả')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setLogs(data.logs || []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(logs, ['id', 'actor_name', 'actor_email', 'action', 'target', 'ip_address'])

  const filtered = searched
    .filter(l => actionFilter === 'Tất cả' || l.action === actionFilter)
    .filter(l => !dateFrom || new Date(l.created_at) >= new Date(dateFrom))
    .filter(l => !dateTo   || new Date(l.created_at) <= new Date(dateTo + 'T23:59:59'))

  const { page, setPage, totalPages, paginated } = usePagination(filtered, 10)

  const suspiciousCount = logs.filter(l => l.action === 'SUSPICIOUS_LOGIN').length

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Nhật Ký Admin" subtitle="Lịch sử đăng nhập và hoạt động xác thực hệ thống">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {/* Summary chips */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Tổng lượt đăng nhập', value: logs.length,         icon: 'history',  color: 'bg-blue-50 text-blue-600' },
            { label: 'Nghi ngờ',            value: suspiciousCount,      icon: 'warning',  color: 'bg-red-50 text-red-600' },
            { label: 'Bình thường',          value: logs.length - suspiciousCount, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
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
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Loại Hoạt Động</label>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none bg-white min-w-[180px]">
            {ACTION_TYPES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Từ Ngày</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Đến Ngày</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none" />
        </div>
        <div className="flex-1 pt-5">
          <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm tên, email, IP..." />
        </div>
      </div>

      <DataTable
        headers={['Timestamp', 'Actor', 'Vai Trò', 'Hành Động', 'User Agent', 'Địa Chỉ IP', 'Kết Quả']}
        loading={loading}
        empty={!loading && filtered.length === 0 && (
          <EmptyState icon="history" title="Không có nhật ký" description="Không tìm thấy nhật ký phù hợp." />
        )}
      >
        {paginated.map(log => (
          <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.action === 'SUSPICIOUS_LOGIN' ? 'bg-red-50/30' : ''}`}>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-500 font-mono whitespace-nowrap">{fmtDateTime(log.created_at)}</span></td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full ${log.actor_role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-outlined text-[14px] ${log.actor_role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                    {log.actor_role === 'admin' ? 'shield_person' : 'person'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{log.actor_name}</p>
                  <p className="text-xs text-gray-400">{log.actor_email}</p>
                </div>
              </div>
            </td>
            <td className="py-3.5 px-5">
              <span className="text-xs text-gray-500 capitalize">{ROLE_LABEL[log.actor_role] || log.actor_role}</span>
            </td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[16px] ${log.action === 'SUSPICIOUS_LOGIN' ? 'text-red-400' : 'text-gray-400'}`}>
                  {ACTION_ICONS[log.action] || 'history'}
                </span>
                <code className={`text-xs px-2 py-0.5 rounded font-mono ${log.action === 'SUSPICIOUS_LOGIN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {log.action}
                </code>
              </div>
            </td>
            <td className="py-3.5 px-5 max-w-[240px]">
              <span className="text-xs text-gray-500 truncate block" title={log.target}>{log.target}</span>
            </td>
            <td className="py-3.5 px-5"><code className="text-xs text-gray-500 font-mono">{log.ip_address || '—'}</code></td>
            <td className="py-3.5 px-5">
              <StatusBadge status={log.result === 'SUCCESS' ? 'SUCCESS' : log.result === 'ALERT' ? 'ALERT_CREATED' : 'FAILED'} />
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
