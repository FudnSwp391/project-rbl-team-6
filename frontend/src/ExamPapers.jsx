/**
 * ExamPapers.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Trang luyện thi với đề thi thật từ các năm trước.
 * Rendered INSIDE the StudentDashboard layout (no sidebar/header needed).
 */
import { useState, useEffect, useMemo } from 'react'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Subject configuration ────────────────────────────────────────────────────
const SUBJECT_CONFIG = {
  'Toán': { icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', chipBg: 'bg-blue-100 text-blue-700', gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600', iconBg: 'bg-blue-100 text-blue-600', hoverIconBg: 'group-hover:bg-blue-200' },
  'Ngữ văn': { icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', chipBg: 'bg-purple-100 text-purple-700', gradientFrom: 'from-purple-500', gradientTo: 'to-purple-600', iconBg: 'bg-purple-100 text-purple-600', hoverIconBg: 'group-hover:bg-purple-200' },
  'Tiếng Việt': { icon: 'import_contacts', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', chipBg: 'bg-fuchsia-100 text-fuchsia-700', gradientFrom: 'from-fuchsia-500', gradientTo: 'to-fuchsia-600', iconBg: 'bg-fuchsia-100 text-fuchsia-600', hoverIconBg: 'group-hover:bg-fuchsia-200' },
  'Tiếng Anh': { icon: 'translate', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', chipBg: 'bg-green-100 text-green-700', gradientFrom: 'from-green-500', gradientTo: 'to-green-600', iconBg: 'bg-green-100 text-green-600', hoverIconBg: 'group-hover:bg-green-200' },
  'Vật lí': { icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', chipBg: 'bg-orange-100 text-orange-700', gradientFrom: 'from-orange-500', gradientTo: 'to-orange-600', iconBg: 'bg-orange-100 text-orange-600', hoverIconBg: 'group-hover:bg-orange-200' },
  'Hoá học': { icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', chipBg: 'bg-red-100 text-red-700', gradientFrom: 'from-red-500', gradientTo: 'to-red-600', iconBg: 'bg-red-100 text-red-600', hoverIconBg: 'group-hover:bg-red-200' },
  'Sinh học': { icon: 'eco', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', chipBg: 'bg-emerald-100 text-emerald-700', gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600', hoverIconBg: 'group-hover:bg-emerald-200' },
  'Khoa học tự nhiên': { icon: 'science', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', chipBg: 'bg-emerald-100 text-emerald-700', gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600', hoverIconBg: 'group-hover:bg-emerald-200' },
  'Tự nhiên và Xã hội': { icon: 'park', color: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-200', chipBg: 'bg-lime-100 text-lime-700', gradientFrom: 'from-lime-500', gradientTo: 'to-lime-600', iconBg: 'bg-lime-100 text-lime-600', hoverIconBg: 'group-hover:bg-lime-200' },
  'Khoa học': { icon: 'biotech', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', chipBg: 'bg-cyan-100 text-cyan-700', gradientFrom: 'from-cyan-500', gradientTo: 'to-cyan-600', iconBg: 'bg-cyan-100 text-cyan-600', hoverIconBg: 'group-hover:bg-cyan-200' },
  'Lịch sử': { icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', chipBg: 'bg-amber-100 text-amber-700', gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600', iconBg: 'bg-amber-100 text-amber-600', hoverIconBg: 'group-hover:bg-amber-200' },
  'Địa lí': { icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', chipBg: 'bg-teal-100 text-teal-700', gradientFrom: 'from-teal-500', gradientTo: 'to-teal-600', iconBg: 'bg-teal-100 text-teal-600', hoverIconBg: 'group-hover:bg-teal-200' },
  'Lịch sử và Địa lí': { icon: 'public', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', chipBg: 'bg-teal-100 text-teal-700', gradientFrom: 'from-teal-500', gradientTo: 'to-teal-600', iconBg: 'bg-teal-100 text-teal-600', hoverIconBg: 'group-hover:bg-teal-200' },
  'Tin học': { icon: 'computer', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', chipBg: 'bg-indigo-100 text-indigo-700', gradientFrom: 'from-indigo-500', gradientTo: 'to-indigo-600', iconBg: 'bg-indigo-100 text-indigo-600', hoverIconBg: 'group-hover:bg-indigo-200' },
  'Đạo đức': { icon: 'favorite', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', chipBg: 'bg-pink-100 text-pink-700', gradientFrom: 'from-pink-500', gradientTo: 'to-pink-600', iconBg: 'bg-pink-100 text-pink-600', hoverIconBg: 'group-hover:bg-pink-200' },
  'Giáo dục công dân': { icon: 'balance', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', chipBg: 'bg-rose-100 text-rose-700', gradientFrom: 'from-rose-500', gradientTo: 'to-rose-600', iconBg: 'bg-rose-100 text-rose-600', hoverIconBg: 'group-hover:bg-rose-200' },
  'Giáo dục kinh tế và pháp luật': { icon: 'gavel', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', chipBg: 'bg-rose-100 text-rose-700', gradientFrom: 'from-rose-500', gradientTo: 'to-rose-600', iconBg: 'bg-rose-100 text-rose-600', hoverIconBg: 'group-hover:bg-rose-200' },
}

const DEFAULT_SUBJECT_CONFIG = { icon: 'description', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', chipBg: 'bg-gray-100 text-gray-700', gradientFrom: 'from-gray-500', gradientTo: 'to-gray-600', iconBg: 'bg-gray-100 text-gray-600', hoverIconBg: 'group-hover:bg-gray-200' }

function getSubjectConfig(subject) {
  if (!subject) return DEFAULT_SUBJECT_CONFIG
  const key = Object.keys(SUBJECT_CONFIG).find(k => subject.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(subject.toLowerCase()))
  return key ? SUBJECT_CONFIG[key] : DEFAULT_SUBJECT_CONFIG
}

const ALL_SUBJECTS = Object.keys(SUBJECT_CONFIG)
const SUBJECTS_TH = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tự nhiên và Xã hội', 'Khoa học', 'Lịch sử và Địa lí', 'Đạo đức', 'Tin học']
const SUBJECTS_THCS = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Khoa học tự nhiên', 'Lịch sử và Địa lí', 'Giáo dục công dân', 'Tin học']
const SUBJECTS_THPT = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hoá học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học']

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i)

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function ExamCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 rounded-2xl p-md animate-pulse flex flex-col gap-md">
      <div className="flex gap-md items-start">
        <div className="w-14 h-14 rounded-xl bg-surface-container-high shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-surface-container-high rounded-lg w-3/4" />
          <div className="h-3 bg-surface-container-high rounded-lg w-1/2" />
        </div>
      </div>
      <div className="flex gap-xs flex-wrap">
        <div className="h-6 bg-surface-container-high rounded-full w-16" />
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
        <div className="h-6 bg-surface-container-high rounded-full w-24" />
      </div>
      <div className="flex gap-xs">
        <div className="h-5 bg-surface-container-high rounded-lg w-24" />
        <div className="h-5 bg-surface-container-high rounded-lg w-20" />
      </div>
      <div className="h-10 bg-surface-container-high rounded-xl mt-auto" />
    </div>
  )
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, score }) {
  if (status === 'submitted') {
    const isFailed = score != null && score < 50;
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          Chưa đạt{score != null ? ` · ${score}%` : ''}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-label-sm text-label-sm">
        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
        Đã nộp{score != null ? ` · ${score}%` : ''}
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-label-sm text-label-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Đang làm
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
      <span className="material-symbols-outlined text-[13px]">radio_button_unchecked</span>
      Chưa làm
    </span>
  )
}

// ─── Exam card ─────────────────────────────────────────────────────────────────
function ExamCard({ paper }) {
  const cfg = getSubjectConfig(paper.subject)
  const score = paper.attempt_score != null ? Math.round(paper.attempt_score) : null
  const isSubmitted = paper.attempt_status === 'submitted'
  const isFailed = isSubmitted && score != null && score < 50
  const isInProgress = paper.attempt_status === 'in_progress'

  const handleAction = () => {
    if (isSubmitted && !isFailed) {
      window.location.hash = `/exam-result/${paper.attempt_id}`
    } else {
      window.location.hash = `/exam-quiz/${paper.id}`
    }
  }

  return (
    <div className="relative bg-surface-container-lowest/80 backdrop-blur-md border border-surface-container-lowest/40 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] rounded-2xl p-md flex flex-col gap-md hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
      {/* Subtle gradient accent top-left */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl bg-gradient-to-b ${cfg.gradientFrom} ${cfg.gradientTo} opacity-80`} />

      {/* Header row */}
      <div className="flex gap-md items-start pl-1">
        {/* Subject icon */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${cfg.iconBg} ${cfg.hoverIconBg} shadow-sm`}>
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {cfg.icon}
          </span>
        </div>

        {/* Title + subject */}
        <div className="flex-1 min-w-0">
          <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {paper.title}
          </h3>
          <p className={`font-label-sm text-label-sm mt-0.5 ${cfg.color}`}>
            {paper.subject}
          </p>
        </div>

        {/* Status */}
        <div className="shrink-0">
          <StatusBadge status={paper.attempt_status} score={score} />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-xs pl-1">
        {/* Grade */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm border border-primary/20">
          <span className="material-symbols-outlined text-[13px]">school</span>
          Lớp {paper.grade}
        </span>

        {/* Year */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
          {paper.year}
        </span>

        {/* Exam type */}
        {paper.exam_type && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm ${cfg.chipBg}`}>
            <span className="material-symbols-outlined text-[13px]">article</span>
            {paper.exam_type}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-md pl-1 text-on-surface-variant">
        {paper.duration_minutes && (
          <span className="inline-flex items-center gap-xs font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px]">timer</span>
            {paper.duration_minutes} phút
          </span>
        )}
        {paper.total_questions && (
          <span className="inline-flex items-center gap-xs font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px]">help_outline</span>
            {paper.total_questions} câu
          </span>
        )}
      </div>

      {/* Score bar — only if submitted */}
      {isSubmitted && score != null && (
        <div className="pl-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Điểm số</span>
            <span className={`font-label-sm text-label-sm font-bold ${
              score >= 80 ? 'text-green-600' :
              score >= 50 ? 'text-amber-600' :
              'text-red-600'
            }`}>{score}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                score >= 80 ? 'bg-green-500' :
                score >= 50 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="mt-auto pl-1">
        {isSubmitted && !isFailed ? (
          <button
            onClick={handleAction}
            className="w-full h-10 border border-outline-variant text-on-surface font-label-md text-label-md rounded-xl hover:bg-surface-container hover:text-primary hover:border-primary/30 transition-all duration-200 flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            Xem kết quả
          </button>
        ) : isInProgress ? (
          <button
            onClick={handleAction}
            className="w-full h-10 bg-amber-500 text-white font-label-md text-label-md rounded-xl hover:bg-amber-600 hover:shadow-md hover:shadow-amber-200 transition-all duration-200 flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            Tiếp tục làm
          </button>
        ) : isFailed ? (
          <button
            onClick={handleAction}
            className="w-full h-10 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:opacity-90 hover:shadow-md hover:shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
            Làm lại
          </button>
        ) : (
          <button
            onClick={handleAction}
            className="w-full h-10 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:opacity-90 hover:shadow-md hover:shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Bắt đầu làm
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border font-label-sm text-label-sm transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.03]'
          : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-outline-variant/70'
      }`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      )}
      {label}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ExamPapers({ token }) {
  const [examPapers, setExamPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterGrade, setFilterGrade] = useState(null)
  const [filterSubject, setFilterSubject] = useState('')
  const [filterYear, setFilterYear] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch exam papers ──
  useEffect(() => {
    fetchPapers()
  }, [filterGrade, filterSubject, filterYear])

  async function fetchPapers() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterGrade) params.append('grade', filterGrade)
      if (filterSubject) params.append('subject', filterSubject)
      if (filterYear) params.append('year', filterYear)

      const res = await fetch(
        `${apiBaseUrl}/api/exam-papers${params.toString() ? '?' + params.toString() : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Không thể tải danh sách đề thi')
      const data = await res.json()
      setExamPapers(Array.isArray(data) ? data : data.papers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Client-side search filter ──
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return examPapers
    const q = searchQuery.toLowerCase()
    return examPapers.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.subject?.toLowerCase().includes(q) ||
      p.exam_type?.toLowerCase().includes(q)
    )
  }, [examPapers, searchQuery])

  // ── Stats ──
  const totalPapers = examPapers.length
  const uniqueGrades = new Set(examPapers.map(p => p.grade).filter(Boolean)).size
  const uniqueSubjects = new Set(examPapers.map(p => p.subject).filter(Boolean)).size

  const clearFilters = () => {
    setFilterGrade(null)
    setFilterSubject('')
    setFilterYear(null)
    setSearchQuery('')
  }

  const hasActiveFilters = filterGrade || filterSubject || filterYear || searchQuery.trim()

  return (
    <div className="flex flex-col gap-xl pb-xl animate-[fadeIn_0.4s_ease-out]">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-tertiary-container shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 px-lg py-xl flex flex-col sm:flex-row sm:items-center gap-lg">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
            <span
              className="material-symbols-outlined text-white text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              description
            </span>
          </div>
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg text-white font-black mb-1">
              Đề thi theo năm
            </h2>
            <p className="font-body-lg text-body-lg text-white/80">
              Luyện thi với đề thi thật từ các năm trước — chuẩn bị tốt nhất cho kỳ thi
            </p>
          </div>
          <div className="flex items-center gap-md shrink-0">
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-white font-black">{totalPapers}</p>
              <p className="font-label-sm text-label-sm text-white/70">đề thi</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-white font-black">{uniqueGrades}</p>
              <p className="font-label-sm text-label-sm text-white/70">lớp</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-white font-black">{uniqueSubjects}</p>
              <p className="font-label-sm text-label-sm text-white/70">môn</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-md border border-surface-container-lowest/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] rounded-2xl p-md flex flex-col gap-md">

        {/* Search */}
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm đề thi, môn học..."
            className="w-full h-11 pl-10 pr-sm bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-sm top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* Grade filter */}
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm flex items-center gap-xs">
            <span className="material-symbols-outlined text-[14px]">school</span>
            Lớp
          </p>
          <div className="flex flex-wrap gap-xs">
            <FilterChip
              label="Tất cả"
              active={filterGrade === null}
              onClick={() => setFilterGrade(null)}
            />
            {GRADES.map(g => (
              <FilterChip
                key={g}
                label={`Lớp ${g}`}
                active={filterGrade === g}
                onClick={() => setFilterGrade(filterGrade === g ? null : g)}
              />
            ))}
          </div>
        </div>

        {/* Subject filter */}
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm flex items-center gap-xs">
            <span className="material-symbols-outlined text-[14px]">book</span>
            Môn học
          </p>
          <div className="flex flex-wrap gap-xs">
            <FilterChip
              label="Tất cả"
              active={filterSubject === ''}
              onClick={() => setFilterSubject('')}
            />
            {(filterGrade === null ? ALL_SUBJECTS : (filterGrade <= 5 ? SUBJECTS_TH : filterGrade <= 9 ? SUBJECTS_THCS : SUBJECTS_THPT)).map(s => {
              const cfg = SUBJECT_CONFIG[s] || DEFAULT_SUBJECT_CONFIG
              return (
                <button
                  key={s}
                  onClick={() => setFilterSubject(filterSubject === s ? '' : s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-label-sm text-label-sm transition-all duration-200 whitespace-nowrap ${
                    filterSubject === s
                      ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm scale-[1.03]`
                      : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-outline-variant/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Year filter */}
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm flex items-center gap-xs">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            Năm
          </p>
          <div className="flex flex-wrap gap-xs">
            <FilterChip
              label="Tất cả"
              active={filterYear === null}
              onClick={() => setFilterYear(null)}
            />
            {YEARS.map(y => (
              <FilterChip
                key={y}
                label={String(y)}
                active={filterYear === y}
                onClick={() => setFilterYear(filterYear === y ? null : y)}
              />
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-xs border-t border-outline-variant/20">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {filtered.length} kết quả
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-xs px-3 py-1.5 rounded-lg bg-error-container/30 border border-error/20 text-error font-label-sm text-label-sm hover:bg-error-container/50 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="bg-error-container/30 border border-error/20 rounded-xl p-md flex items-center gap-sm text-on-error-container">
          <span className="material-symbols-outlined text-error text-[22px]">error</span>
          <div className="flex-1">
            <p className="font-label-md text-label-md">Lỗi tải dữ liệu</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
          </div>
          <button
            onClick={fetchPapers}
            className="px-3 py-1.5 rounded-lg bg-error/10 text-error font-label-sm text-label-sm hover:bg-error/20 transition-colors flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Thử lại
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        /* Skeleton grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <ExamCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-2xl gap-md text-on-surface-variant">
          <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] opacity-40">
              {hasActiveFilters ? 'search_off' : 'description'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-headline-md text-headline-md text-on-surface mb-xs">
              {hasActiveFilters ? 'Không tìm thấy đề thi' : 'Chưa có đề thi'}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              {hasActiveFilters
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm thêm đề thi.'
                : 'Hệ thống chưa có đề thi nào. Vui lòng quay lại sau.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-10 px-lg bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:opacity-90 transition-all flex items-center gap-sm"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list_off</span>
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        /* Cards grid */
        <>
          <div className="flex items-center justify-between">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Hiển thị <span className="font-bold text-on-surface">{filtered.length}</span> đề thi
              {hasActiveFilters && ` (đã lọc từ ${totalPapers})`}
            </p>
            <button
              onClick={fetchPapers}
              className="h-9 px-md bg-surface-container border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface flex items-center gap-xs hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Làm mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {filtered.map(paper => (
              <ExamCard key={paper.id} paper={paper} />
            ))}
          </div>
        </>
      )}

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
