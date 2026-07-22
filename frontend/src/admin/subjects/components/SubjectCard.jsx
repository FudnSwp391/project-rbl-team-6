import { useState } from 'react'
import { subjectMeta } from '../subjectMeta'
import StatusBadge from './StatusBadge'
import SubjectContextMenu from './SubjectContextMenu'

const fmtInt = n => (n || 0).toLocaleString('vi-VN')

export default function SubjectCard({ subject, selected, onSelect, onOpen, onAction }) {
  const [menu, setMenu] = useState(null)
  // Hover reveal is CSS, but the keyboard path is tracked in state: a purely
  // CSS :focus-within reveal is invisible to sighted keyboard users the moment
  // anything upstream interferes with focus styling, and it cannot be asserted
  // in tests. State makes the guarantee explicit.
  const [focused, setFocused] = useState(false)
  const meta     = subjectMeta(subject.name, subject)
  const archived = subject.status === 'archived'
  const pending  = subject.pending_count || 0

  return (
    <article
      onClick={() => onOpen(subject)}
      onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }) }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(subject) } }}
      onFocus={() => setFocused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
      tabIndex={0}
      role="button"
      aria-label={`Môn ${subject.name}`}
      className={`group relative flex flex-col bg-white rounded-2xl border cursor-pointer
        transition-[transform,box-shadow,border-color] duration-200 ease-out
        hover:-translate-y-0.5 hover:shadow-lg hover:border-outline
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
        ${archived ? 'opacity-60 border-dashed border-outline-variant'
                   : 'border-outline-variant shadow-sm'}
        ${selected ? 'ring-2 ring-primary border-primary' : ''}`}
    >
      {/* Selection affordance: hidden until hover/selected so the resting card
          stays clean, but always reachable via keyboard focus. */}
      <button
        onClick={e => { e.stopPropagation(); onSelect(subject.id || subject.name) }}
        aria-label={`Chọn ${subject.name}`}
        aria-pressed={selected}
        className={`absolute top-4 left-4 w-4 h-4 rounded border-2 z-10 grid place-items-center
          transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/40
          ${selected
            ? 'opacity-100 bg-primary border-primary'
            : `border-outline bg-white group-hover:opacity-100 ${focused ? 'opacity-100' : 'opacity-0'}`}`}
      >
        {selected && (
          <span className="material-symbols-outlined text-[12px] text-white leading-none">check</span>
        )}
      </button>

      <div className="p-5 pb-4">
        {/* Identity */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${meta.color}`}>
            <span className="material-symbols-outlined text-[22px]">{meta.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-on-surface truncate leading-tight">
              {subject.name}
            </h3>
            <p className="text-xs text-on-surface-variant truncate mt-0.5">
              {(subject.levels || []).length
                ? subject.levels.join(' · ')
                : 'Chưa gán cấp học'}
            </p>
          </div>
          <StatusBadge status={subject.status} />
        </div>

        {/* Hero metric — tutors, the only figure the platform measures directly
            per subject today. No revenue/trend here: there is no data source for
            them yet and a fabricated number is worse than an absent one. */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold text-on-surface tabular-nums leading-none">
              {fmtInt(subject.tutor_count)}
            </span>
            <span className="text-sm text-on-surface-variant font-medium">gia sư</span>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1.5">Đang nhận dạy môn này</p>
        </div>

        {/* Supporting metrics, one line, ranked below the hero */}
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant flex-wrap tabular-nums">
          <Stat n={subject.course_count}  label="khóa học" />
          <Dot />
          <Stat n={subject.student_count} label="học viên" />
          <Dot />
          <Stat n={subject.quiz_count}    label="đề kiểm tra" />
        </div>

        {/* Exceptions — rendered only when work actually exists */}
        {pending > 0 && (
          <div className="flex items-center gap-2 mt-3.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1
                             text-[11px] font-medium bg-amber-50 text-amber-700 ring-amber-200">
              <span className="material-symbols-outlined text-[13px]">pending_actions</span>
              {pending} khóa chờ duyệt
            </span>
          </div>
        )}
      </div>

      {/* Actions — revealed on hover, but forced visible on keyboard focus and
          on touch devices where :hover never fires. */}
      <div className={`mt-auto flex items-center gap-2 px-5 py-3 border-t border-outline-variant/70
                      transition-all duration-200 motion-reduce:transition-none
                      group-hover:opacity-100 group-hover:translate-y-0
                      [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0
                      ${focused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-0.5'}`}>
        <button
          onClick={e => { e.stopPropagation(); onOpen(subject) }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-on-primary
                     hover:brightness-125 active:scale-[0.97] transition"
        >
          Quản lý
        </button>
        <button
          onClick={e => { e.stopPropagation(); onAction('edit', subject) }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-on-surface-variant
                     hover:bg-surface-variant transition"
        >
          Chỉnh sửa
        </button>
        <button
          onClick={e => { e.stopPropagation(); setMenu({ anchor: e.currentTarget }) }}
          aria-label={`Tùy chọn cho ${subject.name}`}
          aria-haspopup="menu"
          className="ml-auto w-7 h-7 grid place-items-center rounded-lg
                     text-on-surface-variant hover:bg-surface-variant transition"
        >
          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
        </button>
      </div>

      {menu && (
        <SubjectContextMenu
          subject={subject}
          position={menu}
          onClose={() => setMenu(null)}
          onAction={onAction}
        />
      )}
    </article>
  )
}

const Dot = () => <span className="text-outline-variant select-none">·</span>

const Stat = ({ n, label }) => (
  <span>
    <b className="font-semibold text-on-surface">{fmtInt(n)}</b> {label}
  </span>
)
