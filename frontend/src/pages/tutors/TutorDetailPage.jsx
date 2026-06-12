import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { useAuth } from '../../context/AuthContext'
import { toastSuccess } from '../../services/toast'
import ReviewsSection from '../../components/ReviewsSection'
import '../../pages.css'

const TIME_SLOTS = ['08:00', '09:30', '14:00', '15:30', '17:00', '19:00', '20:30']

/* ── Video bài giảng demo theo MÔN dạy (YouTube thật) ──
   Hiển thị đúng video của môn gia sư đang dạy. */
const SUBJECT_VIDEOS = {
  'Toán': [
    { youtubeId: 'g0ED6CI3q8g', title: 'Phương trình bậc hai & Hệ thức Viét', duration: '12:34' },
    { youtubeId: 'OElZZ_jcZOI', title: 'Tổng và tích nghiệm theo Hệ thức Viét', duration: '15:20' },
  ],
  'Vật lý': [
    { youtubeId: 'bwhqX8SrlFg', title: 'Dao động điều hoà — Vật Lí 12', duration: '18:10' },
    { youtubeId: 'JY9NZ70tHgk', title: 'Dao động điều hòa — Tiết 1 (Cánh Diều)', duration: '14:50' },
    { youtubeId: '1iRNRWoKyDs', title: 'Phương trình dao động & bài tập áp dụng', duration: '12:15' },
  ],
  'Tiếng Anh': [
    { youtubeId: '8z8ZXuAe7Fc', title: 'IELTS Writing Task 2 từ A–Z (7.0–8.0)', duration: '18:02' },
    { youtubeId: 'VbJAEjZb8T0', title: 'IELTS Writing Task 2 cho người mới', duration: '14:15' },
    { youtubeId: 'GYeN42p6p54', title: 'Toàn bộ 4 dạng IELTS Writing Task 2', duration: '22:30' },
  ],
  'Hóa học': [
    { youtubeId: 'pf1XfNZHvyY', title: 'Phản ứng oxi hóa–khử (3 bộ SGK)', duration: '11:30' },
    { youtubeId: '_TWqcNZp1z4', title: 'Cân bằng phản ứng oxi hóa–khử', duration: '14:20' },
    { youtubeId: 'Z2t2_AVQsu8', title: 'Luyện tập phản ứng oxi hóa–khử', duration: '09:55' },
  ],
  'Tin học': [
    { youtubeId: 'NZj6LI5a9vc', title: 'Python cơ bản — Bài 1: Giới thiệu', duration: '20:10' },
    { youtubeId: 'jf-q_dG8WzI', title: 'Python cơ bản — Bài 2: Cài đặt môi trường', duration: '16:45' },
    { youtubeId: 'QFxqY8qv42E', title: 'Python cơ bản — Bài 3: Chạy file đầu tiên', duration: '22:00' },
  ],
  'Ngữ văn': [
    { youtubeId: '9JNsQUvCZ58', title: 'Nghị luận xã hội 600 chữ — đạt điểm cao', duration: '13:20' },
    { youtubeId: '64ZktjZC8iA', title: 'Khái quát văn nghị luận — luyện thi THPT', duration: '17:05' },
  ],
}

// Gom video theo các môn gia sư đang dạy
function getDemoVideos(subjectNames) {
  return (subjectNames || []).flatMap(subj =>
    (SUBJECT_VIDEOS[subj] || []).map((v, i) => ({ ...v, subject: subj, id: `${subj}-${i}` }))
  )
}

