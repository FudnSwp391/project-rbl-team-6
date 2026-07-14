import { useState, useEffect, useCallback } from 'react'
import TutorGradingReview from './TutorGradingReview'
import SessionEvaluationModal from './SessionEvaluationModal'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ── Toast mini-component ──────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  const bg = type === 'success' ? '#dcfce7' : type === 'error' ? '#fef2f2' : '#eff6ff'
  const color = type === 'success' ? '#15803d' : type === 'error' ? '#991b1b' : '#1d4ed8'
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color, border: `1px solid ${color}30`,
      borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380,
      animation: 'slideUp .25s ease',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  )
}

export default function TutorGradingDashboard({ token }) {
  // ── Tab 1: Assessment state ─────────────────────────────────────────────
  const [attempts, setAttempts]       = useState([])
  const [loadingAssess, setLoadingAssess] = useState(true)
  const [errorAssess, setErrorAssess] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [searchAssess, setSearchAssess] = useState('')

  // ── Tab 2: Session Evaluation state ────────────────────────────────────
  const [sessions, setSessions]         = useState([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [errorSession, setErrorSession] = useState('')
  const [searchSession, setSearchSession] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [pageSession, setPageSession]   = useState(1)
  const [totalSession, setTotalSession] = useState(0)
  const [selectedSession, setSelectedSession] = useState(null)
  const [evalModalOpen, setEvalModalOpen] = useState(false)

  // ── Stats ───────────────────────────────────────────────────────────────
  const [evalStats, setEvalStats] = useState({ pending_count: 0, evaluated_count: 0 })

  // ── Active tab ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('assessment')

  // ── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => setToast({ message, type })


  // ── Fetch assessment queue ──────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoadingAssess(true)
    setErrorAssess('')
    try {
      const res  = await fetch(`${API}/api/tutor/grading-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch grading queue')
      setAttempts(data)
    } catch (err) {
      setErrorAssess(err.message)
    } finally {
      setLoadingAssess(false)
    }
  }, [token])

  // ── Fetch session evaluations ───────────────────────────────────────────
  const fetchSessions = useCallback(async (page = 1) => {
    setLoadingSession(true)
    setErrorSession('')
    try {
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: filterStatus,
        ...(searchSession.trim() ? { search: searchSession.trim() } : {}),
      })
      const res  = await fetch(`${API}/api/tutor/session-evaluations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch sessions')
      setSessions(data.sessions || [])
      setTotalSession(data.total || 0)
      setPageSession(data.page || 1)
    } catch (err) {
      setErrorSession(err.message)
    } finally {
      setLoadingSession(false)
    }
  }, [token, filterStatus, searchSession])

  // ── Fetch eval stats ────────────────────────────────────────────────────
  const fetchEvalStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/tutor/session-eval-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setEvalStats(data)
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => { fetchQueue() },    [fetchQueue])
  useEffect(() => { fetchEvalStats() }, [fetchEvalStats])
  useEffect(() => {
    if (activeTab === 'session') fetchSessions(1)
  }, [activeTab, filterStatus, fetchSessions])


  // ── Khi đang xem chi tiết 1 bài kiểm tra ──────────────────────────────
  if (selectedAttempt) {
    return (
      <TutorGradingReview
        token={token}
        attemptInfo={selectedAttempt}
        onBack={() => {
          setSelectedAttempt(null)
          fetchQueue()
          showToast('Đã lưu điểm thành công!', 'success')
        }}
      />
    )
  }

  // ── Derived: filter assessment list by search ───────────────────────────
  const filteredAttempts = attempts.filter(a => {
    if (!searchAssess.trim()) return true
    const q = searchAssess.toLowerCase()
    return (
      (a.student_name || '').toLowerCase().includes(q) ||
      (a.paper_title  || '').toLowerCase().includes(q) ||
      (a.subject      || '').toLowerCase().includes(q)
    )
  })
  const pendingCount = attempts.filter(a => a.tutor_score == null).length
  const dueToday = attempts.filter(a => {
    const d = new Date(a.submitted_at)
    return d.toDateString() === new Date().toDateString() && a.tutor_score == null
  }).length

  const LIMIT_SESSION = 15
  const totalPages = Math.ceil(totalSession / LIMIT_SESSION)


  return (
    <div className="flex flex-col gap-lg h-full">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page title */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
          Review &amp; Grade
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Review student submissions and provide manual feedback
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1 */}
        <div style={{ background:'var(--surface-container-lowest,#fff)', border:'1px solid var(--outline-variant,#c4c5d7)', borderRadius:'0.75rem', padding:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div>
            <p style={{ color:'var(--on-surface-variant)', fontSize:13, fontWeight:600, marginBottom:4 }}>Bài kiểm tra chờ chấm</p>
            <h3 style={{ fontSize:36, fontWeight:700, color:'var(--primary)', lineHeight:1.1, margin:0 }}>
              {loadingAssess ? '—' : pendingCount}
            </h3>
            <p style={{ fontSize:12, color:'var(--on-surface-variant)', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>schedule</span>
              {loadingAssess ? '...' : `${dueToday} nộp hôm nay`}
            </p>
          </div>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,56,176,.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize:32, fontVariationSettings:"'FILL' 1" }}>assignment</span>
          </div>
        </div>
        {/* Card 2 */}
        <div style={{ background:'var(--surface-container-lowest,#fff)', border:'1px solid var(--outline-variant,#c4c5d7)', borderRadius:'0.75rem', padding:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div>
            <p style={{ color:'var(--on-surface-variant)', fontSize:13, fontWeight:600, marginBottom:4 }}>Buổi học chờ đánh giá</p>
            <h3 style={{ fontSize:36, fontWeight:700, color:'#36455b', lineHeight:1.1, margin:0 }}>
              {evalStats.pending_count ?? '—'}
            </h3>
            <p style={{ fontSize:12, color:'var(--on-surface-variant)', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>person_pin</span>
              {evalStats.evaluated_count ?? 0} buổi đã đánh giá
            </p>
          </div>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(54,69,91,.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'#36455b' }}>
            <span className="material-symbols-outlined" style={{ fontSize:32, fontVariationSettings:"'FILL' 1" }}>chat_bubble</span>
          </div>
        </div>
      </div>


      {/* Tab navigation */}
      <div style={{ borderBottom:'1px solid var(--outline-variant,#c4c5d7)', display:'flex', gap:'2rem', paddingTop:4 }}>
        {[
          { key: 'assessment', label: 'Chấm điểm bài kiểm tra' },
          { key: 'session',    label: 'Đánh giá buổi học'       },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            paddingBottom:14, fontWeight:600, fontSize:14, border:'none', background:'none', cursor:'pointer',
            borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === tab.key ? 'var(--primary)' : 'var(--on-surface-variant)',
            transition:'all .2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ══════════ TAB 1: Assessment Grading ══════════ */}
      {activeTab === 'assessment' && (
        <>
          {errorAssess && (
            <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, color:'#991b1b', fontSize:14 }}>
              {errorAssess}
            </div>
          )}
          {/* Search bar */}
          <div style={{ position:'relative', maxWidth:420 }}>
            <span className="material-symbols-outlined" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'var(--on-surface-variant)' }}>search</span>
            <input
              value={searchAssess}
              onChange={e => setSearchAssess(e.target.value)}
              placeholder="Tìm theo học sinh, bài kiểm tra, môn học..."
              style={{ width:'100%', height:40, paddingLeft:36, paddingRight:12, borderRadius:8, border:'1px solid var(--outline-variant)', background:'var(--surface-container-lowest)', fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {loadingAssess ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-xl text-center">
              <span className="material-symbols-outlined text-[64px] text-green-500 mb-4">task_alt</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {searchAssess ? 'Không tìm thấy kết quả' : 'All caught up!'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                {searchAssess ? 'Thử từ khoá khác.' : 'Không có bài nào chờ chấm. Take a break!'}
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
                      <th className="p-4 font-label-md text-on-surface-variant" style={{ textAlign:'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filteredAttempts.map(attempt => {
                      const date = new Date(attempt.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
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
                              <span className="font-label-sm text-on-surface-variant">{attempt.subject} • {(attempt.type || '').toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="p-4 font-body-sm text-on-surface-variant">{date}</td>
                          <td className="p-4 font-body-md font-bold text-on-surface">{attempt.score != null ? `${attempt.score}%` : 'N/A'}</td>
                          <td className="p-4">
                            {isGraded
                              ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, background:'#f3e8ff', color:'#7e22ce', fontWeight:700, fontSize:13 }}>{attempt.tutor_score}%</span>
                              : <span className="font-label-sm text-on-surface-variant italic">Pending</span>
                            }
                          </td>
                          <td className="p-4" style={{ textAlign:'right' }}>
                            {!isGraded && (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:20, background:'var(--error-container,#ffdad6)', color:'var(--on-error-container,#93000a)', fontSize:11, fontWeight:600, marginRight:8 }}>
                                <span style={{ width:6, height:6, borderRadius:'50%', background:'#ba1a1a', display:'inline-block' }} />Waiting
                              </span>
                            )}
                            <button
                              onClick={() => setSelectedAttempt(attempt)}
                              className="h-9 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm hover:bg-primary hover:text-on-primary transition-colors"
                            >
                              {isGraded ? 'Edit Grade' : 'Chấm điểm'}
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
        </>
      )}


      {/* ══════════ TAB 2: Session Evaluation ══════════ */}
      {activeTab === 'session' && (
        <>
          {errorSession && (
            <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, color:'#991b1b', fontSize:14 }}>
              {errorSession}
            </div>
          )}

          {/* Search + Filter row */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:220 }}>
              <span className="material-symbols-outlined" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:18, color:'var(--on-surface-variant)' }}>search</span>
              <input
                value={searchSession}
                onChange={e => { setSearchSession(e.target.value); setPageSession(1) }}
                onKeyDown={e => e.key === 'Enter' && fetchSessions(1)}
                placeholder="Tìm theo tên học sinh..."
                style={{ width:'100%', height:40, paddingLeft:36, paddingRight:12, borderRadius:8, border:'1px solid var(--outline-variant)', background:'var(--surface-container-lowest)', fontSize:14, outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPageSession(1) }}
              style={{ height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--outline-variant)', background:'var(--surface-container-lowest)', fontSize:14, cursor:'pointer', outline:'none' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ đánh giá</option>
              <option value="evaluated">Đã đánh giá</option>
            </select>
            <button
              onClick={() => fetchSessions(pageSession)}
              style={{ height:40, padding:'0 16px', borderRadius:8, background:'var(--primary)', color:'white', border:'none', fontWeight:600, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>refresh</span>
              Làm mới
            </button>
          </div>

          {loadingSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-xl text-center">
              <span className="material-symbols-outlined text-[64px] text-green-500 mb-4">task_alt</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {filterStatus === 'pending' ? 'Không có buổi học nào chờ đánh giá' : 'Chưa có dữ liệu'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                {filterStatus === 'pending'
                  ? 'Tất cả buổi học đã được đánh giá đầy đủ. Tuyệt vời!'
                  : 'Chưa có buổi học nào được hoàn thành.'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/30">
                        <th className="p-4 font-label-md text-on-surface-variant">Học sinh</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Môn học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Ngày học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Giờ học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Điểm TB</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Trạng thái</th>
                        <th className="p-4 font-label-md text-on-surface-variant" style={{ textAlign:'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {sessions.map(session => {
                        const isPending   = !session.evaluation_id
                        const isLocked    = session.eval_status === 'locked'
                        const avgScore = session.evaluation_id
                          ? (([session.score_attendance, session.score_attitude, session.score_comprehension, session.score_focus, session.score_homework]
                              .filter(Boolean).reduce((a, b) => a + Number(b), 0) /
                              [session.score_attendance, session.score_attitude, session.score_comprehension, session.score_focus, session.score_homework].filter(Boolean).length) || 0
                            ).toFixed(1)
                          : null
                        const dateStr = session.lesson_date
                          ? new Date(session.lesson_date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
                          : '—'
                        return (
                          <tr key={session.booking_id} className="hover:bg-surface-container-lowest/80 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {session.student_picture
                                  ? <img src={session.student_picture} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                                  : <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface-variant)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--on-surface-variant)' }}><span className="material-symbols-outlined" style={{ fontSize:20 }}>person</span></div>
                                }
                                <span className="font-label-md text-on-surface">{session.student_name}</span>
                              </div>
                            </td>
                            <td className="p-4 font-body-md text-on-surface">{session.subject || '—'}</td>
                            <td className="p-4 font-body-md text-on-surface">{dateStr}</td>
                            <td className="p-4 font-body-sm text-on-surface-variant">{session.time_slot || '—'}</td>
                            <td className="p-4">
                              {avgScore != null
                                ? <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize:16, color:'#f59e0b', fontVariationSettings:"'FILL' 1" }}>star</span>
                                    <span className="font-label-md text-on-surface">{avgScore}/5</span>
                                  </div>
                                : <span className="font-label-sm text-on-surface-variant italic">Chưa có</span>
                              }
                            </td>
                            <td className="p-4">
                              {isPending
                                ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:20, background:'var(--error-container,#ffdad6)', color:'var(--on-error-container,#93000a)', fontSize:11, fontWeight:600 }}>
                                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#ba1a1a', display:'inline-block' }} />Chờ đánh giá
                                  </span>
                                : isLocked
                                  ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:20, background:'#f3e8ff', color:'#6b21a8', fontSize:11, fontWeight:600 }}>
                                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#7c3aed', display:'inline-block' }} />Đã khoá
                                    </span>
                                  : <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:20, background:'var(--surface-container-highest,#dae2fd)', color:'var(--on-surface-variant)', fontSize:11, fontWeight:600 }}>
                                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--outline)', display:'inline-block' }} />Hoàn thành
                                    </span>
                              }
                            </td>
                            <td className="p-4" style={{ textAlign:'right' }}>
                              <button
                                disabled={isLocked}
                                onClick={() => { setSelectedSession(session); setEvalModalOpen(true) }}
                                className="h-9 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isPending ? 'Đánh giá' : isLocked ? 'Đã khoá' : 'Xem / Sửa'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:8 }}>
                  <button disabled={pageSession <= 1} onClick={() => { setPageSession(p => p-1); fetchSessions(pageSession-1) }}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--outline-variant)', background:'var(--surface-container-lowest)', cursor:'pointer', fontSize:13, opacity: pageSession<=1 ? .4 : 1 }}>
                    ← Trước
                  </button>
                  <span style={{ fontSize:13, color:'var(--on-surface-variant)' }}>{pageSession} / {totalPages}</span>
                  <button disabled={pageSession >= totalPages} onClick={() => { setPageSession(p => p+1); fetchSessions(pageSession+1) }}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--outline-variant)', background:'var(--surface-container-lowest)', cursor:'pointer', fontSize:13, opacity: pageSession>=totalPages ? .4 : 1 }}>
                    Tiếp →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Session Evaluation Modal */}
      {evalModalOpen && selectedSession && (
        <SessionEvaluationModal
          token={token}
          session={selectedSession}
          onClose={() => { setEvalModalOpen(false); setSelectedSession(null) }}
          onSaved={() => {
            setEvalModalOpen(false)
            setSelectedSession(null)
            fetchSessions(pageSession)
            fetchEvalStats()
            showToast('Đánh giá đã được lưu thành công!', 'success')
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  )
}
