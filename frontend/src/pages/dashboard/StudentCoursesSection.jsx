/**
 * StudentCoursesSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Khu vực "Khóa học của tôi" trong StudentDashboard.
 * Liệt kê các khóa học học sinh đã đăng ký (GET /api/my/enrollments).
 * Bấm vào 1 khóa → mở trang chi tiết khóa học.
 */
import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'

function fmt(n) { return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) }

export default function StudentCoursesSection() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let cancelled = false
    api.getMyEnrollments()
      .then(rows => { if (!cancelled) setCourses(rows) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          Khóa học của tôi
          {courses.length > 0 && (
            <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
              {courses.length}
            </span>
          )}
        </h3>
        <a href="#/courses" className="text-primary font-label-md hover:underline flex items-center gap-1">
          Khám phá thêm
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </a>
      </div>

      {loading ? (
        <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 rounded-xl flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="font-label-md text-label-md">Đang tải khóa học...</p>
        </div>
      ) : error ? (
        <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-error/20 rounded-xl flex flex-col items-center justify-center py-12 gap-2 text-error">
          <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <p className="font-label-md text-label-md text-center px-4">{error}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 rounded-xl flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px]">menu_book</span>
          <p className="font-label-md text-label-md">Bạn chưa đăng ký khóa học nào.</p>
          <a
            href="#/courses"
            className="mt-1 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            Tìm khóa học
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {courses.map((c) => (
            <EnrolledCourseCard key={c.enrollment_id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function EnrolledCourseCard({ course }) {
  const [imgErr, setImgErr] = useState(false)
  const progress = Number(course.progress_percent) || 0

  return (
    <button
      onClick={() => { window.location.hash = `/courses/${course.id}` }}
      className="text-left bg-surface-container-lowest/70 backdrop-blur-md border border-surface-container-lowest/30 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="h-32 bg-secondary-container relative flex items-center justify-center overflow-hidden">
        {!imgErr && course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="material-symbols-outlined text-[40px] text-on-secondary-container">play_lesson</span>
        )}
        {course.subject && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/55 text-white font-label-sm text-label-sm backdrop-blur-sm">
            {course.subject}{course.level ? ` · ${course.level}` : ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-md flex flex-col gap-2 flex-1">
        <p className="font-label-md text-[15px] text-on-surface line-clamp-2 leading-snug">{course.title}</p>
        <p className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">person</span>
          {course.tutor_name}
        </p>

        <div className="flex items-center gap-3 text-[13px] text-on-surface-variant mt-auto pt-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">play_circle</span>
            {course.total_lessons || 0} bài
          </span>
          {Number(course.review_count) > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>star</span>
              {(Number(course.avg_rating) || 0).toFixed(1)}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Tiến độ</span>
            <span className="font-label-sm text-label-sm text-primary font-bold">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-variant overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </button>
  )
}
