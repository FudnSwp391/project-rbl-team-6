import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config';

const API = API_BASE_URL

export default function TutorGradingReview({ token, attemptInfo, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tutorScore, setTutorScore] = useState(0)
  const [tutorFeedback, setTutorFeedback] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(
          `${API}/api/tutor/grading-queue/${attemptInfo.type}/${attemptInfo.attempt_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || 'Failed to fetch details')

        setData(json)
        setTutorScore(json.attempt.tutor_score != null ? json.attempt.tutor_score : (json.attempt.score || 0))

        let initialFeedback = ''
        if (json.attempt.tutor_feedback) {
          try {
            const parsed = JSON.parse(json.attempt.tutor_feedback)
            initialFeedback = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
          } catch {
            initialFeedback = json.attempt.tutor_feedback
          }
        }
        setTutorFeedback(initialFeedback)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [attemptInfo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/tutor/grade-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId: attemptInfo.attempt_id,
          type: attemptInfo.type,
          tutorScore: parseFloat(tutorScore),
          tutorFeedback: tutorFeedback
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to save grade')
      onBack()
    } catch (err) {
      alert(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-md bg-error/10 text-error rounded-xl">
        <p>{error || 'No data found'}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-error text-white rounded-lg">Go Back</button>
      </div>
    )
  }

  const { attempt, paper, questions, student } = data
  const parsedAnswers = typeof attempt.answers === 'string'
    ? JSON.parse(attempt.answers)
    : (attempt.answers || {})

  let parsedAiFeedback = {}
  if (attempt.tutor_feedback) {
    try {
      const p = JSON.parse(attempt.tutor_feedback)
      if (typeof p === 'object' && p !== null) parsedAiFeedback = p
    } catch { /* not JSON */ }
  }

  // ── Stats for MC-only questions ──────────────────────────────
  const mcQuestions = questions.filter(q => q.question_type !== 'essay')
  const wrongQuestions = mcQuestions.filter(q => {
    const ans = parsedAnswers[q.id]
    return !ans || ans.toUpperCase() !== (q.correct_answer || '').toUpperCase()
  })
  const correctCount = mcQuestions.length - wrongQuestions.length
  const hasEssay = questions.some(q => q.question_type === 'essay')
  const isMCOnly = mcQuestions.length > 0 && !hasEssay

  return (
    <div className="flex flex-col gap-lg h-full pb-xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-2xl shadow-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <img
              src={student.picture || 'https://via.placeholder.com/40'}
              className="w-8 h-8 rounded-full object-cover"
              alt="avatar"
            />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {student.full_name}'s Submission
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {paper.title} • {paper.subject}
          </p>
        </div>
        <div className="text-right">
          <p className="font-label-sm text-on-surface-variant mb-1">AI Calculated Score</p>
          <p className="font-headline-md text-primary font-black">{attempt.score}%</p>
        </div>
      </div>

      {/* ── MC Summary Banner ── */}
      {mcQuestions.length > 0 && (
        <div className="grid grid-cols-3 gap-md">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col items-center">
            <span className="material-symbols-outlined text-green-600 text-3xl mb-1">check_circle</span>
            <p className="font-headline-sm text-green-700 font-black">{correctCount}</p>
            <p className="font-label-sm text-green-600">Correct</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col items-center">
            <span className="material-symbols-outlined text-red-500 text-3xl mb-1">cancel</span>
            <p className="font-headline-sm text-red-600 font-black">{wrongQuestions.length}</p>
            <p className="font-label-sm text-red-500">Incorrect</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col items-center">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-1">quiz</span>
            <p className="font-headline-sm text-on-surface font-black">{mcQuestions.length}</p>
            <p className="font-label-sm text-on-surface-variant">Total MC</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

        {/* ── Left: Question Review ── */}
        <div className="lg:col-span-2 space-y-md">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">grading</span>
            Question Review
          </h3>

          {/* Wrong-answers summary for MC exams */}
          {isMCOnly && wrongQuestions.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-label-md text-red-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                {wrongQuestions.length} question{wrongQuestions.length > 1 ? 's' : ''} answered incorrectly
              </p>
              <div className="flex flex-wrap gap-2">
                {wrongQuestions.map((q, i) => {
                  const globalIdx = questions.indexOf(q) + 1
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold hover:bg-red-200 transition-colors"
                    >
                      Q{globalIdx}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-md">
            {questions.map((q, idx) => {
              const studentAnswer = parsedAnswers[q.id]
              const isEssay = q.question_type === 'essay'
              const aiData = parsedAiFeedback[q.id]

              // MC correctness
              const isCorrect = !isEssay
                && studentAnswer
                && studentAnswer.toUpperCase() === (q.correct_answer || '').toUpperCase()
              const isWrong = !isEssay && !isCorrect

              return (
                <div
                  id={`q-${q.id}`}
                  key={q.id}
                  className={`bg-surface-container-lowest border rounded-xl p-md shadow-sm scroll-mt-24 ${
                    isWrong
                      ? 'border-red-300'
                      : isCorrect
                        ? 'border-green-300'
                        : 'border-outline-variant/30'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex gap-2 mb-3 items-start">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isWrong
                        ? 'bg-red-100 text-red-600'
                        : isCorrect
                          ? 'bg-green-100 text-green-600'
                          : 'bg-primary/10 text-primary'
                    }`}>
                      {idx + 1}
                    </span>
                    <h4 className="font-label-md text-on-surface leading-snug flex-1">{q.question_text}</h4>
                    {!isEssay && (
                      <span className={`ml-auto shrink-0 flex items-center gap-1 text-sm font-bold ${
                        isCorrect ? 'text-green-600' : 'text-red-500'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {isCorrect ? 'check_circle' : 'cancel'}
                        </span>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>

                  <div className="ml-8 space-y-3">
                    {/* MC: show all options with highlights */}
                    {!isEssay && (
                      <div className="grid grid-cols-1 gap-2">
                        {['a','b','c','d'].map(opt => {
                          const label = opt.toUpperCase()
                          const text = q[`option_${opt}`]
                          if (!text) return null
                          const isStudentChoice = studentAnswer?.toUpperCase() === label
                          const isCorrectOpt = (q.correct_answer || '').toUpperCase() === label
                          return (
                            <div
                              key={opt}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                                isCorrectOpt
                                  ? 'bg-green-50 border-green-300 text-green-800 font-semibold'
                                  : isStudentChoice && !isCorrectOpt
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCorrectOpt
                                  ? 'bg-green-200 text-green-800'
                                  : isStudentChoice && !isCorrectOpt
                                    ? 'bg-red-200 text-red-700'
                                    : 'bg-surface-variant text-on-surface-variant'
                              }`}>
                                {label}
                              </span>
                              <span className="flex-1">{text}</span>
                              {isCorrectOpt && (
                                <span className="material-symbols-outlined text-green-600 text-[16px]">check_circle</span>
                              )}
                              {isStudentChoice && !isCorrectOpt && (
                                <span className="material-symbols-outlined text-red-500 text-[16px]">cancel</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* MC: student picked nothing */}
                    {!isEssay && !studentAnswer && (
                      <p className="italic text-on-surface-variant/60 text-sm">No answer selected</p>
                    )}

                    {/* Essay: student answer */}
                    {isEssay && (
                      <div className="bg-surface-container-low rounded-lg p-3">
                        <p className="font-label-sm text-on-surface-variant mb-1">Student's Answer:</p>
                        {studentAnswer
                          ? <p className="font-body-md whitespace-pre-wrap">{studentAnswer}</p>
                          : <p className="italic text-on-surface-variant/50 text-sm">No answer provided</p>
                        }
                      </div>
                    )}

                    {/* MC: explanation / essay: rubric */}
                    {(q.explanation || (isEssay && q.suggested_answer)) && (
                      <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
                        <p className="font-label-sm text-blue-700 mb-1">
                          {isEssay ? 'Suggested Rubric:' : 'Explanation:'}
                        </p>
                        <p className="font-body-sm text-blue-800 whitespace-pre-wrap">
                          {isEssay ? q.suggested_answer : q.explanation}
                        </p>
                      </div>
                    )}

                    {/* AI Feedback for essay */}
                    {isEssay && aiData && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-label-sm text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                            AI Evaluation
                          </p>
                          <span className="font-bold text-primary">{aiData.score}/100 pts</span>
                        </div>
                        <p className="font-body-sm text-on-surface whitespace-pre-wrap">{aiData.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: Grading Form ── */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest border border-purple-200 rounded-2xl p-md shadow-md sticky top-24 flex flex-col gap-4">

            <h3 className="font-headline-sm text-purple-700 flex items-center gap-2 pb-3 border-b border-purple-100">
              <span className="material-symbols-outlined">edit_note</span>
              Tutor Override
            </h3>

            {/* Quick stats recap */}
            {mcQuestions.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-3 text-sm">
                <p className="font-label-sm text-purple-700 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                  Performance Summary
                </p>
                <div className="flex justify-between text-purple-900">
                  <span>Correct</span>
                  <span className="font-bold text-green-700">{correctCount} / {mcQuestions.length}</span>
                </div>
                {wrongQuestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <p className="font-label-sm text-purple-600 mb-1">Missed questions:</p>
                    <div className="flex flex-wrap gap-1">
                      {wrongQuestions.map(q => {
                        const idx = questions.indexOf(q) + 1
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold hover:bg-red-200"
                          >
                            Q{idx}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Final Score (0-100%)</label>
                <input
                  type="number" min="0" max="100" required
                  value={tutorScore}
                  onChange={e => setTutorScore(e.target.value)}
                  className="h-12 px-md rounded-xl border border-purple-300 bg-purple-50/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-lg font-bold text-purple-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Feedback &amp; Remarks for Student</label>
                <textarea
                  rows={7} required
                  value={tutorFeedback}
                  onChange={e => setTutorFeedback(e.target.value)}
                  className="p-md rounded-xl border border-purple-300 bg-purple-50/30 focus:border-purple-500 outline-none resize-y font-body-md"
                  placeholder={
                    mcQuestions.length > 0
                      ? `e.g. You answered ${correctCount}/${mcQuestions.length} correctly. Review questions ${wrongQuestions.map((_,i)=>questions.indexOf(wrongQuestions[i])+1).join(', ')} — pay attention to...`
                      : 'Provide your evaluation and constructive feedback here...'
                  }
                />
                <p className="font-label-sm text-on-surface-variant">
                  This message will be visible to the student.
                </p>
              </div>

              <button
                type="submit" disabled={saving}
                className="h-12 w-full bg-purple-600 text-white rounded-xl font-label-lg shadow-sm hover:bg-purple-700 hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving...' : 'Submit Final Grade'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
