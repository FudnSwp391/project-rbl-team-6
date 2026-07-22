import { useEffect, useMemo, useState } from 'react'
import { API, authFetch } from './api'
import { subjectMeta } from './subjectMeta'
import StatusBadge from './components/StatusBadge'
import SubjectContextMenu from './components/SubjectContextMenu'
import KpiCard from './detail/KpiCard'
import DataTable from './detail/DataTable'
import BarChart from './charts/BarChart'

const fmtInt  = n => (n || 0).toLocaleString('vi-VN')
const fmtVND  = n => !n ? '0đ' : n.toLocaleString('vi-VN') + 'đ'
const fmtCompactVND = n => {
  if (!n) return '0đ'
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' tỷ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' tr'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return n + 'đ'
}
// bookings.lesson_date is a date; the clock time lives in time_slot, so this
// deliberately does not render an hour that would be meaningless.
const fmtDate = iso => {
  if (!iso) return '—'
  const d = new Date(iso), p = x => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const monthLabel = key => {
  const [y, m] = key.split('-')
  return `T${Number(m)}/${String(y).slice(2)}`
}

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'tutors',   label: 'Gia sư',    icon: 'school' },
  { id: 'courses',  label: 'Khóa học',  icon: 'menu_book' },
  { id: 'sessions', label: 'Buổi học',  icon: 'event' },
  { id: 'settings', label: 'Cài đặt',   icon: 'settings' },
]

