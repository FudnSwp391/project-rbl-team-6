// Single source of truth for subject icon/colour presentation.
//
// This replaces two maps that had drifted apart inside AdminDashboard.jsx:
// SUBJECT_META_MAP (subjects view, keyed 'Toán') and SUBJECT_META (courses
// view, keyed 'Toán học') disagreed on both keys and colours for the same
// subject. Aliases below absorb the older keys so either spelling resolves.
//
// The backend now stores icon/color per subject row, so `subjectMeta` is the
// fallback for rows that predate the migration or use a custom icon we do not
// have a local entry for.

export const SUBJECT_META = {
  'Toán':       { icon: 'calculate',    color: 'bg-blue-100 text-blue-700',       bar: 'bg-blue-500',    grad: 'from-blue-500 to-blue-700'       },
  'Tiếng Việt': { icon: 'menu_book',    color: 'bg-rose-100 text-rose-700',       bar: 'bg-rose-500',    grad: 'from-rose-500 to-rose-700'       },
  'Ngữ văn':    { icon: 'auto_stories', color: 'bg-pink-100 text-pink-700',       bar: 'bg-pink-500',    grad: 'from-pink-500 to-pink-700'       },
  'Tiếng Anh':  { icon: 'translate',    color: 'bg-green-100 text-green-700',     bar: 'bg-green-500',   grad: 'from-green-500 to-green-700'     },
  'Vật lý':     { icon: 'bolt',         color: 'bg-cyan-100 text-cyan-700',       bar: 'bg-cyan-500',    grad: 'from-cyan-500 to-cyan-700'       },
  'Hóa học':    { icon: 'biotech',      color: 'bg-purple-100 text-purple-700',   bar: 'bg-purple-500',  grad: 'from-purple-500 to-purple-700'   },
  'Sinh học':   { icon: 'grass',        color: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', grad: 'from-emerald-500 to-emerald-700' },
  'Lịch sử':    { icon: 'history_edu',  color: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500',   grad: 'from-amber-500 to-amber-700'     },
  'Địa lý':     { icon: 'public',       color: 'bg-teal-100 text-teal-700',       bar: 'bg-teal-500',    grad: 'from-teal-500 to-teal-700'       },
  'Tin học':    { icon: 'code',         color: 'bg-indigo-100 text-indigo-700',   bar: 'bg-indigo-500',  grad: 'from-indigo-500 to-indigo-700'   },
}

// Legacy keys used by the course-management view.
const ALIASES = {
  'Toán học':  'Toán',
  'Văn học':   'Ngữ văn',
  'Lập trình': 'Tin học',
}

export const SUBJECT_FALLBACK = {
  icon: 'school', color: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400', grad: 'from-gray-400 to-gray-600',
}

export function subjectMeta(name, row) {
  const base = SUBJECT_META[name] || SUBJECT_META[ALIASES[name]] || SUBJECT_FALLBACK
  // Admin-edited icon/colour from the DB wins over the local table.
  if (row && (row.icon || row.color)) {
    return { ...base, icon: row.icon || base.icon, color: row.color || base.color }
  }
  return base
}

// ── Status presentation ───────────────────────────────────────────────────────
// Positive = emerald, warning = amber, destructive = red. No other hue carries
// meaning anywhere in this module.
export const STATUS_META = {
  active:   { label: 'Hoạt động', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  draft:    { label: 'Nháp',      dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 ring-slate-200'       },
  archived: { label: 'Lưu trữ',   dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-amber-200'       },
  disabled: { label: 'Vô hiệu',   dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 ring-red-200'             },
}
export const statusMeta = s => STATUS_META[s] || STATUS_META.draft

// ── Search helpers ────────────────────────────────────────────────────────────
// Vietnamese admins type without diacritics ("toan" must match "Toán"), so all
// matching runs through this normaliser rather than a bare toLowerCase().
// Escapes are spelled out (U+0300..U+036F combining marks, đ/Đ) so the regex
// survives any re-encoding of this file.
export function deaccent(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}