/* ── "Bảng vàng thành tích" chi tiết theo môn (giải thưởng, HS đậu ĐH top, HSG...) ── */
const DETAIL_HONORS = {
  'Toán': [
    { icon: 'emoji_events',  text: 'Giải Nhất Giáo viên dạy giỏi cấp Thành phố môn Toán' },
    { icon: 'school',        text: '200+ học sinh đậu đại học top: Bách Khoa, Ngoại Thương, Y Dược' },
    { icon: 'military_tech', text: 'Bồi dưỡng 15+ học sinh đoạt giải HSG Toán cấp Tỉnh / Quốc gia' },
    { icon: 'menu_book',     text: 'Đồng tác giả bộ tài liệu luyện thi THPT Quốc gia môn Toán' },
  ],
  'Tiếng Anh': [
    { icon: 'workspace_premium', text: 'Chứng chỉ IELTS 8.0 — chuyên gia luyện thi quốc tế' },
    { icon: 'school',        text: '150+ học viên đạt IELTS 7.0+ / TOEIC 900+' },
    { icon: 'military_tech', text: 'Đào tạo học sinh đoạt giải Olympic Tiếng Anh' },
    { icon: 'record_voice_over', text: 'Phương pháp giao tiếp thực chiến, sửa lỗi tức thì' },
  ],
  'Vật lý': [
    { icon: 'emoji_events',  text: 'Thạc sĩ Vật lý — giải thưởng nghiên cứu Quang học' },
    { icon: 'school',        text: 'Học sinh đậu ngành Kỹ thuật top: Bách Khoa, KHTN' },
    { icon: 'military_tech', text: 'Bồi dưỡng học sinh đoạt giải HSG Vật lý cấp Tỉnh' },
    { icon: 'bolt',          text: 'Chuyên phần Điện & Dao động — luyện thi khối A, A1' },
  ],
  'Hóa học': [
    { icon: 'emoji_events',  text: 'Thạc sĩ Hóa học — giải Olympic Hóa Sinh viên toàn quốc' },
    { icon: 'school',        text: 'Nhiều học sinh đạt 9–10 điểm Hóa kỳ thi THPT' },
    { icon: 'military_tech', text: 'Bồi dưỡng đội tuyển HSG Hóa cấp Tỉnh' },
    { icon: 'science',      text: 'Dạy trực quan bằng thí nghiệm, hiểu sâu cơ chế phản ứng' },
  ],
  'Tin học': [
    { icon: 'emoji_events',  text: 'Kỹ sư phần mềm — chứng chỉ AWS / Python chuyên nghiệp' },
    { icon: 'military_tech', text: 'Học sinh đoạt giải HSG Tin học Quốc gia' },
    { icon: 'groups',        text: 'Mentor cho 200+ lập trình viên junior' },
    { icon: 'code',          text: 'Dạy qua dự án thực chiến — Code · Debug · Deploy' },
  ],
  'Ngữ văn': [
    { icon: 'emoji_events',  text: 'Giáo viên cốt cán môn Ngữ văn cấp Thành phố' },
    { icon: 'school',        text: 'Học sinh đạt điểm Văn trung bình 8.5+ kỳ thi THPT' },
    { icon: 'military_tech', text: 'Bồi dưỡng 20+ học sinh giải HSG Văn cấp Thành phố' },
    { icon: 'menu_book',     text: 'Đồng tác giả tài liệu phương pháp làm bài đạt điểm 9–10' },
  ],
  'Sinh học': [
    { icon: 'emoji_events',  text: 'Giáo viên Sinh học giàu kinh nghiệm luyện thi khối B' },
    { icon: 'school',        text: 'Nhiều học sinh đậu Y Dược, Công nghệ Sinh học' },
    { icon: 'military_tech', text: 'Bồi dưỡng học sinh giỏi môn Sinh học' },
    { icon: 'biotech',       text: 'Chuyên Di truyền & Sinh thái, hệ thống hoá kiến thức' },
  ],
}
const DEFAULT_DETAIL_HONORS = [
  { icon: 'workspace_premium', text: 'Phương pháp giảng dạy bài bản, tận tâm với học sinh' },
  { icon: 'school',            text: 'Nhiều học sinh tiến bộ rõ rệt sau khóa học' },
  { icon: 'auto_stories',      text: 'Hệ thống hoá kiến thức, bám sát chương trình thi' },
]

