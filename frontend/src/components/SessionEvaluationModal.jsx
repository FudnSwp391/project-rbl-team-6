import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config';

const API = API_BASE_URL

// ── Star rating component ──────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display:'flex', gap:4 }}>
      {[1,2,3,4,5].map(star => (
        <button
          key={star} type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onChange(star)}
          style={{ background:'none', border:'none', cursor: disabled ? 'not-allowed' : 'pointer', padding:0 }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 28,
              color: star <= (hover || value) ? '#f59e0b' : '#d1d5db',
              fontVariationSettings: star <= (hover || value) ? "'FILL' 1" : "'FILL' 0",
              transition: 'color .15s',
            }}
          >star</span>
        </button>
      ))}
      {value > 0 && <span style={{ fontSize:13, color:'var(--on-surface-variant)', alignSelf:'center', marginLeft:4 }}>{value}/5</span>}
    </div>
  )
}

const CRITERIA = [
  { key: 'score_attendance',    label: 'Chuyên cần',            icon: 'event_available' },
  { key: 'score_attitude',      label: 'Thái độ học tập',       icon: 'sentiment_satisfied' },
  { key: 'score_comprehension', label: 'Khả năng tiếp thu',     icon: 'psychology' },
  { key: 'score_focus',         label: 'Mức độ tập trung',      icon: 'center_focus_strong' },
  { key: 'score_homework',      label: 'Hoàn thành bài tập',    icon: 'assignment_turned_in' },
]

