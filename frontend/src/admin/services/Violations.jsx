import { useState, useEffect } from 'react'
import { PageHeader, DataTable, StatusBadge, EmptyState } from '../transactions/components'

import { API_BASE_URL as API } from '../../config'

const SEV_COLOR = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low:    'bg-green-100 text-green-700 border border-green-200',
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function Violations({ token }) {
  const [violations, setViolations] = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/violations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setViolations(data.violations || [])
        setSummary({ total: data.total, by_status: data.by_status, by_severity: data.by_severity })
      })
      .catch(e => setError(`Không thể tải dữ liệu vi phạm (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  const headers = ['ID', 'Người báo cáo', 'Người bị báo cáo', 'Lý do', 'Mức độ', 'Trạng thái', 'Ngày']

  return (
    <div className="p-6">
      <PageHeader title="Báo cáo vi phạm" subtitle="Danh sách các vi phạm được ghi nhận từ hệ thống (chỉ xem)" />

      {summary && (
        <div className="flex flex-wrap gap-3 mb-6">
          <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
            Tổng: {summary.total}
          </span>
          {Object.entries(summary.by_status || {}).map(([s, n]) => (
            <span key={s} className="px-3 py-1.5 bg-blue-50 rounded-full text-sm font-medium text-blue-700">
              {s}: {n}
            </span>
          ))}
          {Object.entries(summary.by_severity || {}).map(([s, n]) => (
            <span key={s} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${SEV_COLOR[s] || 'bg-gray-100 text-gray-600'}`}>
              {s === 'high' ? 'Cao' : s === 'medium' ? 'TB' : 'Thấp'}: {n}
            </span>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <DataTable
          headers={headers}
          empty={violations.length === 0
            ? <EmptyState title="Không có vi phạm" description="Hiện tại không có báo cáo vi phạm nào." />
            : null}
        >
          {violations.map(v => (
            <tr key={v.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-5 text-xs font-mono text-gray-500">{v.id.slice(0, 8)}…</td>
              <td className="py-3 px-5">
                <div className="text-sm font-medium text-gray-900">{v.reporter_name || '—'}</div>
                <div className="text-xs text-gray-400">{v.reporter_email || ''}</div>
              </td>
              <td className="py-3 px-5">
                <div className="text-sm font-medium text-gray-900">{v.accused_name || '—'}</div>
                <div className="text-xs text-gray-400">{v.accused_email || ''}</div>
              </td>
              <td className="py-3 px-5 text-sm text-gray-600 max-w-xs truncate" title={v.reason}>{v.reason || '—'}</td>
              <td className="py-3 px-5">
                {v.severity
                  ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SEV_COLOR[v.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {v.severity === 'high' ? 'Cao' : v.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  : '—'}
              </td>
              <td className="py-3 px-5"><StatusBadge status={v.status} /></td>
              <td className="py-3 px-5 text-sm text-gray-500 whitespace-nowrap">{fmtDate(v.created_at)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
