import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Mock extended profiles ───────────────────────────────────────────────────
const BASE_PROFILE = {
  full_name: 'Nguyễn Thị Hương',
  title: 'Gia sư Toán - Luyện thi THPT Quốc gia',
  picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXSWk4apMr3IzYvtncJ0aXLJKYQHTWlrtSF2YL2ibUD-XC_mNTDoY7Z3m6oxnKVRA1HNZp_rDtYYIQpuAuQr4EcMcFNaoq5B8ApEsaoOChwewphyG4iSlU3dN8o7SWM2M3rii5R3sUEnVMGLeaL4yN_PD7KZqLGGvki4YDThYhOoMYkLyvxDdSE8URnYNkAuJbWmtakbS84ZdjH3LnvD0AFkv4cSMp3mRxYij_yHfqg55WITF2Mxqc_7hJdFxmmIJ-jlFYMkduVPA',
  city: 'Đà Nẵng',
  experience_years: 8,
  hourly_rate: 180000,
  avg_r: 4.8,
  review_count: 128,
  subjects: 'Toán học, Vật lý, Luyện thi THPT, Học sinh mất gốc',
  completedLessons: 245,
  onTimeRate: '98%',
  responseRate: '96%',
  studentsCount: 150,
  teachingFormatShort: 'Online / Offline',
  bio: 'Với hơn 8 năm kinh nghiệm giảng dạy Toán học cấp THPT và luyện thi Đại học, tôi luôn tâm niệm rằng mỗi học sinh đều có một cách tiếp thu riêng. Phương pháp của tôi tập trung vào việc khơi gợi sự hứng thú, xây dựng nền tảng vững chắc và rèn luyện tư duy logic thay vì học vẹt.',
  teachingMethods: [
    'Kiểm tra năng lực đầu vào để xác định điểm mạnh và điểm yếu của học sinh',
    'Xây dựng lộ trình học riêng phù hợp với mục tiêu của từng học sinh',
    'Giảng bài từ cơ bản đến nâng cao, đảm bảo học sinh nắm vững từng bước',
    'Theo dõi và đánh giá tiến bộ định kỳ, điều chỉnh phương pháp khi cần',
  ],
  suitableFor: [
    'Học sinh mất gốc môn Toán',
    'Học sinh cần cải thiện điểm kiểm tra thường xuyên',
    'Học sinh ôn thi THPT Quốc gia',
    'Học sinh muốn học nâng cao, tham gia Olympic Toán',
    'Học sinh cần người kèm sát tiến độ học tập',
  ],
  degrees: [
    { title: 'Cử nhân Sư phạm Toán — Đại học Sư phạm Đà Nẵng', status: 'verified' },
    { title: 'Chứng chỉ nghiệp vụ sư phạm', status: 'verified' },
    { title: 'Chứng chỉ luyện thi THPT Quốc gia', status: 'pending' },
    { title: 'Xác minh danh tính', status: 'verified' },
  ],
  teachingFormats: [
    { icon: 'videocam', label: 'Online qua Google Meet / Zoom' },
    { icon: 'home', label: 'Dạy trực tiếp tại nhà học sinh' },
    { icon: 'apartment', label: 'Dạy trực tiếp tại nhà gia sư' },
    { icon: 'store', label: 'Dạy tại địa điểm công cộng' },
  ],
  availableSchedule: [
    { day: 'T2', slots: ['18:00–20:00', '20:00–22:00'] },
    { day: 'T3', slots: ['19:00–21:00'] },
    { day: 'T4', slots: ['18:00–20:00'] },
    { day: 'T5', slots: ['20:00–22:00'] },
    { day: 'T6', slots: ['18:00–20:00'] },
    { day: 'T7', slots: ['08:00–10:00', '14:00–16:00'] },
    { day: 'CN', slots: ['09:00–11:00'] },
  ],
  studentReviews: [
    { id: 1, name: 'Minh Anh', subject: 'Toán lớp 12', lessonCount: 12, rating: 5.0, comment: 'Cô dạy rất dễ hiểu, có lộ trình rõ ràng. Sau vài buổi em đã tự tin hơn khi làm bài toán vận dụng.', initials: 'MA', bg: '#dde1ff', color: '#00288e' },
    { id: 2, name: 'Quốc Bảo', subject: 'Toán lớp 9',  lessonCount: 8,  rating: 5.0, comment: 'Gia sư kiên nhẫn, đúng giờ và luôn chữa bài rất kỹ. Phù hợp với học sinh mất gốc.', initials: 'QB', bg: '#e2e2e2', color: '#444653' },
    { id: 3, name: 'Hà My',    subject: 'Luyện thi THPT', lessonCount: 15, rating: 4.8, comment: 'Cách dạy dễ hiểu, có nhiều mẹo làm bài nhanh và bám sát đề thi.', initials: 'HM', bg: '#d4e3ff', color: '#003564' },
  ],
  verifiedBadges: [
    { label: 'Đã xác minh', className: 'bg-green-100 text-green-800', icon: 'verified' },
    { label: 'Bằng cấp đã kiểm tra', className: 'bg-blue-100 text-blue-800', icon: 'school' },
    { label: 'EduX duyệt', className: 'bg-purple-100 text-purple-800', icon: 'workspace_premium' },
  ],
  policies: {
    trial: 'Hỗ trợ buổi tư vấn ngắn 15–20 phút miễn phí để thầy/cô và học sinh hiểu nhau trước khi bắt đầu.',
    cancellation: 'Hủy trước 24h: hoàn tiền 100%. Hủy trong 24h: hoàn 50%. Không báo trước: không hoàn tiền.',
  },
}