function getDetailHonors(tutor, subjectNames) {
  const subj = (subjectNames || []).find(s => DETAIL_HONORS[s])
  const base = subj ? [...DETAIL_HONORS[subj]] : [...DEFAULT_DETAIL_HONORS]
  // Đóng góp cộng đồng
  base.push({ icon: 'volunteer_activism', text: 'Đóng góp học liệu miễn phí, lan tỏa tri thức cho học sinh cả nước' })
  // Dữ liệu THẬT từ DB
  const rating = Number(tutor.avg_rating) || 0
  if (rating >= 4.5 && tutor.review_count > 0)
    base.push({ icon: 'star', text: `Điểm đánh giá ${rating.toFixed(1)}/5 từ ${tutor.review_count} học viên` })
  else if (tutor.experience_years)
    base.push({ icon: 'verified', text: `${tutor.experience_years} năm kinh nghiệm giảng dạy` })
  return base.slice(0, 6)
}

/* ── Video Modal ── */
function VideoModal({ video, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="video-subject-chip" style={{ marginBottom: 0 }}>{video.subject}</span>
            <h4 style={{ marginTop: 4 }}>{video.title}</h4>
          </div>
          <button className="modal-close btn-ripple" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="modal-video-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

/* ── Single video card ── */
function VideoCard({ video, onClick, delay = 0 }) {
  return (
    <div
      className="video-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* YouTube thumbnail */}
      <div style={{ position: 'relative' }}>
        <img
          className="video-thumb"
          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
          alt={video.title}
          loading="lazy"
          onError={e => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }}
        />
        <div className="video-thumb-placeholder" style={{ display: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            play_circle
          </span>
        </div>
        <div className="video-play-overlay">
          <div className="video-play-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1", marginLeft: 2 }}>
              play_arrow
            </span>
          </div>
        </div>
      </div>

      <div className="video-info">
        <span className="video-subject-chip">{video.subject}</span>
        <p className="video-title">{video.title}</p>
        <div className="video-duration">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
          {video.duration}
        </div>
      </div>
    </div>
  )
}

function fmt(price) {
  return new Intl.NumberFormat('vi-VN').format(price)
}

/* ── Detail Avatar (with fallback) ── */
function DetailAvatar({ tutor }) {
  const [err, setErr] = useState(false)
  const name = tutor.full_name || '?'
  if (!err && tutor.picture) {
    return (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          className="detail-avatar-photo"
          src={tutor.picture}
          alt={name}
          onError={() => setErr(true)}
        />
        {Number(tutor.avg_rating) >= 4.9 && (
          <span className="detail-avatar-badge" title="Gia sư xuất sắc">
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1", color: '#f59e0b' }}>workspace_premium</span>
          </span>
        )}
      </div>
    )
  }
  return (
    <div
      className="detail-avatar-fallback"
      style={{ background: 'linear-gradient(135deg, #00288e, #4c6ef5)' }}
    >
      {name.charAt(0)}
    </div>
  )
}

/* ── Main TutorDetailPage component ── */
export default function TutorDetailPage({ tutorId, onBack }) {
  const { user } = useAuth()
  const [tutor,        setTutor]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [booked,       setBooked]       = useState(false)
  const [bookOpen,     setBookOpen]     = useState(false)
  const [activeVideo,  setActiveVideo]  = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getTutor(tutorId)
      .then(data => { if (!cancelled) setTutor(data) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tutorId])

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="empty-state"><p>Đang tải hồ sơ gia sư...</p></div>
      </div>
    )
  }
  if (error || !tutor) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon">error</span>
          <h3>Không tìm thấy gia sư</h3>
          <p>{error || 'Gia sư không tồn tại hoặc đã bị xóa.'}</p>
          <button className="btn btn-outline" onClick={onBack}>← Quay lại</button>
        </div>
      </div>
    )
  }

  const baseRating = Number(tutor.avg_rating) || 0

  // Aliases để giữ tương thích với UI sẵn có
  const subjectNames = (tutor.subjects || []).map(s => s.subject)
  const subjectLevels = [...new Set((tutor.subjects || []).map(s => s.level).filter(Boolean))]
  const methods = tutor.teaching_methods || []
  const demoVideos = getDemoVideos(subjectNames)
  const honors = getDetailHonors(tutor, subjectNames)

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-inner">
          <button className="back-btn btn-ripple" onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Tìm gia sư
          </button>
          <span style={{ color: 'var(--outline)', fontSize: 16 }}>›</span>
          <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 14 }}>
            {tutor.full_name}
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="detail-hero">
        <DetailAvatar tutor={tutor} />

        <div>
          <h1 className="detail-name">{tutor.full_name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 15 }}>
              <span
                className="material-symbols-outlined"
                style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1", fontSize: 18 }}
              >star</span>
              {baseRating.toFixed(1)}
              <span style={{ color: 'var(--outline)', fontWeight: 400, fontSize: 13 }}>
                ({tutor.review_count || 0} đánh giá)
              </span>
            </span>
            {tutor.experience_years != null && (
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>
                {tutor.experience_years} năm kinh nghiệm
              </span>
            )}
            {tutor.location && (
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>
                {tutor.location}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {subjectNames.map(s => <span key={s} className="chip-sm">{s}</span>)}
            {subjectLevels.map(l => <span key={l} className="chip-level">{l}</span>)}
            {methods.map(m => (
              <span key={m} className={m === 'online' ? 'chip-online' : 'chip-offline'}>
                {m === 'online' ? 'Online' : 'Offline'}
              </span>
            ))}
          </div>

          <p className="detail-bio">{tutor.bio}</p>
        </div>

        <div className="detail-right">
          <div className="detail-price-label">Học phí</div>
          <div className="detail-price">
            {fmt(tutor.hourly_rate)}<span>đ/giờ</span>
          </div>
          <button
            className={`detail-book-btn btn-ripple ${booked ? 'enroll-btn enrolled' : ''}`}
            disabled={booked}
            onClick={() => {
              if (!user) { window.location.hash = '/signin'; return }
              setBookOpen(true)
            }}
          >
            {booked ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>Đã gửi yêu cầu!</>
            ) : !user ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>Đăng nhập để đặt lịch</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_add_on</span>Đặt lịch học</>
            )}
          </button>
        </div>
      </div>

      {/* Modal đặt lịch (tạo booking pending → gia sư duyệt) */}
      {bookOpen && (
        <BookingModal
          tutor={tutor}
          onClose={() => setBookOpen(false)}
          onBooked={() => { setBooked(true); setBookOpen(false) }}
        />
      )}

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {/* Content */}
      <div className="detail-content" style={{ gridTemplateColumns: '1fr' }}>
        {/* Left column */}
        <div>
          {/* Info */}
          <div className="detail-section">
            <h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>info</span>
              Thông tin chi tiết
            </h3>
            <div className="info-list">
              {tutor.education && (
                <div className="info-item">
                  <div className="info-icon">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <div>
                    <div className="info-item-label">Học vấn</div>
                    <div className="info-item-value">{tutor.education}</div>
                  </div>
                </div>
              )}
              {tutor.experience_years != null && (
                <div className="info-item">
                  <div className="info-icon">
                    <span className="material-symbols-outlined">work_history</span>
                  </div>
                  <div>
                    <div className="info-item-label">Kinh nghiệm</div>
                    <div className="info-item-value">{tutor.experience_years} năm giảng dạy</div>
                  </div>
                </div>
              )}
              {tutor.location && (
                <div className="info-item">
                  <div className="info-icon">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <div className="info-item-label">Khu vực</div>
                    <div className="info-item-value">{tutor.location}</div>
                  </div>
                </div>
              )}
              {methods.length > 0 && (
                <div className="info-item">
                  <div className="info-icon">
                    <span className="material-symbols-outlined">devices</span>
                  </div>
                  <div>
                    <div className="info-item-label">Hình thức dạy</div>
                    <div className="info-item-value">
                      {methods.map(m => m === 'online' ? 'Online' : 'Offline').join(' & ')}
                    </div>
                  </div>
                </div>
              )}
              {tutor.teaching_style && (
                <div className="info-item">
                  <div className="info-icon">
                    <span className="material-symbols-outlined">lightbulb</span>
                  </div>
                  <div>
                    <div className="info-item-label">Phong cách giảng dạy</div>
                    <div className="info-item-value">{tutor.teaching_style}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bảng vàng thành tích (chi tiết) */}
          <div className="honor-board">
            <div className="honor-board-shine" aria-hidden="true" />
            <div className="honor-board-head">
              <span className="trophy">
                <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </span>
              Bảng vàng thành tích
            </div>
            <p className="honor-board-sub">Những dấu ấn nổi bật trong sự nghiệp giảng dạy của {tutor.full_name}.</p>
            <div className="honor-grid">
              {honors.map((h, i) => (
                <div className="honor-item" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="honor-item-ico">
                    <span className="material-symbols-outlined">{h.icon}</span>
                  </span>
                  <span className="honor-item-text">{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Video bài giảng demo theo môn dạy */}
          {demoVideos.length > 0 && (
            <div className="detail-section">
              <h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>smart_display</span>
                Video bài giảng demo
                <span style={{
                  marginLeft: 8, fontSize: 12, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-deep))',
                  padding: '2px 10px', borderRadius: 999,
                }}>{demoVideos.length} video</span>
              </h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, margin: '0 0 18px', lineHeight: 1.5 }}>
                Xem trước phong cách giảng dạy của <strong>{tutor.full_name}</strong> qua các buổi giảng mẫu môn{' '}
                <strong style={{ color: 'var(--primary)' }}>{subjectNames.join(' · ')}</strong>.
              </p>
              <div className="video-grid">
                {demoVideos.map((v, i) => (
                  <VideoCard key={v.id} video={v} delay={i * 0.06} onClick={() => setActiveVideo(v)} />
                ))}
              </div>
            </div>
          )}

          {/* Đánh giá gia sư (dùng chung ReviewsSection — có sửa/xóa + gating) */}
          <ReviewsSection type="tutor" targetId={tutor.id} />
        </div>
      </div>
    </div>
  )
}

