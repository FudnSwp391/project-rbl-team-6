import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { readHashQuery, writeHashQuery } from '../../services/urlFilters'
import { CourseCardSkeleton } from '../../components/Skeletons'
import Pagination from '../../components/Pagination'
import '../../pages.css'

const SUBJECTS_F = ['Tất cả', 'Toán', 'Tiếng Anh', 'Hóa học', 'Tin học', 'Ngữ văn', 'Vật lý', 'Sinh học', 'Lịch sử', 'Địa lý']
const LEVELS_F   = ['Tất cả', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Đại học']
const PAGE_SIZE  = 6

function fmt(p) { return new Intl.NumberFormat('vi-VN').format(p || 0) }

export default function CoursesPage({ onViewCourse }) {
  const initial = readHashQuery()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [subject, setSubject] = useState(initial.subject || 'Tất cả')
  const [level,   setLevel]   = useState(initial.level || 'Tất cả')
  const [search,  setSearch]  = useState(initial.q || '')
  const [sort,    setSort]    = useState(initial.sort || 'newest')
  const [page,    setPage]    = useState(Number(initial.page) || 1)

  // Đồng bộ URL
  useEffect(() => {
    writeHashQuery('/courses', { subject, level, q: search, sort, page })
  }, [subject, level, search, sort, page])

  // Đổi filter → về trang 1
  useEffect(() => { setPage(1) }, [subject, level, search, sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const filters = {
      subject: subject !== 'Tất cả' ? subject : '',
      level:   level !== 'Tất cả'   ? level   : '',
      q: search,
      sort,
    }
    const handle = setTimeout(() => {
      api.getCourses(filters)
        .then(d => { if (!cancelled) setCourses(d) })
        .catch(e => { if (!cancelled) setError(e.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [subject, level, search, sort])

  const totalPages = Math.max(1, Math.ceil(courses.length / PAGE_SIZE))
  const pageItems = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <button className="back-btn btn-ripple" onClick={() => { window.location.hash = '/' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Trang chủ
          </button>
          <span style={{ color: 'var(--outline)', fontSize: 16 }}>›</span>
          <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 14 }}>Khóa học</span>
        </div>
      </header>

      <div className="courses-page-content">
        <div className="courses-page-hero">
          <h1>Khóa học online</h1>
          <p>Học mọi lúc, mọi nơi với các gia sư hàng đầu</p>
        </div>

        <div className="courses-filter-row">
          <div className="filter-search-wrap" style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 18, pointerEvents: 'none' }}
            >search</span>
            <input
              className="filter-search filter-search-padded"
              style={{ display: 'block' }}
              placeholder="Tìm khóa học..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
            {SUBJECTS_F.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={level} onChange={e => setLevel(e.target.value)} style={{ width: 'auto', minWidth: 120 }}>
            {LEVELS_F.map(l => <option key={l}>{l}</option>)}
          </select>
          <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
            <option value="newest">Mới nhất</option>
            <option value="rating">Đánh giá cao nhất</option>
            <option value="price_asc">Giá thấp nhất</option>
            <option value="price_desc">Giá cao nhất</option>
          </select>
        </div>

        <p style={{ color: 'var(--outline)', fontSize: 14, marginBottom: 20 }}>
          {loading ? 'Đang tải...' : `${courses.length} khóa học`}
        </p>

        {error && (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon">error</span>
            <h3>Không tải được danh sách</h3>
            <p>{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="courses-grid">
            {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        )}

        {!error && !loading && courses.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon">search_off</span>
            <h3>Không tìm thấy khóa học</h3>
            <p>Thử điều chỉnh từ khóa hoặc bộ lọc.</p>
          </div>
        )}

        {!error && !loading && courses.length > 0 && (
          <>
            <div className="courses-grid">
              {pageItems.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  delay={i * 0.06}
                  onClick={() => onViewCourse(course.id)}
                />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

export function CourseCard({ course, delay, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const rating = Number(course.avg_rating) || 0
  return (
    <article
      className="course-card clickable-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className="course-thumb" style={{ background: 'linear-gradient(135deg, hsl(228 100% 88%), hsl(240 80% 92%))' }}>
        {!imgErr && course.thumbnail_url && (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="course-thumb-img"
            loading="lazy"
            onError={() => setImgErr(true)}
          />
        )}
        <div className="course-thumb-overlay" />
        <span className="material-symbols-outlined course-thumb-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
          play_lesson
        </span>
        <span className="course-thumb-subject">{course.subject}</span>
      </div>

      <div className="course-body">
        <span className="course-level-chip">{course.level}</span>
        <h3 className="course-title">{course.title}</h3>
        <p className="course-instructor">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
          {course.tutor_name}
        </p>

        <div className="course-meta-row">
          <span className="course-meta-item">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_circle</span>
            {course.total_lessons || 0} bài
          </span>
          <span className="course-meta-item">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            {Math.round(course.duration_hours || 0)}h
          </span>
          <span className="course-meta-item">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
            {course.enrollment_count || 0}
          </span>
        </div>

        <div className="course-foot">
          <div className="course-price-block">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
              {rating.toFixed(1)}
              <span style={{ color: 'var(--outline)', fontWeight: 400 }}>({course.review_count || 0})</span>
            </span>
            <div className="course-price-new">{fmt(course.price)}đ</div>
            {course.original_price && Number(course.original_price) > Number(course.price) && (
              <div className="course-price-old">{fmt(course.original_price)}đ</div>
            )}
          </div>
          <button
            className="btn btn-primary btn-ripple"
            style={{ minHeight: 38, padding: '0 16px', fontSize: 13, borderRadius: 10, flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); onClick() }}
          >
            Xem khóa học
          </button>
        </div>
      </div>
    </article>
  )
}
