import React, { useState, useEffect, useMemo } from 'react';
import CartButton from './components/CartButton';
import { API_BASE_URL } from './config';

// Trang Môn Học — toàn bộ số liệu lấy thật từ /api/subjects/overview
// (số gia sư, số khóa, học phí, điểm đánh giá). Bổ sung: bộ lọc nâng cao (sidebar),
// tag môn xu hướng, danh mục xổ ra môn con, và lộ trình học tiêu biểu.

const CAT_STYLE = {
  natural:  { bg: 'bg-[#00288e]', soft: 'bg-[#00288e]/10', text: 'text-[#00288e]' },
  social:   { bg: 'bg-[#b45309]', soft: 'bg-[#b45309]/10', text: 'text-[#b45309]' },
  language: { bg: 'bg-[#0d9488]', soft: 'bg-[#0d9488]/10', text: 'text-[#0d9488]' },
  cert:     { bg: 'bg-[#7c3aed]', soft: 'bg-[#7c3aed]/10', text: 'text-[#7c3aed]' },
  tech:     { bg: 'bg-[#be123c]', soft: 'bg-[#be123c]/10', text: 'text-[#be123c]' },
};
const styleOf = k => CAT_STYLE[k] || CAT_STYLE.natural;
const fmtVnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const goTutors = q => { window.location.hash = `/find-tutors?${q}`; };

// Lộ trình học ghép sẵn — tham chiếu tên môn có thật trong dữ liệu; số gia sư
// được cộng từ số thật của từng môn khi render (môn nào không có sẽ tự bỏ qua).
const LEARNING_PATHS = [
  { key: 'a',    title: 'Khối A — Kỹ thuật',      desc: 'Luyện thi đại học khối tự nhiên',        icon: 'functions',      grad: 'from-[#00288e] to-[#3a6fe0]', subjects: ['Toán học', 'Vật lý', 'Hóa học'] },
  { key: 'en',   title: 'Tiếng Anh & Du học',      desc: 'Từ giao tiếp đến IELTS / TOEIC',          icon: 'flight_takeoff', grad: 'from-[#0d9488] to-[#2dd4bf]', subjects: ['Tiếng Anh', 'IELTS', 'TOEIC'] },
  { key: 'c',    title: 'Khối C — Xã hội',         desc: 'Ngữ văn · Lịch sử · Địa lý',              icon: 'history_edu',    grad: 'from-[#b45309] to-[#f59e0b]', subjects: ['Ngữ văn', 'Lịch sử', 'Địa lý'] },
  { key: 'asia', title: 'Ngoại ngữ châu Á',        desc: 'Hàn · Nhật · Trung từ con số 0',          icon: 'translate',      grad: 'from-[#be123c] to-[#fb7185]', subjects: ['Tiếng Hàn', 'Tiếng Nhật', 'Tiếng Trung'] },
  { key: 'it',   title: 'Lập trình & CNTT',        desc: 'Nền tảng lập trình + tư duy Toán',        icon: 'code',           grad: 'from-[#7c3aed] to-[#a78bfa]', subjects: ['Lập trình', 'Toán học'] },
  { key: 'b',    title: 'Khối B — Y & Sinh',       desc: 'Toán · Hóa · Sinh cho ngành Y Dược',      icon: 'biotech',        grad: 'from-[#0369a1] to-[#38bdf8]', subjects: ['Toán học', 'Hóa học', 'Sinh học'] },
];

const METHOD_OPTS = [
  { v: 'online',  l: 'Học Online',                 icon: 'videocam' },
  { v: 'offline', l: 'Offline tại nhà / trung tâm', icon: 'location_on' },
];

const SORT_OPTS = [
  { v: 'popular',   l: 'Phổ biến nhất' },
  { v: 'price_asc', l: 'Học phí thấp → cao' },
  { v: 'rating',    l: 'Đánh giá cao nhất' },
];

