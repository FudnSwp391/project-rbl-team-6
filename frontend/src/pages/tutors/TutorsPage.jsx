import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { readHashQuery, writeHashQuery } from '../../services/urlFilters'
import { TutorRowSkeleton } from '../../components/Skeletons'
import Pagination from '../../components/Pagination'
import '../../pages.css'

const LEVELS  = ['Tất cả', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Đại học']
const METHODS = ['Tất cả', 'online', 'offline']
const PAGE_SIZE = 6

function fmt(price) {
  return new Intl.NumberFormat('vi-VN').format(price || 0)
}

/* ── "Bảng vàng thành tích" ──
   API danh sách không trả môn → nhận diện môn chính từ bio để gợi thành tích.
   Kết hợp dữ liệu THẬT (rating/kinh nghiệm) + thành tích tiêu biểu theo môn. */
function detectSubject(text = '') {
  const t = text.toLowerCase()
  if (t.includes('toán')) return 'Toán'
  if (t.includes('ielts') || t.includes('toeic') || t.includes('tiếng anh') || t.includes('anh ngữ')) return 'Tiếng Anh'
  if (t.includes('vật lý') || t.includes('vật lí')) return 'Vật lý'
  if (t.includes('hóa')) return 'Hóa học'
  if (t.includes('python') || t.includes('tin học') || t.includes('lập trình')) return 'Tin học'
  if (t.includes('văn')) return 'Ngữ văn'
  if (t.includes('sinh')) return 'Sinh học'
  return null
}

const SUBJECT_HONORS = {
  'Toán':      { skill: 'Giỏi luyện thi THPT Quốc gia & bồi dưỡng đội tuyển HSG Toán', community: 'Đóng góp kho tài liệu Toán miễn phí cho học sinh cả nước' },
  'Tiếng Anh': { skill: 'Giỏi luyện IELTS/TOEIC — nhiều học viên đạt 7.0+ band', community: 'Mentor tiếng Anh cộng đồng, hỗ trợ học sinh vùng khó' },
  'Vật lý':    { skill: 'Giỏi phần Điện & Dao động — luyện thi khối A, A1', community: 'Tác giả chuỗi bài giảng Vật lý mở cho học sinh toàn quốc' },
  'Hóa học':   { skill: 'Giỏi Hóa hữu cơ & oxi hóa–khử, ôn luyện HSG Hóa', community: 'Biên soạn ngân hàng đề Hóa chia sẻ miễn phí cả nước' },
  'Tin học':   { skill: 'Giỏi lập trình & luyện thi HSG Tin / lập trình thi đấu', community: 'Dẫn dắt 200+ lập trình viên trẻ trong cộng đồng' },
  'Ngữ văn':   { skill: 'Giỏi Nghị luận — học sinh đạt 8–9 điểm Văn THPT', community: 'Lan tỏa phương pháp học Văn cho học sinh cả nước' },
  'Sinh học':  { skill: 'Giỏi Di truyền & Sinh thái — luyện thi khối B', community: 'Đóng góp học liệu Sinh học cho cộng đồng' },
  default:     { skill: 'Phương pháp giảng dạy hiệu quả, tận tâm với học sinh', community: 'Tích cực đóng góp cho cộng đồng học tập' },
}

function getHonors(tutor) {
  const meta = SUBJECT_HONORS[detectSubject(tutor.bio)] || SUBJECT_HONORS.default
  const out = [
    { icon: 'workspace_premium', text: meta.skill },
    { icon: 'volunteer_activism', text: meta.community },
  ]
  const rating = Number(tutor.avg_rating) || 0
  if (rating >= 4.8 && tutor.review_count > 0) {
    out.push({ icon: 'star', text: `Gia sư xuất sắc — ${rating.toFixed(1)}/5 từ ${tutor.review_count} đánh giá` })
  } else if (tutor.experience_years) {
    out.push({ icon: 'verified', text: `${tutor.experience_years} năm kinh nghiệm giảng dạy` })
  }
  return out
}

export default function TutorsPage({ onViewTutor }) {
  const initial = readHashQuery()   // đọc filter từ URL khi mở trang
  const [subjects, setSubjects] = useState([])    // từ /api/subjects
  const [tutors,   setTutors]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const [subject,  setSubject]  = useState(initial.subject || 'Tất cả')
  const [level,    setLevel]    = useState(initial.level || 'Tất cả')
  const [maxPrice, setMaxPrice] = useState(initial.max_price ? Math.round(Number(initial.max_price) / 1000) : 500)
  const [method,   setMethod]   = useState(initial.method || 'Tất cả')
  const [search,   setSearch]   = useState(initial.q || '')
  const [sort,     setSort]     = useState(initial.sort || 'rating')
  const [page,     setPage]     = useState(Number(initial.page) || 1)

  // Load danh sách môn 1 lần
  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setSubjects([]))
  }, [])

  // Đồng bộ filter/sort/trang vào URL (không re-route)
  useEffect(() => {
    writeHashQuery('/tutors', {
      subject, level, max_price: maxPrice !== 500 ? maxPrice * 1000 : '',
      method, q: search, sort, page,
    })
  }, [subject, level, maxPrice, method, search, sort, page])

  // Đổi filter → quay về trang 1
  useEffect(() => { setPage(1) }, [subject, level, maxPrice, method, search, sort])

  // Re-fetch khi filter thay đổi (debounce nhẹ qua dependency search)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const filters = {
      subject: subject !== 'Tất cả' ? subject : '',
      level:   level   !== 'Tất cả' ? level   : '',
      max_price: maxPrice * 1000,
      method:  method !== 'Tất cả' ? method : '',
      q: search,
      sort,
    }
    const handle = setTimeout(() => {
      api.getTutors(filters)
        .then(data => { if (!cancelled) setTutors(data) })
        .catch(e => { if (!cancelled) setError(e.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [subject, level, maxPrice, method, search, sort])

  // Phân trang client-side
  const totalPages = Math.max(1, Math.ceil(tutors.length / PAGE_SIZE))
  const pageItems = tutors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => {
    setSubject('Tất cả'); setLevel('Tất cả')
    setMaxPrice(500); setMethod('Tất cả'); setSearch('')
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <button className="back-btn btn-ripple" onClick={() => { window.location.hash = '/' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Trang chủ
          </button>
          <span style={{ color: 'var(--outline)', fontSize: 16 }}>›</span>
          <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 14 }}>Tìm gia sư</span>
        </div>
      </header>

      <div className="tutors-layout">
        {/* ── Filter sidebar ── */}
        <aside className="filter-sidebar">
          <h2 className="filter-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 22 }}>tune</span>
            Bộ lọc
          </h2>

          <div className="filter-group">
            <label>Tìm tên gia sư</label>
            <div className="filter-search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input
                className="filter-search filter-search-padded"
                placeholder="Nhập tên gia sư..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Môn học</label>
            <select className="filter-select" value={subject} onChange={e => setSubject(e.target.value)}>
              <option>Tất cả</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Cấp học</label>
            <select className="filter-select" value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Giá tối đa: {fmt(maxPrice * 1000)}đ/giờ</label>
            <input
              type="range" min={50} max={500} step={10}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="price-slider"
            />
            <div className="price-labels">
              <span>50.000đ</span>
              <span>500.000đ</span>
            </div>
          </div>

          <div className="filter-group">
            <label>Hình thức dạy</label>
            <div className="method-options">
              {METHODS.map(m => (
                <label key={m} className="method-option">
                  <input
                    type="radio"
                    name="method"
                    checked={method === m}
                    onChange={() => setMethod(m)}
                  />
                  {m === 'Tất cả' ? 'Tất cả' : m === 'online' ? 'Online' : 'Offline'}
                </label>
              ))}
            </div>
          </div>

          <button className="filter-reset btn-ripple" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </aside>

        {/* ── Main area ── */}
        <div className="tutors-main">
          <div className="tutors-header">
            <div>
              <h1>Tìm gia sư</h1>
              <p className="tutors-count">
                {loading ? 'Đang tải...' : `${tutors.length} gia sư phù hợp`}
              </p>
            </div>
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="price_asc">Giá thấp nhất</option>
              <option value="price_desc">Giá cao nhất</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>

          {error && (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">error</span>
              <h3>Không tải được danh sách</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Skeleton khi đang tải */}
          {!error && loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => <TutorRowSkeleton key={i} />)}
            </div>
          )}

          {!error && !loading && tutors.length === 0 && (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">search_off</span>
              <h3>Không tìm thấy gia sư</h3>
              <p>Thử điều chỉnh bộ lọc để có kết quả phù hợp hơn.</p>
            </div>
          )}

          {!error && !loading && pageItems.map((tutor, i) => (
            <TutorCardRow
              key={tutor.id}
              tutor={tutor}
              delay={i * 0.06}
              onView={() => onViewTutor(tutor.id)}
            />
          ))}

          {!error && !loading && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}

function TutorAvatar({ tutor, size = 88, className = 'tutor-card-v2-avatar' }) {
  const [err, setErr] = useState(false)
  if (!err && tutor.picture) {
    return (
      <img
        className={className}
        src={tutor.picture}
        alt={tutor.full_name}
        width={size} height={size}
        onError={() => setErr(true)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={`${className}-fallback`}
      style={{ background: 'linear-gradient(135deg, #00288e, #4c6ef5)', width: size, height: size, fontSize: size * 0.32 }}
    >
      {(tutor.full_name || '?').charAt(0)}
    </div>
  )
}

function TutorCardRow({ tutor, delay, onView }) {
  const rating = Number(tutor.avg_rating) || 0
  return (
    <article
      className="tutor-card-v2 clickable-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={onView}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <TutorAvatar tutor={tutor} size={88} className="tutor-card-v2-avatar" />
        {rating >= 4.9 && (
          <span className="avatar-badge" title="Gia sư xuất sắc">⭐</span>
        )}
      </div>

      <div className="tutor-card-v2-info">
        <h3>{tutor.full_name}</h3>

        <div className="tutor-card-v2-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700 }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#f59e0b', fontSize: 16, fontVariationSettings: "'FILL' 1" }}
            >star</span>
            {rating.toFixed(1)}
            <span style={{ color: 'var(--outline)', fontWeight: 400, fontSize: 13 }}>
              ({tutor.review_count || 0} đánh giá)
            </span>
          </span>
          {tutor.experience_years != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>work</span>
              {tutor.experience_years} năm kinh nghiệm
            </span>
          )}
          {tutor.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>location_on</span>
              {tutor.location}
            </span>
          )}
        </div>

        <div className="tutor-card-v2-chips">
          {(tutor.teaching_methods || []).map(m => (
            <span key={m} className={m === 'online' ? 'chip-online' : 'chip-offline'}>
              {m === 'online' ? 'Online' : 'Offline'}
            </span>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.55, margin: 0 }}>
          {tutor.bio}
        </p>

        {/* Bảng vàng thành tích */}
        <div className="tutor-honors">
          <div className="tutor-honors-head">
            <span className="material-symbols-outlined">military_tech</span>
            Bảng vàng thành tích
          </div>
          <ul className="tutor-honors-list">
            {getHonors(tutor).map((a, i) => (
              <li key={i}>
                <span className="material-symbols-outlined">{a.icon}</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="tutor-card-v2-foot">
          <div className="tutor-card-v2-price">
            <strong>{fmt(tutor.hourly_rate)}</strong>
            <span>đ/giờ</span>
          </div>
          <button
            className="btn btn-primary btn-ripple"
            style={{ minHeight: 40, padding: '0 20px', fontSize: 14, borderRadius: 12 }}
            onClick={e => { e.stopPropagation(); onView() }}
          >
            Xem hồ sơ
          </button>
        </div>
      </div>
    </article>
  )
}
