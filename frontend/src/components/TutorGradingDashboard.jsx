import { useState, useEffect } from 'react'
import TutorGradingReview from './TutorGradingReview'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TutorGradingDashboard({ token }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState(null)

  const fetchQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/tutor/grading-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch grading queue')
      setAttempts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  if (selectedAttempt) {
    return (
      <TutorGradingReview 
        token={token} 
        attemptInfo={selectedAttempt}
        onBack={() => {
          setSelectedAttempt(null)
          fetchQueue() // Refresh list after grading
        }} 
      />
    )
  }

  return (
    <div className="flex flex-col gap-lg h-full">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
          Review & Grade
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Review student submissions and provide manual feedback</p>
      </div>

      {error && (
        <div className="p-md bg-error/10 border border-error/20 text-error rounded-xl font-body-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-xl text-center">
          <span className="material-symbols-outlined text-[64px] text-green-500 mb-4">task_alt</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">All caught up!</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            There are no student submissions waiting for your review. Take a break!
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="p-4 font-label-md text-on-surface-variant">Student</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Assessment</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Submitted</th>
                  <th className="p-4 font-label-md text-on-surface-variant">AI Score</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Tutor Score</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {attempts.map(attempt => {
                  const date = new Date(attempt.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  const isGraded = attempt.tutor_score != null
                  return (
                    <tr key={`${attempt.type}-${attempt.attempt_id}`} className="hover:bg-surface-container-lowest/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={attempt.student_picture || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full bg-surface-variant object-cover" />
                          <span className="font-label-md text-on-surface">{attempt.student_name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-label-md text-on-surface">{attempt.paper_title}</span>
                          <span className="font-label-sm text-on-surface-variant">{attempt.subject} • {attempt.type.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="p-4 font-body-sm text-on-surface-variant">{date}</td>
                      <td className="p-4 font-body-md font-bold text-on-surface">{attempt.score != null ? `${attempt.score}%` : 'N/A'}</td>
                      <td className="p-4">
                        {isGraded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-sm">
                            {attempt.tutor_score}%
                          </span>
                        ) : (
                          <span className="font-label-sm text-on-surface-variant italic">Pending</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedAttempt(attempt)}
                          className="h-9 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm hover:bg-primary hover:text-on-primary transition-colors"
                        >
                          {isGraded ? 'Edit Grade' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
