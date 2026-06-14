/**
 * PracticeMode.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main AI Practice page with Quick Setup and AI Chat tabs.
 * Rendered INSIDE the StudentDashboard layout (no sidebar/header needed).
 */
import { useState, useEffect } from 'react'
import AIChatBox from './AIChatBox'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Vietnam GDPT 2018 Curriculum by grade
const CURRICULUM = {
  6: {
    level: 'THCS', badge: 'Lớp 6',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Khoa học tự nhiên', icon: 'science', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử & Địa lí', icon: 'public', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Công nghệ', icon: 'engineering', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'GDCD', icon: 'account_balance', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Âm nhạc', icon: 'music_note', color: 'text-pink-600', bg: 'bg-pink-50' },
      { name: 'Mỹ thuật', icon: 'palette', color: 'text-rose-600', bg: 'bg-rose-50' },
    ],
  },
  7: {
    level: 'THCS', badge: 'Lớp 7',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Khoa học tự nhiên', icon: 'science', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử & Địa lí', icon: 'public', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Công nghệ', icon: 'engineering', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'GDCD', icon: 'account_balance', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Âm nhạc', icon: 'music_note', color: 'text-pink-600', bg: 'bg-pink-50' },
      { name: 'Mỹ thuật', icon: 'palette', color: 'text-rose-600', bg: 'bg-rose-50' },
    ],
  },
  8: {
    level: 'THCS', badge: 'Lớp 8',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Vật lí (KHTN)', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'Hoá học (KHTN)', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50' },
      { name: 'Sinh học (KHTN)', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử & Địa lí', icon: 'public', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Công nghệ', icon: 'engineering', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'GDCD', icon: 'account_balance', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ],
  },
  9: {
    level: 'THCS', badge: 'Lớp 9', note: 'Thi vào lớp 10',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Vật lí', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'Hoá học', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50' },
      { name: 'Sinh học', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử', icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Địa lí', icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'GDCD', icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
  },
  10: {
    level: 'THPT', badge: 'Lớp 10',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Vật lí', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'Hoá học', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50' },
      { name: 'Sinh học', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử', icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Địa lí', icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'GDKT & Pháp luật', icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-slate-600', bg: 'bg-slate-50' },
      { name: 'Công nghệ', icon: 'engineering', color: 'text-orange-600', bg: 'bg-orange-50' },
    ],
  },
  11: {
    level: 'THPT', badge: 'Lớp 11',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Vật lí', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'Hoá học', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50' },
      { name: 'Sinh học', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử', icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Địa lí', icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'GDKT & Pháp luật', icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { name: 'Tin học', icon: 'computer', color: 'text-slate-600', bg: 'bg-slate-50' },
    ],
  },
  12: {
    level: 'THPT', badge: 'Lớp 12', note: 'Thi THPT QG',
    subjects: [
      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50' },
      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { name: 'Vật lí', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50' },
      { name: 'Hoá học', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50' },
      { name: 'Sinh học', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50' },
      { name: 'Lịch sử', icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50' },
      { name: 'Địa lí', icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50' },
      { name: 'GDKT & Pháp luật', icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ],
  },
}

const GRADES = [6, 7, 8, 9, 10, 11, 12]

const QUESTION_PRESETS = [5, 10, 15, 20]

const DIFFICULTIES = [
  {
    key: 'easy',
    label: 'Easy',
    dot: '🟢',
    desc: 'Fundamentals & basics',
    color: 'border-green-300 hover:border-green-400',
    activeBg: 'bg-green-50 border-green-500 ring-2 ring-green-200',
    iconBg: 'bg-green-100 text-green-600',
  },
  {
    key: 'medium',
    label: 'Medium',
    dot: '🟡',
    desc: 'Applied concepts',
    color: 'border-amber-300 hover:border-amber-400',
    activeBg: 'bg-amber-50 border-amber-500 ring-2 ring-amber-200',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    key: 'hard',
    label: 'Hard',
    dot: '🔴',
    desc: 'Advanced & challenging',
    color: 'border-red-300 hover:border-red-400',
    activeBg: 'bg-red-50 border-red-500 ring-2 ring-red-200',
    iconBg: 'bg-red-100 text-red-600',
  },
]

// Time limit presets (in minutes; null = unlimited)
const TIME_LIMITS = [
  { label: 'No limit', value: null, icon: 'all_inclusive', color: 'text-on-surface-variant' },
  { label: '5 min',   value: 5,    icon: 'timer',         color: 'text-green-600' },
  { label: '10 min',  value: 10,   icon: 'timer',         color: 'text-green-600' },
  { label: '15 min',  value: 15,   icon: 'timer',         color: 'text-amber-600' },
  { label: '20 min',  value: 20,   icon: 'timer',         color: 'text-amber-600' },
  { label: '30 min',  value: 30,   icon: 'timer',         color: 'text-red-500' },
]

// AI-suggested time: 1.5 min per question, rounded
function suggestTime(count, difficulty) {
  const base = { easy: 1, medium: 1.5, hard: 2 }[difficulty] || 1.5
  const mins = Math.round(count * base)
  // Find closest preset or return custom
  return mins
}


export default function PracticeMode({ token }) {
  const [activeTab, setActiveTab] = useState('quick')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [customCount, setCustomCount] = useState('')
  const [useCustomCount, setUseCustomCount] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [questionType, setQuestionType] = useState('multiple_choice')
  const [timeLimit, setTimeLimit] = useState(null)
  const [customTime, setCustomTime] = useState('')
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)  // { type: 'quota'|'generic', detail: string }
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [resumeSession, setResumeSession] = useState(null) // For the continue popup
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [selectedGrade, setSelectedGrade] = useState(null)   // null = show all grades

  // ── Fetch practice history ──
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/practice/history?_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const sessions = data.sessions || []
          setHistory(sessions)
          
          // Check if the most recent session is in_progress to show the resume popup
          if (sessions.length > 0 && sessions[0].status === 'in_progress') {
            setResumeSession(sessions[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch practice history:', err)
      } finally {
        setHistoryLoading(false)
      }
    }
    fetchHistory()
  }, [token])

  // ── Fetch available subjects from site's quizzes ──
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setAvailableSubjects(data)
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err)
      }
    }
    fetchSubjects()
  }, [token])

  // ── Generate quiz handler ──
  const handleGenerate = async (params) => {
    const { topic: t, count: c, difficulty: d, timeLimitMins } = params
    if (!t?.trim()) return

    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/practice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: t, count: c, difficulty: d, timeLimitMins, questionType }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle quota exceeded specifically
        if (res.status === 503 && data.message === 'AI_QUOTA_EXCEEDED') {
          setGenerateError({ type: 'quota', detail: data.detail })
          setIsGenerating(false)
          return
        }
        throw new Error(data.message || 'Generate failed')
      }

      window.location.hash = '/practice-quiz/' + data.session.id
    } catch (err) {
      console.error('Failed to generate quiz:', err)
      setGenerateError({ type: 'generic', detail: err.message || 'Có lỗi xảy ra, vui lòng thử lại.' })
      setIsGenerating(false)
    }
  }

  const handleQuickGenerate = () => {
    let count = useCustomCount ? parseInt(customCount) || 10 : questionCount
    if (questionType === 'essay') count = 2 // Fixed 2 sections (e.g. Đọc hiểu + Viết) for 2018 curriculum
    const timeLimitMins = useCustomTime
      ? (parseInt(customTime) || null)
      : timeLimit
    handleGenerate({ topic, count, difficulty, timeLimitMins })
  }

  const handleChatGenerate = (params) => {
    // Chat-generated: suggest time based on count+difficulty
    const suggestedMins = suggestTime(params.count || 10, params.difficulty || 'medium')
    handleGenerate({ ...params, timeLimitMins: suggestedMins })
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  // ── Generating Overlay ──
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-lg animate-[fadeIn_0.3s_ease-out]">
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 w-24 h-24 bg-primary/20 rounded-full blur-xl animate-pulse" />
          {/* Spinner */}
          <div className="w-24 h-24 rounded-full border-4 border-surface-container-high border-t-primary animate-spin" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[32px] animate-pulse">
              auto_awesome
            </span>
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
            AI is creating your quiz...
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Generating personalized questions. This may take a moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-xl animate-[fadeIn_0.4s_ease-out]">
      {/* ── Resume Popup ── */}
      {resumeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
          <div className="relative bg-surface/95 backdrop-blur-2xl rounded-[24px] p-xl max-w-sm w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-outline-variant/30 flex flex-col items-center text-center gap-md animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
            
            {/* Decorative background glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Icon Container */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }}></div>
              <span className="material-symbols-outlined text-[36px] text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
                history
              </span>
            </div>

            <div className="flex flex-col gap-xs z-10">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Làm tiếp bài thi?</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Bạn đang làm dở bài thi <br />
                <strong className="text-primary text-body-lg">"{resumeSession.topic}"</strong>
              </p>
            </div>

            <div className="flex justify-stretch w-full gap-sm mt-md z-10">
              <button
                onClick={() => setResumeSession(null)}
                className="flex-1 px-4 py-3 rounded-xl font-label-lg text-label-lg text-on-surface bg-surface-container hover:bg-surface-container-high transition-all active:scale-95"
              >
                Để sau
              </button>
              <button
                onClick={() => {
                  window.location.hash = '/practice-quiz/' + resumeSession.id
                }}
                className="flex-1 px-4 py-3 rounded-xl font-label-lg text-label-lg bg-primary text-on-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Tiếp tục
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-sm mb-xs">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              AI Practice
            </h2>
          </div>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface-variant ml-[52px] -mt-sm">
          Practice smarter with AI-generated quizzes tailored to your needs.
        </p>
      </div>

      {/* ── History Section ── */}
      {!historyLoading && history.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">history</span>
              Recent Sessions
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {history.length} session{history.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex gap-md overflow-x-auto pb-sm -mx-xs px-xs scrollbar-thin">
            {history.slice(0, 8).map((session) => {
              const isCompleted = session.status === 'submitted'
              const scorePercent = session.total_questions
                ? Math.round((session.total_correct / session.total_questions) * 100)
                : 0

              const handleDelete = async (e) => {
                e.stopPropagation()
                if (!confirm('Discard this practice session?')) return
                try {
                  const res = await fetch(`${apiBaseUrl}/api/practice/${session.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (res.ok) setHistory(prev => prev.filter(s => s.id !== session.id))
                } catch (err) { console.error('Delete failed:', err) }
              }

              return (
                <div
                  key={session.id}
                  className="relative min-w-[240px] max-w-[280px] bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-sm shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  onClick={() => {
                    if (isCompleted) {
                      window.location.hash = '/practice-result/' + session.id
                    } else {
                      window.location.hash = '/practice-quiz/' + session.id
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Delete button for in-progress only */}
                  {!isCompleted && (
                    <button
                      onClick={handleDelete}
                      title="Discard session"
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors z-10"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}

                  <div className="flex items-start justify-between gap-xs">
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="font-label-md text-label-md text-on-surface truncate">{session.topic}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {session.total_questions} questions
                        {session.difficulty && ` • ${session.difficulty}`}
                      </p>
                    </div>
                    {isCompleted ? (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-label-md text-label-md shrink-0 ${
                        scorePercent >= 80 ? 'bg-green-100 text-green-700' :
                        scorePercent >= 50 ? 'bg-amber-100 text-amber-700' :
                                             'bg-red-100 text-red-700'
                      }`}>
                        {scorePercent}%
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        In Progress
                      </span>
                    )}
                  </div>

                  {isCompleted && (
                    <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          scorePercent >= 80 ? 'bg-green-500' :
                          scorePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatDate(session.created_at)}
                    </span>
                    {isCompleted ? (
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
                        View result
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-primary flex items-center gap-xs">
                        Continue
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab Selector ── */}
      <div className="relative">
        <div className="flex bg-surface-container-high/60 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 flex items-center justify-center gap-sm h-12 rounded-lg font-label-md text-label-md transition-all duration-300 ${
              activeTab === 'quick'
                ? 'bg-surface-container-lowest shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={
                activeTab === 'quick'
                  ? { fontVariationSettings: "'FILL' 1" }
                  : {}
              }
            >
              bolt
            </span>
            Quick Setup
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-sm h-12 rounded-lg font-label-md text-label-md transition-all duration-300 ${
              activeTab === 'chat'
                ? 'bg-surface-container-lowest shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={
                activeTab === 'chat'
                  ? { fontVariationSettings: "'FILL' 1" }
                  : {}
              }
            >
              chat
            </span>
            Chat with AI
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="min-h-[500px]">
        {/* ─── Quick Setup Tab ─── */}
        {activeTab === 'quick' && (
          <div className="flex flex-col gap-lg animate-[fadeIn_0.3s_ease-out]">
            {/* Topic + Grade Selector */}
            <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md">
              <label className="font-label-md text-label-md text-on-surface mb-sm block">
                <span className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">topic</span>
                  Chủ đề muốn ôn luyện
                </span>
              </label>

              {/* Search input */}
              <div className="relative group mb-md">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Nhập chủ đề hoặc chọn môn học bên dưới..."
                  className="w-full h-12 pl-10 pr-md bg-surface-container-low border border-outline-variant/50 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Grade selector */}
              <div className="mb-md">
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[14px]">class</span>
                  Chọn lớp (Chương trình GDPT 2018)
                </p>
                <div className="flex flex-wrap gap-xs">
                  <button
                    onClick={() => setSelectedGrade(null)}
                    className={`h-9 px-md rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 ${
                      selectedGrade === null
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    Tất cả
                  </button>
                  {/* THCS group */}
                  <div className="flex items-center gap-xs">
                    <span className="text-[10px] font-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md">THCS</span>
                    {[6, 7, 8, 9].map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGrade(g)}
                        className={`h-9 w-12 rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 ${
                          selectedGrade === g
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {/* THPT group */}
                  <div className="flex items-center gap-xs">
                    <span className="text-[10px] font-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md">THPT</span>
                    {[10, 11, 12].map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGrade(g)}
                        className={`h-9 w-12 rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 ${
                          selectedGrade === g
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm scale-105'
                            : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-violet-300 hover:bg-violet-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subject list from selected grade OR all grades */}
              {selectedGrade ? (
                /* Single grade selected */
                <div>
                  <div className="flex items-center gap-sm mb-sm">
                    <span className={`inline-flex items-center gap-xs px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      selectedGrade <= 9 ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'
                    }`}>
                      Lớp {selectedGrade}
                      {CURRICULUM[selectedGrade]?.note && (
                        <span className="font-normal opacity-80">({CURRICULUM[selectedGrade].note})</span>
                      )}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {CURRICULUM[selectedGrade]?.subjects.length} môn
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                    {CURRICULUM[selectedGrade]?.subjects.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setTopic(`${s.name} lớp ${selectedGrade}`)}
                        className={`flex items-center gap-sm p-sm rounded-xl border-2 transition-all duration-200 text-left ${
                          topic === `${s.name} lớp ${selectedGrade}`
                            ? 'border-primary bg-primary-container/60 shadow-sm scale-[1.02]'
                            : 'border-outline-variant/20 bg-surface-container hover:border-primary/40 hover:bg-surface-container-high hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined text-[18px] ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface leading-tight">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Show all grades as accordion rows */
                <div className="space-y-sm">
                  <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">explore</span>
                    Hoặc chọn nhanh theo môn
                  </p>
                  {/* Quick subject grid across all grades */}
                  <div className="flex flex-wrap gap-xs">
                    {[
                      { name: 'Ngữ văn', icon: 'menu_book', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
                      { name: 'Toán', icon: 'calculate', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                      { name: 'Tiếng Anh', icon: 'translate', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                      { name: 'Vật lí', icon: 'bolt', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                      { name: 'Hoá học', icon: 'biotech', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                      { name: 'Sinh học', icon: 'eco', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                      { name: 'Lịch sử', icon: 'history_edu', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                      { name: 'Địa lí', icon: 'map', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
                      { name: 'Tin học', icon: 'computer', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
                      { name: 'Khoa học tự nhiên', icon: 'science', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                      { name: 'GDCD', icon: 'account_balance', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
                    ].map(s => (
                      <button
                        key={s.name}
                        onClick={() => setTopic(s.name)}
                        className={`inline-flex items-center gap-xs px-3 py-1.5 rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 ${
                          topic === s.name
                            ? `${s.bg} ${s.color} ${s.border} shadow-sm`
                            : `bg-surface-container border-outline-variant/20 text-on-surface-variant hover:${s.bg} hover:${s.color} hover:${s.border}`
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[14px] ${topic === s.name ? s.color : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        {s.name}
                      </button>
                    ))}
                  </div>

                  {/* Available from website's quizzes */}
                  {availableSubjects.length > 0 && (
                    <div className="pt-xs">
                      <p className="font-label-sm text-label-sm text-primary flex items-center gap-xs mb-xs">
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                        Có sẵn trong khóa học của bạn
                      </p>
                      <div className="flex flex-wrap gap-xs">
                        {availableSubjects.map(s => (
                          <button
                            key={s.subject}
                            onClick={() => setTopic(s.subject)}
                            className={`inline-flex items-center gap-xs px-3 py-1.5 rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 ${
                              topic === s.subject
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-primary-container/40 text-on-primary-container border-primary/20 hover:bg-primary-container hover:border-primary/40'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                            {s.subject}
                            <span className="opacity-60 text-[10px]">({s.quiz_count})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question Count */}
            {questionType !== 'essay' ? (
              <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md">
                <label className="font-label-md text-label-md text-on-surface mb-sm block">
                  <span className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      format_list_numbered
                    </span>
                    Number of questions
                  </span>
                </label>
                <div className="flex flex-wrap gap-sm">
                  {QUESTION_PRESETS.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setQuestionCount(n)
                        setUseCustomCount(false)
                      }}
                      className={`h-12 w-16 rounded-xl border-2 font-label-md text-label-md transition-all duration-200 ${
                        !useCustomCount && questionCount === n
                          ? 'bg-primary text-on-primary border-primary shadow-sm scale-105'
                          : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50 hover:bg-surface-container-high'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <div className="flex items-center gap-sm">
                    <span className="text-on-surface-variant font-label-sm text-label-sm">
                      or
                    </span>
                    <input
                      type="number"
                      value={customCount}
                      onChange={(e) => {
                        setCustomCount(e.target.value)
                        setUseCustomCount(true)
                      }}
                      onFocus={() => setUseCustomCount(true)}
                      placeholder="Custom"
                      min={1}
                      max={50}
                      className={`h-12 w-24 rounded-xl border-2 text-center font-label-md text-label-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-all duration-200 ${
                        useCustomCount
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/30 bg-surface-container hover:border-primary/50'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-md flex gap-sm">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="font-body-sm text-on-surface-variant">
                  <strong>Cấu trúc chuẩn GDPT 2018:</strong> Đề kiểm tra Tự luận sẽ được AI sinh tự động dựa trên cấu trúc chương trình mới, thường bao gồm các phần cố định (Ví dụ với Ngữ văn là phần Đọc hiểu và Viết) thay vì số lượng câu hỏi cụ thể.
                </p>
              </div>
            )}

            {/* Question Type */}
            <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md">
              <label className="font-label-md text-label-md text-on-surface mb-sm block">
                <span className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    quiz
                  </span>
                  Loại câu hỏi
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                {[
                  { key: 'multiple_choice', label: 'Trắc nghiệm', icon: 'check_box', desc: 'Chỉ chọn đáp án ABCD' },
                  { key: 'essay', label: 'Tự luận', icon: 'edit_document', desc: 'Viết câu trả lời tự luận' },
                  { key: 'mixed', label: 'Trộn lẫn', icon: 'shuffle', desc: 'Kết hợp cả hai loại' }
                ].map((qt) => (
                  <button
                    key={qt.key}
                    onClick={() => setQuestionType(qt.key)}
                    className={`flex flex-col items-center gap-sm p-md rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                      questionType === qt.key
                        ? 'bg-primary-container/40 border-primary ring-2 ring-primary/20 scale-[1.02]'
                        : 'bg-surface-container border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors duration-300 ${questionType === qt.key ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{qt.icon}</span>
                    </div>
                    <div className="text-center">
                      <p className="font-label-md text-label-md text-on-surface">
                        {qt.label}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {qt.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md">
              <label className="font-label-md text-label-md text-on-surface mb-sm block">
                <span className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    signal_cellular_alt
                  </span>
                  Difficulty level
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDifficulty(d.key)}
                    className={`flex flex-col items-center gap-sm p-md rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                      difficulty === d.key
                        ? `${d.activeBg} scale-[1.02]`
                        : `bg-surface-container border-outline-variant/20 ${d.color}`
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${d.iconBg} transition-colors duration-300`}
                    >
                      {d.dot}
                    </div>
                    <div className="text-center">
                      <p className="font-label-md text-label-md text-on-surface">
                        {d.label}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {d.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Time Limit ─── */}
            <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md">
              <div className="flex items-center justify-between mb-sm">
                <label className="font-label-md text-label-md text-on-surface">
                  <span className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">timer</span>
                    Time limit
                  </span>
                </label>
                {/* AI Suggest button */}
                {topic.trim() && (
                  <button
                    onClick={() => {
                      const count = useCustomCount ? parseInt(customCount) || 10 : questionCount
                      const mins = suggestTime(count, difficulty)
                      setTimeLimit(null)        // clear preset
                      setCustomTime(String(mins))
                      setUseCustomTime(true)
                    }}
                    className="inline-flex items-center gap-xs px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container font-label-sm text-label-sm hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    AI suggest
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-sm">
                {TIME_LIMITS.map((tl) => (
                  <button
                    key={String(tl.value)}
                    onClick={() => { setTimeLimit(tl.value); setUseCustomTime(false) }}
                    className={`h-10 px-md rounded-xl border-2 font-label-sm text-label-sm transition-all duration-200 flex items-center gap-xs ${
                      !useCustomTime && timeLimit === tl.value
                        ? 'bg-primary text-on-primary border-primary shadow-sm scale-105'
                        : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50 hover:bg-surface-container-high'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[14px] ${ !useCustomTime && timeLimit === tl.value ? 'text-on-primary' : tl.color}`}>{tl.icon}</span>
                    {tl.label}
                  </button>
                ))}
                <div className="flex items-center gap-xs">
                  <span className="text-on-surface-variant font-label-sm text-label-sm">or</span>
                  <div className="relative">
                    <input
                      type="number"
                      value={customTime}
                      onChange={(e) => { setCustomTime(e.target.value); setUseCustomTime(true) }}
                      onFocus={() => setUseCustomTime(true)}
                      placeholder="Custom"
                      min={1}
                      max={180}
                      className={`h-10 w-24 rounded-xl border-2 text-center font-label-sm text-label-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-all duration-200 ${
                        useCustomTime
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/30 bg-surface-container hover:border-primary/50'
                      }`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-label-sm text-label-sm text-on-surface-variant pointer-events-none">min</span>
                  </div>
                </div>
              </div>

              {/* Current selection summary */}
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-[14px]">info</span>
                {
                  useCustomTime && customTime
                    ? `${customTime}-minute timer will start when quiz begins`
                    : timeLimit
                      ? `${timeLimit}-minute timer will start when quiz begins`
                      : 'No time limit — practice at your own pace'
                }
              </p>
            </div>

            {/* ── Error / Quota Banner ── */}
            {generateError && (
              <div className={`rounded-xl p-md border flex gap-sm items-start ${
                generateError.type === 'quota'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                  generateError.type === 'quota' ? 'text-amber-500' : 'text-red-500'
                }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {generateError.type === 'quota' ? 'warning' : 'error'}
                </span>
                <div className="flex-1">
                  <p className="font-label-md text-label-md mb-xs">
                    {generateError.type === 'quota' ? '⚠️ Gemini API đạt giới hạn' : 'Có lỗi xảy ra'}
                  </p>
                  <p className="font-body-sm text-body-sm opacity-90">{generateError.detail}</p>
                  {generateError.type === 'quota' && (
                    <button
                      onClick={() => {
                        // Navigate to exam papers section
                        window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'exam-papers' }))
                      }}
                      className="mt-sm inline-flex items-center gap-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-label-sm text-label-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">description</span>
                      Chuyển sang Đề thi có sẵn
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setGenerateError(null)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleQuickGenerate}
              disabled={!topic.trim() || isGenerating}
              className={`w-full h-14 rounded-xl font-label-md text-label-md flex items-center justify-center gap-sm transition-all duration-300 ${
                topic.trim() && !isGenerating
                  ? 'bg-primary text-on-primary hover:bg-surface-tint hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]'
                  : 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="w-5 h-5 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
                  Đang tạo câu hỏi...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                  Tạo câu hỏi
                  {topic.trim() && (
                    <span className="ml-xs opacity-70">
                      • {useCustomCount ? parseInt(customCount) || 10 : questionCount}{' '}
                      {difficulty === 'easy' ? 'dễ' : difficulty === 'hard' ? 'khó' : 'trung bình'}
                      {(useCustomTime ? parseInt(customTime) : timeLimit)
                        ? ` • ${useCustomTime ? customTime : timeLimit} phút`
                        : ' • Không giới hạn'
                      }
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── Chat with AI Tab ─── */}
        {activeTab === 'chat' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <AIChatBox token={token} onQuizReady={handleChatGenerate} />
          </div>
        )}
      </div>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  )
}
