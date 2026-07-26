import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiRequest } from '../services/api';
import CourseGoldShowcase from '../components/CourseGoldShowcase';
import ComplaintModal from '../components/ComplaintModal';
import CartButton from '../components/CartButton';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

const CAT_STYLE = {
  'Kỹ Thuật Phần Mềm': { gradient: 'linear-gradient(135deg,#0ea5e9,#1e3a8a)', icon: 'code' },
  'Toán Học':          { gradient: 'linear-gradient(135deg,#6366f1,#312e81)', icon: 'calculate' },
  'Ngoại Ngữ':         { gradient: 'linear-gradient(135deg,#f59e0b,#b45309)', icon: 'translate' },
  'Vi Mạch':           { gradient: 'linear-gradient(135deg,#10b981,#065f46)', icon: 'memory' },
  _default:            { gradient: 'linear-gradient(135deg,#3b82f6,#1e3a8a)', icon: 'school' },
};

function fmtVnd(v) {
  if (!v || Number(v) === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(Number(v)) + ' đ';
}

function Stars({ value, size = 18 }) {
  const r = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: size, color: i <= r ? '#f5a623' : '#d1d5db', fontVariationSettings: i <= r ? "'FILL' 1" : "'FILL' 0" }}>star</span>
      ))}
    </span>
  );
}

