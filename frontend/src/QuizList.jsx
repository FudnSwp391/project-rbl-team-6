import { useState, useEffect } from 'react'

const SUBJECT_ICONS = {
  Mathematics: 'calculate',
  Math: 'calculate',
  Science: 'science',
  Biology: 'biotech',
  Chemistry: 'science',
  Physics: 'bolt',
  Languages: 'translate',
  English: 'translate',
  History: 'history_edu',
  Geography: 'public',
  'Computer Science': 'code',
  Coding: 'code',
  Music: 'music_note',
  Art: 'palette',
  default: 'quiz',
}

function getSubjectIcon(subject) {
  if (!subject) return SUBJECT_ICONS.default
  const key = Object.keys(SUBJECT_ICONS).find(k =>
    subject.toLowerCase().includes(k.toLowerCase())
  )
  return key ? SUBJECT_ICONS[key] : SUBJECT_ICONS.default
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null
  const color =
    score >= 70 ? 'text-green-600 bg-green-50 border-green-200' :
    score >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                  'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-sm text-label-sm ${color}`}>
      <span className="material-symbols-outlined text-[14px]">star</span>
      {score}%
    </span>
  )
}

function QuizCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 rounded-xl p-md animate-pulse">
      <div className="flex gap-md items-start">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container-high rounded w-3/4" />
          <div className="h-3 bg-surface-container-high rounded w-1/2" />
          <div className="h-3 bg-surface-container-high rounded w-full" />
        </div>
      </div>
      <div className="mt-md flex gap-sm">
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
        <div className="h-6 bg-surface-container-high rounded-full w-20" />
      </div>
      <div className="mt-md h-10 bg-surface-container-high rounded-lg" />
    </div>
  )
}

export default function QuizList({ token }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('available')

  useEffect(() => {
    fetchQuizzes()
  }, [])

  async function fetchQuizzes() {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load quizzes')
      const data = await res.json()
      setQuizzes(data.quizzes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isPassed = (q) => q.attempt_status === 'submitted' && (q.attempt_score ?? 0) >= 50
  const available = quizzes.filter(q => !isPassed(q))
  const completed = quizzes.filter(q => isPassed(q))
  const displayed = activeTab === 'available' ? available : completed

  return (
    <div className="flex flex-col gap-xl pb-xl">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>quiz</span>
            Assessments
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Test your knowledge with structured quizzes.
          </p>
        </div>
        <button
          onClick={fetchQuizzes}
          className="h-10 px-md bg-surface-container border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-sm hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-xl w-fit gap-1">
        {[
          { key: 'available', label: 'Available', count: available.length, icon: 'pending' },
          { key: 'completed', label: 'Completed', count: completed.length, icon: 'check_circle' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-xs px-md py-sm rounded-lg font-label-md text-label-md transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={activeTab === tab.key ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            {tab.label}
            <span className={`ml-xs px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === tab.key ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-container/30 border border-error/20 rounded-xl p-md flex items-center gap-sm text-on-error-container">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-body-md">{error}</p>
        </div>
      )}

      {/* Quiz Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {[1, 2, 3].map(i => <QuizCardSkeleton key={i} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[64px] opacity-30">
            {activeTab === 'available' ? 'quiz' : 'task_alt'}
          </span>
          <p className="font-headline-md text-headline-md">
            {activeTab === 'available' ? 'No quizzes available' : 'No completed quizzes yet'}
          </p>
          <p className="font-body-md text-body-md text-center max-w-sm">
            {activeTab === 'available'
              ? 'Check back later — your tutors will assign quizzes for you.'
              : 'Complete a quiz to see your results here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {displayed.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuizCard({ quiz }) {
  const isFailed = quiz.attempt_status === 'submitted' && (quiz.attempt_score ?? 0) < 50
  const isCompleted = quiz.attempt_status === 'submitted' && !isFailed
  const isInProgress = quiz.attempt_status === 'in_progress'
  const icon = getSubjectIcon(quiz.subject)

  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-md flex flex-col gap-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Header */}
      <div className="flex gap-md items-start">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
          isCompleted
            ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
            : isFailed
            ? 'bg-red-50 text-red-600 group-hover:bg-red-100'
            : 'bg-primary-container/30 text-on-primary-container group-hover:bg-primary-container/50'
        }`}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-sm">
            <h3 className="font-label-md text-label-md text-on-surface leading-snug line-clamp-2">
              {quiz.title}
            </h3>
            {(isCompleted || isFailed) && <ScoreBadge score={quiz.attempt_score} />}
          </div>
          <p className="font-label-sm text-label-sm text-primary mt-0.5">{quiz.subject}</p>
        </div>
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 text-[13px]">
          {quiz.description}
        </p>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-xs">
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">help</span>
          {quiz.total_questions} questions
        </span>
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[14px]">timer</span>
          {quiz.duration_minutes} min
        </span>
        {isInProgress && (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">pending</span>
            In progress
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Failed (Retake Required)
          </span>
        )}
      </div>

      {/* Action button */}
      {isCompleted ? (
        <button
          onClick={() => { window.location.hash = `/quiz-result/${quiz.attempt_id}` }}
          className="w-full h-10 border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container hover:text-primary transition-colors flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
          View Results
        </button>
      ) : (
        <button
          onClick={() => { window.location.hash = `/quiz/${quiz.id}` }}
          className="w-full h-10 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 hover:shadow-md transition-all flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isInProgress ? 'play_circle' : isFailed ? 'replay' : 'play_arrow'}
          </span>
          {isInProgress ? 'Continue Quiz' : isFailed ? 'Retake Quiz' : 'Start Quiz'}
        </button>
      )}
    </div>
  )
}
