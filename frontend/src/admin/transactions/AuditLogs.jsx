import { useState } from 'react'
import { StatusBadge, PageHeader, DataTable, SearchFilterBar, Pagination, ExportButton, EmptyState, usePagination, useSearch } from './components'
import { AUDIT_LOGS, fmtDateTime } from './mockData'

const ACTION_TYPES = ['Tất cả', 'APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL', 'RESOLVE_DISPUTE', 'RELEASE_ESCROW', 'UPDATE_COMMISSION', 'FRAUD_DETECTION', 'APPROVE_REFUND', 'REJECT_REFUND']

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState('Tất cả')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { search, setSearch, filtered: searched } = useSearch(AUDIT_LOGS, ['id', 'actor', 'action', 'target', 'ipAddress'])

  const filtered = searched
    .filter(l => actionFilter === 'Tất cả' || l.action === actionFilter)
    .filter(l => !dateFrom || new Date(l.timestamp) >= new Date(dateFrom))
    .filter(l => !dateTo || new Date(l.timestamp) <= new Date(dateTo + 'T23:59:59'))

  const { page, setPage, totalPages, paginated } = usePagination(filtered, 10)

  const ACTION_ICONS = {
    APPROVE_WITHDRAWAL: 'check_circle',
    REJECT_WITHDRAWAL: 'cancel',
    RESOLVE_DISPUTE: 'gavel',
    RELEASE_ESCROW: 'payments',
    UPDATE_COMMISSION: 'percent',
    FRAUD_DETECTION: 'warning',
    APPROVE_REFUND: 'undo',
    REJECT_REFUND: 'block',
    PAYMENT_FAILED: 'error',
    VIEW_WITHDRAWAL: 'visibility',
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Nhật Ký Admin" subtitle="Nhật ký toàn bộ hoạt động quản trị trên hệ thống">
        <ExportButton label="Xuất Log" />
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Loại Hành Động</label>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none bg-white min-w-[200px]">
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
          <SearchFilterBar search={search} onSearch={v => { setSearch(v); setPage(1) }} placeholder="Tìm actor, action, target, IP..." />
        </div>
      </div>

      <DataTable
        headers={['Timestamp', 'Actor', 'Hành Động', 'Mục Tiêu', 'Địa Chỉ IP', 'Kết Quả']}
        loading={false}
        empty={filtered.length === 0 && <EmptyState icon="history" title="Không có nhật ký" description="Không tìm thấy nhật ký phù hợp." />}
      >
        {paginated.map(log => (
          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs text-gray-500 font-mono">{fmtDateTime(log.timestamp)}</span></td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full ${log.actor === 'System' ? 'bg-purple-100' : 'bg-blue-100'} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-[14px] ${log.actor === 'System' ? 'text-purple-600' : 'text-blue-600'}`}>{log.actor === 'System' ? 'computer' : 'person'}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800">{log.actor}</span>
              </div>
            </td>
            <td className="py-3.5 px-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-gray-400">{ACTION_ICONS[log.action] || 'history'}</span>
                <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{log.action}</code>
              </div>
            </td>
            <td className="py-3.5 px-5 max-w-[200px]"><span className="text-sm text-gray-600 truncate block">{log.target}</span></td>
            <td className="py-3.5 px-5"><code className="text-xs text-gray-500 font-mono">{log.ipAddress}</code></td>
            <td className="py-3.5 px-5"><StatusBadge status={log.result === 'SUCCESS' ? 'SUCCESS' : log.result === 'FAILED' ? 'FAILED' : 'ALERT_CREATED'} /></td>
          </tr>
        ))}
      </DataTable>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  )
}
