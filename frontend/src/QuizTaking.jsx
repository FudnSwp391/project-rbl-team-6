import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Timer component ──────────────────────────────────────────────────────────
function CountdownTimer({ seconds, totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.()
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const isLow = remaining < 60
  const isVeryLow = remaining < 30
  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 100

  return (
    <div className={`flex flex-col gap-0.5 transition-colors ${
      isVeryLow ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-on-surface'
    }`}>
      <div className={`flex items-center gap-xs px-md py-1.5 rounded-lg font-label-md text-label-md ${
        isVeryLow ? 'bg-red-50 border border-red-200 animate-pulse' :
        isLow     ? 'bg-amber-50 border border-amber-200' :
                    'bg-surface-container-high'
      }`}>
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          timer
        </span>
        <span className="font-mono text-[16px] font-bold">{mm}:{ss}</span>
      </div>
      {totalSeconds > 0 && (
        <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isVeryLow ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ─── No-limit timer (elapsed) ────────────────────────────────────────────
function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-xs px-md py-1.5 rounded-lg bg-surface-container-high font-label-md text-label-md text-on-surface-variant">
      <span className="material-symbols-outlined text-[18px]">schedule</span>
      <span className="font-mono text-[16px]">{mm}:{ss}</span>
    </div>
  )
}

// ─── Confirm Submit Modal ─────────────────────────────────────────────────────
function ConfirmModal({ unanswered, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-xl max-w-sm w-full shadow-2xl">
        <div className="flex flex-col items-center text-center gap-md">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Submit Quiz?</h3>
            {unanswered > 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                You have <strong className="text-amber-600">{unanswered} unanswered question{unanswered > 1 ? 's' : ''}</strong>. Are you sure you want to submit?
              </p>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant">
                You've answered all questions. Ready to submit?
              </p>
            )}
          </div>
          <div className="flex gap-sm w-full">
            <button
              onClick={onCancel}
              className="flex-1 h-11 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors"
            >
              Keep reviewing
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-11 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              Submit now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main QuizTaking component ────────────────────────────────────────────────
export default function QuizTaking({ quizId, token, isPractice = false, practiceSessionId = null, isExamPaper = false, examPaperId = null }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attemptId, setAttemptId] = useState(null)
  const [sessionId] = useState(practiceSessionId)
  const [answers, setAnswers] = useState({})   // { questionKey: 'A'|'B'|'C'|'D' }
  const [flagged, setFlagged] = useState(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)   // seconds; null = unlimited
  const [totalSeconds, setTotalSeconds] = useState(null)     // original cap for progress bar
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const autoSaveRef = useRef(null)

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setCurrentIndex(i => Math.min(questions.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCurrentIndex(i => Math.max(0, i - 1))
      } else if (e.key === 'f' || e.key === 'F') {
        setFlagged(prev => {
          const next = new Set(prev)
          if (next.has(currentIndex)) next.delete(currentIndex)
          else next.add(currentIndex)
          return next
        })
      } else if (['1','2','3','4','a','b','c','d','A','B','C','D'].includes(e.key)) {
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', a: 'A', b: 'B', c: 'C', d: 'D' }
        const answer = map[e.key.toLowerCase()] || e.key.toUpperCase()
        const q = questions[currentIndex]
        if (q) {
          const key = (isPractice || isExamPaper) ? String(currentIndex) : (q.id || String(currentIndex))
          setAnswers(prev => ({ ...prev, [key]: answer }))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [questions, currentIndex, isPractice, isExamPaper])

  // ── Load quiz data ──
  useEffect(() => {
    if (isExamPaper) {
      fetchExamPaper()
    } else if (isPractice) {
      // Try to load from sessionStorage first (written by PracticeMode after generate)
      const stored = sessionStorage.getItem('practice_session')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (!practiceSessionId || parsed.sessionId === practiceSessionId) {
            setQuestions(parsed.questions || [])
            setQuiz({
              title: parsed.topic || 'AI Practice',
              subject: `${parsed.difficulty || 'medium'} difficulty`,
              total_questions: (parsed.questions || []).length
            })
            // Set timer from stored time limit
            if (parsed.timeLimitMins && parsed.timeLimitMins > 0) {
              const secs = parsed.timeLimitMins * 60
              setTimeRemaining(secs)
              setTotalSeconds(secs)
            }
            setLoading(false)
            sessionStorage.removeItem('practice_session')
            return
          }
        } catch (_) {}
      }
      fetchPracticeSession()
    } else if (quizId) {
      fetchQuizData()
    }
  }, [quizId, isPractice, practiceSessionId, isExamPaper, examPaperId])

  // ── Auto-save draft every 30s (formal quizzes only) ──
  useEffect(() => {
    if (isPractice || isExamPaper || !attemptId) return
    autoSaveRef.current = setInterval(() => {
      saveDraft()
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [attemptId, answers, timeRemaining, isPractice, isExamPaper])

  async function fetchExamPaper() {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/exam-papers/${examPaperId}/start`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load exam paper')
      const data = await res.json()
      setQuiz({
        title: data.exam_paper.title,
        subject: `${data.exam_paper.subject} • Lớp ${data.exam_paper.grade}`,
        total_questions: data.questions.length,
        duration_minutes: data.exam_paper.duration_minutes,
      })
      setQuestions(data.questions || [])
      setAttemptId(data.attempt_id)
      // Set countdown timer from exam paper duration
      if (data.exam_paper.duration_minutes) {
        const secs = data.exam_paper.duration_minutes * 60
        setTimeRemaining(secs)
        setTotalSeconds(secs)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuizData() {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/quizzes/${quizId}/start`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load quiz')
      const data = await res.json()
      setQuiz(data.quiz)
      setQuestions(data.questions || [])
      setAttemptId(data.attempt.id)
      setAnswers(data.attempt.answers || {})
      const secs = data.attempt.time_remaining_seconds || data.quiz.duration_minutes * 60
      setTimeRemaining(secs)
      setTotalSeconds(data.quiz.duration_minutes * 60)  // original cap for progress bar
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPracticeSession() {
    // Backend fallback: re-fetch session questions (no correct answers)
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/practice/${practiceSessionId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load practice session')
      const data = await res.json()
      setQuestions(data.questions || [])
      setQuiz({
        title: data.session.topic || 'AI Practice',
        subject: `${data.session.difficulty || 'medium'} difficulty`,
        total_questions: (data.questions || []).length,
      })
    } catch (err) {
      setError('Could not load practice session. Please go back and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveDraft() {
    if (!attemptId) return
    try {
      await fetch(`${apiBaseUrl}/api/quizzes/${quizId}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers, time_remaining_seconds: timeRemaining }),
      })
    } catch (_) { /* silent */ }
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setShowConfirm(false)
    try {
      if (isExamPaper) {
        // Build answers keyed by question id
        const examAnswers = {}
        questions.forEach((q, idx) => {
          const ans = answers[String(idx)]
          if (ans) examAnswers[q.id] = ans
        })
        const res = await fetch(`${apiBaseUrl}/api/exam-papers/${examPaperId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ attemptId, answers: examAnswers }),
        })
        if (!res.ok) throw new Error('Submit failed')
        window.location.hash = `/exam-result/${attemptId}`
      } else if (isPractice) {
        const res = await fetch(`${apiBaseUrl}/api/practice/${sessionId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answers }),
        })
        if (!res.ok) throw new Error('Submit failed')
        window.location.hash = `/practice-result/${sessionId}`
      } else {
        await saveDraft()
        const res = await fetch(`${apiBaseUrl}/api/quizzes/${quizId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answers }),
        })
        if (!res.ok) throw new Error('Submit failed')
        const data = await res.json()
        window.location.hash = `/quiz-result/${data.attempt.id}`
      }
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }, [answers, attemptId, quizId, sessionId, isPractice, isExamPaper, examPaperId, token, timeRemaining, questions])

  // For practice/exam: key by index; for formal quiz: key by question id
  function getAnswerKey(q, idx) {
    return (isPractice || isExamPaper) ? String(idx) : (q.id || String(idx))
  }

  function selectAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleFlag(idx) {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-body-md text-body-md text-on-surface-variant">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-md">
        <div className="text-center max-w-sm">
          <span className="material-symbols-outlined text-error text-[48px]">error</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-md mb-sm">{error}</h2>
          <button onClick={() => window.history.back()} className="btn-primary px-md py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const currentKey = currentQ ? getAnswerKey(currentQ, currentIndex) : null
  const answeredCount = Object.keys(answers).length
  const unanswered = questions.length - answeredCount
  const OPTIONS = ['A', 'B', 'C', 'D']
  const OPTION_KEYS = isExamPaper
    ? ['option_a', 'option_b', 'option_c', 'option_d']   // exam paper: snake_case from DB
    : isPractice
      ? ['optionA', 'optionB', 'optionC', 'optionD']     // AI practice: camelCase from Gemini
      : ['option_a', 'option_b', 'option_c', 'option_d'] // formal quiz: snake_case from DB

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {showConfirm && (
        <ConfirmModal
          unanswered={unanswered}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="h-14 bg-surface border-b border-outline-variant/20 flex items-center px-md gap-md shrink-0 z-20">
        <button
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-label-md text-label-md text-on-surface truncate">{quiz?.title}</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {quiz?.subject} • Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-sm">
          {/* Answered count */}
          <div className="hidden sm:flex items-center gap-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          {/* Keyboard hint (desktop only) */}
          <div className="hidden lg:flex items-center gap-xs px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant"
               title="Keyboard shortcuts: ←→ navigate • A/B/C/D answer • F flag">
            <span className="material-symbols-outlined text-[14px]">keyboard</span>
            <span className="font-label-sm text-[11px]">← → A–D F</span>
          </div>

          {/* Timer — countdown if time limit set, elapsed if no limit */}
          {timeRemaining !== null ? (
            <CountdownTimer
              seconds={timeRemaining}
              totalSeconds={totalSeconds}
              onExpire={() => handleSubmit()}
            />
          ) : (
            // Show elapsed time for practice and exam paper (no-limit or no duration set)
            (isPractice || isExamPaper) && <ElapsedTimer />
          )}

          {/* Submit button */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="h-9 px-md bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-xs"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">send</span>
            )}
            <span className="hidden sm:inline">{submitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar overlay (mobile) ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Question Navigation Sidebar ── */}
        <aside className={`
          fixed lg:static left-0 top-0 h-full z-40 flex flex-col
          w-64 bg-surface border-r border-outline-variant/20
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-md border-b border-outline-variant/20 shrink-0">
            <h2 className="font-label-md text-label-md text-on-surface mb-xs">Questions</h2>
            <div className="flex gap-sm flex-wrap text-[11px] font-label-sm text-label-sm">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" />Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-container-high inline-block border border-outline-variant" />Not answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Flagged</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-md">
            <div className="grid grid-cols-5 gap-xs">
              {questions.map((q, idx) => {
                const key = getAnswerKey(q, idx)
                const isAnswered = !!answers[key]
                const isFlagged = flagged.has(idx)
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={idx}
                    onClick={() => { setCurrentIndex(idx); setSidebarOpen(false) }}
                    className={`w-10 h-10 rounded-lg font-label-sm text-label-sm transition-all duration-150 relative ring-offset-1 ${
                      isCurrent ? 'ring-2 ring-primary scale-110 shadow-md' : 'hover:scale-105'
                    } ${
                      isFlagged ? 'bg-amber-400 text-white' :
                      isAnswered ? 'bg-primary text-on-primary' :
                      'bg-surface-container-high text-on-surface-variant border border-outline-variant/50'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-600 rounded-full border border-white" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-md border-t border-outline-variant/20 shrink-0">
            <div className="w-full bg-surface-container-high rounded-full h-2 mb-xs">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
              />
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
        </aside>

        {/* ── Main Question Area ── */}
        <main className="flex-1 overflow-y-auto p-md lg:p-lg">
          {currentQ ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-lg">
              {/* Question card */}
              <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl p-lg">
                <div className="flex items-center gap-sm mb-lg">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {currentIndex + 1}
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-snug">
                    {isPractice ? currentQ.question : currentQ.question_text}
                  </h2>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-sm">
                  {OPTIONS.map((letter, optIdx) => {
                    const optKey = OPTION_KEYS[optIdx]
                    const optText = currentQ[optKey]
                    const isSelected = answers[currentKey] === letter

                    return (
                      <button
                        key={letter}
                        onClick={() => selectAnswer(currentKey, letter)}
                        className={`w-full flex items-center gap-md p-md rounded-xl border-2 text-left transition-all duration-200 group ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant text-on-surface-variant group-hover:border-primary group-hover:text-primary'
                        }`}>
                          {letter}
                        </span>
                        <span className={`font-body-md text-body-md ${isSelected ? 'text-on-surface font-medium' : 'text-on-surface'}`}>
                          {optText}
                        </span>
                        {isSelected && (
                          <span className="ml-auto material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-md">
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-xs h-10 px-md border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Previous
                </button>

                <button
                  onClick={() => toggleFlag(currentIndex)}
                  className={`flex items-center gap-xs h-10 px-md rounded-lg font-label-md text-label-md border transition-colors ${
                    flagged.has(currentIndex)
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'border-outline-variant text-on-surface-variant hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={flagged.has(currentIndex) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    flag
                  </span>
                  {flagged.has(currentIndex) ? 'Flagged' : 'Flag'}
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                    className="flex items-center gap-xs h-10 px-md bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
                  >
                    Next
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-xs h-10 px-md bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Submit
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-on-surface-variant font-body-md text-body-md">No questions found.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
