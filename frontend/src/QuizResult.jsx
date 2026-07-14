import { useState, useEffect } from 'react'

function CircularProgress({ percentage, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const color = percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#dc2626'

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e7e8ea" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

function formatDuration(startedAt, submittedAt) {
  if (!startedAt || !submittedAt) return '—'
  const diff = Math.round((new Date(submittedAt) - new Date(startedAt)) / 1000)
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m}m ${s}s`
}

function AnswerIndicator({ letter, text, status }) {
  // status: 'correct' | 'wrong' | 'neutral'
  const styles = {
    correct: 'border-green-400 bg-green-50',
    wrong:   'border-red-400 bg-red-50',
    neutral: 'border-outline-variant/50 bg-transparent',
  }
  const letterStyles = {
    correct: 'bg-green-500 text-white border-green-500',
    wrong:   'bg-red-500 text-white border-red-500',
    neutral: 'bg-transparent text-on-surface-variant border-outline-variant',
  }
  const icons = {
    correct: 'check',
    wrong:   'close',
    neutral: null,
  }

  return (
    <div className={`flex items-center gap-md p-sm rounded-xl border-2 ${styles[status]}`}>
      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${letterStyles[status]}`}>
        {icons[status] ? (
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icons[status]}
          </span>
        ) : letter}
      </span>
      <span className={`font-body-md text-body-md text-sm ${
        status === 'correct' ? 'text-green-800 font-medium' :
        status === 'wrong' ? 'text-red-800' :
        'text-on-surface'
      }`}>{text}</span>
    </div>
  )
}

