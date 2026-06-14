import { useState, useEffect } from 'react'
import TutorAssessmentForm from './TutorAssessmentForm'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TutorAssessmentManager({ token }) {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchExams = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/tutor/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch')
      setExams(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

  if (isCreating) {
    return (
      <TutorAssessmentForm 
        token={token} 
        onCancel={() => setIsCreating(false)}
        onSuccess={() => {
          setIsCreating(false)
          fetchExams()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-lg h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
            My Assessments
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage your exam papers and quizzes</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="h-12 px-lg bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Create New
        </button>
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
      ) : exams.length === 0 ? (
        <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-xl text-center">
          <span className="material-symbols-outlined text-[64px] text-outline mb-4">note_stack</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No assessments yet</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
            Create your first exam paper or quiz. You can include both multiple choice and essay questions.
          </p>
          <button 
            onClick={() => setIsCreating(true)}
            className="h-10 px-md border border-primary text-primary rounded-lg font-label-md hover:bg-primary/5 transition-colors"
          >
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {exams.map(exam => (
            <div key={exam.id} className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm rounded-2xl p-md flex flex-col gap-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-label-sm">
                  {exam.subject}
                </span>
                <span className="font-label-sm text-on-surface-variant">{exam.question_count} Qs</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 mt-1">
                {exam.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant flex-1 line-clamp-2">
                {exam.description || 'No description provided.'}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-sm">
                <span className="font-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {exam.duration_minutes}m
                </span>
                <span className="font-label-sm text-on-surface-variant">
                  Grade {exam.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