function getMockProfile(id) {
  return { ...BASE_PROFILE, id }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(val) {
  if (!val) return 'Thỏa thuận'
  const n = Number(val)
  if (n >= 1000) return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
  return `$${n}`
}

function StarRating({ value, size = 14 }) {
  const rounded = Math.round(value * 2) / 2
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="material-symbols-outlined text-[#FFB800]"
          style={{ fontSize: size, fontVariationSettings: i <= rounded ? "'FILL' 1" : "'FILL' 0" }}>
          star
        </span>
      ))}
    </span>
  )
}

function SectionCard({ icon, title, children }) {
  return (
    <section className="bg-white rounded-2xl p-6 tutor-profile-card">
      <h2 className="text-xl font-semibold text-[#191c1e] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 22 }}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Loading / Not found ──────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="bg-[#f8f9fb] min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-[#444653]">
        <span className="material-symbols-outlined text-5xl text-[#00288e] animate-spin">progress_activity</span>
        <p className="text-base font-medium">Đang tải hồ sơ...</p>
      </div>
    </div>
  )
}

function NotFoundScreen() {
  return (
    <div className="bg-[#f8f9fb] min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <span className="material-symbols-outlined text-6xl text-[#c4c5d5]">person_search</span>
        <h1 className="text-2xl font-bold text-[#191c1e] mt-4">Không tìm thấy gia sư</h1>
        <p className="text-[#444653] mt-2">Hồ sơ này không tồn tại hoặc đã bị xóa.</p>
        <a href="#/find-tutors"
          className="inline-flex items-center gap-2 mt-6 bg-[#00288e] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại danh sách gia sư
        </a>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TutorProfile({ tutorId, onGoSignIn, onGoSignUp, user }) {
  const [tutor, setTutor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setLoading(true)
    setNotFound(false)

    // ── Step 1: Read basic data saved from FindTutors listing ──────────────────
    let saved = null
    try {
      const raw = sessionStorage.getItem('viewingTutor')
      if (raw) {
        const parsed = JSON.parse(raw)
        // Only use if IDs match
        if (String(parsed.id) === String(tutorId)) saved = parsed
      }
    } catch {}

    const buildTutor = (apiData) => {
      const base = saved || {}
      const data = apiData || {}
      const teachingMethodsFromDB = Array.isArray(data.teaching_methods) && data.teaching_methods.length > 0
        ? data.teaching_methods
        : null
      const suitableForFromDB = Array.isArray(data.suitable_students) && data.suitable_students.length > 0
        ? data.suitable_students
        : null
      return {
        ...BASE_PROFILE,              // extended mock fields (schedule, reviews, etc.)
        ...base,                      // real basic fields from FindTutors listing
        ...data,                      // real extended fields from API (overwrites if exist)
        // Resolve avatar: prefer profile_photo from API > listing picture > mock
        picture: data.profile_photo_url || data.picture || base.profile_photo_url || base.picture || BASE_PROFILE.picture,
        // Resolve title: headline from API > bio snippet > base bio snippet > mock title
        title: data.headline || base.headline
          || (data.bio ? data.bio.slice(0, 80) : null)
          || (base.bio ? base.bio.slice(0, 80) : null)
          || BASE_PROFILE.title,
        // Use structured DB data if available, otherwise fall back to mock
        teachingMethods: teachingMethodsFromDB || BASE_PROFILE.teachingMethods,
        suitableFor: suitableForFromDB || BASE_PROFILE.suitableFor,
      }
    }

    // ── Step 2: Show immediately with saved data (no spinner wait) ─────────────
    if (saved) {
      setTutor(buildTutor(null))
      setLoading(false)
    }

    // ── Step 3: Fetch full profile from API (enhance what's shown) ─────────────
    // Always try to fetch from API. If it's a mock card, the API will return 404 and we'll fallback to saved data.
    if (!saved) {
      // Show loading if we don't have saved data to render immediately
      setLoading(true)
    }

    fetch(`${API_BASE}/api/tutors/${tutorId}`)
      .then(async r => {
        if (r.status === 404) {
          if (!saved) { setNotFound(true); setLoading(false) }
          return
        }
        const data = r.ok ? await r.json() : null
        setTutor(buildTutor(data))
        if (!saved) setLoading(false)
      })
      .catch(() => {
        if (!saved) {
          setTutor(buildTutor(null))
          setLoading(false)
        }
      })
  }, [tutorId])

  if (loading) return <LoadingScreen />
  if (notFound) return <NotFoundScreen />
  if (!tutor) return <NotFoundScreen />

  const subjectList = tutor.subjects
    ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const priceDisplay = fmtPrice(tutor.hourly_rate)

  return (
    <div className="bg-[#f8f9fb] text-[#191c1e] min-h-screen font-sans">
      <style>{`
        .tutor-profile-card {
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          <a href="#/" className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            EduX
          </a>
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
          </nav>
          <div className="flex items-center gap-4 z-10">
            {user ? (
              <button onClick={() => {
                if (user.role === 'admin') window.location.hash = '/admin'
                else if (user.role === 'tutor') window.location.hash = '/tutor'
                else window.location.hash = '/dashboard'
              }} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">
                Bảng Điều Khiển
              </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-[1280px] mx-auto px-4 md:px-6">

        {/* ── Back link ── */}
        <div className="py-4">
          <a href="#/find-tutors" className="inline-flex items-center gap-1 text-[#00288e] text-sm font-semibold hover:underline">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Quay lại danh sách gia sư
          </a>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_370px] gap-6 items-start">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-5 min-w-0">

            {/* Hero card */}
            <section className="bg-white rounded-2xl p-6 tutor-profile-card flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md bg-[#dde1ff]">
                  {tutor.profile_photo_url || tutor.picture ? (
                    <img src={tutor.profile_photo_url || tutor.picture} alt={tutor.full_name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-[#00288e]/40">person</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#10B981] rounded-full border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-bold text-[#191c1e]">{tutor.full_name}</h1>
                    <p className="text-[#444653] text-base mt-0.5">{tutor.title || tutor.bio?.slice(0, 60)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-end shrink-0">
                    {(tutor.verifiedBadges || BASE_PROFILE.verifiedBadges).map((b, i) => (
                      <span key={i} className={`${b.className} text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{b.icon}</span>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Subject chips */}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {subjectList.map(s => (
                    <span key={s} className="bg-[#d4e3ff] text-[#00288e] text-xs px-3 py-1 rounded-lg font-medium">{s}</span>
                  ))}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[#444653]">
                  {tutor.city && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#00288e]">location_on</span>
                      {tutor.city}
                    </span>
                  )}
                  {tutor.experience_years > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#00288e]">work_history</span>
                      {tutor.experience_years} năm kinh nghiệm
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-semibold text-[#00288e]">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    {priceDisplay}/giờ
                  </span>
                </div>
              </div>
            </section>

            {/* Trust stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { value: tutor.completedLessons ?? 245, label: 'Buổi học', color: 'text-[#00288e]' },
                { value: tutor.onTimeRate ?? '98%',     label: 'Đúng giờ',  color: 'text-green-600' },
                { value: tutor.responseRate ?? '96%',   label: 'Phản hồi',  color: 'text-blue-600' },
                { value: Number(tutor.avg_r || 4.8).toFixed(1), label: 'Đánh giá', color: 'text-[#FFB800]' },
                { value: tutor.studentsCount ?? '150+', label: 'Học sinh',  color: 'text-indigo-800' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl p-3 tutor-profile-card flex flex-col items-center text-center">
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                  <span className="text-xs text-[#444653] mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Giới thiệu */}
            <SectionCard icon="person" title="Giới thiệu">
              <p className="text-[#444653] leading-relaxed">{tutor.bio}</p>
            </SectionCard>

            {/* Phương pháp */}
            <SectionCard icon="lightbulb" title="Phương pháp giảng dạy">
              <ol className="space-y-3">
                {(tutor.teachingMethods || BASE_PROFILE.teachingMethods).map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#dde1ff] text-[#00288e] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[#444653]">{m}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>

            {/* Phù hợp với */}
            <SectionCard icon="group" title="Phù hợp với học sinh">
              <ul className="space-y-2">
                {(tutor.suitableFor || BASE_PROFILE.suitableFor).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#444653]">
                    <span className="material-symbols-outlined text-[#10B981] shrink-0 mt-0.5" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {s}
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* Bằng cấp & xác minh */}
            <SectionCard icon="verified_user" title="Bằng cấp & xác minh">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(tutor.degrees || BASE_PROFILE.degrees).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#f8f9fb] rounded-lg border border-[#e1e2e4]">
                    <span className="text-sm font-medium text-[#191c1e]">{d.title}</span>
                    {d.status === 'verified'
                      ? <span className="material-symbols-outlined text-green-600 shrink-0 ml-2" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>verified</span>
                      : <span className="material-symbols-outlined text-blue-500 shrink-0 ml-2" style={{ fontSize: 18 }}>fact_check</span>
                    }
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Hình thức giảng dạy */}
            <SectionCard icon="devices" title="Hình thức giảng dạy">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(tutor.teachingFormats || BASE_PROFILE.teachingFormats).map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#f8f9fb] rounded-lg border border-[#e1e2e4]">
                    <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 20 }}>{f.icon}</span>
                    <span className="text-sm text-[#444653]">{f.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Lịch dạy */}
            <SectionCard icon="event_available" title="Lịch dạy khả dụng">
              <div className="space-y-3">
                {(tutor.availableSchedule || BASE_PROFILE.availableSchedule).map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 text-sm font-semibold text-[#444653] shrink-0 pt-1">{row.day}</div>
                    <div className="flex flex-wrap gap-2">
                      {row.slots.map(slot => (
                        <span key={slot} className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Đánh giá */}
            <SectionCard icon="star" title={`Đánh giá từ học sinh (${tutor.review_count || (tutor.studentReviews || BASE_PROFILE.studentReviews).length})`}>
              <div className="flex items-center gap-4 mb-5 p-4 bg-[#f8f9fb] rounded-xl">
                <span className="text-5xl font-bold text-[#00288e]">{Number(tutor.avg_r || 4.8).toFixed(1)}</span>
                <div>
                  <StarRating value={Number(tutor.avg_r || 4.8)} size={20} />
                  <p className="text-sm text-[#444653] mt-1">{tutor.review_count || 128} đánh giá</p>
                </div>
              </div>
              <div className="space-y-4">
                {(tutor.studentReviews || BASE_PROFILE.studentReviews).map(r => (
                  <div key={r.id} className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e1e2e4]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: r.bg, color: r.color }}>
                        {r.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-[#191c1e] text-sm">{r.name}</span>
                          <StarRating value={r.rating} size={13} />
                        </div>
                        <p className="text-xs text-[#757684] mt-0.5">{r.subject} · Đã học {r.lessonCount} buổi</p>
                        <p className="text-sm text-[#444653] mt-2 leading-relaxed">"{r.comment}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Chính sách */}
            <SectionCard icon="policy" title="Chính sách học thử & hủy lịch">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e1e2e4]">
                  <h4 className="font-semibold text-[#00288e] mb-1 text-sm">Buổi học thử</h4>
                  <p className="text-xs text-[#444653] leading-relaxed">{(tutor.policies || BASE_PROFILE.policies).trial}</p>
                </div>
                <div className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e1e2e4]">
                  <h4 className="font-semibold text-[#00288e] mb-1 text-sm">Chính sách hủy lịch</h4>
                  <p className="text-xs text-[#444653] leading-relaxed">{(tutor.policies || BASE_PROFILE.policies).cancellation}</p>
                </div>
              </div>
            </SectionCard>

            {/* Report */}
            <div className="flex justify-center py-4">
              <button
                onClick={() => alert('Tính năng báo cáo sẽ được phát triển sau.')}
                className="text-red-500 text-sm hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">flag</span>
                Báo cáo hồ sơ này
              </button>
            </div>
          </div>

          {/* ════ RIGHT COLUMN (sticky booking card) ════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[88px] space-y-4">
              <div className="bg-white rounded-2xl p-6 tutor-profile-card border border-[#e1e2e4]">
                <p className="text-xs font-semibold text-[#757684] uppercase tracking-wide mb-4">Thông tin đặt lịch</p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-[#00288e]">{priceDisplay}</span>
                  <span className="text-[#444653] text-sm">/giờ</span>
                </div>

                {/* Meta list */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[#444653] text-sm">
                    <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-semibold text-[#191c1e]">{Number(tutor.avg_r || 4.8).toFixed(1)}</span>
                    <span>({tutor.review_count || 128} đánh giá)</span>
                  </div>
                  {tutor.experience_years > 0 && (
                    <div className="flex items-center gap-2 text-[#444653] text-sm">
                      <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18 }}>work_history</span>
                      {tutor.experience_years} năm kinh nghiệm
                    </div>
                  )}
                  {tutor.city && (
                    <div className="flex items-center gap-2 text-[#444653] text-sm">
                      <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18 }}>location_on</span>
                      {tutor.city} (Online/Offline)
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#444653] text-sm">
                    <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18 }}>devices</span>
                    {tutor.teachingFormatShort || 'Online / Offline'}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.hash = '/booking/' + tutorId}
                    className="w-full bg-[#00288e] text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#1e40af] transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    Đặt Lịch Học
                  </button>
                  <button
                    onClick={() => {
                      if (!user) return onGoSignIn();
                      alert('Để nhắn tin, bạn cần tham gia khóa học của gia sư này. Nếu đã đăng ký, vui lòng vào Bảng điều khiển -> Tin nhắn để trao đổi.');
                    }}
                    className="w-full bg-white border border-[#c4c5d5] text-[#00288e] py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#f8f9fb] transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    Nhắn Tin Với Gia Sư
                  </button>
                </div>

                {/* Trust notice */}
                <div className="mt-5 pt-4 border-t border-[#e1e2e4] text-xs text-[#757684] text-center leading-relaxed">
                  <span className="material-symbols-outlined text-green-600 align-middle mr-1" style={{ fontSize: 16 }}>shield_check</span>
                  Thanh toán an toàn qua EduX. Tiền chỉ giải ngân cho gia sư sau khi buổi học được xác nhận hoàn thành.
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Mobile booking bar (fixed bottom) ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e1e2e4] px-4 py-3 flex items-center gap-3 z-40 shadow-lg">
          <div className="flex-1">
            <span className="text-xl font-bold text-[#00288e]">{priceDisplay}</span>
            <span className="text-xs text-[#444653]">/giờ</span>
          </div>
          <button
            onClick={() => {
              if (!user) return onGoSignIn();
              alert('Để nhắn tin, bạn cần tham gia khóa học của gia sư này. Nếu đã đăng ký, vui lòng vào Bảng điều khiển -> Tin nhắn để trao đổi.');
            }}
            className="px-4 py-2.5 border border-[#00288e] text-[#00288e] rounded-xl text-sm font-semibold"
          >
            Nhắn Tin
          </button>
          <button
            onClick={() => window.location.hash = '/booking/' + id}
            className="px-5 py-2.5 bg-[#00288e] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors"
          >
            Đặt Lịch
          </button>
        </div>
      </main>
    </div>
  )
}
