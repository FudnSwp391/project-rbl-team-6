import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TutorGradingReview({ token, attemptInfo, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tutorScore, setTutorScore] = useState(0)
  const [tutorFeedback, setTutorFeedback] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API}/api/tutor/grading-queue/${attemptInfo.type}/${attemptInfo.attempt_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || 'Failed to fetch details')
        
        setData(json)
        
        // Initialize form
        setTutorScore(json.attempt.tutor_score != null ? json.attempt.tutor_score : (json.attempt.score || 0))
        
        let initialFeedback = ''
        if (json.attempt.tutor_feedback) {
          try {
            const parsed = JSON.parse(json.attempt.tutor_feedback)
            if (typeof parsed === 'string') initialFeedback = parsed
            // if it's an object (like from AI), we don't necessarily want to stringify the whole object as simple text, but let's just dump it if it's not a string.
            else initialFeedback = JSON.stringify(parsed)
          } catch(e) {
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
  const parsedAnswers = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : (attempt.answers || {})
  
  let parsedAiFeedback = {}
  if (attempt.tutor_feedback) { // Ai feedback is currently stored in tutor_feedback by the submit endpoint if there is no tutor override. Wait, the backend actually stores AI feedback there.
    try {
      parsedAiFeedback = JSON.parse(attempt.tutor_feedback)
    } catch(e) {}
  }

  return (
    <div className="flex flex-col gap-lg h-full pb-xl">
      {/* Header */}
      <div className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-2xl shadow-sm sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <img src={student.picture || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{student.full_name}'s Submission</h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{paper.title} • {paper.subject}</p>
        </div>
        <div className="text-right">
          <p className="font-label-sm text-on-surface-variant mb-1">AI Calculated Score</p>
          <p className="font-headline-md text-primary font-black">{attempt.score}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: Student Answers */}
        <div className="lg:col-span-2 space-y-md">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">grading</span>
            Question Review
          </h3>
          
          <div className="flex flex-col gap-md">
            {questions.map((q, idx) => {
              const studentAnswer = parsedAnswers[q.id]
              const isEssay = q.question_type === 'essay'
              const aiData = parsedAiFeedback[q.id] // { score, feedback }

              return (
                <div key={q.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-sm">
                  <div className="flex gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</span>
                    <h4 className="font-label-md text-on-surface leading-snug">{q.question_text}</h4>
                  </div>

                  <div className="ml-8 space-y-4">
                    {/* Student Answer */}
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="font-label-sm text-on-surface-variant mb-1">Student's Answer:</p>
                      {isEssay ? (
                        <p className="font-body-md whitespace-pre-wrap">{studentAnswer || <span className="italic text-on-surface-variant/50">No answer provided</span>}</p>
                      ) : (
                        <p className="font-body-md font-bold text-primary">{studentAnswer || 'N/A'}</p>
                      )}
                    </div>

                    {/* Reference / Rubric */}
                    <div className="bg-green-50/50 border border-green-200 rounded-lg p-3">
                      <p className="font-label-sm text-green-700 mb-1">{isEssay ? 'Suggested Rubric:' : 'Correct Answer:'}</p>
                      <p className="font-body-sm text-green-800 whitespace-pre-wrap">{isEssay ? q.suggested_answer : q.correct_answer}</p>
                    </div>

                    {/* AI Feedback for Essay */}
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

        {/* Right Column: Grading Form */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest border border-purple-200 rounded-2xl p-md shadow-md sticky top-24">
            <h3 className="font-headline-sm text-purple-700 flex items-center gap-2 mb-4 border-b border-purple-100 pb-3">
              <span className="material-symbols-outlined">edit_note</span>
              Tutor Override
            </h3>
            
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
                <label className="font-label-md text-on-surface">Overall Feedback for Student</label>
                <textarea 
                  rows={6} required
                  value={tutorFeedback}
                  onChange={e => setTutorFeedback(e.target.value)}
                  className="p-md rounded-xl border border-purple-300 bg-purple-50/30 focus:border-purple-500 outline-none resize-y"
                  placeholder="Provide your manual evaluation and constructive feedback here..."
                />
              </div>

              <button 
                type="submit" disabled={saving}
                className="h-12 w-full mt-2 bg-purple-600 text-white rounded-xl font-label-lg shadow-sm hover:bg-purple-700 hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