export default function CourseDetail({ courseId }) {
  const { user, token } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [enrolled, setEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('info'); // 'info' | 'success'
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState(null);

  const [parentChildren, setParentChildren] = useState([]);
  const [showChildSelect, setShowChildSelect] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');

  // ── State Nạp Tiền Bù ──
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupInfo, setTopupInfo] = useState({ needed: 0, balance: 0, missing: 0, targetStudentId: null });
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // ── Giỏ hàng (localStorage edux_cart — cùng định dạng CartPage/Marketplace) ──
  const CART_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const readCartIds = () => {
    try {
      const arr = JSON.parse(localStorage.getItem('edux_cart') || '[]');
      return Array.isArray(arr) ? arr.map(it => it.id) : [];
    } catch { return []; }
  };
  const [cartIds, setCartIds] = useState(readCartIds);
  useEffect(() => {
    const sync = () => setCartIds(readCartIds());
    window.addEventListener('cartUpdated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('cartUpdated', sync); window.removeEventListener('storage', sync); };
  }, []);

  const addToCart = (c) => {
    if (!CART_UUID_RE.test(String(c.id))) {
      setToast('Khóa học demo — không thể mua.');
      setTimeout(() => setToast(''), 2200);
      return;
    }
    let cart = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('edux_cart') || '[]');
      if (Array.isArray(parsed)) cart = parsed;
    } catch {}
    if (user && user.role === 'tutor') {
      setToast('Gia sư không được mua khóa học.');
      setTimeout(() => setToast(''), 2200);
      return;
    }
    if (!cart.some(it => it.id === c.id)) {
      cart.push({
        id: c.id, title: c.title, price: Number(c.price || 0),
        thumbnail_url: c.thumbnail_url || null,
        tutor_name: c.tutor_name || 'Gia sư EduX',
        tutor_picture: c.tutor_picture || c.tutorAvatar || null,
        subject: c.subject || '', quantity: 1, addedAt: Date.now(),
      });
      localStorage.setItem('edux_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
    }
    setToast('Đã thêm vào giỏ hàng!');
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    const id = courseId || window.location.hash.match(/#\/course\/([^/]+)/)?.[1];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!id) { setError('Không tìm thấy ID khóa học.'); setLoading(false); return; }

    apiRequest(`/api/courses/${id}`)
      .then(d => { setCourse(d); setLoading(false); })
      .catch(e => { setError(e.message || 'Không tìm thấy khóa học.'); setLoading(false); });

    if (user && token) {
      apiRequest(`/api/courses/${id}/enrollment-status`)
        .then(d => {
          if (d.enrolled) setEnrolled(true);
          else if (d.refunded) {
            setToast('Khóa học này đã được hoàn tiền và không còn thuộc quyền sở hữu của bạn.');
            setTimeout(() => setToast(''), 5000);
          }
        })
        .catch(console.error);

      fetch(`${API_BASE}/api/complaints/active?course_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.active) setActiveComplaintId(d.active.id); })
        .catch(() => {});

      if (user?.role === 'parent') {
        fetch(`${API_BASE}/api/parent/children`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : { children: [] })
          .then(data => {
            const list = data?.children || [];
            setParentChildren(list);
            if (list.length > 0) setSelectedChildId(list[0].student_id);
          })
          .catch(() => setParentChildren([]));
      }
    }
  }, [courseId, user, token]);

  // ── Đóng modal khi bấm nút Back của trình duyệt ──
  useEffect(() => {
    const handlePopState = () => {
      setShowChildSelect(false);
      setShowTopupModal(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Auto-Resume đăng ký sau khi nạp VNPAY thành công quay lại ──
  useEffect(() => {
    if (!course || !user || !token) return;
    try {
      const pendingEnroll = JSON.parse(sessionStorage.getItem('edux_pending_enroll') || 'null');
      const isReturned = sessionStorage.getItem('edux_payment_returned') === 'true';
      
      if (pendingEnroll && String(pendingEnroll.courseId) === String(course.id)) {
        // Kiểm tra thời gian hết hạn (15 phút)
        const isExpired = pendingEnroll.createdAt && (Date.now() - pendingEnroll.createdAt > 15 * 60 * 1000);
        
        sessionStorage.removeItem('edux_pending_enroll');
        sessionStorage.removeItem('edux_payment_returned');

        if (!isExpired && isReturned) {
          handleEnroll(pendingEnroll.targetStudentId);
        }
      }
    } catch { /* ignore */ }
  }, [course, user, token]);

  const handleEnroll = async (targetStudentId) => {
    if (!user) {
      try { sessionStorage.setItem('redirectAfterLogin', window.location.hash); } catch (e) {}
      window.location.hash = '/signin';
      return;
    }
    
    if (course && course.tutor_id === user.userId) {
      setToast('Bạn không thể đăng ký khóa học của chính mình.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    if (user.role === 'parent' && targetStudentId === undefined) {
      if (parentChildren.length === 0) {
        setToast('Bạn chưa liên kết với tài khoản học sinh nào. Vui lòng vào trang Bảng Điều Khiển để liên kết trước.');
        setTimeout(() => setToast(''), 5000);
        return;
      }
      setShowChildSelect(true);
      return;
    }

    const price = Number(course?.price || 0);
    if (price > 0) {
      const confirmMsg = `Khóa học này có giá ${price.toLocaleString('vi-VN')} VNĐ. Số tiền này sẽ được trừ trực tiếp vào ví của bạn. Bạn có chắc chắn muốn mua?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setEnrollLoading(true);
    try {
      await apiRequest(`/api/courses/${course.id}/enroll`, {
        method: 'POST',
        body: user.role === 'parent' ? JSON.stringify({ targetStudentId }) : undefined
      });

      if (user.role !== 'parent') {
        setEnrolled(true);
      }
      setShowChildSelect(false);
      setToast('Đăng ký khóa học thành công!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      if ((err.message && err.message.includes('INSUFFICIENT_FUNDS')) || err.code === 'INSUFFICIENT_FUNDS') {
        const needed = Number(err.needed || course?.price || 0);
        const balance = Number(err.balance || 0);
        const missing = Math.max(needed - balance, 10000);
        setTopupInfo({ needed, balance, missing, targetStudentId });
        setTopupAmount(missing);
        setShowChildSelect(false);
        setShowTopupModal(true);
      } else {
        setToast(err.message || 'Lỗi khi đăng ký khóa học.');
        setTimeout(() => setToast(''), 3000);
      }
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleTopUpVNPAY = async () => {
    if (!topupAmount || isNaN(topupAmount) || Number(topupAmount) < 10000) {
      return alert('Số tiền nạp tối thiểu là 10.000 VNĐ.');
    }
    setTopupLoading(true);
    try {
      sessionStorage.setItem('edux_payment_source', JSON.stringify({
        returnHash: window.location.hash,
        source: 'course_detail'
      }));
      sessionStorage.setItem('edux_pending_enroll', JSON.stringify({
        courseId: course.id,
        targetStudentId: topupInfo.targetStudentId,
        createdAt: Date.now()
      }));

      const returnUrl = `${window.location.origin}/#/payment/result`;
      const res = await fetch(`${API_BASE}/api/payment/create-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(topupAmount), returnUrl })
      });
      const data = await res.json();
      if (data.success && data.vnpUrl && data.params) {
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = data.vnpUrl;
        for (const [key, value] of Object.entries(data.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        alert(data.message || 'Không thể tạo liên kết thanh toán VNPAY');
        setTopupLoading(false);
      }
    } catch {
      alert('Lỗi kết nối máy chủ');
      setTopupLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#5d5f5f] font-medium">Đang tải khóa học...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[64px] text-[#9aa3b8]">error_outline</span>
        <p className="text-[#5d5f5f] text-lg">{error}</p>
        <button onClick={() => {
          if (user && (user.id === c?.tutor_id || user.userId === c?.tutor_id)) {
            window.location.hash = '#/tutor?tab=Khóa Học';
          } else {
            window.location.hash = '#/courses';
          }
        }} className="px-6 py-3 bg-[#00288e] text-white rounded-xl font-semibold hover:bg-[#001d6e] transition-colors">
          ← Quay lại danh sách
        </button>
      </div>
    </div>
  );

  const c = course;
  const catStyle = CAT_STYLE[c.subject] || CAT_STYLE._default;
  const discount = c.original_price && c.original_price > c.price
    ? Math.round((1 - c.price / c.original_price) * 100) : 0;
  const lessons = c.lessons || [];
  const outcomes = Array.isArray(c.learning_outcomes) ? c.learning_outcomes : [];
  const requirements = Array.isArray(c.requirements) ? c.requirements : [];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e] font-sans">
      {/* Header — đồng bộ với navbar chuẩn toàn site */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md border-b border-[#c4c5d5]/40 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[80px] relative">
          {/* Logo */}
          <a href="#/" className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            EduX
          </a>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-10">
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-base font-medium text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/courses">Khóa Học</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
          </nav>

          {/* Right: cart + auth */}
          <div className="flex items-center gap-4 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <CartButton />
            )}
            {user ? (
              <button
                onClick={() => {
                  if (user.role === 'admin') window.location.hash = '/admin';
                  else if (user.role === 'tutor') window.location.hash = '/tutor';
                  else window.location.hash = '/dashboard';
                }}
                className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80"
              >
                Bảng Điều Khiển
              </button>
            ) : (
              <>
                <button onClick={() => window.location.hash = '#/signin'} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={() => window.location.hash = '#/signup'} className="bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20 max-w-[1280px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#757684] mb-6">
          <a href="#/courses" className="hover:text-[#00288e] transition-colors">Khóa học</a>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          <span className="text-[#191c1e] font-semibold">{c.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Main content */}
          <div className="flex-grow min-w-0 space-y-6">
            {/* Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ background: catStyle.gradient }}>
              <span className="material-symbols-outlined absolute select-none" style={{ right: -20, bottom: -30, fontSize: 200, color: 'rgba(255,255,255,0.08)' }}>{catStyle.icon}</span>
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt={c.title} className="w-full h-[280px] object-cover" />
              ) : (
                <div className="w-full h-[280px] flex items-center justify-center">
                  <div className="relative z-10 text-center px-8">
                    <span className="material-symbols-outlined text-white/30" style={{ fontSize: 80 }}>{catStyle.icon}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <span className="inline-block text-[10px] font-bold tracking-wider uppercase bg-white/20 text-white px-3 py-1 rounded-full mb-3">{c.subject || 'Khóa học'}</span>
                <h1 className="text-white font-extrabold text-2xl md:text-3xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>{c.title}</h1>
              </div>
            </div>

            {/* Tutor info bar */}
            <div className="flex items-center gap-4 bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-sm">
              {c.tutor_picture ? (
                <img src={c.tutor_picture} alt={c.tutor_name} className="w-12 h-12 rounded-full object-cover border-2 border-[#00288e]/20" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#00288e]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 28 }}>person</span>
                </div>
              )}
              <div>
                <p className="text-sm text-[#757684]">Giảng viên</p>
                <p className="font-bold text-[#191c1e]">{c.tutor_name || 'Chưa cập nhật'}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Stars value={Number(c.avg_rating) || 0} />
                  <span className="font-bold text-sm text-[#191c1e]">{Number(c.avg_rating || 0).toFixed(1)}</span>
                  {c.review_count > 0 && <span className="text-[#757684] text-xs">({c.review_count} đánh giá)</span>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-[#e5e7eb] flex items-center">
                <div className="flex flex-1">
                  {[['overview', 'Tổng quan'], ['lessons', `Bài học (${lessons.length})`], ['info', 'Thông tin thêm']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className={`px-6 py-4 text-sm font-semibold transition-colors ${activeTab === key ? 'text-[#00288e] border-b-2 border-[#00288e]' : 'text-[#757684] hover:text-[#00288e]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {user && enrolled && (
                  <button
                    onClick={() => setComplaintOpen(true)}
                    className={`mx-4 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 ${
                      activeComplaintId
                        ? 'border-amber-400/60 text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'border-[#dc2626]/30 text-[#dc2626] hover:bg-red-50'
                    }`}
                  >
                    {activeComplaintId ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        Đang xử lý
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>report_problem</span>
                        Khiếu nại
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#191c1e] mb-3">Mô tả khóa học</h2>
                      <p className="text-[#444653] leading-relaxed whitespace-pre-line">{c.description || 'Chưa có mô tả cho khóa học này.'}</p>
                    </div>
                    {outcomes.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#191c1e] mb-3">Bạn sẽ học được gì?</h2>
                        <div className="grid md:grid-cols-2 gap-3">
                          {outcomes.map((o, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[#16a34a] mt-0.5" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="text-[#444653] text-sm">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {requirements.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#191c1e] mb-3">Yêu cầu</h2>
                        <ul className="space-y-2">
                          {requirements.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[#f59e0b] mt-0.5" style={{ fontSize: 20 }}>arrow_right</span>
                              <span className="text-[#444653] text-sm">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'lessons' && (
                  <div className="space-y-3">
                    {lessons.length === 0 ? (
                      <div className="text-center py-12 text-[#757684]">
                        <span className="material-symbols-outlined text-[48px] text-[#d1d5db] block mb-3">library_books</span>
                        <p>Chưa có bài học nào được thêm vào khóa học này.</p>
                      </div>
                    ) : lessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-4 p-4 bg-[#f8f9fb] rounded-xl border border-[#e5e7eb] hover:border-[#00288e]/30 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#00288e]/10 flex items-center justify-center shrink-0">
                          <span className="text-[#00288e] font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold text-[#191c1e] text-sm">{lesson.title}</p>
                          {lesson.description && <p className="text-[#757684] text-xs mt-0.5 line-clamp-1">{lesson.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {lesson.duration_label && <span className="text-xs text-[#757684]">{lesson.duration_label}</span>}
                          {lesson.is_preview ? (
                            <span className="text-[10px] font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded-full">Xem trước</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#9aa3b8]" style={{ fontSize: 18 }}>lock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'info' && (
                  <div className="space-y-4">
                    {[
                      ['Cấp độ', c.level],
                      ['Đối tượng', c.target_students],
                      ['Ngôn ngữ', c.language],
                      ['Hình thức', c.learning_mode],
                      ['Nền tảng', c.platform],
                      ['Phương pháp giảng dạy', c.teaching_method],
                      ['Mục tiêu học tập', c.learning_goal],
                      ['Kết quả mong đợi', c.expected_outcome],
                      ['Khu vực', [c.city, c.district].filter(Boolean).join(', ')],
                    ].filter(([, v]) => v && v.toString().trim()).map(([label, value]) => (
                      <div key={label} className="flex items-start border-b border-[#f0f1f3] pb-3 last:border-0">
                        <span className="w-48 text-sm text-[#757684] shrink-0">{label}</span>
                        <span className="text-sm text-[#191c1e] font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Phần vàng: Video demo · Bảng vàng thành tích · Phản hồi ── */}
            <CourseGoldShowcase course={c} courseId={c.id} onEnroll={handleEnroll} enrolled={enrolled} />
          </div>

          {/* Right sidebar: Price & actions */}
          <div className="w-full lg:w-[340px] shrink-0 space-y-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm sticky top-[88px]">
              {/* Price */}
              <div className="mb-5">
                {c.original_price > c.price && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#9aa3b8] text-base line-through">{fmtVnd(c.original_price)}</span>
                    {discount > 0 && <span className="text-[#16a34a] text-sm font-bold bg-[#16a34a]/10 px-2 py-0.5 rounded-full">-{discount}%</span>}
                  </div>
                )}
                <div className="text-[#00288e] font-extrabold text-3xl">{fmtVnd(c.price)}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ['play_lesson', `${c.total_lessons || lessons.length || 0} bài học`],
                  ['schedule', c.session_duration ? `${c.session_duration} phút/buổi` : (c.duration || 'Linh hoạt')],
                  ['group', c.class_type || '1-on-1'],
                  ['bar_chart', c.level || 'Tất cả'],
                ].map(([icon, text], i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-[#f8f9fb] rounded-xl">
                    <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 20 }}>{icon}</span>
                    <span className="text-xs text-[#444653] font-medium">{text}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {user && (user.id === c.tutor_id || user.userId === c.tutor_id) ? (
                <button onClick={() => window.location.hash = `#/tutor?tab=Khóa Học&editCourseId=${c.id}`} className="w-full py-3.5 rounded-xl bg-[#6366f1] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#4f46e5] transition-colors mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                  Chỉnh sửa khóa học
                </button>
              ) : enrolled ? (
                <button onClick={() => window.location.hash = '#/my-courses'} className="w-full py-3.5 rounded-xl bg-[#16a34a] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                  Đã đăng ký (Đến lớp học)
                </button>
              ) : (
                <button onClick={() => handleEnroll()} disabled={enrollLoading} className={`w-full py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all mb-3 ${enrollLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#1e40af] to-[#3b6fe0] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(59,111,224,0.6)]'}`}>
                  {enrollLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_cart</span>
                      Đăng ký khóa học
                    </>
                  )}
                </button>
              )}
              {!enrolled && (
                cartIds.includes(c.id) ? (
                  <button onClick={() => window.location.hash = '#/cart'} className="w-full py-3 rounded-xl border-2 border-[#16a34a] bg-[#f0fdf4] text-[#16a34a] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#dcfce7] transition-colors mb-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                    Trong giỏ — Xem giỏ hàng
                  </button>
                ) : (
                  <button onClick={() => addToCart(c)} className="w-full py-3 rounded-xl border-2 border-[#00288e] text-[#00288e] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00288e] hover:text-white transition-colors mb-3">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_shopping_cart</span>
                    Thêm vào giỏ hàng
                  </button>
                )
              )}
              <button onClick={() => {
                if (user && (user.id === c.tutor_id || user.userId === c.tutor_id)) {
                  window.location.hash = '#/tutor?tab=Khóa Học';
                } else {
                  window.location.hash = '#/courses';
                }
              }} className="w-full py-3 rounded-xl border-2 border-[#c4c5d5] text-[#444653] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#f1f2f6] transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold pointer-events-none ${toastType === 'success' ? 'bg-[#15803d]' : 'bg-[#1e40af]'}`}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{toastType === 'success' ? 'check_circle' : 'info'}</span>
          {toast}
        </div>
      )}

      <ComplaintModal
        isOpen={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        onSuccess={(data) => {
          setComplaintOpen(false);
          setActiveComplaintId(data.id);
          setToastType('success');
          setToast(`Khiếu nại CPL-${data.ticket_number} đã được gửi thành công!`);
          setTimeout(() => { setToast(''); setToastType('info'); }, 6000);
        }}
        courseId={c?.id}
        courseTitle={c?.title}
        token={token}
      />

      {/* Modal chọn con cái khi Phụ huynh bấm mua */}
      {showChildSelect && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-2xl">
            <h3 className="text-xl font-bold text-[#111827] mb-4">Bạn muốn mua khóa học cho bé nào?</h3>
            <div className="flex flex-col gap-3 mb-6">
              {parentChildren.map(child => (
                <label key={child.student_id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedChildId === child.student_id ? 'border-[#00288e] bg-[#eef4ff]' : 'border-[#e5e7eb] hover:bg-gray-50'}`}>
                  <input 
                    type="radio" name="child" value={child.student_id} 
                    checked={selectedChildId === child.student_id} 
                    onChange={(e) => setSelectedChildId(e.target.value)} 
                    className="w-4 h-4 accent-[#00288e]" 
                  />
                  <div className="flex items-center gap-3">
                    {child.student_picture ? (
                       <img src={child.student_picture} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                       <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                          {child.student_name?.[0]?.toUpperCase()}
                       </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-[#111827]">{child.nickname || child.student_name}</div>
                      <div className="text-xs text-gray-500">{child.student_email || 'Chưa cập nhật email'}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowChildSelect(false)} className="flex-1 py-2.5 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button onClick={() => handleEnroll(selectedChildId)} disabled={!selectedChildId} className="flex-1 py-2.5 rounded-xl font-semibold bg-[#00288e] text-white hover:bg-[#001d6e] disabled:opacity-50 transition-colors">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nạp tiền bù khi thiếu số dư ví */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowTopupModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-xl font-bold text-[#111827] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[26px]">account_balance_wallet</span>
              Số Dư Ví Không Đủ
            </h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Bạn cần nạp thêm tiền vào ví để hoàn tất đăng ký khóa học này. Hệ thống sẽ tự động đăng ký ngay sau khi nạp thành công.
            </p>

            <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-700">
                <span>Giá khóa học:</span>
                <span className="font-bold">{topupInfo.needed?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Số dư hiện tại:</span>
                <span className="font-semibold text-green-700">{topupInfo.balance?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="border-t border-amber-200/60 pt-1.5 flex justify-between font-bold text-red-600">
                <span>Số tiền thiếu cần nạp bù:</span>
                <span>{topupInfo.missing?.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-1">Số tiền nạp qua VNPAY (VNĐ)</label>
            <input
              type="number"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="Nhập số tiền nạp"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00288e] outline-none text-lg font-bold mb-3"
            />

            {/* Quick selection */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[topupInfo.missing, 100000, 200000, 500000, 1000000].filter(v => v > 0).map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => setTopupAmount(val)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${Number(topupAmount) === val ? 'border-[#00288e] bg-[#eef4ff] text-[#00288e]' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                >
                  {val === topupInfo.missing ? `Nạp bù ${val / 1000}K` : `${val / 1000}K`}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTopupModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleTopUpVNPAY}
                disabled={topupLoading}
                className="flex-1 py-3 rounded-xl font-bold bg-[#00288e] text-white hover:bg-[#001d6e] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {topupLoading ? 'Đang tạo giao dịch...' : 'Nạp tiền VNPAY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
