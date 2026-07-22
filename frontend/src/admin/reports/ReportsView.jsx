import { useState, useEffect } from 'react'
import { PageHeader, KpiCard, EmptyState } from '../transactions/components'

import { API_BASE_URL as API } from '../../config'
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'

const COMPLAINT_STATUS_LABEL = {
  pending:         'Đang chờ',
  processing:      'Đang xử lý',
  waiting_student: 'Chờ HS',
  waiting_tutor:   'Chờ GS',
  resolved:        'Đã giải quyết',
  rejected:        'Từ chối',
  closed:          'Đã đóng',
}
const COMPLAINT_STATUS_CLS = {
  pending:         'bg-amber-50 text-amber-700 border-amber-100',
  processing:      'bg-blue-50 text-blue-700 border-blue-100',
  waiting_student: 'bg-violet-50 text-violet-700 border-violet-100',
  waiting_tutor:   'bg-orange-50 text-orange-700 border-orange-100',
  resolved:        'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected:        'bg-red-50 text-red-700 border-red-100',
  closed:          'bg-gray-100 text-gray-600 border-gray-200',
}
const COMPLAINT_CATEGORY_LABEL = {
  tutor_behavior:  'Gia sư',
  content_quality: 'Nội dung',
  technical:       'Kỹ thuật',
  payment:         'Thanh toán',
  other:           'Khác',
}

function CBadge({ status }) {
  const cls = COMPLAINT_STATUS_CLS[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {COMPLAINT_STATUS_LABEL[status] || status}
    </span>
  )
}

const DISPUTE_STATUS_LABEL = {
  OPEN:             'Đang mở',
  RESOLVED_REFUND:  'Hoàn tiền',
  RESOLVED_RELEASE: 'Giải ngân',
  RESOLVED_PARTIAL: 'Một phần',
  DISMISSED:        'Bác bỏ',
  WITHDRAWN:        'Đã rút',
}
const DISPUTE_STATUS_CLS = {
  OPEN:             'bg-orange-100 text-orange-700 border-orange-200',
  RESOLVED_REFUND:  'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED_RELEASE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RESOLVED_PARTIAL: 'bg-teal-50 text-teal-700 border-teal-100',
  DISMISSED:        'bg-gray-100 text-gray-600 border-gray-200',
  WITHDRAWN:        'bg-gray-100 text-gray-500 border-gray-200',
}

function DBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const cls = DISPUTE_STATUS_CLS[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {DISPUTE_STATUS_LABEL[status] || status}
    </span>
  )
}

function StatPills({ map, labelMap, clsMap }) {
  const entries = Object.entries(map).filter(([, v]) => v > 0)
  if (entries.length === 0) return null
  return (
    <div className="flex gap-2 flex-wrap">
      {entries.map(([s, v]) => (
        <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${clsMap[s] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {labelMap[s] || s}: {v}
        </span>
      ))}
    </div>
  )
}

export default function ReportsView({ token }) {
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [complaints, setComplaints]   = useState([])
  const [cStats, setCStats]           = useState({})
  const [disputes, setDisputes]       = useState([])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/api/admin/course-complaints?limit=50`, { headers: h })
        .then(r => r.ok ? r.json() : Promise.reject('course-complaints')),
      fetch(`${API}/api/admin/disputes`, { headers: h })
        .then(r => r.ok ? r.json() : Promise.reject('disputes')),
    ])
      .then(([cc, disp]) => {
        setComplaints(cc.complaints || [])
        setCStats(cc.stats || {})
        setDisputes(disp.disputes || [])
      })
      .catch(e => setError(`Không thể tải dữ liệu báo cáo (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  const totalComplaints    = Object.values(cStats).reduce((s, n) => s + Number(n), 0)
  const pendingComplaints  = ['pending', 'processing', 'waiting_student', 'waiting_tutor']
    .reduce((s, k) => s + (Number(cStats[k]) || 0), 0)
  const openDisputes       = disputes.filter(d => d.status === 'OPEN' && !d.withdrawn_at).length

  const disputeByStatus = disputes.reduce((acc, d) => {
    const key = d.withdrawn_at ? 'WITHDRAWN' : (d.status || 'OPEN')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải dữ liệu báo cáo...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Báo cáo Khiếu nại & Tranh chấp"
        subtitle="Tổng hợp từ dữ liệu thực — khiếu nại khóa học và tranh chấp buổi học (chỉ xem)"
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard icon="report_problem" label="Tổng khiếu nại KH"    value={totalComplaints}   color="amber" />
        <KpiCard icon="pending_actions" label="Khiếu nại đang xử lý" value={pendingComplaints} color="orange" />
        <KpiCard icon="gavel"           label="Tổng tranh chấp"       value={disputes.length}   color="red" />
        <KpiCard icon="error_outline"   label="Tranh chấp đang mở"    value={openDisputes}      color={openDisputes > 0 ? 'red' : 'green'} />
      </div>

      {/* ── Course Complaints ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Khiếu nại Khóa học</h3>
            <p className="text-xs text-gray-400 mt-0.5">50 gần nhất · nguồn: course_complaints → courses</p>
          </div>
          <StatPills map={cStats} labelMap={COMPLAINT_STATUS_LABEL} clsMap={COMPLAINT_STATUS_CLS} />
        </div>

        {complaints.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="report_problem" title="Không có khiếu nại" description="Chưa có khiếu nại khóa học nào." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Mã', 'Tiêu đề', 'Học sinh', 'Khóa học', 'Loại', 'Trạng thái', 'Ngày'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {complaints.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-gray-400">#{c.ticket_number}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 max-w-[180px] truncate" title={c.title}>{c.title}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-800">{c.student_name}</div>
                      <div className="text-xs text-gray-400">{c.student_email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-[160px] truncate" title={c.course_title}>{c.course_title || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{COMPLAINT_CATEGORY_LABEL[c.category] || c.category || '—'}</td>
                    <td className="py-3 px-4"><CBadge status={c.status} /></td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Booking Disputes ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Tranh chấp Buổi học</h3>
            <p className="text-xs text-gray-400 mt-0.5">100 gần nhất, ưu tiên đang mở · nguồn: disputes → bookings</p>
          </div>
          <StatPills map={disputeByStatus} labelMap={DISPUTE_STATUS_LABEL} clsMap={DISPUTE_STATUS_CLS} />
        </div>

        {disputes.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="gavel" title="Không có tranh chấp" description="Chưa có tranh chấp buổi học nào." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Lý do', 'Người báo cáo', 'Gia sư', 'Môn / Ngày học', 'Loại', 'Trạng thái', 'Ngày'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disputes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-700 max-w-[180px] truncate" title={d.reason}>{d.reason || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-800">{d.reporter_name || '—'}</div>
                      <div className="text-xs text-gray-400">{d.reporter_email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{d.tutor_full_name || d.tutor_name || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-700">{d.subject || d.course_title || '—'}</div>
                      <div className="text-xs text-gray-400">{d.lesson_date || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 capitalize">{d.target_type || '—'}</td>
                    <td className="py-3 px-4"><DBadge status={d.withdrawn_at ? 'WITHDRAWN' : d.status} /></td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
