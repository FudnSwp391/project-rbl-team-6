import { useState, useEffect } from 'react'
import { PageHeader, KpiCard, StatusBadge, EmptyState } from '../transactions/components'

import { API_BASE_URL as API } from '../../config'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN')
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function Moderation({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`${API}/api/admin/ai-moderation`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setData(d))
      .catch(e => setError(`Không thể tải dữ liệu kiểm duyệt (${e})`))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Đang tải dữ liệu kiểm duyệt...
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  if (!data) return null

  const { pending_profiles, incomplete_courses, review_stats, summary } = data

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Giám sát nội dung"
        subtitle="Tín hiệu cần chú ý, tổng hợp theo quy tắc — không dùng AI bên ngoài (chỉ xem)"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="pending_actions" label="Gia sư chờ duyệt"   value={summary.pending_tutor_count}     color="amber"  />
        <KpiCard icon="article"         label="Khoá học thiếu mô tả" value={summary.incomplete_course_count} color="orange" />
        <KpiCard icon="rate_review"     label="Tổng đánh giá"       value={review_stats.total}               color="blue"   />
        <KpiCard icon="star"            label="Điểm trung bình"
          value={review_stats.avg_rating ? Number(review_stats.avg_rating).toFixed(1) : '—'}
          color="green"
        />
      </div>

      {/* Pending tutor profiles */}
      <Section title={`Hồ sơ gia sư chờ duyệt (${pending_profiles.length})`}>
        {pending_profiles.length === 0 ? (
          <EmptyState title="Không có hồ sơ chờ duyệt" description="Tất cả hồ sơ gia sư đã được xử lý." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Gia sư</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Tiêu đề</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Môn dạy</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {pending_profiles.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{p.full_name}</td>
                    <td className="py-3 px-4 text-gray-500">{p.email}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={p.headline}>{p.headline || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {Array.isArray(p.subjects) ? p.subjects.slice(0, 2).join(', ') : (p.subjects || '—')}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status="PENDING" /></td>
                    <td className="py-3 px-4 text-gray-400">{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Courses missing description */}
      <Section title={`Khoá học thiếu mô tả (${incomplete_courses.length})`}>
        {incomplete_courses.length === 0 ? (
          <EmptyState title="Không có khoá học thiếu mô tả" description="Tất cả khoá học đã có đầy đủ thông tin." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Tên khoá học</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Môn học</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Gia sư</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {incomplete_courses.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate" title={c.title}>{c.title}</td>
                    <td className="py-3 px-4 text-gray-500">{c.subject || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-700">{c.tutor_name || '—'}</div>
                      <div className="text-xs text-gray-400">{c.tutor_email || ''}</div>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={c.status?.toUpperCase() || 'PENDING'} /></td>
                    <td className="py-3 px-4 text-gray-400">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Review stats */}
      <Section title="Thống kê đánh giá">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng đánh giá',     value: review_stats.total,            color: 'text-blue-600' },
            { label: 'Điểm TB',            value: Number(review_stats.avg_rating || 0).toFixed(2), color: 'text-emerald-600' },
            { label: 'Đánh giá thấp (≤2)', value: review_stats.low_rating_count, color: 'text-red-600' },
            { label: 'Bị ẩn',             value: review_stats.hidden_count,     color: 'text-gray-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
