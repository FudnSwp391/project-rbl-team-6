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
    <div className="flex flex-col gap-5 pb-8">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page title */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
          Chấm Điểm &amp; Đánh Giá
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Quản lý chấm điểm bài tập và đánh giá chi tiết chất lượng buổi học
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1 */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div>
            <p className="text-on-surface-variant text-[13px] font-semibold mb-1">Bài kiểm tra chờ chấm</p>
            <h3 className="text-4xl font-bold text-primary leading-tight m-0 group-hover:scale-105 transition-transform origin-left">
              {loadingAssess ? '—' : pendingCount}
            </h3>
            <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {loadingAssess ? '...' : `${dueToday} nộp hôm nay`}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings:"'FILL' 1" }}>assignment</span>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
          <div>
            <p className="text-on-surface-variant text-[13px] font-semibold mb-1">Buổi học chờ đánh giá</p>
            <h3 className="text-4xl font-bold text-[#36455b] leading-tight m-0 group-hover:scale-105 transition-transform origin-left">
              {evalStats.pending_count ?? '—'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">person_pin</span>
              {evalStats.evaluated_count ?? 0} buổi đã đánh giá
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#36455b]/10 flex items-center justify-center text-[#36455b] group-hover:bg-[#36455b] group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings:"'FILL' 1" }}>chat_bubble</span>
          </div>
        </div>
      </div>


      {/* Tab navigation */}
      <div className="border-b border-outline-variant/50 flex gap-8 pt-2">
        {[
          { key: 'assessment', label: 'Chấm điểm bài kiểm tra' },
          { key: 'session',    label: 'Đánh giá buổi học'       },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`
            pb-3 font-semibold text-sm border-b-2 transition-all duration-200 outline-none
            ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}>
            {tab.label}
          </button>
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
              <span className="material-symbols-outlined text-[64px] text-green-500 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {searchAssess ? 'Không tìm thấy kết quả' : 'Hoàn tất!'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                {searchAssess ? 'Thử từ khoá tìm kiếm khác.' : 'Bạn đã hoàn thành việc chấm điểm. Hãy nghỉ ngơi nhé!'}
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/50">
                      <th className="p-4 font-label-md text-on-surface-variant">Học sinh</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Bài kiểm tra</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Ngày nộp</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Điểm AI</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Điểm của bạn</th>
                      <th className="p-4 font-label-md text-on-surface-variant text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {filteredAttempts.map(attempt => {
                      const date = new Date(attempt.submitted_at).toLocaleDateString('vi-VN', { month:'2-digit', day:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                      const isGraded = attempt.tutor_score != null
                      return (
                        <tr key={`${attempt.type}-${attempt.attempt_id}`} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={attempt.student_picture || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full bg-surface-variant object-cover border border-outline-variant/30" />
                              <span className="font-label-md text-on-surface font-semibold">{attempt.student_name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-label-md text-on-surface font-semibold">{attempt.paper_title}</span>
                              <span className="font-label-sm text-on-surface-variant">{attempt.subject} • {(attempt.type || '').toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="p-4 font-body-sm text-on-surface-variant">{date}</td>
                          <td className="p-4 font-body-md font-bold text-on-surface">{attempt.score != null ? `${attempt.score}%` : '—'}</td>
                          <td className="p-4">
                            {isGraded
                              ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 font-bold text-[13px]">{attempt.tutor_score}%</span>
                              : <span className="font-label-sm text-on-surface-variant italic">Chờ chấm</span>
                            }
                          </td>
                          <td className="p-4 text-right">
                            {!isGraded && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-bold mr-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />Cần xử lý
                              </span>
                            )}
                            <button
                              onClick={() => setSelectedAttempt(attempt)}
                              className="h-9 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors focus:ring-2 focus:ring-primary/50 outline-none"
                            >
                              {isGraded ? 'Sửa điểm' : 'Chấm điểm'}
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
              <span className="material-symbols-outlined text-[64px] text-green-500 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {filterStatus === 'pending' ? 'Không có buổi học nào chờ đánh giá' : 'Chưa có dữ liệu'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                {filterStatus === 'pending'
                  ? 'Tất cả buổi học đã được đánh giá đầy đủ. Tuyệt vời!'
                  : 'Chưa có buổi học nào được ghi nhận.'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/50">
                        <th className="p-4 font-label-md text-on-surface-variant">Học sinh</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Môn học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Ngày học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Giờ học</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Điểm TB</th>
                        <th className="p-4 font-label-md text-on-surface-variant">Trạng thái</th>
                        <th className="p-4 font-label-md text-on-surface-variant text-right">Thao tác</th>
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
                          <tr key={session.booking_id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {session.student_picture
                                  ? <img src={session.student_picture} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-outline-variant/30" />
                                  : <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">person</span></div>
                                }
                                <span className="font-label-md text-on-surface font-semibold">{session.student_name}</span>
                              </div>
                            </td>
                            <td className="p-4 font-body-md text-on-surface">{session.subject || '—'}</td>
                            <td className="p-4 font-body-md text-on-surface">{dateStr}</td>
                            <td className="p-4 font-body-sm text-on-surface-variant">{session.time_slot || '—'}</td>
                            <td className="p-4">
                              {avgScore != null
                                ? <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] text-amber-500" style={{ fontVariationSettings:"'FILL' 1" }}>star</span>
                                    <span className="font-label-md text-on-surface font-bold">{avgScore}/5</span>
                                  </div>
                                : <span className="font-label-sm text-on-surface-variant italic">Chưa có</span>
                              }
                            </td>
                            <td className="p-4">
                              {isPending
                                ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />Chờ đánh giá
                                  </span>
                                : isLocked
                                  ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />Đã khoá
                                    </span>
                                  : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />Hoàn thành
                                    </span>
                              }
                            </td>
                            <td className="p-4 text-right">
                              <button
                                disabled={isLocked}
                                onClick={() => { setSelectedSession(session); setEvalModalOpen(true) }}
                                className="h-9 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors focus:ring-2 focus:ring-primary/50 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
                <div className="flex justify-center items-center gap-3 mt-4">
                  <button 
                    disabled={pageSession <= 1} 
                    onClick={() => { setPageSession(p => p-1); fetchSessions(pageSession-1) }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-sm font-semibold hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Trước
                  </button>
                  <span className="text-sm font-semibold text-on-surface-variant bg-surface-variant/30 px-3 py-1.5 rounded-md">
                    {pageSession} / {totalPages}
                  </span>
                  <button 
                    disabled={pageSession >= totalPages} 
                    onClick={() => { setPageSession(p => p+1); fetchSessions(pageSession+1) }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-sm font-semibold hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Tiếp
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
