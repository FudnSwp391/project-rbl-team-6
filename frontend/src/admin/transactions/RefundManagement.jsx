import { useState, useEffect } from 'react'
import {
  StatusBadge, PageHeader, DataTable, SearchFilterBar, FilterTabs,
  Pagination, AvatarCell, EmptyState,
  usePagination, useSearch
} from './components'
import { fmtMoney, fmtDateTime } from './mockData'

import { API_BASE_URL as API } from '../../config'

const STATUS_TABS = [
  { value: 'ALL',      label: 'Tất cả' },
  { value: 'APPROVED', label: 'Đã hoàn tiền' },
  { value: 'PENDING',  label: 'Chờ xử lý' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function mapStatus(s) {
  if (!s) return 'PENDING'
  if (s === 'RESOLVED_REFUND') return 'APPROVED'
  return s.toUpperCase()
}

function mapRow(r) {
  return {
    id:          r.id,
    user:        { name: r.user_name || 'Người dùng', email: r.user_email || '', avatar: null, isBanned: !!r.user_is_banned },
    courseTitle: r.course_title || '—',
    reason:      r.reason       || '—',
    amount:      parseFloat(r.amount) || 0,
    status:      mapStatus(r.status),
    adminNote:   r.admin_note   || '',
    requestDate: r.created_at,
    resolvedAt:  r.resolved_at,
    evidenceUrls: Array.isArray(r.evidence_urls) ? r.evidence_urls : [],
    source:      'dispute',
    requesterHistory: {
      total: r.requester_dispute_total || 0,
      won:   r.requester_dispute_won   || 0,
      lost:  r.requester_dispute_lost  || 0,
      open:  r.requester_dispute_open  || 0,
      fraudFlags: r.requester_fraud_flags || 0,
    },
  }
}

// Chỉ hiện khi có tín hiệu đáng chú ý (>1 tranh chấp trước, có thua, có cờ
// gian lận, hoặc bị khóa) — tránh làm rối bảng với dòng "Thắng 1/1" vô nghĩa
// cho người mới tranh chấp lần đầu.
function RequesterTrustBadge({ user, history }) {
  const notable = user.isBanned || history.fraudFlags > 0 || history.total > 1
  if (!notable) return null
  const lossHeavy = history.total > 0 && history.lost > history.won
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {user.isBanned && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
          <span className="material-symbols-outlined text-[11px]">block</span>Đã bị khóa
        </span>
      )}
      {history.fraudFlags > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
          <span className="material-symbols-outlined text-[11px]">shield_person</span>{history.fraudFlags} cờ gian lận
        </span>
      )}
      {history.total > 1 && (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${lossHeavy ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
          title={`Trong ${history.total} tranh chấp từng gửi: ${history.won} được hoàn tiền, ${history.lost} bị từ chối (giải ngân cho gia sư), ${history.open} đang mở.`}
        >
          <span className="material-symbols-outlined text-[11px]">gavel</span>
          Thắng {history.won}/{history.total} tranh chấp trước
        </span>
      )}
    </div>
  )
}

export default function RefundManagement({ token }) {
  const [refunds,      setRefunds]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/transactions/refunds`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setRefunds((data.refunds || []).map(mapRow))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const { search, setSearch, filtered: searched } = useSearch(refunds, ['id', 'user.name', 'courseTitle', 'reason'])
  const filtered = statusFilter === 'ALL' ? searched : searched.filter(r => r.status === statusFilter)
  const { page, setPage, totalPages, paginated } = usePagination(filtered, 8)

  const totalApproved = refunds.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.amount, 0)
  const totalPending  = refunds.filter(r => r.status === 'PENDING').reduce((s, r)  => s + r.amount, 0)

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Quản Lý Hoàn Tiền" subtitle="Danh sách hoàn tiền từ tranh chấp khóa học (chỉ xem)">      </PageHeader>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng yêu cầu',   value: loading ? '—' : refunds.length,                                                    icon: 'undo',        color: 'bg-blue-50 text-blue-600' },
          { label: 'Chờ xử lý',      value: loading ? '—' : refunds.filter(r => r.status === 'PENDING').length,                icon: 'schedule',    color: 'bg-amber-50 text-amber-600' },
          { label: 'Đã hoàn tiền',   value: loading ? '—' : fmtMoney(totalApproved),                                           icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Đang xử lý',     value: loading ? '—' : fmtMoney(totalPending),                                            icon: 'hourglass',   color: 'bg-purple-50 text-purple-600' },
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

      <FilterTabs
        tabs={STATUS_TABS.map(t => ({ ...t, count: t.value === 'ALL' ? refunds.length : refunds.filter(r => r.status === t.value).length }))}
        active={statusFilter}
        onChange={v => { setStatusFilter(v); setPage(1) }}
      />
      <SearchFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1) }}
        placeholder="Tìm mã, người dùng, khóa học, lý do..."
      />

      <DataTable
        headers={['Mã', 'Người Dùng', 'Khóa Học', 'Lý Do', 'Số Tiền', 'Ngày YC', 'Ghi Chú Admin', 'Trạng Thái', 'Bằng Chứng']}
        loading={loading}
        empty={!loading && filtered.length === 0 && (
          <EmptyState icon="undo" title="Không có yêu cầu hoàn tiền" description="Không tìm thấy yêu cầu phù hợp." />
        )}
      >
        {paginated.map(r => (
          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-3.5 px-5"><span className="text-xs font-mono font-bold text-blue-600">{r.id}</span></td>
            <td className="py-3.5 px-5">
              <AvatarCell name={r.user.name} email={r.user.email} avatar={r.user.avatar} />
              <RequesterTrustBadge user={r.user} history={r.requesterHistory} />
            </td>
            <td className="py-3.5 px-5">
              <span className="text-sm font-semibold text-gray-800 max-w-[180px] truncate block">{r.courseTitle}</span>
            </td>
            <td className="py-3.5 px-5 max-w-[200px]">
              <span className="text-sm text-gray-700 line-clamp-2">{r.reason}</span>
            </td>
            <td className="py-3.5 px-5">
              <span className="text-sm font-bold text-red-600">-{fmtMoney(r.amount)}</span>
            </td>
            <td className="py-3.5 px-5"><span className="text-xs text-gray-400">{fmtDateTime(r.requestDate)}</span></td>
            <td className="py-3.5 px-5 max-w-[200px]">
              {r.adminNote
                ? <span className="text-xs text-gray-500 italic line-clamp-2">{r.adminNote}</span>
                : <span className="text-gray-300">—</span>
              }
            </td>
            <td className="py-3.5 px-5"><StatusBadge status={r.status} /></td>
            <td className="py-3.5 px-5">
              {r.evidenceUrls.length > 0
                ? <div className="flex flex-wrap items-center gap-1 max-w-[140px]">
                    <span className="material-symbols-outlined text-[14px] text-blue-600">attach_file</span>
                    {r.evidenceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        Xem{r.evidenceUrls.length > 1 ? ` #${i + 1}` : ''}
                      </a>
                    ))}
                  </div>
                : <span className="text-gray-300">—</span>
              }
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