const COURSE_STATUS = {
  published:      { label: 'Đã đăng',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  draft:          { label: 'Nháp',       cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
  pending_review: { label: 'Chờ duyệt',  cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  rejected:       { label: 'Bị từ chối', cls: 'bg-red-50 text-red-700 ring-red-200' },
  archived:       { label: 'Lưu trữ',    cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
}
// bookings.status vocabulary — capitalised, unlike the course statuses above.
const SESSION_STATUS = {
  Completed:  { label: 'Hoàn thành',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  InProgress: { label: 'Đang diễn ra', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  Approved:   { label: 'Đã duyệt',     cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  Pending:    { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Cancelled:  { label: 'Đã hủy',       cls: 'bg-red-50 text-red-700 ring-red-200' },
  Declined:   { label: 'Bị từ chối',   cls: 'bg-red-50 text-red-700 ring-red-200' },
  Timeout:    { label: 'Hết hạn',      cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
}
const Pill = ({ map, value }) => {
  const m = map[value] || { label: value || '—', cls: 'bg-slate-50 text-slate-600 ring-slate-200' }
  return <span className={`px-2 py-0.5 rounded-md ring-1 text-[11px] font-medium whitespace-nowrap ${m.cls}`}>{m.label}</span>
}

export default function SubjectDetailView({ subjectId, token, onBack, onAction }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('overview')
  const [menu, setMenu]       = useState(null)
  const [tick, setTick]       = useState(0)

  useEffect(() => {
    let cancelled = false
    authFetch(`${API}/api/admin/subjects/${subjectId}`, token)
      .then(d => { if (!cancelled) { setData(d); setError(null); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [subjectId, token, tick])

  const retry = () => { setLoading(true); setError(null); setTick(t => t + 1) }

  const monthlySessions = useMemo(
    () => (data?.monthly || []).map(m => ({ label: monthLabel(m.month), value: m.sessions })), [data])
  const monthlyRevenue = useMemo(
    () => (data?.monthly || []).map(m => ({ label: monthLabel(m.month), value: m.revenue })), [data])

  if (loading) return <DetailSkeleton onBack={onBack} />

  if (error) {
    return (
      <div className="p-10 max-w-[1280px] mx-auto">
        <BackLink onBack={onBack} />
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <span className="material-symbols-outlined">error</span>
          <span className="min-w-0">Không tải được chi tiết môn học — {error}</span>
          <button onClick={retry}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition">
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  const { subject, kpis, top_tutors, tutors, courses, sessions } = data
  const meta = subjectMeta(subject.name, subject)

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      <BackLink onBack={onBack} name={subject.name} />

      {/* Identity header */}
      <div className="flex items-start gap-4 mb-6 flex-wrap">
        <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${meta.color}`}>
          <span className="material-symbols-outlined text-[28px]">{meta.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-on-background">{subject.name}</h2>
            <StatusBadge status={subject.status} size="md" />
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {(subject.levels || []).join(' · ') || 'Chưa gán cấp học'}
            {subject.description ? ` — ${subject.description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAction('edit', subject)}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant
                       border border-outline-variant bg-white hover:bg-surface-container-low transition
                       flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">edit</span>
            Chỉnh sửa
          </button>
          <button onClick={e => setMenu({ anchor: e.currentTarget })}
            aria-label="Tùy chọn khác" aria-haspopup="menu"
            className="w-9 h-9 grid place-items-center rounded-lg border border-outline-variant
                       bg-white text-on-surface-variant hover:bg-surface-container-low transition">
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 -mx-10 px-10 bg-background/85 backdrop-blur-xl
                      border-b border-outline-variant/60 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => {
            const active = tab === t.id
            const badge = t.id === 'courses' && kpis.pending_courses > 0 ? kpis.pending_courses : null
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap
                  transition-colors ${active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[17px]">{t.icon}</span>
                {t.label}
                {badge && (
                  <span className="ml-0.5 px-1.5 rounded text-[10px] font-semibold tabular-nums
                                   bg-amber-100 text-amber-700">{badge}</span>
                )}
                {active && <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-t bg-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon="school"     label="Gia sư"          value={fmtInt(kpis.tutors)} />
            <KpiCard icon="menu_book"  label="Khóa học"        value={fmtInt(kpis.courses)} />
            <KpiCard icon="group"      label="Học viên"        value={fmtInt(kpis.students)} />
            <KpiCard icon="quiz"       label="Đề kiểm tra"     value={fmtInt(kpis.quizzes)} />
            <KpiCard icon="payments"   label="Doanh thu"
              value={kpis.paid_bookings ? fmtCompactVND(kpis.revenue) : null}
              hint={kpis.paid_bookings ? `${fmtInt(kpis.paid_bookings)} buổi đã giải ngân` : null} />
            <KpiCard icon="event"      label="Buổi học"
              value={kpis.sessions_total || null}
              hint={kpis.sessions_total ? `${fmtInt(kpis.sessions_completed)} hoàn thành` : null} />
            <KpiCard icon="check_circle" label="Tỷ lệ hoàn thành"
              value={kpis.completion_rate} unit={kpis.completion_rate !== null ? '%' : ''} />
            <KpiCard icon="star"       label="Đánh giá TB"
              value={kpis.avg_rating}
              hint={kpis.review_count ? `${fmtInt(kpis.review_count)} đánh giá` : null} />
          </div>

          {kpis.pending_courses > 0 && (
            <button onClick={() => setTab('courses')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50
                         border border-amber-200 text-sm text-left hover:bg-amber-100/70 transition">
              <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
              <span className="text-amber-900">
                <b className="font-semibold">{kpis.pending_courses} khóa học</b> đang chờ duyệt ở môn này
              </span>
              <span className="material-symbols-outlined text-amber-700 text-[18px] ml-auto">arrow_forward</span>
            </button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Buổi học 6 tháng gần nhất" icon="event">
              <BarChart data={monthlySessions} format={fmtInt} barClass="fill-primary"
                emptyText="Chưa có buổi học nào được ghi nhận cho môn này" />
            </Panel>
            <Panel title="Doanh thu 6 tháng gần nhất" icon="payments"
                   note="Ghi nhận khi escrow giải ngân">
              <BarChart data={monthlyRevenue} format={fmtCompactVND} barClass="fill-emerald-500"
                emptyText="Chưa có buổi học nào được giải ngân cho môn này" />
            </Panel>
          </div>

          <Panel title="Gia sư dạy nhiều nhất" icon="leaderboard">
            {top_tutors.length ? (
              <ol className="space-y-2">
                {top_tutors.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-on-surface-variant tabular-nums">{i + 1}</span>
                    <span className="text-sm text-on-surface font-medium min-w-0 truncate flex-1">{t.name}</span>
                    <span className="text-xs text-on-surface-variant tabular-nums shrink-0">
                      {fmtInt(t.completed)}/{fmtInt(t.sessions)} buổi
                    </span>
                    <div className="w-24 h-1.5 rounded-full bg-surface-variant overflow-hidden shrink-0">
                      <div className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((t.sessions / top_tutors[0].sessions) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-on-surface-variant py-6 text-center">
                Chưa có buổi học nào để xếp hạng gia sư
              </p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'tutors' && (
        <DataTable
          emptyIcon="school"
          empty="Chưa có gia sư nào nhận dạy môn này"
          rows={tutors}
          columns={[
            { key: 'name', label: 'Gia sư', render: r => (
              <span className="font-medium text-on-surface">{r.name}</span>) },
            { key: 'hourly_rate', label: 'Học phí / giờ', align: 'right',
              render: r => r.hourly_rate ? fmtVND(Number(r.hourly_rate)) : '—' },
          ]}
        />
      )}

      {tab === 'courses' && (
        <DataTable
          emptyIcon="menu_book"
          empty="Chưa có khóa học nào thuộc môn này"
          rows={courses}
          columns={[
            { key: 'title', label: 'Khóa học', render: r => (
              <span className="font-medium text-on-surface">{r.title}</span>) },
            { key: 'tutor_name', label: 'Gia sư' },
            { key: 'status', label: 'Trạng thái', render: r => <Pill map={COURSE_STATUS} value={r.status} /> },
            { key: 'price', label: 'Giá', align: 'right',
              render: r => r.price === 0 ? 'Miễn phí' : fmtVND(r.price) },
          ]}
        />
      )}

      {tab === 'sessions' && (
        <DataTable
          emptyIcon="event"
          empty="Chưa có buổi học nào cho môn này"
          rows={sessions}
          columns={[
            { key: 'lesson_date', label: 'Buổi học', render: r => (
              <span className="whitespace-nowrap">
                {fmtDate(r.lesson_date)}
                {r.time_slot && <span className="text-on-surface-variant"> · {r.time_slot}</span>}
              </span>) },
            { key: 'tutor_name', label: 'Gia sư' },
            { key: 'student_name', label: 'Học viên' },
            { key: 'status', label: 'Trạng thái', render: r => <Pill map={SESSION_STATUS} value={r.status} /> },
            { key: 'lesson_fee', label: 'Học phí', align: 'right', render: r => (
              <span className="whitespace-nowrap">
                {r.lesson_fee ? fmtVND(r.lesson_fee) : '—'}
                {r.settled && (
                  <span className="material-symbols-outlined text-[14px] text-emerald-600 align-middle ml-1"
                        title="Đã giải ngân">check_circle</span>
                )}
              </span>) },
          ]}
        />
      )}

      {tab === 'settings' && (
        <div className="space-y-4 max-w-2xl">
          <Panel title="Thông tin" icon="info">
            <dl className="text-sm divide-y divide-outline-variant/60">
              <Row label="Tên môn học" value={subject.name} />
              <Row label="Slug" value={<code className="text-xs bg-surface-container-low px-1.5 py-0.5 rounded">{subject.slug}</code>} />
              <Row label="Mô tả" value={subject.description || '—'} />
              <Row label="Cấp học" value={(subject.levels || []).join(' · ') || '—'} />
              <Row label="Trạng thái" value={<StatusBadge status={subject.status} />} />
            </dl>
            <button onClick={() => onAction('edit', subject)}
              className="mt-4 px-3.5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant
                         border border-outline-variant bg-white hover:bg-surface-container-low transition">
              Chỉnh sửa thông tin
            </button>
          </Panel>

          <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Vùng nguy hiểm</h3>
            <p className="text-xs text-on-surface-variant mb-3">
              Lưu trữ ẩn môn khỏi marketplace nhưng giữ nguyên dữ liệu. Xóa chỉ khả dụng
              khi không còn khóa học, đề kiểm tra hay gia sư nào liên kết.
            </p>
            <div className="flex flex-wrap gap-2">
              {subject.status === 'archived' ? (
                <DangerBtn onClick={() => onAction('restore', subject)} icon="unarchive" label="Khôi phục" />
              ) : (
                <DangerBtn onClick={() => onAction('archive', subject)} icon="inventory_2" label="Lưu trữ" />
              )}
              <DangerBtn onClick={() => onAction('delete', subject)} icon="delete" label="Xóa môn học" danger />
            </div>
          </div>
        </div>
      )}

      {menu && (
        <SubjectContextMenu
          subject={subject}
          position={menu}
          onClose={() => setMenu(null)}
          onAction={(a, s) => {
            if (a === 'manage' || a === 'analytics') { setTab('overview'); return }
            onAction(a, s)
          }}
        />
      )}
    </div>
  )
}

const BackLink = ({ onBack, name }) => (
  <button onClick={onBack}
    className="flex items-center gap-1.5 mb-4 text-sm text-on-surface-variant hover:text-primary transition">
    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
    Môn học{name ? ` / ${name}` : ''}
  </button>
)

const Panel = ({ title, icon, note, children }) => (
  <section className="bg-white rounded-xl border border-outline-variant p-4">
    <div className="flex items-center gap-1.5 mb-4 flex-wrap">
      <span className="material-symbols-outlined text-[17px] text-on-surface-variant">{icon}</span>
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      {note && <span className="text-[11px] text-on-surface-variant ml-auto">{note}</span>}
    </div>
    {children}
  </section>
)

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <dt className="text-on-surface-variant shrink-0">{label}</dt>
    <dd className="text-on-surface text-right min-w-0">{value}</dd>
  </div>
)

const DangerBtn = ({ onClick, icon, label, danger }) => (
  <button onClick={onClick}
    className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-1.5
      ${danger
        ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
        : 'border-outline-variant text-on-surface-variant bg-white hover:bg-surface-container-low'}`}>
    <span className="material-symbols-outlined text-[17px]">{icon}</span>
    {label}
  </button>
)

function DetailSkeleton({ onBack }) {
  return (
    <div className="p-10 max-w-[1280px] mx-auto animate-pulse">
      <BackLink onBack={onBack} />
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-200 shrink-0" />
        <div className="flex-1 pt-1">
          <div className="h-6 bg-gray-200 rounded w-40 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-64" />
        </div>
      </div>
      <div className="h-11 border-b border-outline-variant/60 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bg-white rounded-xl border border-outline-variant p-4">
            <div className="h-3 bg-gray-100 rounded w-20 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-52 bg-white rounded-xl border border-outline-variant" />
        <div className="h-52 bg-white rounded-xl border border-outline-variant" />
      </div>
    </div>
  )
}