export default function QuizResult({ attemptId, token, isPractice = false, sessionId = null, isExamPaper = false, isTutorExam = false, tutorExamId = null }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchResults()
  }, [attemptId, sessionId, tutorExamId])

  async function fetchResults() {
    try {
      setLoading(true)

      if (isTutorExam) {
        // Fetch tutor exam result
        const res = await fetch(`${apiBaseUrl}/api/student/assessments/exams/${tutorExamId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load tutor exam results')
        const json = await res.json()
        
        const questions = (json.questions || []).map(q => {
          const ansRecord = (json.answers || []).find(a => a.question_id === q.id)
          return {
            id: q.id,
            text: q.question_text,
            question_type: q.question_type || 'MCQ',
            options: {
              A: q.options[0]?.text || '',
              B: q.options[1]?.text || '',
              C: q.options[2]?.text || '',
              D: q.options[3]?.text || ''
            },
            correctAnswer: q.correct_answer,
            explanation: q.grading_note,
            studentAnswer: ansRecord ? ansRecord.student_answer : null,
          }
        })
        
        // Count total correct based on answers
        const total_correct = (json.answers || []).filter(a => a.is_correct).length

        // Total score vs total points
        const score = json.submission?.score || 0
        const total = json.exam?.total_score || 100
        const percentage = total > 0 ? (score / total) * 100 : 0

        setData({
          title: json.exam?.title,
          subject: json.exam?.course || 'Assessment',
          score: percentage,
          tutor_score: percentage,
          total_correct: total_correct,
          total_questions: json.exam?.total_questions || questions.length,
          started_at: json.submission?.started_at,
          submitted_at: json.submission?.submitted_at,
          questions,
          isPractice: false,
          isExamPaper: false,
          isTutorExam: true
        })
      } else if (isPractice) {
        // Fetch practice result from dedicated endpoint
        const res = await fetch(`${apiBaseUrl}/api/practice/${sessionId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load practice results')
        const json = await res.json()

        const questions = (json.session?.questions || []).map((q, i) => ({
          id: q.index || i,
          text: q.question,
          question_type: q.question_type || 'multiple_choice',
          options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          studentAnswer: json.session?.answers ? json.session.answers[String(i)] ?? json.session.answers[i] : null,
          ai_score: q.ai_score,
          ai_feedback: q.ai_feedback,
          // tutor feedback is session-level for practice, not per-question
        }))

        // Parse session-level tutor feedback (plain string stored as JSON string)
        let sessionTutorFeedback = null
        if (json.session?.tutor_feedback) {
          try {
            const parsed = JSON.parse(json.session.tutor_feedback)
            sessionTutorFeedback = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
          } catch {
            sessionTutorFeedback = json.session.tutor_feedback
          }
        }

        setData({
          title: json.session.topic,
          subject: `${json.session.difficulty} difficulty`,
          score: json.session.score,
          tutor_score: json.session.tutor_score,
          tutor_feedback: sessionTutorFeedback,
          total_correct: json.session.total_correct,
          total_questions: json.session.total_questions,
          started_at: json.session.created_at,
          submitted_at: json.session.submitted_at,
          questions,
          isPractice: true,
        })
      } else if (isExamPaper) {
        // Fetch exam paper result
        const res = await fetch(`${apiBaseUrl}/api/exam-papers/attempts/${attemptId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load exam results')
        const json = await res.json()
        
        let feedbackMap = {}
        try { feedbackMap = typeof json.attempt?.tutor_feedback === 'string' ? JSON.parse(json.attempt.tutor_feedback) : (json.attempt?.tutor_feedback || {}) } catch(e){}

        const questions = (json.questions || []).map(q => {
           const fb = feedbackMap[q.id] || {}
           return {
            id: q.id,
            text: q.question_text,
            question_type: q.question_type || 'multiple_choice',
            options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            studentAnswer: (json.attempt?.answers || {})[q.id] || null,
            ai_score: fb.score,
            ai_feedback: fb.feedback,
            tutor_score: q.tutor_score, // this is at attempt level for exam, we can just use fb
            tutor_feedback: q.tutor_feedback
          }
        })

        setData({
          title: json.paper?.title,
          subject: json.paper?.subject,
          score: json.attempt?.score,
          total_correct: json.attempt?.total_correct,
          total_questions: json.paper?.total_questions || questions.length,
          started_at: json.attempt?.started_at,
          submitted_at: json.attempt?.submitted_at,
          questions,
          isPractice: false,
          isExamPaper: true,
        })
      } else {
        // Fetch formal quiz attempt result
        const res = await fetch(`${apiBaseUrl}/api/quizzes/attempts/${attemptId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load results')
        const json = await res.json()

        let feedbackMap = {}
        try { feedbackMap = typeof json.attempt?.tutor_feedback === 'string' ? JSON.parse(json.attempt.tutor_feedback) : (json.attempt?.tutor_feedback || {}) } catch(e){}

        const questions = (json.questions || []).map(q => {
          const fb = feedbackMap[q.id] || {}
          return {
            id: q.id,
            text: q.question_text,
            question_type: q.question_type || 'multiple_choice',
            options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            studentAnswer: (json.attempt?.answers || {})[q.id] || null,
            ai_score: fb.score,
            ai_feedback: fb.feedback,
            tutor_score: q.tutor_score,
            tutor_feedback: q.tutor_feedback
          }
        })


        setData({
          title: json.quiz?.title,
          subject: json.quiz?.subject,
          score: json.attempt?.score,
          total_correct: json.attempt?.total_correct,
          total_questions: json.quiz?.total_questions || questions.length,
          started_at: json.attempt?.started_at,
          submitted_at: json.attempt?.submitted_at,
          questions,
          isPractice: false,
          isExamPaper: false,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [attemptId, sessionId])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-body-md text-body-md text-on-surface-variant">Đang tải kết quả...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-md">
        <div className="text-center">
          <span className="material-symbols-outlined text-error text-[48px]">error</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-md mb-md">{error || 'Không tìm thấy kết quả'}</h2>
          <button
            onClick={() => window.location.hash = '/dashboard'}
            className="h-10 px-md bg-primary text-on-primary rounded-lg font-label-md text-label-md"
          >
            Quay lại Bảng Điều Khiển
          </button>
        </div>
      </div>
    )
  }

  const percentage = data.score ?? 0
  // If tutor has overridden score, show that as the displayed score
  const displayScore = data.tutor_score != null ? data.tutor_score : percentage
  const color = displayScore >= 70 ? 'text-green-600' : displayScore >= 50 ? 'text-amber-600' : 'text-red-600'
  const bgGrade = displayScore >= 70 ? 'from-green-50 to-emerald-50' : displayScore >= 50 ? 'from-amber-50 to-yellow-50' : 'from-red-50 to-rose-50'
  const grade = displayScore >= 90 ? 'Xuất sắc! 🎉' : displayScore >= 70 ? 'Làm tốt lắm! 👍' : displayScore >= 50 ? 'Cố lên! 💪' : 'Cần luyện tập thêm 📚'

  return (
    <div className="min-h-screen bg-background font-body-md text-body-md text-on-surface">
      {/* ── Header bar ── */}
      <header className="sticky top-0 z-10 h-14 bg-surface/90 backdrop-blur-sm border-b border-outline-variant/20 flex items-center px-md gap-md">
        <button
          onClick={() => window.location.hash = data.isPractice ? '/dashboard/practice' : data.isExamPaper ? '/dashboard/exam-papers' : '/dashboard/assessments'}
          className="flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Quay lại Bảng Điều Khiển
        </button>
        <div className="flex-1" />
        <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">
          {data.title}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-md py-xl flex flex-col gap-xl pb-xl">

        {/* ── Score Overview Card ── */}
        <div className={`bg-gradient-to-br ${bgGrade} border border-outline-variant/30 rounded-2xl p-xl flex flex-col items-center gap-lg shadow-sm`}>
          <div className="relative">
            <CircularProgress percentage={displayScore} size={140} strokeWidth={12} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-headline-lg text-headline-lg font-black ${color}`}>{displayScore}%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {data.tutor_score != null ? 'điểm gia sư' : 'điểm số'}
              </span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">{grade}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{data.title}</p>
            {data.tutor_score != null && (
              <p className="font-label-sm text-on-surface-variant mt-xs">
                AI score: {percentage}% → Gia sư đã điều chỉnh: <span className="text-purple-600 font-bold">{data.tutor_score}%</span>
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm w-full">
            {[
              { label: 'Tổng', value: data.total_questions, icon: 'quiz', color: 'text-on-surface' },
              { label: 'Đúng', value: data.total_correct ?? '—', icon: 'check_circle', color: 'text-green-600' },
              { label: 'Sai', value: (data.total_questions - (data.total_correct ?? 0)), icon: 'cancel', color: 'text-red-600' },
              { label: 'Thời gian', value: formatDuration(data.started_at, data.submitted_at), icon: 'timer', color: 'text-primary' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/70 backdrop-blur-sm rounded-xl p-sm flex flex-col items-center gap-xs shadow-sm">
                <span className={`material-symbols-outlined text-[20px] ${stat.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {stat.icon}
                </span>
                <span className={`font-headline-md text-headline-md font-black ${stat.color}`}>{stat.value}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tutor Feedback Block (practice session-level) ── */}
        {data.tutor_feedback && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-lg shadow-sm">
            <div className="flex items-center gap-sm mb-md">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-purple-800">Nhận xét của Gia sư</h3>
                {data.tutor_score != null && (
                  <p className="font-label-sm text-purple-500">Điểm đã điều chỉnh: <span className="font-bold text-purple-700">{data.tutor_score}%</span></p>
                )}
              </div>
            </div>
            <p className="font-body-md text-on-surface whitespace-pre-wrap leading-relaxed">{data.tutor_feedback}</p>
          </div>
        )}

        {/* Pending tutor review notice */}
        {!data.tutor_feedback && data.isPractice && (
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">pending</span>
            <p className="font-body-sm text-on-surface-variant">Bài làm đang chờ gia sư xem xét và nhận xét.</p>
          </div>
        )}

        {/* ── Question Review ── */}
        {data.questions && data.questions.length > 0 && (
          <div className="flex flex-col gap-md">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
              Xem Lại Câu Hỏi
            </h2>

            {data.questions.map((q, idx) => {
              const isEssay = q.question_type === 'essay'
              const unanswered = !q.studentAnswer
              const isCorrect = !isEssay && q.studentAnswer === q.correctAnswer

              return (
                <div
                  key={q.id || idx}
                  className={`bg-surface-container-lowest/70 backdrop-blur-md border rounded-xl p-lg flex flex-col gap-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] ${
                    unanswered ? 'border-outline-variant/50' :
                    (isEssay ? 'border-primary/50' : (isCorrect ? 'border-green-200' : 'border-red-200'))
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-sm">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      unanswered ? 'bg-surface-container-high text-on-surface-variant' :
                      isEssay ? 'bg-primary-container text-on-primary-container' : (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                    }`}>
                      {unanswered ? idx + 1 : (
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isEssay ? 'edit_document' : (isCorrect ? 'check' : 'close')}
                        </span>
                      )}
                    </span>
                    <h3 className="font-label-md text-label-md text-on-surface flex-1 leading-snug">{q.text}</h3>
                  </div>

                  {/* Options / Essay Answer */}
                  {isEssay ? (
                    <div className="ml-10 flex flex-col gap-sm">
                      <div className="p-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                        <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Câu trả lời của bạn:</p>
                        <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{q.studentAnswer || <span className="italic opacity-60">Không có câu trả lời</span>}</p>
                      </div>
                      
                      {q.ai_feedback && (
                        <div className="p-md rounded-xl border border-primary/20 bg-primary-container/20">
                          <p className="font-label-sm text-label-sm text-primary mb-xs flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                            AI Đánh giá (Điểm: {q.ai_score}/100)
                          </p>
                          <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{q.ai_feedback}</p>
                        </div>
                      )}

                      {q.tutor_feedback && (
                        <div className="p-md rounded-xl border border-purple-200 bg-purple-50">
                          <p className="font-label-sm text-label-sm text-purple-700 mb-xs flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[16px]">school</span>
                            Gia sư Nhận xét (Điểm: {q.tutor_score}/100)
                          </p>
                          <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{q.tutor_feedback}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-xs ml-10">
                      {Object.entries(q.options).map(([letter, text]) => {
                        let status = 'neutral'
                        if (letter === q.correctAnswer) status = 'correct'
                        else if (letter === q.studentAnswer && !isCorrect) status = 'wrong'
                        return <AnswerIndicator key={letter} letter={letter} text={text} status={status} />
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="ml-10 bg-surface-container-low rounded-lg p-sm flex gap-sm">
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                        lightbulb
                      </span>
                      <p className="font-body-md text-body-md text-on-surface-variant text-sm">{q.explanation}</p>
                    </div>
                  )}

                  {unanswered && !isEssay && (
                    <p className="ml-10 font-label-sm text-label-sm text-on-surface-variant italic">Not answered</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-md flex-wrap">
          <button
            onClick={() => window.location.hash = '/dashboard'}
            className="flex-1 sm:flex-none h-11 px-xl border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Quay lại Bảng Điều Khiển
          </button>
          {isPractice ? (
            <button
              onClick={() => window.location.hash = '/practice'}
              className="flex-1 sm:flex-none h-11 px-xl bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Luyện tập mới
            </button>
          ) : isExamPaper ? (
            <button
              onClick={() => window.location.hash = '/dashboard/exam-papers'}
              className="flex-1 sm:flex-none h-11 px-xl bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined text-[18px]">article</span>
              Thêm Kỳ Thi
            </button>
          ) : (
            <button
              onClick={() => window.location.hash = '/dashboard/assessments'}
              className="flex-1 sm:flex-none h-11 px-xl bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              Thêm Bài Kiểm Tra
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
