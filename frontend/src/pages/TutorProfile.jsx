import { useState, useEffect } from 'react'
import BookingModal from '../components/BookingModal'
import { useAuth } from '../AuthContext'
import CartButton from '../components/CartButton';
import { supabase } from '../services/supabase'
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL

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

function NotFoundScreen({ errorMsg }) {
  return (
    <div className="bg-[#f8f9fb] min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <span className="material-symbols-outlined text-6xl text-[#c4c5d5]">person_search</span>
        <h1 className="text-2xl font-bold text-[#191c1e] mt-4">Không tìm thấy gia sư</h1>
        <p className="text-[#444653] mt-2">{errorMsg || 'Hồ sơ này không tồn tại hoặc đã bị xóa.'}</p>
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
  const { token } = useAuth()
  const [tutor, setTutor] = useState(null)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // ── Inline chat widget state ──
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  // ── Instant Booking State ──
  const [showInstantModal, setShowInstantModal] = useState(false)
  const [instantBookingStatus, setInstantBookingStatus] = useState('idle') // 'idle' | 'creating' | 'waiting' | 'accepted' | 'rejected'
  const [instantBookingId, setInstantBookingId] = useState(null)
  const [instantError, setInstantError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)

  // ── Viết đánh giá ──
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const loadTutor = async () => {
    setLoading(true)
    setNotFound(false)
    setErrorMsg(null)
    try {
      const r = await fetch(`${API_BASE}/api/tutors/${tutorId}`)
      if (r.status === 404) {
        setNotFound(true)
        setLoading(false)
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setTutor(data)
      setLoading(false)
    } catch {
      setNotFound(true)
      setErrorMsg('Đã có lỗi xảy ra khi tải hồ sơ.')
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    loadTutor()
  }, [tutorId])

  const openReviewModal = () => {
    if (!user) { onGoSignIn(); return }
    setReviewRating(5)
    setReviewComment('')
    setReviewError('')
    setShowReviewModal(true)
  }

  const submitReview = async () => {
    if (!reviewComment.trim() || reviewSubmitting) return
    setReviewSubmitting(true)
    setReviewError('')
    try {
      const res = await fetch(`${API_BASE}/api/entity-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: 'tutor', target_id: tutorId, rating: reviewRating, comment: reviewComment.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setShowReviewModal(false)
        // Refresh nhẹ danh sách đánh giá — không setLoading(true) để tránh
        // cả trang chớp về màn hình loading toàn màn hình sau khi vừa gửi xong.
        const r = await fetch(`${API_BASE}/api/tutors/${tutorId}`)
        if (r.ok) setTutor(await r.json())
      } else {
        setReviewError(data.message || 'Không gửi được đánh giá.')
      }
    } catch {
      setReviewError('Lỗi kết nối. Vui lòng thử lại.')
    }
    setReviewSubmitting(false)
  }

  // ── Mở chat widget với gia sư ──
  const openChatWidget = async () => {
    if (!user) { onGoSignIn(); return }
    setChatError('')
    setShowChat(true)
    setChatLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat/${tutorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setChatMessages(data.messages || [])
      } else {
        // Chưa có lịch sử chat → widget vẫn mở nhưng trống
        setChatMessages([])
      }
    } catch {
      setChatMessages([])
    }
    setChatLoading(false)
  }

  // ── Gửi yêu cầu Học Ngay ──
  const handleRequestInstantBooking = async () => {
    if (!user) { onGoSignIn(); return }
    setInstantError('')
    setInstantBookingStatus('creating')
    try {
      const tutorActualId = tutor.user_id || tutor.id || tutorId;
      const subjectFirst = Array.isArray(tutor.subjects)
        ? tutor.subjects[0]
        : (tutor.subjects ? tutor.subjects.split(',')[0].trim() : 'Môn học')
      const res = await fetch(`${API_BASE}/api/bookings/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutor_id: tutorActualId,
          tutor_name: tutor.full_name || tutor.display_name || '',
          subject: subjectFirst,
          duration_mins: tutor.instant_duration_mins || 30,
          note: 'Học Ngay từ profile'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống khi tạo yêu cầu Học Ngay');
      const bookingId = data.booking?.id || data.booking_id;
      if (!bookingId) throw new Error('Không nhận được mã booking từ server.');
      setInstantBookingId(bookingId);
      setInstantBookingStatus('waiting');
      setTimeLeft(60);
    } catch (e) {
      setInstantError(e.message);
      setInstantBookingStatus('idle');
    }
  }

  // ── Lắng nghe trạng thái thay đổi của booking Học Ngay (Polling + Realtime) ──
  useEffect(() => {
    if (instantBookingStatus !== 'waiting' || !instantBookingId) return;
    
    // 1. Polling fallback (mỗi 3 giây)
    const pollStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/bookings/${instantBookingId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const newStatus = data.status;
        
        if (newStatus === 'Confirmed' || newStatus === 'InProgress') {
          setInstantBookingStatus('accepted');
          setTimeout(() => {
            window.location.hash = `/session/${instantBookingId}`;
          }, 2000);
        } else if (newStatus === 'Cancelled' || newStatus === 'Declined' || newStatus === 'Expired' || newStatus === 'Timeout') {
          setInstantBookingStatus('rejected');
        }
      } catch (e) { /* ignore network error */ }
    };
    
    pollStatus();
    const pollInterval = setInterval(pollStatus, 3000);

    // 2. Supabase Realtime (khi có)
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`student-instant-${instantBookingId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${instantBookingId}` },
          (payload) => {
            const newStatus = payload.new?.status;
            if (newStatus === 'Confirmed' || newStatus === 'InProgress') {
              setInstantBookingStatus('accepted');
              setTimeout(() => {
                window.location.hash = `/session/${payload.new.id}`;
              }, 2000);
            } else if (newStatus === 'Cancelled' || newStatus === 'Declined' || newStatus === 'Expired' || newStatus === 'Timeout') {
              setInstantBookingStatus('rejected');
            }
          }
        )
        .subscribe();
    }
    
    // 3. Countdown timer — tự hủy sau 60s
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setInstantBookingStatus(s => s === 'waiting' ? 'rejected' : s);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  }, [instantBookingStatus, instantBookingId]);

  // ── Gửi tin nhắn từ widget ──
  const sendChatMsg = async (e) => {
    e.preventDefault()
    if (!chatDraft.trim() || chatSending) return
    setChatSending(true)
    setChatError('')
    const content = chatDraft.trim()
    setChatDraft('')
    try {
      // Thử gửi thông thường trước
      let res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: tutorId, content })
      })
      if (res.status === 403) {
        // Chưa có permission → dùng /api/chat/start để khởi tạo cuộc trò chuyện
        res = await fetch(`${API_BASE}/api/chat/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tutor_id: tutorId, content })
        })
      }
      if (res.ok) {
        const data = await res.json()
        const newMsg = data.message || { sender_id: user?.id, content, msg_type: 'text', created_at: new Date().toISOString() }
        setChatMessages(prev => [...prev, { ...newMsg, sender_name: user?.name || user?.email }])
      } else {
        const err = await res.json().catch(() => ({}))
        setChatError(err.message || 'Không gửi được tin nhắn')
        setChatDraft(content) // khôi phục lại draft nếu lỗi
      }
    } catch {
      setChatError('Lỗi kết nối. Vui lòng thử lại.')
      setChatDraft(content)
    }
    setChatSending(false)
  }

  // ── Đi đến dashboard messages (chỉ hỗ trợ student role có section messages) ──
  const goToDashboardMessages = () => {
    if (!user) { onGoSignIn(); return }
    // Lưu tutor vào sessionStorage để MessagesSection có thể auto-open chat
    sessionStorage.setItem('openChatWith', JSON.stringify({
      id: tutorId,
      full_name: tutor?.full_name || 'Gia sư',
      picture: tutor?.picture || tutor?.profile_photo_url || null,
      role: 'tutor'
    }))
    // Route đúng theo role: cả student và parent đều có section messages
    if (user.role === 'parent') window.location.hash = '/parent'
    else window.location.hash = '/dashboard/messages'
  }

  if (loading) return <LoadingScreen />
  if (notFound) return <NotFoundScreen errorMsg={errorMsg} />
  if (!tutor) return <NotFoundScreen />

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
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
          </nav>
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <CartButton />
            )}
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
                  {tutor.avatar ? (
                    <img src={tutor.avatar} alt={tutor.full_name}
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
                    <p className="text-[#444653] text-base mt-0.5">{tutor.bio ? tutor.bio.slice(0, 60) + '...' : 'Gia sư tại EduX'}</p>
                  </div>
                </div>

                {/* Subject chips */}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {tutor.subjects && tutor.subjects.length > 0 ? tutor.subjects.map(s => (
                    <span key={s} className="bg-[#d4e3ff] text-[#00288e] text-xs px-3 py-1 rounded-lg font-medium">{s}</span>
                  )) : (
                    <span className="text-[#757684] text-sm">Chưa cập nhật môn học</span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[#444653]">
                  {tutor.experience_years > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#00288e]">work_history</span>
                      {tutor.experience_years} năm kinh nghiệm
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#00288e]">work_history</span>
                      Chưa cập nhật kinh nghiệm
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-semibold text-[#00288e]">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    {priceDisplay}/giờ
                  </span>
                </div>
              </div>
            </section>

            {/* Video demo bài giảng */}
            <section className="bg-white rounded-2xl p-6 tutor-profile-card">
              <h2 className="text-xl font-bold text-[#00288e] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>ondemand_video</span>
                Video demo bài giảng
                <span className="text-xs font-normal text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full ml-2 border border-emerald-200">Học thử miễn phí</span>
              </h2>
              <div className="w-full bg-gradient-to-br from-[#2a2414] to-[#120f08] text-white rounded-xl aspect-video flex flex-col items-center justify-center p-6 text-center shadow-inner border-4 border-white ring-1 ring-[#e1e2e4]">
                <span className="material-symbols-outlined text-[48px] text-[#3a6fe0] mb-4 opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                <p className="font-semibold text-sm mb-1 text-white/90">
                  Gia sư chưa tải video demo cho khóa {tutor.subjects && tutor.subjects.length > 0 ? tutor.subjects[0] : 'này'}
                </p>
                <p className="text-xs text-white/60">
                  Video demo sẽ tự hiển thị khi gia sư thêm bài giảng "Xem trước".
                </p>
              </div>
            </section>

            {/* BẢNG VÀNG THÀNH TÍCH */}
            <section className="rounded-2xl p-6 tutor-profile-card bg-gradient-to-r from-[#e3f2fd] via-[#eaf4ff] to-[#fff8e1] shadow-[inset_0_2px_10px_rgba(255,255,255,0.7)] border border-[#bbdefb]">
              <div className="flex flex-col gap-1 mb-5">
                <h2 className="text-lg md:text-xl font-bold text-[#00288e] flex items-center gap-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  BẢNG VÀNG THÀNH TÍCH
                </h2>
                <p className="text-xs md:text-sm text-[#00288e]/70 ml-9 md:ml-10">Thành tích khóa học - Học làm người</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: (parseFloat(tutor.rating) || 0).toFixed(1), label: 'ĐIỂM ĐÁNH GIÁ', icon: 'star' },
                  { value: tutor.completed_lessons_count ?? '—', label: 'HỌC VIÊN HÀI LÒNG', icon: 'verified' },
                  { value: tutor.total_students ?? 3, label: 'BÀI GIẢNG', icon: 'play_lesson' },
                  { value: tutor.review_count ?? 0, label: 'LƯỢT PHẢN HỒI', icon: 'reviews' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/95 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-white h-full hover:shadow-md transition-shadow">
                    <span className="material-symbols-outlined text-[#00288e] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                    <span className="text-2xl font-black text-[#00288e]">{stat.value}</span>
                    <span className="text-[10px] font-bold text-[#00288e]/70 mt-1 uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Giới thiệu */}
            <SectionCard icon="person" title="Giới thiệu">
              {tutor.bio ? (
                <p className="text-[#444653] leading-relaxed whitespace-pre-wrap">{tutor.bio}</p>
              ) : (
                <p className="text-[#757684] italic">Gia sư chưa cập nhật giới thiệu bản thân.</p>
              )}
            </SectionCard>

            {/* Phương pháp */}
            <SectionCard icon="lightbulb" title="Hình thức giảng dạy">
              {tutor.teaching_methods && tutor.teaching_methods.length > 0 ? (
                <ul className="space-y-3">
                  {tutor.teaching_methods.map((m, i) => (
                    <li key={i} className="flex gap-3 items-center">
                      <span className="w-6 h-6 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined" style={{fontSize: 16}}>check</span>
                      </span>
                      <span className="text-[#444653] capitalize">{m === 'online' ? 'Dạy trực tuyến (Online)' : m === 'offline' ? 'Dạy trực tiếp (Offline)' : m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#757684] italic">Chưa cập nhật hình thức giảng dạy.</p>
              )}
            </SectionCard>

            {/* Lịch dạy */}
            <SectionCard icon="event_available" title="Lịch dạy khả dụng">
              {tutor.availability && Object.keys(tutor.availability).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(tutor.availability).map(([day, slots]) => (
                    <div key={day} className="flex items-start gap-3">
                      <div className="w-12 text-sm font-semibold text-[#444653] shrink-0 pt-1 capitalize">{day}</div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(slots) ? slots.map(slot => (
                          <span key={slot} className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                            {slot}
                          </span>
                        )) : (
                           <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                            {slots}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#757684] italic">Gia sư chưa cập nhật lịch rảnh</p>
              )}
            </SectionCard>

            {/* Phản hồi học viên */}
            <section className="bg-white rounded-2xl p-6 tutor-profile-card">
              <h2 className="text-xl font-bold text-[#00288e] mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00288e]" style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
                Phản hồi học viên ({tutor.review_count ?? 0})
              </h2>

              <div className="mb-6">
                <button
                  onClick={openReviewModal}
                  className="bg-[#1e40af] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-[#1e3a8a] transition-colors shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                  Viết đánh giá
                </button>
              </div>

              {tutor.reviews && tutor.reviews.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-5 p-4 bg-[#f8f9fb] rounded-xl">
                    <span className="text-5xl font-bold text-[#00288e]">{(parseFloat(tutor.rating) || 0).toFixed(1)}</span>
                    <div>
                      <StarRating value={parseFloat(tutor.rating) || 0} size={20} />
                      <p className="text-sm text-[#444653] mt-1">{tutor.review_count ?? 0} đánh giá</p>
                    </div>
                  </div>
                  {tutor.reviews.map(r => (
                    <div key={r.id} className="p-4 bg-[#f8f9fb] rounded-xl border border-[#e1e2e4]">
                      <div className="flex items-start gap-3">
                        {r.reviewer_avatar ? (
                          <img src={r.reviewer_avatar} alt={r.reviewer_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-[#dde1ff] text-[#00288e]">
                            {(r.reviewer_name || 'H').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-semibold text-[#191c1e] text-sm">{r.reviewer_name}</span>
                            <StarRating value={r.rating} size={13} />
                          </div>
                          <p className="text-xs text-[#757684] mt-0.5">{new Date(r.created_at).toLocaleDateString('vi-VN')}</p>
                          <p className="text-sm text-[#444653] mt-2 leading-relaxed">"{r.comment}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#444653] text-sm flex items-center gap-2 mt-4">
                  Chưa có đánh giá nào — hãy là người đầu tiên để lại phản hồi vàng!
                  <span className="material-symbols-outlined text-[#FFB800] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </p>
              )}
            </section>
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
                    <span className="font-semibold text-[#191c1e]">{(parseFloat(tutor.rating) || 0).toFixed(1)}</span>
                    <span>({tutor.review_count} đánh giá)</span>
                  </div>
                  {tutor.experience_years > 0 && (
                    <div className="flex items-center gap-2 text-[#444653] text-sm">
                      <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 18 }}>work_history</span>
                      {tutor.experience_years} năm kinh nghiệm
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {user && (tutor.user_id === user.id || tutor.id === user.id) ? (
                  <div className="w-full bg-[#f8f9fb] border border-[#e1e2e4] text-[#757684] py-3 px-4 rounded-xl text-center font-medium text-sm">
                    Đây là hồ sơ gia sư của bạn
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        sessionStorage.setItem('edux_last_booking_tutor', JSON.stringify(tutor));
                        window.location.hash = `/booking/${tutor.user_id || tutor.id || tutorId}`;
                      }}
                      className="w-full bg-[#00288e] text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#1e40af] transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      Đặt Lịch Học Thử
                    </button>
                    {tutor.availability_status === 'Online' && (
                      <button
                        onClick={() => setShowInstantModal(true)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-xl font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-colors shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 animate-pulse"
                      >
                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                        Học Ngay - {tutor.instant_price ? `${Number(tutor.instant_price).toLocaleString()}đ` : priceDisplay}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        sessionStorage.setItem('edux_last_booking_tutor', JSON.stringify(tutor));
                        window.location.hash = `/booking/${tutor.user_id || tutor.id || tutorId}`;
                      }}
                      className="w-full bg-[#10B981] text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#059669] transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      Đặt Lịch Học
                    </button>
                    <button
                      onClick={openChatWidget}
                      className="w-full bg-white border border-[#c4c5d5] text-[#00288e] py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#eef3ff] hover:border-[#00288e] transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      Nhắn Tin Với Gia Sư
                    </button>
                  </div>
                )}

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
        {!(user && (tutor.user_id === user.id || tutor.id === user.id)) && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e1e2e4] px-4 py-3 flex items-center gap-3 z-40 shadow-lg">
            <div className="flex-1">
              <span className="text-xl font-bold text-[#00288e]">{priceDisplay}</span>
              <span className="text-xs text-[#444653]">/giờ</span>
            </div>
            <button
              onClick={openChatWidget}
              className="px-4 py-2.5 border border-[#00288e] text-[#00288e] rounded-xl text-sm font-semibold hover:bg-[#eef3ff] transition-colors"
            >
              Nhắn Tin
            </button>
            {tutor.availability_status === 'Online' && (
              <button
                onClick={() => setShowInstantModal(true)}
                className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-md flex items-center justify-center animate-pulse"
                title="Học Ngay"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </button>
            )}
            <button
              onClick={() => {
                sessionStorage.setItem('edux_last_booking_tutor', JSON.stringify(tutor));
                window.location.hash = `/booking/${tutor.user_id || tutor.id || tutorId}`;
              }}
              className="px-5 py-2.5 bg-[#00288e] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors whitespace-nowrap"
            >
              Đặt Lịch
            </button>
          </div>
        )}

        {/* ── Instant Booking Modal ── */}
        {showInstantModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 pt-6 pb-10 text-white text-center relative">
                <button
                  onClick={() => { if (instantBookingStatus !== 'creating' && instantBookingStatus !== 'waiting') { setShowInstantModal(false); setInstantBookingStatus('idle'); setInstantError(''); } }}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  disabled={instantBookingStatus === 'creating' || instantBookingStatus === 'waiting'}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[32px]">bolt</span>
                </div>
                <h3 className="text-[18px] font-bold">Học Ngay Cùng Gia Sư!</h3>
                <p className="text-[13px] mt-1 text-white/80">
                  {tutor.full_name || tutor.display_name || 'Gia sư'}
                </p>
              </div>

              {/* Body — pulled up with negative margin */}
              <div className="px-6 pb-6 -mt-5">
                {/* Info card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-5">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50 text-[14px]">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">school</span>
                      Môn học
                    </span>
                    <span className="font-semibold text-gray-800">
                      {Array.isArray(tutor.subjects) ? tutor.subjects[0] : (tutor.subjects ? tutor.subjects.split(',')[0].trim() : 'Môn học')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50 text-[14px]">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">schedule</span>
                      Thời lượng
                    </span>
                    <span className="font-semibold text-gray-800">{tutor.instant_duration_mins || 30} phút</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-[14px]">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">payments</span>
                      Học phí
                    </span>
                    <span className="font-bold text-amber-600 text-[16px]">
                      {tutor.instant_price
                        ? `${Number(tutor.instant_price).toLocaleString('vi-VN')} VNĐ`
                        : priceDisplay}
                    </span>
                  </div>
                </div>

                {/* Note */}
                {instantBookingStatus === 'idle' && (
                  <p className="text-[12px] text-gray-500 text-center mb-4">
                    Tiền học phí sẽ được tạm giữ. Nếu gia sư không phản hồi trong 60 giây,
                    tiền sẽ hoàn trả ngay về ví của bạn.
                  </p>
                )}

                {/* Error */}
                {instantError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                    <p className="text-red-600 text-[13px] leading-snug">{instantError}</p>
                  </div>
                )}

                {/* States */}
                {instantBookingStatus === 'idle' && (
                  <button
                    onClick={handleRequestInstantBooking}
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 text-[15px]"
                  >
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                    Xác nhận &amp; Gửi yêu cầu
                  </button>
                )}

                {(instantBookingStatus === 'creating' || instantBookingStatus === 'waiting') && (
                  <div className="flex flex-col items-center py-4 gap-3">
                    {/* Circular countdown */}
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#FDE68A" strokeWidth="6"/>
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#F59E0B" strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 34}`}
                          strokeDashoffset={`${2 * Math.PI * 34 * (1 - timeLeft / 60)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-bold text-[22px] text-amber-600">{timeLeft}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-gray-800">Đang chờ gia sư phản hồi...</p>
                    <p className="text-[12px] text-gray-400">Yêu cầu tự động hủy khi hết giờ đếm ngược</p>
                  </div>
                )}

                {instantBookingStatus === 'accepted' && (
                  <div className="flex flex-col items-center py-4 gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <p className="text-[15px] font-bold text-green-700">Gia sư đã chấp nhận!</p>
                    <p className="text-[12px] text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      Đang chuyển vào phòng học...
                    </p>
                  </div>
                )}

                {instantBookingStatus === 'rejected' && (
                  <div className="flex flex-col items-center py-4 gap-3">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                    </div>
                    <p className="text-[14px] font-bold text-red-600">Yêu cầu không được chấp nhận</p>
                    <p className="text-[12px] text-gray-500 text-center">Gia sư bận hoặc không phản hồi kịp thời.<br/>Tiền học phí đã được hoàn trả về ví của bạn.</p>
                    <button
                      onClick={() => { setInstantBookingStatus('idle'); setInstantError(''); setTimeLeft(60); }}
                      className="mt-2 px-5 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[13px] font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>



      {/* ── Inline Chat Widget ── */}
      {showChat && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col" style={{ width: 360, maxWidth: 'calc(100vw - 24px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-[#e1e2e4] flex flex-col overflow-hidden"
               style={{ height: 480, maxHeight: 'calc(100vh - 120px)' }}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#00288e] text-white">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {tutor.profile_photo_url || tutor.picture
                  ? <img src={tutor.profile_photo_url || tutor.picture} alt={tutor.full_name} className="w-full h-full object-cover" />
                  : <span className="material-symbols-outlined text-white text-[20px]">person</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{tutor.full_name || tutor.display_name || tutor.first_name || 'Gia sư'}</p>
                <p className="text-xs text-white/70 truncate">Gia sư • {(Array.isArray(tutor.subjects) ? tutor.subjects[0] : tutor.subjects?.split(',')[0]?.trim()) || ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToDashboardMessages}
                  title="Mở trong Tin nhắn"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                </button>
                <button
                  onClick={() => setShowChat(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-[#f8f9fb]">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="material-symbols-outlined text-[#00288e] text-3xl animate-spin">progress_activity</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                  <span className="material-symbols-outlined text-[48px] text-[#c4c5d5]">waving_hand</span>
                  <p className="text-sm text-[#444653] font-medium">Bắt đầu cuộc trò chuyện với {tutor.full_name || tutor.display_name || tutor.first_name || 'Gia sư'}</p>
                  <p className="text-xs text-[#757684]">Hỏi về khóa học, lịch học, phương pháp giảng dạy...</p>
                  {/* Quick reply suggestions */}
                  <div className="flex flex-col gap-2 w-full mt-2">
                    {[
                      `Xin chào! Tôi muốn tìm hiểu về lịch dạy của bạn.`,
                      `Bạn có thể dạy online không?`,
                      `Học phí và lịch học như thế nào?`
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setChatDraft(suggestion)}
                        className="text-xs text-left px-3 py-2 bg-white border border-[#e1e2e4] rounded-lg hover:border-[#00288e] hover:bg-[#eef3ff] transition-colors text-[#444653]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  if (!msg) return null;
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? 'bg-[#00288e] text-white rounded-br-sm'
                          : 'bg-white text-[#191c1e] shadow-sm border border-[#e1e2e4] rounded-bl-sm'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content || ''}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60 text-right' : 'text-[#757684]'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Error message */}
            {chatError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <p className="text-xs text-red-600">{chatError}</p>
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendChatMsg} className="flex items-end gap-2 px-3 py-3 border-t border-[#e1e2e4] bg-white">
              <textarea
                value={chatDraft}
                onChange={e => setChatDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(e) } }}
                placeholder={`Nhắn tin cho ${(tutor.full_name || tutor.display_name || tutor.first_name || '').split(' ').filter(Boolean).pop() || 'gia sư'}...`}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[#c4c5d5] bg-[#f8f9fb] px-3 py-2 text-sm text-[#191c1e] placeholder:text-[#757684] focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]/20 focus:outline-none transition-all"
                style={{ maxHeight: 80 }}
              />
              <button
                type="submit"
                disabled={!chatDraft.trim() || chatSending}
                className="w-10 h-10 shrink-0 bg-[#00288e] text-white rounded-full flex items-center justify-center hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {chatSending
                  ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chat Trigger button (khi chưa mở chat) */}
      {!showChat && user && (
        <button
          onClick={openChatWidget}
          title={`Nhắn tin với ${tutor.full_name || tutor.display_name || tutor.first_name || 'Gia sư'}`}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-[#00288e] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#1e40af] hover:scale-105 transition-all group"
        >
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          <span className="absolute -top-10 right-0 bg-[#191c1e] text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Nhắn tin với gia sư
          </span>
        </button>
      )}

      {/* ── Modal viết đánh giá ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#e1e2e4]">
              <h3 className="text-lg font-bold text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00288e]">edit_square</span>
                Đánh giá {tutor.full_name || tutor.display_name || tutor.first_name || 'gia sư'}
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f8f9fb]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[#444653] mb-2">Số sao</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewRating(i)}
                      className="p-0.5"
                      aria-label={`${i} sao`}
                    >
                      <span
                        className="material-symbols-outlined text-[#FFB800] text-[28px]"
                        style={{ fontVariationSettings: i <= reviewRating ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#444653] mb-2">Nhận xét</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Buổi học thế nào? Gia sư dạy có dễ hiểu không?"
                  className="w-full p-3 rounded-xl border border-[#c4c5d5] text-sm focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e]/20 focus:outline-none resize-none"
                />
              </div>
              {reviewError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{reviewError}</p>
              )}
              <button
                onClick={submitReview}
                disabled={!reviewComment.trim() || reviewSubmitting}
                className="h-11 w-full rounded-xl bg-[#00288e] text-white font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reviewSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