export default function SessionEvaluationModal({ token, session, onClose, onSaved, onError }) {
  const isExisting = !!session.evaluation_id
  const isLocked   = session.eval_status === 'locked'

  const [scores, setScores] = useState({
    score_attendance:    session.score_attendance    || 0,
    score_attitude:      session.score_attitude      || 0,
    score_comprehension: session.score_comprehension || 0,
    score_focus:         session.score_focus         || 0,
    score_homework:      session.score_homework      || 0,
  })
  const [comments,            setComments]            = useState(session.comments || '')
  const [parentRecommendation, setParentRecommendation] = useState(session.parent_recommendation || '')
  const [saving, setSaving] = useState(false)

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])


  const avgScore = Object.values(scores).filter(Boolean).length
    ? (Object.values(scores).filter(Boolean).reduce((a,b) => a + Number(b), 0) /
       Object.values(scores).filter(Boolean).length).toFixed(1)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate: tất cả tiêu chí phải được chấm
    const unrated = CRITERIA.filter(c => !scores[c.key])
    if (unrated.length > 0) {
      onError(`Vui lòng chấm điểm cho: ${unrated.map(c => c.label).join(', ')}`)
      return
    }
    if (!comments.trim()) {
      onError('Vui lòng nhập nhận xét cho học sinh.')
      return
    }

    setSaving(true)
    try {
      const body = {
        booking_id: session.booking_id,
        ...scores,
        comments: comments.trim(),
        parent_recommendation: parentRecommendation.trim(),
      }

      let url, method
      if (isExisting) {
        url    = `${API}/api/tutor/session-evaluations/${session.evaluation_id}`
        method = 'PUT'
      } else {
        url    = `${API}/api/tutor/session-evaluations`
        method = 'POST'
      }

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lưu thất bại')
      onSaved()
    } catch (err) {
      onError(err.message)
      setSaving(false)
    }
  }

  const dateStr = session.lesson_date
    ? new Date(session.lesson_date).toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })
    : '—'


  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center',
      padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'var(--surface-container-lowest,#fff)', borderRadius:16,
        width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--outline-variant)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--on-surface)', margin:0 }}>
              {isLocked ? 'Chi tiết đánh giá' : isExisting ? 'Chỉnh sửa đánh giá' : 'Đánh giá buổi học'}
            </h2>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {session.student_picture
                  ? <img src={session.student_picture} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }} alt="" />
                  : <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--surface-variant)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:16 }}>person</span>
                    </div>
                }
                <span style={{ fontSize:14, fontWeight:600, color:'var(--on-surface)' }}>{session.student_name}</span>
              </div>
              <span style={{ fontSize:13, color:'var(--on-surface-variant)' }}>{session.subject || '—'}</span>
              <span style={{ fontSize:13, color:'var(--on-surface-variant)' }}>{dateStr}</span>
              {session.time_slot && <span style={{ fontSize:13, color:'var(--on-surface-variant)' }}>{session.time_slot}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <span className="material-symbols-outlined" style={{ fontSize:22, color:'var(--on-surface-variant)' }}>close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:'20px 24px 24px' }}>

          {/* Avg score preview */}
          {avgScore && (
            <div style={{ marginBottom:20, padding:'12px 16px', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, display:'flex', alignItems:'center', gap:8 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color:'#d97706', fontVariationSettings:"'FILL' 1" }}>star</span>
              <span style={{ fontSize:14, fontWeight:600, color:'#92400e' }}>Điểm trung bình: {avgScore}/5</span>
            </div>
          )}

          {/* Criteria scores */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:20 }}>
            {CRITERIA.map(c => (
              <div key={c.key}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ fontSize:14, fontWeight:600, color:'var(--on-surface)', display:'flex', alignItems:'center', gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16, color:'var(--primary)' }}>{c.icon}</span>
                    {c.label} <span style={{ color:'#dc2626', marginLeft:2 }}>*</span>
                  </label>
                </div>
                <StarRating
                  value={scores[c.key]}
                  onChange={v => setScores(prev => ({ ...prev, [c.key]: v }))}
                  disabled={isLocked}
                />
              </div>
            ))}
          </div>

          {/* Comments */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:14, fontWeight:600, color:'var(--on-surface)', display:'block', marginBottom:6 }}>
              Nhận xét cho học sinh <span style={{ color:'#dc2626' }}>*</span>
            </label>
            <textarea
              rows={4}
              value={comments}
              onChange={e => setComments(e.target.value)}
              disabled={isLocked}
              placeholder="Nhận xét về quá trình học tập trong buổi học này..."
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--outline-variant)', fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', background: isLocked ? '#f9fafb' : 'white' }}
            />
          </div>

          {/* Parent recommendation */}
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:14, fontWeight:600, color:'var(--on-surface)', display:'block', marginBottom:6 }}>
              <span className="material-symbols-outlined" style={{ fontSize:14, verticalAlign:'middle', marginRight:4 }}>family_restroom</span>
              Đề xuất cho phụ huynh
            </label>
            <textarea
              rows={3}
              value={parentRecommendation}
              onChange={e => setParentRecommendation(e.target.value)}
              disabled={isLocked}
              placeholder="Gợi ý cho phụ huynh để hỗ trợ con học tốt hơn..."
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--outline-variant)', fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', background: isLocked ? '#f9fafb' : 'white' }}
            />
          </div>

          {/* Actions */}
          {!isLocked && (
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button type="button" onClick={onClose}
                style={{ height:42, padding:'0 20px', borderRadius:10, border:'1px solid var(--outline-variant)', background:'transparent', fontSize:14, fontWeight:600, cursor:'pointer', color:'var(--on-surface-variant)' }}>
                Hủy
              </button>
              <button type="submit" disabled={saving}
                style={{ height:42, padding:'0 28px', borderRadius:10, border:'none', background:'var(--primary)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, opacity: saving ? .7 : 1 }}>
                {saving && <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite' }} />}
                {saving ? 'Đang lưu...' : isExisting ? 'Cập nhật đánh giá' : 'Lưu đánh giá'}
              </button>
            </div>
          )}
          {isLocked && (
            <div style={{ textAlign:'center', color:'var(--on-surface-variant)', fontSize:13 }}>
              Đánh giá này đã bị khoá và không thể chỉnh sửa.
            </div>
          )}
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
