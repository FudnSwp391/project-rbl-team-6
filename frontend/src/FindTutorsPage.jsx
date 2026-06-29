import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SUBJECT_OPTIONS = ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh', 'Lập Trình', 'Văn Học', 'Lịch Sử', 'Địa Lý'];

const SORT_OPTIONS = [
  { value: 'rating',     label: 'Đánh Giá Cao Nhất' },
  { value: 'price_asc',  label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'experience', label: 'Kinh Nghiệm Nhiều Nhất' },
  { value: 'newest',     label: 'Mới Nhất' },
];

const MOCK_TUTORS = [
  { id: '1', full_name: 'Dr. Sarah Jenkins', bio: 'PhD in Applied Mathematics', avg_r: 4.9, subjects: 'Giải Tích, Đại Số Tuyến Tính', hourly_rate: 65, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp3x_VIeJloqdZlAnstQ2GLxMA8-0glYNJ5zVnQtCcqUeJ3Hr0IenHpDRQo6JOKIw9PxQWmbwOorbIlUnalTc9FPezJ6IteM_wutLhomHTTUI6y4R9WqFGg0QAEkbQiwhYXHlXEVo4cygGYqCx93DF-_MWEUrqkta7ULRML04On0HfHH9726fK1_RiSxz_FxmsiuPvVAqiUlM5pgP5lDV14GHsYHLSYqegxs0_Bf_-megtR0xOkv_grLDs2YfkE9why2KHe5Ppwyw', featured: true },
  { id: '2', full_name: 'Mark Thompson',     bio: 'Master of Physics, MIT',          avg_r: 4.8, subjects: 'Vật Lý Lượng Tử, Toán SAT',    hourly_rate: 55, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlmuVB8nJzFkbr1ZMsSy2gAXdaz55PyMoNSbgEAImuRLsq_wj71B0YKaHHopezS7no3S9X9blul0hS31uWXvQB5FEap2F4of7hmsRCJ51kdRji_yW7R-7epoSuvVMFRyQ0IKN0mHfqXSSgBlBNo8emjeQKtfrNgcW4pKQ-wN7YLD16duYGrmpRhjUMJfUb59WDI51cCv05b8huLdXShrLoorXEBULcXQoTTa6ZETTOFR4ooOlDoZdEFk0laUiFgbHY1XqwTZeromE' },
  { id: '3', full_name: 'Elena Rodriguez',   bio: 'Statistics & Data Analysis Expert', avg_r: 5.0, subjects: 'Thống Kê, R / Python',          hourly_rate: 70, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDipdd276WduXsIdzZiWZfbwSjRHk1wTofzKVHb1ZaLuhpzlI9EiLdg9Ds4HyV5KLtI2kvUMuq6BPxzyk2KWKUmitqmJKtcCb6je7vNvuAPj8gesUrdiGkxOLkTqXaGfzzt8smXBcxLzrK-1b-ag3BN1IB8MJTf_QYwMJOBg-19Y3CUiWMvFyXw73WCv7Yej6AKsq-XWrYTsQMBApJTjqg4KA_O09dg7Mrt1a_XCBYvh3o-CT5bMBVvUx0eO7cWUMGmvb3LMUPCpu4' },
  { id: '4', full_name: 'James Wilson',      bio: 'Geometry & Trigonometry Specialist', avg_r: 4.7, subjects: 'Hình Học, Luyện Thi ACT',     hourly_rate: 45, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpbDFeHbsgtNeW0T8xNSWqhFr7vURnd8NN2e_RC9mCaVAvFqo30P4T02p_HGi82zSzDCbFfFYFIHA0oXUymo8KvGq38ft21pTvybG1L-0rU-twW0EOsBH1zd7LPFm_NIOoWwkYJ_fwDJyQ8dph_KqOAaxRo_xmG8Q2BdRGxw2O1O9WS3JwB5i3HLQbITu3KJ_Q56qFe2t-t0WuUaJ416VX6drpCnQfxpNmPPxa1J0puBymfQvF1gU3udhNfajRBS9HfJ1bqTYVg2Y' },
  { id: '5', full_name: 'Prof. Linda Chen',  bio: 'Differential Equations Expert',     avg_r: 4.9, subjects: 'Toán Kỹ Thuật, Giải Tích III', hourly_rate: 85, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0lXMe0deCxovSOqvaoVVqg9Fgz-ih3S4R1bJdTs_T7D1V0SfDoDF8s1g9Cf2AsC2jHI4cw21GkNvDxulQCuwlr9583sKZDxqnVvKGah3tZjEhvvBREJCVmcESAiOJvGR982gN_ICZW3cQ4XShXYe4RZh1X7r_SVNWlS-FBT1hQDp32_gr2jbyNQ5rGh8ifmpQYqYAF-BvcvRBrqW-15YPKUZ2-0P_0gH9GUnJphznJMnkEjxfZ3QVxBF2Ss1fTUDkPwE8-DKp-nk' },
  { id: '6', full_name: 'David Miller',      bio: 'Discrete Mathematics Specialist',   avg_r: 4.6, subjects: 'Toán Rời Rạc, Thuật Toán',    hourly_rate: 50, picture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt4KMMNAeK6f5SW12Wkwp8L4aFj9BFU6Qmb00RzMD4wFS9Awozy1-7jg4RomgonmoqerDsB0cv3v8QVLrLU1-yXRYS9gEFwIXJRYXzPdrLXN-LJGPdyjSh-G_7--t4Z8wV8-vhq_8Rk2d7UWJA1EJ6dAdv_KCEX4s-g4q1vdMiWS2LqWMv2RBnzbiUx7AcQYFKjAOtOntMm38MhpEB7og0njCRwjKBm8XiitgZwmpuoxiBWeJhEeRIdUA03FeJ1t-op9bWiJ4mDrk' },
];

function StarRating({ value }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-1 text-[#FFB800]">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: i <= rounded ? "'FILL' 1" : "'FILL' 0" }}>
          star
        </span>
      ))}
    </div>
  );
}

function fmtPrice(val) {
  if (!val) return 'Thỏa thuận';
  const n = Number(val);
  if (n >= 1000) return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  return `$${n}`;
}

function TutorCard({ tutor, isMock, onFav }) {
  const avatar = tutor.profile_photo_url || tutor.picture;
  const rating = Number(tutor.avg_r || 0).toFixed(1);
  const subjects = tutor.subjects
    ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-transparent hover:border-[#00288e]/10">
      <div className="relative h-48 overflow-hidden bg-[#edeef0]">
        {avatar ? (
          <img
            alt={tutor.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            src={avatar}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className={`w-full h-full ${avatar ? 'hidden' : 'flex'} items-center justify-center bg-[#dde1ff]`}>
          <span className="material-symbols-outlined text-[64px] text-[#00288e]/40">person</span>
        </div>
        {tutor.featured && (
          <div className="absolute top-4 left-4 bg-[#1e40af] text-white px-3 py-1 rounded-full text-xs font-medium">
            Nổi Bật
          </div>
        )}
        {!isMock && tutor.city && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            <span className="material-symbols-outlined text-[13px]">location_on</span>
            {tutor.city}
          </div>
        )}
        {onFav && !isMock && (
          <button onClick={(e) => { e.stopPropagation(); onFav(tutor); }} title="Yêu thích"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur text-[#e11d48] flex items-center justify-center shadow hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[20px]">favorite</span>
          </button>
        )}
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-semibold text-[#191c1e] leading-tight">{tutor.full_name}</h3>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="material-symbols-outlined text-[16px] text-[#FFB800]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
            <span className="text-sm font-semibold text-[#191c1e]">{rating}</span>
            {!isMock && tutor.review_count > 0 && (
              <span className="text-xs text-[#757684]">({tutor.review_count})</span>
            )}
          </div>
        </div>

        {tutor.bio && (
          <p className="text-sm text-[#5d5f5f] mb-3 line-clamp-2">{tutor.bio}</p>
        )}

        {!isMock && tutor.experience_years > 0 && (
          <p className="text-xs text-[#757684] mb-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">work</span>
            {tutor.experience_years} năm kinh nghiệm
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {subjects.map(s => (
            <span key={s} className="bg-[#00288e]/10 text-[#00288e] px-2.5 py-1 rounded-full text-xs font-medium">{s}</span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-[#00288e]">
            {fmtPrice(tutor.hourly_rate)}
            <span className="text-xs font-normal text-[#5d5f5f]">/giờ</span>
          </span>
          <button
            onClick={() => {
              sessionStorage.setItem('viewingTutor', JSON.stringify(tutor));
              window.location.hash = `/tutor-detail/${tutor.id}`;
            }}
            className="btn-shine px-5 py-2 border border-[#00288e] text-[#00288e] hover:text-white hover:border-transparent hover:bg-gradient-to-r hover:from-[#00288e] hover:to-[#3a6fe0] hover:-translate-y-0.5 rounded-lg text-sm font-semibold transition-all"
          >
            Xem Hồ Sơ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FindTutorsPage({ onGoSignIn, onGoSignUp, user }) {
  const [tutors, setTutors]           = useState([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [isMock, setIsMock]           = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [maxPrice, setMaxPrice]       = useState(200);
  const [sort, setSort]               = useState('rating');
  const [method, setMethod]           = useState('');
  const [level, setLevel]             = useState('');
  const [favMsg, setFavMsg]           = useState('');

  const addFav = (t) => {
    const token = localStorage.getItem('token');
    if (!token) { setFavMsg('Đăng nhập để lưu yêu thích.'); setTimeout(() => setFavMsg(''), 2500); return; }
    fetch(`${API_BASE}/api/wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_type: 'tutor', item_id: t.id }),
    })
      .then(() => setFavMsg(`Đã thêm ${t.full_name} vào Yêu thích ❤`))
      .catch(() => setFavMsg('Lỗi, thử lại.'))
      .finally(() => setTimeout(() => setFavMsg(''), 2500));
  };

  const fetchTutors = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pg, limit: 12, sort,
        ...(search && { search }),
        ...(selectedSubjects.length && { subjects: selectedSubjects.join(',') }),
        ...(method && { method }),
        ...(level && { level }),
      });
      const res = await fetch(`${API_BASE}/api/tutors?${params}`);
      const data = await res.json();
      if (!res.ok) {
        console.error('API /api/tutors error:', data);
        throw new Error(data.detail || data.message || 'Server error');
      }
      if (Array.isArray(data.tutors) && data.tutors.length > 0) {
        setTutors(data.tutors);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        setIsMock(false);
      } else {
        // DB không có gia sư approved → dùng mock
        setTutors(MOCK_TUTORS);
        setTotal(MOCK_TUTORS.length);
        setTotalPages(1);
        setIsMock(true);
      }
    } catch (err) {
      console.error('fetchTutors failed:', err.message);
      setTutors(MOCK_TUTORS);
      setTotal(MOCK_TUTORS.length);
      setTotalPages(1);
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, [search, selectedSubjects, sort, method, level]);

  useEffect(() => { fetchTutors(page); }, [fetchTutors, page]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleKeyDown = e => { if (e.key === 'Enter') handleSearch(); };

  const toggleSubject = (sub) => {
    setSelectedSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput(''); setSearch(''); setSelectedSubjects([]);
    setMaxPrice(200); setSort('rating'); setMethod(''); setLevel(''); setPage(1);
  };

  const displayTutors = (isMock ? MOCK_TUTORS : tutors).filter(t => {
    // 1. Max price
    const matchPrice = !maxPrice || !t.hourly_rate || Number(t.hourly_rate) <= maxPrice * 1000 || Number(t.hourly_rate) <= maxPrice;
    
    // 2. Search text
    const matchSearch = !search.trim() || 
      `${t.full_name} ${t.subjects || ''} ${t.bio || ''}`.toLowerCase().includes(search.toLowerCase().trim());
      
    // 3. Subjects
    const matchSubjects = selectedSubjects.length === 0 || 
      selectedSubjects.some(sub => (t.subjects || '').toLowerCase().includes(sub.toLowerCase()));
      
    // 4. Method
    const matchMethod = !method || 
      (t.teaching_methods && Array.isArray(t.teaching_methods) ? t.teaching_methods.some(m => m.toLowerCase() === method.toLowerCase()) : false) || 
      (t.method && t.method.toLowerCase() === method.toLowerCase());
      
    // 5. Level
    const matchLevel = !level || 
      (t.suitable_students && Array.isArray(t.suitable_students) && t.suitable_students.some(l => l.toLowerCase() === level.toLowerCase())) ||
      (t.level && typeof t.level === 'string' && t.level.toLowerCase().includes(level.toLowerCase())) || 
      (!t.suitable_students && !t.level);

    return matchPrice && matchSearch && matchSubjects && matchMethod && matchLevel;
  });

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <style>{`
        .filter-sidebar { scrollbar-width: none; }
        .filter-sidebar::-webkit-scrollbar { display: none; }
        .ftb-blob { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
        .ftb-1 { width:280px; height:280px; top:-90px; left:-40px; background:radial-gradient(circle,#4c6ef5,transparent 70%); opacity:.6; animation:ftbFloat 13s ease-in-out infinite; }
        .ftb-2 { width:320px; height:320px; bottom:-130px; right:-60px; background:radial-gradient(circle,#7c5cff,transparent 70%); opacity:.5; animation:ftbFloat 17s ease-in-out infinite reverse; }
        @keyframes ftbFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @media (prefers-reduced-motion: reduce){ .ftb-1,.ftb-2{ animation:none } }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings:"'FILL' 1"}}>school</span>
            EduX
          </a>
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/courses">Khóa Học</a>
          </nav>
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <a href="#/cart" className="text-[#00288e] flex items-center" title="Giỏ hàng">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_cart</span>
              </a>
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
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="btn-shine bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 max-w-[1280px] mx-auto px-6">
        {isMock && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 shadow-[0_10px_26px_-12px_rgba(180,120,0,0.3)]">
            <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
            <div className="text-sm leading-relaxed">
              <b>Đang hiển thị gia sư mẫu</b> — không kết nối được máy chủ (backend chưa chạy hoặc DB lỗi).
              Đây <u>không phải</u> gia sư thật. Hãy khởi động lại backend rồi tải lại trang (F5).
            </div>
          </div>
        )}
        {/* Search — banner tối + họa tiết ánh sáng động */}
        <section className="relative mb-10 overflow-hidden rounded-2xl border border-[#1e2a4a]"
          style={{ background: 'radial-gradient(60% 90% at 15% 8%, rgba(76,110,245,.35), transparent 60%), radial-gradient(50% 80% at 85% 18%, rgba(124,92,255,.30), transparent 60%), linear-gradient(135deg,#0b1840,#122163 60%,#0c1538)' }}>
          <span className="ftb-blob ftb-1" aria-hidden="true" />
          <span className="ftb-blob ftb-2" aria-hidden="true" />
          <div className="relative z-10 px-6 py-10 md:px-10 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Tìm <span style={{ background: 'linear-gradient(100deg,#f6d98c,#ffd76a 60%,#f6d98c)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>gia sư hoàn hảo</span> cho hành trình học tập
            </h2>
            <p className="text-white/70 mt-2 text-sm md:text-base">Hàng trăm gia sư chuyên nghiệp sẵn sàng đồng hành cùng bạn.</p>
            <div className="mt-6 flex flex-col md:flex-row gap-3 max-w-[760px] mx-auto">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">search</span>
                <input
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 backdrop-blur focus:outline-none focus:border-[#6ea8ff] focus:ring-2 focus:ring-[#6ea8ff]/30 transition-all"
                  placeholder="Bạn cần hỗ trợ môn học nào?"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button
                onClick={handleSearch}
                className="btn-shine bg-gradient-to-r from-[#3b6fe0] to-[#7c5cff] text-white px-8 py-3 rounded-xl font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-8px_rgba(124,92,255,.7)] transition-all whitespace-nowrap"
              >
                Tìm Kiếm Gia Sư
              </button>
            </div>
          </div>
          {/* Matching flow CTA */}
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#444653]">
            <span className="material-symbols-outlined text-[18px] text-[#00288e]">auto_awesome</span>
            <span>Muốn được gợi ý gia sư phù hợp nhất?</span>
            <button
              onClick={() => window.location.hash = '/tutor-request'}
              className="text-[#00288e] font-semibold hover:underline flex items-center gap-1"
            >
              Tạo yêu cầu tìm gia sư
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24 filter-sidebar max-h-[calc(100vh-120px)] overflow-y-auto">
              <h2 className="text-xl font-semibold text-[#191c1e] mb-6">Bộ Lọc</h2>

              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Môn Học</label>
                <div className="space-y-2">
                  {SUBJECT_OPTIONS.map(sub => (
                    <label key={sub} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(sub)}
                        onChange={() => toggleSubject(sub)}
                        className="rounded border-[#c4c5d5] text-[#00288e] focus:ring-[#00288e]"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">
                  Giá Tối Đa: <span className="text-[#00288e]">${maxPrice}</span>/giờ
                </label>
                <input
                  className="w-full h-2 bg-[#edeef0] rounded-lg appearance-none cursor-pointer accent-[#00288e]"
                  max="200" min="20" step="10" type="range"
                  value={maxPrice}
                  onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1); }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-[#757684]">$20</span>
                  <span className="text-xs text-[#757684]">$200+</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Hình Thức Học</label>
                <div className="space-y-2">
                  {[{ v: '', l: 'Tất Cả' }, { v: 'online', l: 'Online' }, { v: 'offline', l: 'Offline' }].map(opt => (
                    <label key={opt.v} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="method"
                        checked={method === opt.v}
                        onChange={() => { setMethod(opt.v); setPage(1); }}
                        className="text-[#00288e] focus:ring-[#00288e]"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors">{opt.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Cấp Độ</label>
                <select
                  value={level}
                  onChange={e => { setLevel(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-[#c4c5d5] text-sm text-[#444653] bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
                >
                  <option value="">Tất Cả Cấp Độ</option>
                  <option value="Cấp 1">Cấp 1 (Tiểu học)</option>
                  <option value="Cấp 2">Cấp 2 (THCS)</option>
                  <option value="Cấp 3">Cấp 3 (THPT)</option>
                  <option value="Đại học">Đại học</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="text-sm font-semibold text-[#5d5f5f] block mb-3">Sắp Xếp</label>
                <div className="space-y-2">
                  {SORT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="sort"
                        checked={sort === opt.value}
                        onChange={() => { setSort(opt.value); setPage(1); }}
                        className="text-[#00288e] focus:ring-[#00288e]"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleReset} className="w-full py-2 text-[#00288e] text-sm font-semibold hover:underline decoration-2 underline-offset-4">
                Đặt Lại Bộ Lọc
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-6">
              <p className="text-base text-[#444653]">
                Hiển thị <span className="font-bold text-[#191c1e]">{total}</span> gia sư
                {isMock && <span className="ml-2 text-xs text-[#757684]">(dữ liệu mẫu)</span>}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                    <div className="h-48 bg-[#edeef0]" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-[#edeef0] rounded w-3/4" />
                      <div className="h-3 bg-[#edeef0] rounded w-1/2" />
                      <div className="h-3 bg-[#edeef0] rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayTutors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-[64px] text-[#c4c5d5] mb-4">search_off</span>
                <h3 className="text-xl font-semibold text-[#191c1e] mb-2">Không tìm thấy gia sư</h3>
                <p className="text-[#757684] mb-6">Thử thay đổi từ khóa hoặc bộ lọc</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-[#00288e] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all">
                  Xóa Bộ Lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayTutors.map(tutor => (
                  <TutorCard key={tutor.id} tutor={tutor} isMock={isMock} onFav={addFav} />
                ))}
              </div>
            )}
            {favMsg && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-[#1e40af] text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>{favMsg}
              </div>
            )}

            {/* Pagination */}
            {!isMock && totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#757684] hover:border-[#00288e] hover:text-[#00288e] transition-all disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = totalPages <= 5 ? i + 1
                    : page <= 3 ? i + 1
                    : page >= totalPages - 2 ? totalPages - 4 + i
                    : page - 2 + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${pg === page ? 'bg-[#00288e] text-white' : 'border border-[#c4c5d5] text-[#444653] hover:border-[#00288e] hover:text-[#00288e]'}`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#c4c5d5] text-[#757684] hover:border-[#00288e] hover:text-[#00288e] transition-all disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-[#edeef0] w-full mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. Đã đăng ký bản quyền.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Chính Sách Bảo Mật</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Điều Khoản Dịch Vụ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Trung Tâm Hỗ Trợ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Liên Hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
