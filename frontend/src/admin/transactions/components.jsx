// ─── Shared Reusable Components for Transaction Management ────────────────────
import { useState } from 'react'

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  // Transaction statuses
  COMPLETED:       { label: 'Hoàn thành',      cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  RELEASED:        { label: 'Đã giải ngân',    cls: 'bg-green-100 text-green-700 border border-green-200' },
  PENDING_ESCROW:  { label: 'Đang giữ Escrow', cls: 'bg-sky-100 text-sky-700 border border-sky-200' },
  PENDING:         { label: 'Chờ xử lý',       cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  REFUNDED:        { label: 'Đã hoàn tiền',    cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  DISPUTED:        { label: 'Đang tranh chấp', cls: 'bg-red-100 text-red-700 border border-red-200' },
  CANCELLED:       { label: 'Đã hủy',          cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  // Withdrawal statuses
  APPROVED:        { label: 'Đã duyệt',        cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  REJECTED:        { label: 'Từ chối',          cls: 'bg-red-100 text-red-700 border border-red-200' },
  // Dispute statuses
  OPEN:            { label: 'Đang mở',         cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  RESOLVED_REFUND: { label: 'Hoàn tiền',       cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  RESOLVED_RELEASE:{ label: 'Giải ngân',       cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  // Risk levels
  CRITICAL:        { label: 'Nghiêm trọng',    cls: 'bg-red-200 text-red-800 border border-red-300' },
  HIGH:            { label: 'Cao',             cls: 'bg-red-100 text-red-700 border border-red-200' },
  MEDIUM:          { label: 'Trung bình',      cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  LOW:             { label: 'Thấp',            cls: 'bg-green-100 text-green-700 border border-green-200' },
  INFO:            { label: 'Thông tin',       cls: 'bg-sky-100 text-sky-700 border border-sky-200' },
  // Alert statuses
  INVESTIGATING:      { label: 'Đang điều tra',      cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
  NEED_MORE_EVIDENCE: { label: 'Cần thêm bằng chứng', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  RESOLVED:           { label: 'Đã giải quyết',      cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  CONFIRMED_FRAUD:    { label: 'Xác nhận gian lận',   cls: 'bg-red-100 text-red-700 border border-red-200' },
  FALSE_POSITIVE:     { label: 'Báo động giả',        cls: 'bg-sky-100 text-sky-700 border border-sky-200' },
  // Other
  ACTIVE:          { label: 'Đang hoạt động', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  EXPIRED:         { label: 'Hết hạn',         cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  SCHEDULED:       { label: 'Đã lên lịch',    cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
  DELIVERED:       { label: 'Đã gửi',         cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  FAILED:          { label: 'Thất bại',        cls: 'bg-red-100 text-red-700 border border-red-200' },
  SUCCESS:         { label: 'Thành công',      cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  MATCHED:         { label: 'Khớp',            cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  UNMATCHED:       { label: 'Không khớp',      cls: 'bg-red-100 text-red-700 border border-red-200' },
  MISSING:         { label: 'Thiếu',           cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  ALERT_CREATED:   { label: 'Cảnh báo',        cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KpiCard({ icon, label, value, change, color = 'blue', onClick, subtitle }) {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',   border: 'border-blue-100' },
    green:   { bg: 'bg-emerald-50', icon: 'text-emerald-600',border: 'border-emerald-100' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',  border: 'border-amber-100' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-600',    border: 'border-red-100' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600', border: 'border-purple-100' },
    sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',    border: 'border-sky-100' },
    orange:  { bg: 'bg-orange-50',  icon: 'text-orange-600', border: 'border-orange-100' },
    indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600', border: 'border-indigo-100' },
  }
  const c = colorMap[color] || colorMap.blue
  const isPositiveGood = !['red', 'amber', 'orange'].includes(color)
  const changeNum = Number(change)
  const changeGood = isPositiveGood ? changeNum >= 0 : changeNum <= 0
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border ${c.border} cursor-pointer hover:shadow-md transition-all group`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${changeGood ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className="material-symbols-outlined text-[14px]">{changeNum >= 0 ? 'trending_up' : 'trending_down'}</span>
            {Math.abs(changeNum)}%
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 6 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-6">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div className="w-10 h-4 bg-gray-200 rounded" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-7 bg-gray-200 rounded w-3/4" />
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title = 'Không có dữ liệu', description = 'Chưa có dữ liệu để hiển thị.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[32px] text-gray-400">{icon}</span>
      </div>
      <h3 className="text-base font-semibold text-gray-600 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}

// ─── Table Wrapper ────────────────────────────────────────────────────────────
export function DataTable({ headers, children, loading, skeletonCols, empty }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {headers.map(h => (
                <th key={h} className="py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={headers.length} />)
              : children}
          </tbody>
        </table>
        {!loading && empty}
      </div>
    </div>
  )
}

// ─── Search + Filter Bar ──────────────────────────────────────────────────────
export function SearchFilterBar({ search, onSearch, placeholder = 'Tìm kiếm...', children }) {
  return (
    <div className="flex items-center gap-3 mb-5 flex-wrap">
      <div className="relative flex-1 min-w-[240px]">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder={placeholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      {children}
    </div>
  )
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
export function FilterTabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            active === tab.value
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${active === tab.value ? 'bg-white/20' : 'bg-gray-300'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">Trang {page} / {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}

// ─── Avatar Cell ──────────────────────────────────────────────────────────────
export function AvatarCell({ name, email, avatar, sub }) {
  return (
    <div className="flex items-center gap-3">
      {avatar
        ? <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {name?.charAt(0)}
          </div>
      }
      <div>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{email || sub}</p>
      </div>
    </div>
  )
}

// ─── Modal Overlay ────────────────────────────────────────────────────────────
export function ModalOverlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ─── Export Button ────────────────────────────────────────────────────────────
export function ExportButton({ onExport, label = 'Xuất Excel' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        {label}
        <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden w-44">
          {['Excel (.xlsx)', 'CSV (.csv)', 'PDF (.pdf)'].map(f => (
            <button
              key={f}
              onClick={() => { onExport && onExport(f); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
export function Drawer({ open, onClose, title, children, width = 'w-[520px]' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`${width} h-full bg-white shadow-2xl flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────
export function SectionCard({ title, icon, children, action }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon && <span className="material-symbols-outlined text-[20px] text-gray-500">{icon}</span>}
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Hook: usePagination ──────────────────────────────────────────────────────
export function usePagination(data, perPage = 10) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / perPage))
  const paginated = data.slice((page - 1) * perPage, page * perPage)
  return { page, setPage, totalPages, paginated }
}

// ─── Hook: useSearch ──────────────────────────────────────────────────────────
export function useSearch(data, keys) {
  const [search, setSearch] = useState('')
  const filtered = search.trim() === '' ? data : data.filter(item =>
    keys.some(k => {
      const val = k.split('.').reduce((o, key) => o?.[key], item)
      return String(val || '').toLowerCase().includes(search.toLowerCase())
    })
  )
  return { search, setSearch, filtered }
}

// ─── Mini Bar Chart (pure CSS) ─────────────────────────────────────────────────
export function MiniBarChart({ data, color = '#00288e' }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{ height: `${(d.value / max) * 100}%`, background: color, opacity: 0.7 + (i / data.length) * 0.3 }}
          title={d.label}
        />
      ))}
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export function Timeline({ steps }) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <span className={`material-symbols-outlined text-[16px] ${s.done ? 'text-emerald-600' : 'text-gray-400'}`}>{s.done ? 'check' : 'schedule'}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-px flex-1 min-h-[24px] my-1 ${s.done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
          </div>
          <div className="pb-4">
            <p className={`text-sm font-semibold ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
            {s.time && <p className="text-xs text-gray-400">{s.time}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
