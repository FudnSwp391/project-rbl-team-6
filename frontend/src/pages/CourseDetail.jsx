import { useEffect, useMemo, useState } from 'react'
import { enrollCourse, getCourseDetail } from '../services/api'
import { useAuth } from '../AuthContext'

function formatMoney(value) {
  if (!Number(value || 0)) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function getCourseIdFromHash() {
  const match = window.location.hash.match(/#\/course\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function getInitials(name = 'Gia sư') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function CourseDetail({ courseId }) {
  const { user } = useAuth()
  const id = courseId || getCourseIdFromHash()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadCourse() {
      setLoading(true)
      setError('')
      try {
        const data = await getCourseDetail(id)
        if (!cancelled) setCourse(data)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Không thể tải chi tiết khóa học.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) loadCourse()
    return () => { cancelled = true }
  }, [id])

  const totalDuration = useMemo(() => {
    if (!course?.estimatedHours && !course?.lessons?.length) return 'Đang cập nhật'
    if (course?.estimatedHours) return `${course.estimatedHours} giờ`
    return `${course.lessons.length} bài học`
  }, [course])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center text-[#00288e] font-bold">
        Đang tải chi tiết khóa học...
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl bg-white border border-[#d7dce8] p-6 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-red-500">error</span>
          <h1 className="mt-3 text-xl font-black text-[#141824]">Không tìm thấy khóa học</h1>
          <p className="mt-2 text-[#51586a]">{error || 'Khóa học không tồn tại hoặc đã bị lưu trữ.'}</p>
          <a href="#/courses" className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#00288e] px-5 font-bold text-white">Quay lại danh sách</a>
        </div>
      </div>
    )
  }

  const cover = course.thumbnailPreviewUrl || course.thumbnailUrl
  const tutor = course.tutor || {}
  const lessons = course.lessons || []
  const outcomes = course.learningOutcomes || []
  const requirements = course.requirements || []
  const canBuyCourse = user && ['student', 'parent'].includes(user.role)
  const isTutorView = user?.role === 'tutor'
  const isAdminView = user?.role === 'admin'

  const handlePrimaryAction = async () => {
    setActionMessage('')

    if (!user) {
      setActionMessage('Bạn cần đăng nhập bằng tài khoản học sinh hoặc phụ huynh để mua và bắt đầu học khóa này.')
      return
    }

    if (isTutorView) {
      window.location.hash = '/tutor'
      return
    }

    if (isAdminView) {
      window.location.hash = '/admin'
      return
    }

    if (!canBuyCourse) {
      setActionMessage('Tài khoản hiện tại không thể mua khóa học.')
      return
    }

    if (course.isEnrolled) {
      window.location.hash = `/course-player/${course.id}`
      return
    }

    setPurchasing(true)
    try {
      await enrollCourse(course.id, {
        studentName: user.name || user.email?.split('@')[0] || 'Học viên',
      })
      window.location.hash = `/course-player/${course.id}`
    } catch (err) {
      setActionMessage(err.message || 'Chưa thể mua khóa học. Vui lòng thử lại.')
    } finally {
      setPurchasing(false)
    }
  }

  const primaryActionLabel = !user
    ? 'Đăng nhập để mua khóa học'
    : isTutorView
      ? 'Quay lại khóa học của tôi'
      : isAdminView
        ? 'Quay lại trang quản trị'
        : course.isEnrolled
          ? 'Vào học ngay'
          : purchasing
            ? 'Đang xử lý...'
            : 'Mua và bắt đầu học'

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#141824]">
      <header className="sticky top-0 z-40 border-b border-[#d7dce8] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2 text-[#00288e] font-black text-2xl">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            EduX
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-[#51586a]">
            <a href="#/find-tutors" className="hover:text-[#00288e]">Tìm gia sư</a>
            <a href="#/courses" className="text-[#00288e]">Khóa học</a>
            <a href="#/subjects" className="hover:text-[#00288e]">Môn học</a>
          </nav>
          <button
            type="button"
            onClick={() => {
              if (user?.role === 'tutor') window.location.hash = '/tutor'
              else if (user?.role === 'admin') window.location.hash = '/admin'
              else window.location.hash = user ? '/dashboard' : '/signin'
            }}
            className="h-10 px-4 rounded-lg border border-[#00288e] text-[#00288e] font-bold"
          >
            {user ? 'Bảng điều khiển' : 'Đăng nhập'}
          </button>
        </div>
      </header>

      <main>
        <section className="bg-white border-b border-[#d7dce8]">
          <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
            <div className="mb-5 flex items-center gap-2 text-sm text-[#697083]">
              <a href="#/courses" className="font-bold hover:text-[#00288e]">Khóa học</a>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              <span className="text-[#00288e] font-bold line-clamp-1">{course.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {course.subject && <Badge>{course.subject}</Badge>}
                  {course.level && <Badge>{course.level}</Badge>}
                  {course.language && <Badge>{course.language}</Badge>}
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#07111f] leading-tight">
                  {course.title}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-[#3d4351]">
                  {course.shortDescription || course.description || 'Khóa học được thiết kế để giúp học viên đạt mục tiêu học tập với lộ trình rõ ràng.'}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-[#51586a]">
                  <Metric icon="star" label={`${Number(course.rating || 0).toFixed(1)} đánh giá`} fill />
                  <Metric icon="groups" label={`${course.enrollmentCount || 0} học viên`} />
                  <Metric icon="schedule" label={totalDuration} />
                  <Metric icon="menu_book" label={`${lessons.length} chương`} />
                </div>

                <div className="mt-7 flex items-center gap-3">
                  {tutor.picture ? (
                    <img src={tutor.picture} alt={tutor.name} className="w-12 h-12 rounded-full object-cover border border-[#d7dce8]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#eef3ff] text-[#00288e] flex items-center justify-center font-black">
                      {getInitials(tutor.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-[#141824]">{tutor.name || 'Gia sư EduX'}</p>
                    <p className="text-sm text-[#697083]">{tutor.headline || `${tutor.experienceYears || 0} năm kinh nghiệm`}</p>
                  </div>
                </div>
              </div>

              <aside className="rounded-xl border border-[#c8cedd] bg-white shadow-lg overflow-hidden lg:sticky lg:top-24">
                <div className="aspect-video bg-[#eef3ff] flex items-center justify-center overflow-hidden">
                  {cover ? (
                    <img src={cover} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[64px] text-[#00288e]">play_lesson</span>
                  )}
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <div className="flex items-end gap-3">
                      <p className="text-3xl font-black text-[#00288e]">{formatMoney(course.price)}</p>
                      {Number(course.originalPrice || 0) > Number(course.price || 0) && (
                        <p className="pb-1 text-[#8a91a3] line-through">{formatMoney(course.originalPrice)}</p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#697083]">Thanh toán một lần, học theo tiến độ của bạn.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={purchasing}
                    className="w-full h-12 rounded-lg bg-[#00288e] text-white font-black shadow-md hover:bg-[#001f70]"
                  >
                    {primaryActionLabel}
                  </button>
                  {actionMessage && (
                    <p className="rounded-lg border border-[#f7c76d] bg-[#fff8e8] px-3 py-2 text-sm font-bold text-[#8a5a00]">
                      {actionMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { window.location.hash = tutor.id ? `/tutor-detail/${tutor.id}` : '/find-tutors' }}
                    className="w-full h-12 rounded-lg border border-[#00288e] text-[#00288e] font-black hover:bg-[#eef3ff]"
                  >
                    Xem hồ sơ gia sư
                  </button>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoTile icon="language" label="Ngôn ngữ" value={course.language || 'Tiếng Việt'} />
                    <InfoTile icon="signal_cellular_alt" label="Đầu vào" value={course.entryLevel || course.level || 'Cơ bản'} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          <div className="space-y-6">
            <DetailPanel title="Tổng quan khóa học" icon="info">
              <p className="leading-8 text-[#343949] whitespace-pre-line">
                {course.description || course.shortDescription || 'Gia sư chưa cập nhật mô tả chi tiết cho khóa học này.'}
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoLine label="Đối tượng phù hợp" value={course.targetStudents || 'Học viên cần lộ trình học rõ ràng và bài tập thực hành.'} />
                <InfoLine label="Mục tiêu khóa học" value={course.courseGoal || 'Nắm kiến thức trọng tâm và tự tin vận dụng vào bài tập.'} />
                <InfoLine label="Phương pháp giảng dạy" value={course.teachingMethod || 'Học theo từng chương, có ví dụ mẫu và bài luyện tập.'} />
                <InfoLine label="Thông điệp khóa học" value={course.communicationPlan || 'Lộ trình học được xây dựng theo nhu cầu thực tế của học viên.'} />
              </div>
            </DetailPanel>

            <DetailPanel title="Bạn sẽ học được gì" icon="check_circle">
              {outcomes.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outcomes.map((item, index) => <ChecklistItem key={index}>{item}</ChecklistItem>)}
                </div>
              ) : (
                <p className="text-[#697083]">Gia sư chưa cập nhật kết quả học tập mong đợi.</p>
              )}
            </DetailPanel>

            <DetailPanel title="Chương trình học" icon="format_list_numbered">
              {lessons.length ? (
                <div className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id || index} className="rounded-xl border border-[#d7dce8] bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="mt-0.5 w-10 h-10 rounded-full bg-[#eef3ff] text-[#00288e] flex items-center justify-center font-black">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-black text-[#141824]">{lesson.title}</p>
                            {lesson.description && <p className="mt-1 text-sm leading-6 text-[#51586a]">{lesson.description}</p>}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                              {lesson.durationLabel && <span className="rounded-full bg-[#f3f5f9] px-2 py-1 text-[#51586a]">{lesson.durationLabel}</span>}
                              {lesson.isPreview && <span className="rounded-full bg-[#e8f8ef] px-2 py-1 text-[#147a3d]">Xem thử</span>}
                              {lesson.materialUrl && <span className="rounded-full bg-[#eef3ff] px-2 py-1 text-[#00288e]">Có tài liệu</span>}
                            </div>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[#8a91a3]">{lesson.isPreview ? 'play_circle' : 'lock'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#697083]">Khóa học chưa có chương trình học.</p>
              )}
            </DetailPanel>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <DetailPanel title="Giảng viên" icon="person">
              <div className="flex items-center gap-3">
                {tutor.picture ? (
                  <img src={tutor.picture} alt={tutor.name} className="w-14 h-14 rounded-full object-cover border border-[#d7dce8]" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#eef3ff] text-[#00288e] flex items-center justify-center font-black">{getInitials(tutor.name)}</div>
                )}
                <div>
                  <p className="font-black">{tutor.name || 'Gia sư EduX'}</p>
                  <p className="text-sm text-[#697083]">{tutor.headline || 'Gia sư khóa học'}</p>
                </div>
              </div>
              {tutor.bio && <p className="mt-4 text-sm leading-6 text-[#51586a] line-clamp-5">{tutor.bio}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoTile icon="star" label="Đánh giá" value={Number(tutor.rating || 0).toFixed(1)} />
                <InfoTile icon="workspace_premium" label="Kinh nghiệm" value={`${tutor.experienceYears || 0} năm`} />
              </div>
            </DetailPanel>

            <DetailPanel title="Yêu cầu trước khi học" icon="rule">
              {requirements.length ? (
                <ul className="space-y-2">
                  {requirements.map((item, index) => <li key={index} className="text-sm text-[#51586a] flex gap-2"><span className="text-[#00288e]">•</span>{item}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-[#697083]">Không yêu cầu kiến thức đặc biệt trước khi học.</p>
              )}
            </DetailPanel>
          </aside>
        </section>
      </main>
    </div>
  )
}

function Badge({ children }) {
  return <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-black text-[#00288e]">{children}</span>
}

function Metric({ icon, label, fill = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold">
      <span className={`material-symbols-outlined text-[20px] text-[#00288e]`} style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
      {label}
    </span>
  )
}

function DetailPanel({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-[#d7dce8] bg-white p-5 md:p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-[#001b7a]">
        <span className="material-symbols-outlined">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ChecklistItem({ children }) {
  return (
    <div className="flex gap-3 rounded-lg bg-[#f6f8fc] p-3 text-[#343949]">
      <span className="material-symbols-outlined text-[#147a3d]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <span className="text-sm leading-6">{children}</span>
    </div>
  )
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f6f8fc] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#697083]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#343949]">{value}</p>
    </div>
  )
}

function InfoTile({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-[#f6f8fc] p-3">
      <span className="material-symbols-outlined text-[#00288e] text-[20px]">{icon}</span>
      <p className="mt-1 text-xs text-[#697083]">{label}</p>
      <p className="font-black text-[#141824] truncate">{value}</p>
    </div>
  )
}
