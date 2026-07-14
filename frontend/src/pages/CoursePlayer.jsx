import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../AuthContext'
import { enrollCourse, getCourseDetail, updateCourseProgress } from '../services/api'

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function CoursePlayer({ courseId, onGoHome }) {
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)

  const loadCourse = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getCourseDetail(courseId)
      setCourse(data)
      const firstPlayable = data.lessons?.find((lesson) => !lesson.isLocked && lesson.videoUrl) || data.lessons?.[0]
      setSelectedId((current) => current || firstPlayable?.id || '')
    } catch (err) {
      setError(err.message || 'Could not load course.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (courseId) loadCourse()
  }, [courseId])

  const selectedLesson = useMemo(
    () => course?.lessons?.find((lesson) => lesson.id === selectedId) || course?.lessons?.[0],
    [course, selectedId]
  )
  const completed = course?.lessons?.filter((lesson) => lesson.isCompleted).length || 0
  const totalLessons = course?.lessons?.length || 0
  const progress = totalLessons ? Math.round((completed / totalLessons) * 100) : 0
  const canBuyCourse = user && ['student', 'parent'].includes(user.role)
  const isStaffView = user?.role === 'tutor' || user?.role === 'admin'

  const handleEnroll = async () => {
    if (!user) {
      window.location.hash = '/signin'
      return
    }
    if (!canBuyCourse) {
      setError('Tài khoản gia sư/quản trị không cần mua khóa học. Vui lòng quay lại trang quản lý khóa học.')
      return
    }
    setBuying(true)
    setError('')
    try {
      await enrollCourse(course.id, {
        studentName: user.name || user.email?.split('@')[0] || 'Student',
      })
      await loadCourse()
    } catch (err) {
      setError(err.message || 'Could not buy course.')
    } finally {
      setBuying(false)
    }
  }

  const handleComplete = async () => {
    if (!course?.isEnrolled || !selectedLesson || selectedLesson.isLocked) return
    setSavingProgress(true)
    try {
      await updateCourseProgress(course.id, selectedLesson.id, {
        watchedSeconds: Math.max(Number(selectedLesson.watchedSeconds || 0), 1),
        isCompleted: !selectedLesson.isCompleted,
      })
      await loadCourse()
    } catch (err) {
      setError(err.message || 'Could not update progress.')
    } finally {
      setSavingProgress(false)
    }
  }

  if (loading) {
    return (
      <div style={S.page}>
        <Header onBack={onGoHome} />
        <main style={S.center}>Loading course...</main>
      </div>
    )
  }

  if (error && !course) {
    return (
      <div style={S.page}>
        <Header onBack={onGoHome} />
        <main style={S.center}>
          <div style={S.errorCard}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dc2626' }}>error</span>
            <h2>Course not found</h2>
            <p>{error}</p>
            <button style={S.primaryBtn} onClick={loadCourse}>Retry</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Header onBack={onGoHome} />
      <main style={S.main}>
        <section style={S.topbar}>
          <div>
            <div style={S.kicker}>
              {course.subject || 'Online course'}
              {course.isNewTutor && <span style={S.newBadge}>NEW Tutor</span>}
            </div>
            <h1 style={S.title}>{course.title}</h1>
            <p style={S.subtitle}>By {course.tutorName} • {totalLessons} lessons • {course.level || 'All levels'}</p>
          </div>
          <div style={S.progressBox}>
            <span style={S.progressValue}>{progress}%</span>
            <span style={S.progressLabel}>completed</span>
          </div>
        </section>

        {error && <div style={S.noticeError}>{error}</div>}

        <div style={S.layout}>
          <section style={S.playerCard}>
            <div style={S.videoWrap}>
              {selectedLesson?.isLocked ? (
                <div style={S.locked}>
                  <span className="material-symbols-outlined" style={{ fontSize: 54 }}>lock</span>
                  <h2>This lesson is locked</h2>
                  {canBuyCourse ? (
                    <>
                      <p>Buy the course to unlock every lesson, documents, and progress tracking.</p>
                      <button style={S.primaryBtn} onClick={handleEnroll} disabled={buying}>
                        {buying ? 'Processing...' : `Buy course ${money(course.price)}`}
                      </button>
                    </>
                  ) : (
                    <p>{isStaffView ? 'This is a management preview. Purchase actions are only available for students and parents.' : 'Please sign in as a student or parent to buy this course.'}</p>
                  )}
                </div>
              ) : selectedLesson?.videoUrl ? (
                (() => {
                  const url = selectedLesson.videoUrl;
                  const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                  const ytId = ytMatch && ytMatch[2].length === 11 ? ytMatch[2] : null;
                  
                  if (ytId) {
                    return (
                      <iframe 
                        key={selectedLesson.id}
                        src={`https://www.youtube.com/embed/${ytId}`}
                        style={{...S.video, border: 'none'}}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  
                  const isValidUrl = url.startsWith('http') || url.startsWith('/');
                  if (!isValidUrl) {
                    return (
                      <div style={S.locked}>
                        <span className="material-symbols-outlined" style={{ fontSize: 54, color: '#e53935' }}>link_off</span>
                        <h2>Đường dẫn video không hợp lệ</h2>
                        <p>Link: "{url}" không phải là link video hợp lệ.</p>
                      </div>
                    );
                  }

                  return <video key={selectedLesson.id} src={url} controls preload="metadata" style={S.video} />;
                })()
              ) : (
                <div style={S.locked}>
                  <span className="material-symbols-outlined" style={{ fontSize: 54 }}>play_disabled</span>
                  <h2>No video attached</h2>
                  <p>The tutor has not uploaded a video for this lesson yet.</p>
                </div>
              )}
            </div>

            <div style={S.lessonInfo}>
              <div>
                <p style={S.lessonIndex}>Lesson {selectedLesson?.position || 1}</p>
                <h2 style={S.lessonTitle}>{selectedLesson?.title || 'Select a lesson'}</h2>
                <p style={S.lessonDesc}>{selectedLesson?.description || course.description || 'No description yet.'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {selectedLesson?.materialUrl && (
                  <a href={selectedLesson.materialUrl} target="_blank" rel="noreferrer" style={S.secondaryBtn}>
                    <span className="material-symbols-outlined">attach_file</span>
                    Materials
                  </a>
                )}
                {course.isEnrolled && !selectedLesson?.isLocked && (
                  <button style={selectedLesson?.isCompleted ? S.doneBtn : S.primaryBtn} onClick={handleComplete} disabled={savingProgress}>
                    <span className="material-symbols-outlined">{selectedLesson?.isCompleted ? 'check_circle' : 'task_alt'}</span>
                    {selectedLesson?.isCompleted ? 'Mark not done' : 'Mark completed'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside style={S.sidebar}>
            <div style={S.purchaseCard}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Course price</p>
                <strong style={{ fontSize: 28, color: '#00288e' }}>{money(course.price)}</strong>
              </div>
              {course.isEnrolled ? (
                <span style={S.enrolledBadge}>
                  <span className="material-symbols-outlined icon-fill">verified</span>
                  Enrolled
                </span>
              ) : canBuyCourse ? (
                <button style={S.primaryBtn} onClick={handleEnroll} disabled={buying}>
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {buying ? 'Processing...' : 'Buy and start learning'}
                </button>
              ) : (
                <span style={S.staffBadge}>
                  <span className="material-symbols-outlined">visibility</span>
                  {isStaffView ? 'Management preview' : 'Sign in to buy'}
                </span>
              )}
            </div>

            <div style={S.contentPanel}>
              <div style={S.contentHead}>
                <h2>Course content</h2>
                <span>{completed}/{totalLessons}</span>
              </div>
              <div style={S.progressTrack}>
                <span style={{ ...S.progressFill, width: `${progress}%` }} />
              </div>
              <div style={S.lessonList}>
                {course.lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedId(lesson.id)}
                    style={{
                      ...S.lessonRow,
                      ...(lesson.id === selectedLesson?.id ? S.lessonRowActive : {}),
                      ...(lesson.isLocked ? S.lessonRowLocked : {}),
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {lesson.isLocked ? 'lock' : lesson.isCompleted ? 'check_circle' : 'play_circle'}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong>{index + 1}. {lesson.title}</strong>
                      <small>{lesson.durationLabel || (lesson.isPreview ? 'Preview' : 'Video lesson')}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Header({ onBack }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#/" className="brand">
          <span className="material-symbols-outlined icon-fill">school</span>
          <span className="brand-name">EduX</span>
        </a>
        <button type="button" onClick={onBack} style={S.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>
      </div>
    </header>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#f7f8fb', color: '#1f2430' },
  main: { width: '100%', maxWidth: 1260, margin: '0 auto', padding: '28px 24px 64px' },
  center: { minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' },
  topbar: { display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap' },
  kicker: { display: 'flex', alignItems: 'center', gap: 8, color: '#00288e', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' },
  title: { fontSize: 34, lineHeight: 1.18, margin: '8px 0', fontWeight: 900, color: '#111827' },
  subtitle: { margin: 0, color: '#6b7280', fontSize: 15 },
  newBadge: { background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900 },
  progressBox: { minWidth: 130, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 14, textAlign: 'center', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' },
  progressValue: { display: 'block', fontSize: 28, fontWeight: 900, color: '#00288e' },
  progressLabel: { color: '#6b7280', fontSize: 12, fontWeight: 700 },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 22, alignItems: 'start' },
  playerCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,42,0.08)' },
  videoWrap: { background: '#020617', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', maxHeight: 620, background: '#000' },
  locked: { minHeight: 420, padding: 32, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 },
  lessonInfo: { padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  lessonIndex: { margin: 0, color: '#00288e', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' },
  lessonTitle: { margin: '4px 0 8px', fontSize: 22, fontWeight: 900 },
  lessonDesc: { margin: 0, color: '#4b5563', lineHeight: 1.6, maxWidth: 720 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 },
  purchaseCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 12px 32px rgba(15,23,42,0.07)' },
  contentPanel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, overflow: 'hidden', boxShadow: '0 12px 32px rgba(15,23,42,0.07)' },
  contentHead: { padding: '16px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 7, background: '#e5e7eb', margin: '0 18px 12px', borderRadius: 999, overflow: 'hidden' },
  progressFill: { display: 'block', height: '100%', background: '#00288e', borderRadius: 999 },
  lessonList: { maxHeight: 'calc(100vh - 300px)', overflow: 'auto', borderTop: '1px solid #eef2f7' },
  lessonRow: { width: '100%', border: 0, background: '#fff', display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #eef2f7', color: '#1f2937', fontFamily: 'inherit' },
  lessonRowActive: { background: '#eef4ff', color: '#00288e' },
  lessonRowLocked: { opacity: 0.58 },
  primaryBtn: { height: 48, padding: '0 18px', border: 0, borderRadius: 14, background: '#00288e', color: '#fff', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' },
  secondaryBtn: { height: 44, padding: '0 16px', borderRadius: 13, border: '1px solid #cbd5e1', color: '#334155', background: '#fff', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  doneBtn: { height: 48, padding: '0 18px', border: '1px solid #86efac', borderRadius: 14, background: '#dcfce7', color: '#15803d', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' },
  enrolledBadge: { height: 44, borderRadius: 14, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900 },
  staffBadge: { minHeight: 44, borderRadius: 14, background: '#eef3ff', color: '#00288e', border: '1px solid #c8d6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900, padding: '0 14px', textAlign: 'center' },
  noticeError: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 14px', marginBottom: 16, fontWeight: 800 },
  errorCard: { background: '#fff', borderRadius: 22, border: '1px solid #e5e7eb', padding: 32, textAlign: 'center', maxWidth: 420, boxShadow: '0 16px 40px rgba(15,23,42,0.08)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', background: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
}
