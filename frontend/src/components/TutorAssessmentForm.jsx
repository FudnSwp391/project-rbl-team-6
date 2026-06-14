import { useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TutorAssessmentForm({ token, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Toán',
    grade: 10,
    duration_minutes: 45,
    description: '',
  })
  
  const [questions, setQuestions] = useState([
    {
      id: Date.now().toString(),
      question_type: 'multiple_choice',
      question_text: '',
      option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A',
      explanation: '',
      suggested_answer: '' // For essays
    }
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAddQuestion = (type) => {
    setQuestions(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random(),
        question_type: type,
        question_text: '',
        option_a: '', option_b: '', option_c: '', option_d: '',
        correct_answer: 'A',
        explanation: '',
        suggested_answer: ''
      }
    ])
  }

  const handleRemoveQuestion = (id) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const updateQuestion = (id, field, value) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`${API}/api/tutor/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, questions })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create assessment')
      onSuccess()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-lg h-full pb-xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={onCancel}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Create Assessment</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Fill in the details and add your questions</p>
        </div>
      </div>

      {error && (
        <div className="p-md bg-error/10 border border-error/20 text-error rounded-xl font-body-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-xl">
        {/* -- General Info -- */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-xl shadow-sm space-y-md">
          <h3 className="font-headline-sm text-headline-sm border-b border-outline-variant/30 pb-sm">General Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-label-md">Assessment Title</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="h-12 px-md rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="e.g. Midterm Test - Advanced Math"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md">Subject</label>
              <select 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="h-12 px-md rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none"
              >
                <option value="Toán">Toán</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Vật lí">Vật lí</option>
                <option value="Hoá học">Hoá học</option>
                <option value="Sinh học">Sinh học</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md">Grade Level (Lớp)</label>
              <select 
                value={formData.grade}
                onChange={e => setFormData({...formData, grade: parseInt(e.target.value)})}
                className="h-12 px-md rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none"
              >
                {[6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md">Duration (Minutes)</label>
              <input 
                type="number" required min="5" max="180"
                value={formData.duration_minutes}
                onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                className="h-12 px-md rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-label-md">Description (Optional)</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="p-md rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none resize-y"
                placeholder="Briefly describe what this assessment covers..."
              />
            </div>
          </div>
        </div>

        {/* -- Questions -- */}
        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm">Questions ({questions.length})</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleAddQuestion('multiple_choice')} className="h-10 px-md rounded-lg bg-secondary-container text-on-secondary-container font-label-md hover:bg-secondary-container/80 transition-colors">
                + Add Multiple Choice
              </button>
              <button type="button" onClick={() => handleAddQuestion('essay')} className="h-10 px-md rounded-lg bg-primary-container text-on-primary-container font-label-md hover:bg-primary-container/80 transition-colors">
                + Add Essay
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-md">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-xl shadow-sm flex flex-col gap-md relative">
                <div className="absolute top-4 right-4">
                  <button type="button" onClick={() => handleRemoveQuestion(q.id)} disabled={questions.length===1} className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 disabled:opacity-30 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">{index + 1}</span>
                  <span className="font-label-lg text-on-surface-variant">
                    {q.question_type === 'essay' ? 'Essay Question' : 'Multiple Choice Question'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Question Text</label>
                  <textarea 
                    required rows={2}
                    value={q.question_text}
                    onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                    className="p-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none resize-y"
                    placeholder="Enter the question..."
                  />
                </div>

                {q.question_type === 'essay' ? (
                  <div className="flex flex-col gap-1 bg-primary/5 p-md rounded-xl border border-primary/20">
                    <label className="font-label-sm text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                      Suggested Answer (Rubric for AI Grading)
                    </label>
                    <textarea 
                      required rows={4}
                      value={q.suggested_answer}
                      onChange={e => updateQuestion(q.id, 'suggested_answer', e.target.value)}
                      className="p-sm rounded-lg border border-primary/30 bg-white focus:border-primary outline-none resize-y"
                      placeholder="Provide key points, keywords, or a full sample answer. The AI will use this to grade the student's response..."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-sm pl-8">
                    {['A','B','C','D'].map(opt => (
                      <div key={opt} className={`flex items-center gap-2 p-2 rounded-lg border ${q.correct_answer === opt ? 'border-green-500 bg-green-50/50' : 'border-outline-variant bg-surface-container-lowest'}`}>
                        <input 
                          type="radio" name={`correct_${q.id}`} 
                          checked={q.correct_answer === opt}
                          onChange={() => updateQuestion(q.id, 'correct_answer', opt)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                        />
                        <span className="font-bold text-on-surface-variant w-4">{opt}.</span>
                        <input 
                          required
                          value={q[`option_${opt.toLowerCase()}`]}
                          onChange={e => updateQuestion(q.id, `option_${opt.toLowerCase()}`, e.target.value)}
                          className="flex-1 bg-transparent outline-none font-body-sm"
                          placeholder={`Option ${opt}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Explanation (Optional)</label>
                  <input 
                    value={q.explanation}
                    onChange={e => updateQuestion(q.id, 'explanation', e.target.value)}
                    className="h-10 px-sm rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none"
                    placeholder="Explain why the answer is correct..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -- Actions -- */}
        <div className="flex justify-end gap-md pt-lg border-t border-outline-variant/30 sticky bottom-0 bg-surface/90 backdrop-blur-md p-md rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <button 
            type="button" onClick={onCancel} disabled={saving}
            className="h-12 px-lg border border-outline-variant rounded-xl font-label-lg hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" disabled={saving}
            className="h-12 px-xl bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:transform-none"
          >
            {saving && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}
