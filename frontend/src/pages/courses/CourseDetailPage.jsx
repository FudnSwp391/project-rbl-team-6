import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { useAuth } from '../../context/AuthContext'
import { toastSuccess, toastError } from '../../services/toast'
import ReviewsSection from '../../components/ReviewsSection'
import '../../pages.css'

function fmt(p) { return new Intl.NumberFormat('vi-VN').format(p || 0) }

/* ── Ảnh kiến thức theo môn học ──
   3 ảnh thật minh hoạ kiến thức của môn học sẽ học */
const SUBJECT_KNOWLEDGE = {
  'Toán': [
    { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=70', caption: 'Phương trình & Hàm số' },
    { url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=70', caption: 'Hình học giải tích' },
    { url: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=600&auto=format&fit=crop&q=70', caption: 'Luyện đề thi THPT' },
  ],
  'Tiếng Anh': [
    { url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=70', caption: 'IELTS Vocabulary' },
    { url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=70', caption: 'Reading & Writing' },
    { url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=70', caption: 'Speaking thực chiến' },
  ],
  'Hóa học': [
    { url: 'https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=600&auto=format&fit=crop&q=70', caption: 'Thí nghiệm trong phòng lab' },
    { url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=70', caption: 'Phản ứng oxi hóa khử' },
    { url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=600&auto=format&fit=crop&q=70', caption: 'Bảng tuần hoàn hóa học' },
  ],
  'Tin học': [
    { url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=70', caption: 'Python cơ bản' },
    { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=70', caption: 'Code thực chiến' },
    { url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&auto=format&fit=crop&q=70', caption: 'Lập trình dự án thực tế' },
  ],
  'Ngữ văn': [
    { url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=70', caption: 'Văn học cổ điển' },
    { url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=70', caption: 'Phân tích tác phẩm' },
    { url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=70', caption: 'Nghị luận xã hội' },
  ],
  'Vật lý': [
    { url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=70', caption: 'Công thức Vật lý' },
    { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=70', caption: 'Thiên văn & Vũ trụ' },
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=70', caption: 'Vật lý ứng dụng' },
  ],
}

function CourseBanner({ course }) {
  const [imgErr, setImgErr] = useState(false)
  const rating = Number(course.avg_rating) || 0
  return (
    <div className="course-banner">
      {!imgErr && course.thumbnail_url ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="course-banner-img"
          loading="eager"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="course-banner-fallback" style={{ background: 'linear-gradient(135deg, hsl(228 100% 88%), hsl(240 80% 92%))' }} />
      )}
      <div className="course-banner-overlay" />

      <div className="course-banner-content">
        <span className="course-banner-chip">
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
            play_lesson
          </span>
          {course.subject} · {course.level}
        </span>
        <h1 className="course-banner-title">{course.title}</h1>
        <p className="course-banner-tutor">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
          {course.tutor_name}
          <span className="course-banner-divider">·</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fbbf24', fontVariationSettings: "'FILL' 1" }}>star</span>
          <strong>{rating.toFixed(1)}</strong>
          <span style={{ opacity: 0.85 }}>({course.review_count || 0} đánh giá)</span>
        </p>
      </div>
    </div>
  )
}

function KnowledgeImg({ item, delay }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return (
    <figure className="knowledge-card" style={{ animationDelay: `${delay}s` }}>
      <img
        src={item.url}
        alt={item.caption}
        loading="lazy"
        onError={() => setErr(true)}
      />
      <figcaption>{item.caption}</figcaption>
    </figure>
  )
}

export default function CourseDetailPage({ courseId, onBack }) {
  const { user } = useAuth()
  const [course,   setCourse]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [enrolled, setEnrolled] = useState(false)
  const [enrollAnim, setEnrollAnim] = useState(false)
  const [enrollErr, setEnrollErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getCourse(courseId)
      .then(d => { if (!cancelled) setCourse(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  // Nếu đã đăng nhập → kiểm tra đã ghi danh khóa này chưa + lấy tiến độ
  useEffect(() => {
    if (!user) { setEnrolled(false); return }
    let cancelled = false
    api.getMyEnrollments()
      .then(rows => {
        if (cancelled) return
        const mine = rows.find(r => r.id === courseId)
        setEnrolled(!!mine)
        setProgress(mine ? (Number(mine.progress_percent) || 0) : 0)
      })
      .catch(() => { /* im lặng — không chặn xem khóa */ })
    return () => { cancelled = true }
  }, [user, courseId])

  const handleSetProgress = async (pct) => {
    if (savingProgress) return
    setSavingProgress(true)
    const prev = progress
    setProgress(pct)  // optimistic
    try {
      await api.updateProgress(courseId, pct)
      if (pct >= 100) toastSuccess('Chúc mừng! Bạn đã hoàn thành khóa học 🎉')
    } catch (e) {
      setProgress(prev)
      toastError(e.message || 'Không cập nhật được tiến độ.')
    } finally {
      setSavingProgress(false)
    }
  }

  const handleEnroll = async () => {
    if (enrolled || enrollAnim) return
    // Chưa đăng nhập → chuyển sang trang đăng nhập
    if (!user) {
      window.location.hash = '/signin'
      return
    }
    setEnrollAnim(true)
    setEnrollErr('')
    try {
      await api.enrollCourse(courseId)
      setEnrolled(true)
      toastSuccess('Đăng ký khóa học thành công!')
    } catch (e) {
      // 409 = đã đăng ký rồi → coi như thành công
      if (/đã đăng ký/i.test(e.message)) {
        setEnrolled(true)
      } else {
        setEnrollErr(e.message || 'Không đăng ký được. Thử lại sau.')
        toastError(e.message || 'Không đăng ký được.')
      }
    } finally {
      setEnrollAnim(false)
    }
  }

  if (loading) {
    return <div className="page-wrapper"><div className="empty-state"><p>Đang tải khóa học...</p></div></div>
  }
  if (error || !course) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon">error</span>
          <h3>Không tìm thấy khóa học</h3>
          <p>{error || 'Khóa học không tồn tại.'}</p>
          <button className="btn btn-outline" onClick={onBack}>← Quay lại</button>
        </div>
      </div>
    )
  }

  const price = Number(course.price) || 0
  const originalPrice = Number(course.original_price) || 0
  const discount = originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : 0
  // syllabus stored as JSONB in DB
  const syllabus = Array.isArray(course.syllabus) ? course.syllabus : []

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-inner">
          <button className="back-btn btn-ripple" onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Khóa học
          </button>
          <span style={{ color: 'var(--outline)', fontSize: 16 }}>›</span>
          <span
            style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}
          >
            {course.title}
          </span>
        </div>
      </header>

      {/* Banner — Full width hero image */}
      <CourseBanner course={course} />

      {/* Hero */}
      <div className="course-detail-hero">
        {/* Thumbnail */}
        <div className="course-detail-thumb" style={{ background: 'linear-gradient(135deg, hsl(228 100% 88%), hsl(240 80% 92%))' }}>
          {course.thumbnail_url && (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="course-detail-thumb-img"
              loading="lazy"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="course-detail-thumb-overlay" />
          <span className="material-symbols-outlined course-detail-thumb-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            play_lesson
          </span>
        </div>

        {/* Info */}
        <div className="course-detail-info">
          <span className="course-level-chip" style={{ marginBottom: 14 }}>{course.level} · {course.subject}</span>
          <h1>{course.title}</h1>

          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.65, fontSize: 15, margin: '0 0 16px' }}>
            {course.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 14, color: 'var(--on-surface-variant)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
              {course.tutor_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1", color: '#f59e0b' }}>star</span>
              <strong style={{ color: 'var(--on-surface)' }}>{(Number(course.avg_rating) || 0).toFixed(1)}</strong>
              <span>({course.review_count || 0} đánh giá)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
              {course.enrollment_count || 0} học viên
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="course-detail-sidebar">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Học phí
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="course-sidebar-price">{fmt(price)}đ</span>
              {originalPrice > price && (
                <span className="course-sidebar-price-old">{fmt(originalPrice)}đ</span>
              )}
            </div>
            {discount > 0 && (
              <span style={{
                display: 'inline-block', marginTop: 6,
                background: 'rgb(5 150 105 / 10%)', color: '#059669',
                borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
              }}>
                Tiết kiệm {discount}%
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <MetaRow icon="play_circle"   label="Bài học"      value={`${course.total_lessons || 0} bài`} />
            <MetaRow icon="schedule"      label="Thời lượng"   value={`${Math.round(course.duration_hours || 0)} giờ`} />
            <MetaRow icon="devices"       label="Học mọi nơi"  value="Điện thoại / Máy tính" />
            <MetaRow icon="workspace_premium" label="Chứng chỉ" value="Cấp sau khi hoàn thành" />
          </div>

          <button
            className={`enroll-btn btn-ripple ${enrolled ? 'enrolled' : ''}`}
            onClick={handleEnroll}
            disabled={enrollAnim}
            style={{ opacity: enrollAnim ? 0.7 : 1 }}
          >
            {enrollAnim ? (
              <><span className="ai-spinner" />Đang đăng ký...</>
            ) : enrolled ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>Đã đăng ký!</>
            ) : !user ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>Đăng nhập để đăng ký</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_cart</span>Đăng ký ngay</>
            )}
          </button>

          {enrollErr && (
            <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
              {enrollErr}
            </p>
          )}

          {enrolled ? (
            <p style={{ fontSize: 12, color: '#16a34a', textAlign: 'center', margin: 0, fontWeight: 600 }}>
              ✓ Khóa học đã có trong "Trang thành viên" của bạn
            </p>
          ) : !enrollErr && (
            <p style={{ fontSize: 12, color: 'var(--outline)', textAlign: 'center', margin: 0 }}>
              Hoàn tiền trong 7 ngày nếu không hài lòng
            </p>
          )}

          {/* Tiến độ học (chỉ khi đã đăng ký) */}
          {enrolled && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--outline-variant, #e0e0e0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)' }}>Tiến độ học</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: progress >= 100 ? '#16a34a' : 'var(--primary)' }}>
                  {progress >= 100 ? '✓ Hoàn thành' : `${progress}%`}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-variant, #e7e7e7)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#16a34a' : 'var(--primary)', borderRadius: 999, transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0, 25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => handleSetProgress(pct)}
                    disabled={savingProgress}
                    style={{
                      flex: 1, minWidth: 44, padding: '6px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: progress === pct ? '1px solid var(--primary)' : '1px solid var(--outline-variant, #d0d0d0)',
                      background: progress === pct ? 'var(--primary)' : '#fff',
                      color: progress === pct ? '#fff' : 'var(--on-surface-variant)',
                      opacity: savingProgress ? 0.6 : 1,
                    }}
                  >
                    {pct === 100 ? '✓' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="course-detail-content">
        <div style={{ marginTop: 0 }}>
          <div className="detail-section">
            <h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>list_alt</span>
              Nội dung khóa học
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {syllabus.length === 0 ? (
                <p style={{ color: 'var(--outline)', fontSize: 14 }}>Giảng viên sẽ cập nhật chi tiết nội dung sớm.</p>
              ) : syllabus.map((item, i) => (
                <SyllabusItem key={i} number={i + 1} title={typeof item === 'string' ? item : item.title || item.name || ''} delay={i * 0.06} />
              ))}
            </div>
          </div>

          {SUBJECT_KNOWLEDGE[course.subject] && (
            <div className="detail-section">
              <h3>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>collections_bookmark</span>
                Kiến thức bạn sẽ học
              </h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
                Hình ảnh minh hoạ những kiến thức chính sẽ được giảng dạy trong khóa học {course.subject}.
              </p>
              <div className="knowledge-grid">
                {SUBJECT_KNOWLEDGE[course.subject].map((item, i) => (
                  <KnowledgeImg key={i} item={item} delay={i * 0.08} />
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>info</span>
              Thông tin khóa học
            </h3>
            <div className="info-list">
              <div className="info-item">
                <div className="info-icon"><span className="material-symbols-outlined">book</span></div>
                <div>
                  <div className="info-item-label">Môn học</div>
                  <div className="info-item-value">{course.subject}</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><span className="material-symbols-outlined">school</span></div>
                <div>
                  <div className="info-item-label">Cấp độ</div>
                  <div className="info-item-value">{course.level}</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><span className="material-symbols-outlined">play_lesson</span></div>
                <div>
                  <div className="info-item-label">Số bài học</div>
                  <div className="info-item-value">{course.total_lessons || 0} bài</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><span className="material-symbols-outlined">timer</span></div>
                <div>
                  <div className="info-item-label">Tổng thời gian</div>
                  <div className="info-item-value">{Math.round(course.duration_hours || 0)} giờ</div>
                </div>
              </div>
            </div>
          </div>

          {/* Đánh giá khóa học (Phase 2) */}
          <ReviewsSection type="course" targetId={course.id} />
        </div>
      </div>
    </div>
  )
}

function MetaRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
      <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18 }}>{icon}</span>
      <span style={{ color: 'var(--on-surface-variant)', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--on-surface)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function SyllabusItem({ number, title, delay }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        borderRadius: 14,
        background: 'rgb(0 40 142 / 4%)',
        border: '1px solid rgb(0 40 142 / 8%)',
        animationDelay: `${delay}s`,
      }}
      className="fade-in-item"
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'var(--primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
      }}>
        {number}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{title}</span>
    </div>
  )
}
