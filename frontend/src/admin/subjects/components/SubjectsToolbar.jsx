import { useEffect, useRef } from 'react'

export const FILTERS = [
  { id: 'all',      label: 'Tất cả'   },
  { id: 'active',   label: 'Hoạt động' },
  { id: 'archived', label: 'Lưu trữ'  },
  { id: 'attention',label: 'Cần xử lý' },
]

export const SORTS = [
  { id: 'order',    label: 'Mặc định'      },
  { id: 'name',     label: 'Tên A–Z'       },
  { id: 'tutors',   label: 'Nhiều gia sư'  },
  { id: 'courses',  label: 'Nhiều khóa học'},
  { id: 'students', label: 'Nhiều học viên'},
  { id: 'pending',  label: 'Chờ duyệt'     },
]

export default function SubjectsToolbar({
  search, onSearch, filter, onFilter, sort, onSort, counts,
}) {
  const inputRef = useRef(null)

  // Ctrl/Cmd+K focuses search — the shortcut admins expect from every tool they
  // already use. '/' is deliberately not bound: it collides with typing in the
  // other admin views that share this keydown surface.
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="sticky top-0 z-20 -mx-10 px-10 py-3 mb-6
                    bg-background/80 backdrop-blur-xl border-b border-outline-variant/60">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                           text-on-surface-variant text-[18px] pointer-events-none">search</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => onSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { onSearch(''); e.currentTarget.blur() } }}
            placeholder="Tìm môn học…"
            aria-label="Tìm môn học"
            className="w-full pl-9 pr-16 py-2 bg-white border border-outline-variant rounded-lg text-sm
                       focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded
                          border border-outline-variant bg-surface-container-low
                          text-[10px] text-on-surface-variant font-sans pointer-events-none">
            Ctrl K
          </kbd>
        </div>

        {/* Segmented filter — four states, always visible, one click to switch */}
        <div className="flex items-center p-0.5 bg-surface-container-low rounded-lg
                        border border-outline-variant/60">
          {FILTERS.map(f => {
            const active = filter === f.id
            const n = counts?.[f.id]
            return (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap
                  transition-colors flex items-center gap-1.5
                  ${active
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                {f.label}
                {n > 0 && (
                  <span className={`text-[10px] tabular-nums px-1 rounded
                    ${f.id === 'attention'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-surface-variant text-on-surface-variant'}`}>
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="subject-sort">Sắp xếp</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2
                             text-on-surface-variant text-[16px] pointer-events-none">swap_vert</span>
            <select
              id="subject-sort"
              value={sort}
              onChange={e => onSort(e.target.value)}
              className="pl-8 pr-8 py-2 bg-white border border-outline-variant rounded-lg text-xs
                         font-medium text-on-surface appearance-none cursor-pointer shadow-sm
                         focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2
                             text-on-surface-variant text-[16px] pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>
    </div>
  )
}