/* ── Modal đặt lịch học với gia sư ── */
function BookingModal({ tutor, onClose, onBooked }) {
  const today = new Date().toISOString().slice(0, 10)
  const subjectOptions = [...new Set((tutor.subjects || []).map(s => s.subject).filter(Boolean))]
  const [date, setDate]   = useState('')
  const [slot, setSlot]   = useState('')
  const [subject, setSubject] = useState(subjectOptions[0] || '')
  const [note, setNote]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const canSubmit = date && slot && !saving

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true); setError('')
    try {
      await api.createBooking({
        tutorId: tutor.user_id,
        tutorName: tutor.full_name,
        subject: subject || null,
        lessonDate: date,
        timeSlot: slot,
        note: note || null,
      })
      toastSuccess('Đã gửi yêu cầu đặt lịch! Chờ gia sư duyệt.')
      onBooked()
    } catch (err) {
      setError(err.message || 'Không đặt được lịch. Thử lại sau.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>calendar_add_on</span>
            Đặt lịch với {tutor.full_name}
          </h4>
          <button className="modal-close btn-ripple" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Ngày học</span>
            <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className="book-input" />
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Khung giờ</span>
            <select value={slot} onChange={e => setSlot(e.target.value)} className="book-input">
              <option value="">— Chọn khung giờ —</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          {subjectOptions.length > 0 && (
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Môn học</span>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="book-input">
                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Ghi chú (không bắt buộc)</span>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} className="book-input" placeholder="Mục tiêu, nội dung muốn học..." />
          </label>

          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}

          <p style={{ fontSize: 12, color: 'var(--outline)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--primary)' }}>info</span>
            Yêu cầu sẽ được gửi tới gia sư để duyệt.
          </p>

          <button type="submit" className="detail-book-btn btn-ripple" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.6 }}>
            {saving ? (<><span className="ai-spinner" />Đang gửi...</>) : (<><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>Gửi yêu cầu đặt lịch</>)}
          </button>
        </form>

        <style>{`
          .book-input { width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--outline-variant, #c4c7c5); background: #fff; color: var(--on-surface, #1a1c1e); font-size: 14px; outline: none; box-sizing: border-box; }
          .book-input:focus { border-color: var(--primary, #00288e); box-shadow: 0 0 0 3px rgb(0 40 142 / 12%); }
          textarea.book-input { resize: vertical; }
        `}</style>
      </div>
    </div>
  )
}