export default function SubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [openSubject, setOpenSubject] = useState(null);
  const [highlights, setHighlights] = useState(null);
  const [hlLoading, setHlLoading] = useState(false);
  // Bộ lọc nâng cao
  const [budget, setBudget] = useState(null);   // null = không giới hạn học phí
  const [sortBy, setSortBy] = useState('popular');
  const [expandedCat, setExpandedCat] = useState(null);   // danh mục đang xổ môn con
  const [showFilters, setShowFilters] = useState(false);  // toggle sidebar trên mobile

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/subjects/overview`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Mở 1 môn → tải gia sư + khóa học nổi bật của môn đó
  useEffect(() => {
    if (!openSubject) { setHighlights(null); return; }
    setHlLoading(true);
    fetch(`${API_BASE_URL}/api/subjects/${encodeURIComponent(openSubject)}/highlights`)
      .then(r => r.json())
      .then(d => { setHighlights(d); setHlLoading(false); })
      .catch(() => setHlLoading(false));
  }, [openSubject]);

  const totals = data?.totals;
  const categories = data?.categories || [];
  const allSubjects = data?.subjects || [];
  const levels = data?.levels || [];

  // Tra cứu nhanh môn theo tên (dùng cho lộ trình học + danh mục xổ)
  const byName = useMemo(() => {
    const m = {};
    allSubjects.forEach(s => { m[s.name] = s; });
    return m;
  }, [allSubjects]);

  // Môn xu hướng: top theo lượt học viên (mức độ quan tâm thật)
  const trending = useMemo(
    () => [...allSubjects].sort((a, b) => (b.learners || 0) - (a.learners || 0)).slice(0, 6),
    [allSubjects]
  );

  // Khoảng học phí TB thật để thanh trượt ngân sách bám đúng dữ liệu (không bao giờ ra rỗng)
  const [priceMin, priceMax] = useMemo(() => {
    const ps = allSubjects.map(s => s.avgPrice || 0).filter(Boolean);
    if (!ps.length) return [200000, 500000];
    // Làm tròn LÊN mức thấp nhất để ở đầu thanh trượt môn rẻ nhất vẫn lọt (không ra rỗng)
    const mn = Math.ceil(Math.min(...ps) / 25000) * 25000;
    const mx = Math.ceil(Math.max(...ps) / 25000) * 25000;
    return [mn, mx <= mn ? mn + 25000 : mx];
  }, [allSubjects]);

  const q = searchTerm.trim().toLowerCase();
  const subjects = useMemo(() => {
    let list = allSubjects
      .filter(s => activeCat === 'all' || s.category === activeCat)
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .filter(s => budget == null || !s.avgPrice || s.avgPrice <= budget);
    list = [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return (a.avgPrice || 0) - (b.avgPrice || 0);
      if (sortBy === 'rating')    return (b.avgRating || 0) - (a.avgRating || 0) || (b.tutorCount - a.tutorCount);
      return b.tutorCount - a.tutorCount; // popular
    });
    return list;
  }, [allSubjects, activeCat, q, budget, sortBy]);

  const activeFilterCount =
    (activeCat !== 'all' ? 1 : 0) + (budget != null ? 1 : 0) + (sortBy !== 'popular' ? 1 : 0);

  const resetFilters = () => { setActiveCat('all'); setSearchTerm(''); setBudget(null); setSortBy('popular'); };

  // Mở 1 môn con từ danh mục / lộ trình: reset lọc để chắc chắn thấy rồi cuộn xuống + mở
  const openInList = (name, catKey) => {
    setActiveCat(catKey || 'all');
    setSearchTerm(''); setBudget(null); setSortBy('popular');
    setOpenSubject(name);
    setTimeout(() => document.getElementById('subject-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const submitSearch = e => {
    e.preventDefault();
    const hit = allSubjects.find(s => s.name.toLowerCase() === q);
    if (hit) openInList(hit.name, 'all');
    else if (q) goTutors(`search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans flex flex-col">
      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .card-hover:hover { transform: translateY(-4px); transition: all 0.2s ease-in-out; }
        .filter-side { scrollbar-width: none; }
        .filter-side::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md border-b border-[#c4c5d5]/40 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[80px] relative">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/courses">Khóa Học</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-base font-medium text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/subjects">Môn Học</a>
          </div>
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && <CartButton />}
            {user ? (
              <button
                onClick={() => {
                  if (user.role === 'admin') window.location.hash = '/admin';
                  else if (user.role === 'tutor') window.location.hash = '/tutor';
                  else window.location.hash = '/dashboard';
                }}
                className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">
                Bảng Điều Khiển
              </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">Tham Gia Miễn Phí</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero + ô tìm kiếm thật */}
      <header className="pt-24 pb-10 px-6 max-w-[1280px] mx-auto w-full mt-16">
        <div className="relative overflow-hidden rounded-xl bg-[#00288e] px-6 py-14 md:px-16 md:py-16 mb-8 flex flex-col items-center text-center shadow-lg">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-[#3a6fe0]/30 rounded-full blur-3xl" />
          <div className="relative z-10 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 md:max-w-3xl mx-auto tracking-tight leading-tight">
              Tìm Môn Học Phù Hợp Cho Hành Trình Học Tập Của Bạn
            </h1>
            <p className="text-lg text-[#b8c4ff] max-w-2xl mx-auto mb-8">
              {totals
                ? `${totals.subjects} môn học · ${totals.tutors} gia sư đã được xác minh · ${totals.courses} khóa học đang mở`
                : 'Khám phá các môn học do gia sư đã xác minh giảng dạy, từ nền tảng THCS đến luyện thi và chứng chỉ quốc tế.'}
            </p>
            <form onSubmit={submitSearch} className="flex flex-col sm:flex-row justify-center gap-3">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5d5f5f]">search</span>
                <input
                  className="w-full pl-12 pr-6 py-3 rounded-lg border-none focus:ring-2 focus:ring-[#001453] bg-[#f8f9fb] text-[#191c1e] text-base"
                  placeholder="Tìm môn học (vd: Toán học, IELTS, Tiếng Hàn)"
                  type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button type="submit" className="bg-white text-[#00288e] px-7 py-3 rounded-lg text-sm font-bold hover:bg-[#eef1f8] transition-colors shadow-sm whitespace-nowrap">
                Tìm kiếm
              </button>
            </form>

            {/* Môn học xu hướng — tag 🔥 ngay dưới ô tìm kiếm */}
            {trending.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-semibold text-[#b8c4ff]">Xu hướng:</span>
                {trending.map(s => (
                  <button key={s.name} onClick={() => openInList(s.name, 'all')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium hover:bg-white/20 hover:border-white/40 transition-all">
                    <span aria-hidden>🔥</span>{s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thanh số liệu thật */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['groups', totals.tutors, 'Gia sư đã xác minh', '#00288e'],
              ['menu_book', totals.courses, 'Khóa học đang mở', '#b45309'],
              ['school', totals.students.toLocaleString('vi-VN'), 'Học viên & phụ huynh', '#0d9488'],
              ['star', totals.avgRating || '—', 'Điểm đánh giá trung bình', '#d97706'],
            ].map(([icon, value, label, color]) => (
              <div key={label} className="bg-white rounded-xl border border-[#e1e2e4] p-5 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
                  <span className="material-symbols-outlined" style={{ color, fontSize: 22 }}>{icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-[#191c1e] leading-tight">{value}</p>
                  <p className="text-xs text-[#444653] truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="flex-grow max-w-[1280px] mx-auto px-6 w-full mb-16">
        {loading ? (
          <div className="py-24 text-center text-[#444653]">
            <span className="inline-block w-8 h-8 border-[3px] border-[#00288e] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm">Đang tải dữ liệu môn học…</p>
          </div>
        ) : !data ? (
          <div className="py-24 text-center text-[#444653]">Không tải được dữ liệu. Vui lòng thử lại.</div>
        ) : (
          <>
            {/* Nút mở bộ lọc trên mobile */}
            <button onClick={() => setShowFilters(v => !v)}
              className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-[#c4c5d5] rounded-lg text-sm font-semibold text-[#191c1e]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Bộ lọc nâng cao
              {activeFilterCount > 0 && <span className="bg-[#00288e] text-white text-xs font-bold px-1.5 rounded-full">{activeFilterCount}</span>}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* ───────── SIDEBAR: BỘ LỌC NÂNG CAO ───────── */}
              <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
                <div className="bg-white rounded-xl border border-[#e1e2e4] shadow-sm p-6 lg:sticky lg:top-24 filter-side lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-[#191c1e] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#00288e]">tune</span>Bộ Lọc
                    </h2>
                    {activeFilterCount > 0 && (
                      <button onClick={resetFilters} className="text-xs font-semibold text-[#00288e] hover:underline">Đặt lại</button>
                    )}
                  </div>

                  {/* Danh mục */}
                  <div className="mb-7">
                    <label className="text-sm font-bold text-[#191c1e] block mb-3">Danh mục</label>
                    <div className="space-y-1.5">
                      <button onClick={() => setActiveCat('all')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCat === 'all' ? 'bg-[#00288e] text-white' : 'text-[#444653] hover:bg-[#f0f3fa]'}`}>
                        Tất cả môn <span className="opacity-70">({allSubjects.length})</span>
                      </button>
                      {categories.map(c => (
                        <button key={c.key} onClick={() => setActiveCat(activeCat === c.key ? 'all' : c.key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeCat === c.key ? 'bg-[#00288e] text-white' : 'text-[#444653] hover:bg-[#f0f3fa]'}`}>
                          <span className="truncate">{c.label}</span>
                          <span className="opacity-70 text-xs shrink-0 ml-1">{c.subjectCount}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ngân sách */}
                  <div className="mb-7">
                    <label className="text-sm font-bold text-[#191c1e] block mb-1">Học phí trung bình tối đa</label>
                    <p className="text-[#00288e] font-bold text-sm mb-3">
                      {budget == null ? 'Không giới hạn' : `≤ ${fmtVnd(budget)}/buổi`}
                    </p>
                    <input type="range" min={priceMin} max={priceMax} step={25000}
                      value={budget == null ? priceMax : budget}
                      onChange={e => { const v = Number(e.target.value); setBudget(v >= priceMax ? null : v); }}
                      className="w-full h-2 bg-[#edeef0] rounded-lg appearance-none cursor-pointer accent-[#00288e]" />
                    <div className="flex justify-between mt-2 text-xs text-[#757684]">
                      <span>{Math.round(priceMin / 1000)}k</span><span>{Math.round(priceMax / 1000)}k+</span>
                    </div>
                  </div>

                  {/* Sắp xếp */}
                  <div className="mb-7">
                    <label className="text-sm font-bold text-[#191c1e] block mb-3">Sắp xếp</label>
                    <div className="space-y-2">
                      {SORT_OPTS.map(o => (
                        <label key={o.v} className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="subjectSort" checked={sortBy === o.v}
                            onChange={() => setSortBy(o.v)} className="text-[#00288e] focus:ring-[#00288e]" />
                          <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors">{o.l}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#eef0f4] pt-5">
                    {/* Cấp độ — lối tắt sang Tìm Gia Sư theo cấp học */}
                    <label className="text-sm font-bold text-[#191c1e] block mb-3">Theo cấp độ</label>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {levels.map(l => (
                        <button key={l.label} onClick={() => goTutors(`level=${encodeURIComponent(l.filter)}`)}
                          title={`${l.tutorCount} gia sư`}
                          className="px-3 py-1.5 rounded-full bg-[#f0f3fa] border border-[#e0e3ea] text-xs font-medium text-[#444653] hover:bg-[#00288e] hover:text-white hover:border-transparent transition-all">
                          {l.label}
                        </button>
                      ))}
                    </div>

                    {/* Hình thức học — lối tắt sang Tìm Gia Sư */}
                    <label className="text-sm font-bold text-[#191c1e] block mb-3">Hình thức học</label>
                    <div className="space-y-2">
                      {METHOD_OPTS.map(m => (
                        <button key={m.v} onClick={() => goTutors(`method=${m.v}`)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#e0e3ea] text-sm font-medium text-[#444653] hover:border-[#00288e] hover:text-[#00288e] transition-all text-left">
                          <span className="material-symbols-outlined text-[18px]">{m.icon}</span>{m.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* ───────── NỘI DUNG PHẢI ───────── */}
              <div className="flex-grow min-w-0">
                {/* Duyệt theo danh mục — xổ ra môn con */}
                <h2 className="text-2xl font-bold text-[#191c1e] mb-1">Duyệt Theo Danh Mục</h2>
                <p className="text-sm text-[#444653] mb-5">Bấm để lọc, hoặc mở rộng để xem các môn con bên trong.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                  {categories.map(c => {
                    const st = styleOf(c.key);
                    const active = activeCat === c.key;
                    const open = expandedCat === c.key;
                    const subs = (c.subjects || []).map(n => byName[n]).filter(Boolean)
                      .sort((a, b) => b.tutorCount - a.tutorCount);
                    return (
                      <div key={c.key}
                        className={`bg-white rounded-xl shadow-sm border transition-all ${active ? 'border-[#00288e] ring-2 ring-[#00288e]/20' : 'border-[#e1e2e4]'}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <button onClick={() => setActiveCat(active ? 'all' : c.key)} className="flex items-start gap-3 flex-1 text-left group">
                              <div className={`w-12 h-12 rounded-lg ${st.soft} flex items-center justify-center shrink-0`}>
                                <span className={`material-symbols-outlined ${st.text}`}>{c.icon}</span>
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-lg font-bold text-[#191c1e] leading-snug group-hover:text-[#00288e] transition-colors">{c.label}</h3>
                                <p className="text-xs text-[#444653] line-clamp-1">{c.desc}</p>
                                <p className={`text-xs font-bold ${st.text} mt-1`}>{c.tutorCount} gia sư · {c.subjectCount} môn</p>
                              </div>
                            </button>
                            <button onClick={() => setExpandedCat(open ? null : c.key)}
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#5d5f5f] hover:bg-[#f0f3fa] transition-colors"
                              title={open ? 'Thu gọn' : 'Xem môn con'}>
                              <span className={`material-symbols-outlined text-[22px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                          </div>

                          {/* Môn con */}
                          {open && (
                            <div className="mt-4 pt-4 border-t border-[#eef0f4] grid grid-cols-1 gap-1.5">
                              {subs.map(s => (
                                <button key={s.name} onClick={() => openInList(s.name, c.key)}
                                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f8f9fb] hover:bg-[#eef2ff] border border-transparent hover:border-[#00288e]/30 transition-all text-left group">
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span className={`material-symbols-outlined text-[18px] ${st.text}`}>{s.icon}</span>
                                    <span className="text-sm font-medium text-[#191c1e] truncate">{s.name}</span>
                                  </span>
                                  <span className="text-xs text-[#5d5f5f] shrink-0 flex items-center gap-1">
                                    {s.tutorCount} gia sư
                                    <span className="material-symbols-outlined text-[15px] text-[#00288e] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bảng môn học chi tiết (lọc theo sidebar) */}
                <section id="subject-list" className="bg-white rounded-xl p-6 md:p-8 border border-[#e1e2e4] shadow-sm mb-12 scroll-mt-24">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-[#191c1e]">
                        {activeCat === 'all' ? 'Tất cả môn học' : categories.find(c => c.key === activeCat)?.label}
                      </h2>
                      <p className="text-sm text-[#444653] mt-0.5">Số liệu cập nhật theo dữ liệu thực tế trên nền tảng</p>
                    </div>
                    <span className="text-sm font-semibold text-[#00288e] bg-[#d4e3ff] px-3 py-1 rounded-full">{subjects.length} môn</span>
                  </div>

                  {subjects.length === 0 ? (
                    <div className="py-12 text-center">
                      <span className="material-symbols-outlined text-[42px] text-[#c4c5d5]">search_off</span>
                      <p className="mt-2 text-sm text-[#444653]">Không có môn nào khớp bộ lọc hiện tại.</p>
                      <button onClick={resetFilters} className="mt-4 px-5 py-2 bg-[#00288e] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-colors">Đặt lại bộ lọc</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subjects.map(s => {
                        const st = styleOf(s.category);
                        const open = openSubject === s.name;
                        return (
                          <div key={s.name}
                            className={`rounded-lg border transition-all ${open ? 'border-[#00288e] bg-[#f6f8ff] shadow-sm' : 'border-transparent bg-[#f8f9fb] hover:bg-[#eef0f4] hover:border-[#c4c5d5]'}`}>
                            <button onClick={() => setOpenSubject(open ? null : s.name)} className="w-full text-left p-4 flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${st.soft} flex items-center justify-center shrink-0`}>
                                <span className={`material-symbols-outlined ${st.text} text-[20px]`}>{s.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#191c1e]">{s.name}</p>
                                <p className="text-xs text-[#444653]">
                                  {s.tutorCount} gia sư
                                  {s.courseCount > 0 && ` · ${s.courseCount} khóa học`}
                                  {s.minPrice > 0 && ` · từ ${fmtVnd(s.minPrice)}`}
                                </p>
                              </div>
                              {s.avgRating > 0 && (
                                <span className="flex items-center gap-0.5 text-xs font-bold text-[#d97706] shrink-0">
                                  <span className="material-symbols-outlined text-[15px]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                                  {s.avgRating}
                                </span>
                              )}
                              <span className={`material-symbols-outlined text-[#5d5f5f] text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {open && (
                              <div className="px-4 pb-4 border-t border-[#dfe3ef] pt-3">
                                {hlLoading ? (
                                  <p className="text-xs text-[#444653] py-3 text-center">Đang tải gia sư nổi bật…</p>
                                ) : (
                                  <>
                                    {highlights?.tutors?.length > 0 && (
                                      <>
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#5d5f5f] mb-2">Gia sư tiêu biểu</p>
                                        <div className="space-y-1.5 mb-3">
                                          {highlights.tutors.map(t => (
                                            <button key={t.id} onClick={() => { window.location.hash = `/tutor-detail/${t.id}`; }}
                                              className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white border border-[#e1e2e4] hover:border-[#00288e]/40 transition-colors text-left">
                                              {t.photo
                                                ? <img src={t.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                : <div className="w-8 h-8 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center text-xs font-bold shrink-0">{(t.full_name || '?')[0]}</div>}
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[#191c1e] truncate">{t.full_name}</p>
                                                <p className="text-[11px] text-[#5d5f5f] truncate">{t.headline || t.subjects}</p>
                                              </div>
                                              {Number(t.avg_rating) > 0 && (
                                                <span className="text-[11px] font-bold text-[#d97706] shrink-0">★ {Number(t.avg_rating).toFixed(1)}</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {highlights?.courses?.length > 0 && (
                                      <>
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#5d5f5f] mb-2">Khóa học nổi bật</p>
                                        <div className="space-y-1.5 mb-3">
                                          {highlights.courses.map(c => (
                                            <button key={c.id} onClick={() => { window.location.hash = `/course/${c.id}`; }}
                                              className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white border border-[#e1e2e4] hover:border-[#00288e]/40 transition-colors text-left">
                                              {c.thumbnail_url
                                                ? <img src={c.thumbnail_url} alt="" className="w-11 h-8 rounded object-cover shrink-0" />
                                                : <div className="w-11 h-8 rounded bg-[#edeef0] flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[#5d5f5f] text-[16px]">menu_book</span></div>}
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[#191c1e] truncate">{c.title}</p>
                                                <p className="text-[11px] text-[#5d5f5f] truncate">{c.tutor_name || 'EduX'}{c.level ? ` · ${c.level}` : ''}</p>
                                              </div>
                                              <span className="text-[11px] font-bold text-[#00288e] shrink-0">{fmtVnd(c.price)}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    <div className="flex gap-2">
                                      <button onClick={() => goTutors(`subjects=${encodeURIComponent(s.name)}`)}
                                        className="flex-1 bg-[#00288e] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#1e40af] transition-colors">
                                        Xem tất cả {s.tutorCount} gia sư
                                      </button>
                                      {s.courseCount > 0 && (
                                        <button onClick={() => { window.location.hash = `/courses?q=${encodeURIComponent(s.name)}`; }}
                                          className="flex-1 border border-[#00288e] text-[#00288e] text-xs font-bold py-2 rounded-lg hover:bg-[#00288e]/5 transition-colors">
                                          {s.courseCount} khóa học
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Lộ trình học tiêu biểu */}
                <section className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#00288e]">route</span>
                    <h2 className="text-2xl font-bold text-[#191c1e]">Lộ Trình Học Tiêu Biểu</h2>
                  </div>
                  <p className="text-sm text-[#444653] mb-5">Combo môn ghép sẵn theo mục tiêu — biết ngay nên học gì, không lạc hướng.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LEARNING_PATHS.map(p => {
                      const subs = p.subjects.map(n => byName[n]).filter(Boolean);
                      if (subs.length === 0) return null;
                      const tutorSum = subs.reduce((a, s) => a + (s.tutorCount || 0), 0);
                      return (
                        <div key={p.key} className="bg-white rounded-xl border border-[#e1e2e4] shadow-sm overflow-hidden card-hover flex flex-col">
                          <div className={`bg-gradient-to-r ${p.grad} p-5 flex items-center gap-3`}>
                            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-white text-[24px]" style={{fontVariationSettings:"'FILL' 1"}}>{p.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-white leading-tight">{p.title}</h3>
                              <p className="text-xs text-white/80">{p.desc}</p>
                            </div>
                          </div>
                          <div className="p-5 flex flex-col flex-grow">
                            <div className="flex flex-wrap gap-2 mb-4">
                              {subs.map((s, i) => (
                                <React.Fragment key={s.name}>
                                  {i > 0 && <span className="material-symbols-outlined text-[#c4c5d5] text-[16px] self-center">arrow_forward</span>}
                                  <button onClick={() => openInList(s.name, s.category)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f0f3fa] border border-[#e0e3ea] text-xs font-semibold text-[#00288e] hover:bg-[#00288e] hover:text-white hover:border-transparent transition-all">
                                    {s.name} <span className="opacity-70">· {s.tutorCount}</span>
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#eef0f4]">
                              <span className="text-xs text-[#5d5f5f]"><b className="text-[#191c1e]">{tutorSum}</b> lượt gia sư dạy</span>
                              <button onClick={() => goTutors(`subjects=${encodeURIComponent(subs.map(s => s.name).join(','))}`)}
                                className="inline-flex items-center gap-1 text-sm font-bold text-[#00288e] hover:gap-2 transition-all">
                                Xem gia sư <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            {/* CTA cuối */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-14">
              <div className="lg:col-span-2 bg-[#1e40af] text-white p-8 rounded-xl relative overflow-hidden shadow-md">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-4xl mb-3 text-[#ffd166]">auto_awesome</span>
                  <h3 className="text-2xl font-bold mb-2">Chưa biết chọn môn nào?</h3>
                  <p className="text-sm text-[#dde1ff] mb-6 max-w-lg">
                    Mô tả mục tiêu học tập của bạn — hệ thống AI sẽ gợi ý gia sư phù hợp nhất về môn, hình thức học và ngân sách.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => { window.location.hash = '/tutor-request'; }}
                      className="bg-white text-[#00288e] px-6 py-3 rounded-lg text-sm font-bold hover:bg-[#f0f1f3] transition-colors shadow-sm">
                      Nhận gợi ý từ AI
                    </button>
                    <button onClick={() => goTutors('sort=rating')}
                      className="border border-white/50 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors">
                      Xem gia sư đánh giá cao
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-xl border border-[#e1e2e4] shadow-sm flex flex-col items-center text-center justify-center">
                <div className="w-12 h-12 bg-[#edeef0] rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#444653]">volunteer_activism</span>
                </div>
                <h3 className="text-lg font-bold text-[#191c1e] mb-2">Bạn muốn dạy môn của mình?</h3>
                <p className="text-sm text-[#444653] mb-6">Đăng ký làm gia sư trên EduX — tự đặt học phí và lịch dạy của riêng bạn.</p>
                <button onClick={() => { window.location.hash = '/become-tutor'; }}
                  className="text-[#00288e] border border-[#00288e] w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-[#f3f4f6] transition-colors">
                  Trở thành gia sư
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. Đã đăng ký bản quyền.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Chính Sách Bảo Mật</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Điều Khoản Dịch Vụ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Trung Tâm Hỗ Trợ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Liên Hệ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Tuyển Dụng</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
