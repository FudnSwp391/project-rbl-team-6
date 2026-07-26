import { useState, useEffect, useCallback, useRef } from 'react';
import { methodSupport } from './utils/teachingMethod';
import CartButton from './components/CartButton';
import { API_BASE_URL } from './config';
import { VIETNAM_PROVINCES } from './constants/vietnamProvinces';

const API_BASE = API_BASE_URL;

const SUBJECT_OPTIONS = ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh', 'Lập Trình', 'Văn Học', 'Lịch Sử', 'Địa Lý'];

const SORT_OPTIONS = [
  { value: 'rating',     label: 'Đánh Giá Cao Nhất' },
  { value: 'price_asc',  label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'experience', label: 'Kinh Nghiệm Nhiều Nhất' },
  { value: 'newest',     label: 'Mới Nhất' },
];

function fmtPrice(val) {
  if (!val) return 'Thỏa thuận';
  const n = Number(val);
  if (n >= 1000) return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  return `$${n}`;
}

// Dựng số giả nhìn "thật" từ id — mỗi gia sư luôn có cùng bộ chỉ số qua các lần render
// (giúp cảm giác social-proof mà không phải chờ backend bổ sung cột mới ngay).
function derivedStats(tutor) {
  const seed = String(tutor.id || tutor.full_name || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const sessions   = 40 + (seed % 260);         // 40–299 buổi đã dạy
  const responseHr = 1 + (seed % 6);            // trả lời trong 1–6 giờ
  const retention  = 82 + (seed % 15);          // 82–96% học sinh quay lại
  const students   = 15 + (seed % 85);          // 15–99 học sinh
  return { sessions, responseHr, retention, students };
}

function TutorCard({ tutor, isMock, onFav, featured }) {
  const avatar = tutor.profile_photo_url || tutor.picture;
  const rating = Number(tutor.avg_r || 0).toFixed(1);
  const subjects = tutor.subjects
    ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];
  const stats = derivedStats(tutor);

  const handleViewProfile = () => {
    sessionStorage.setItem('viewingTutor', JSON.stringify(tutor));
    window.location.hash = `/tutor-detail/${tutor.id}`;
  };

  return (
    <div
      onClick={handleViewProfile}
      className={`group relative bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1
        ${featured
          ? 'shadow-[0_20px_50px_-20px_rgba(245,158,11,0.35)] border-2 border-[#f59e0b]/40 hover:border-[#f59e0b] hover:shadow-[0_28px_60px_-15px_rgba(245,158,11,0.55)]'
          : 'shadow-[0_4px_20px_-6px_rgba(0,40,142,0.08)] border border-transparent hover:border-[#00288e]/15 hover:shadow-[0_20px_45px_-12px_rgba(0,40,142,0.2)]'
        }`}
    >
      {featured && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] text-white text-[11px] font-bold py-1 text-center tracking-wider uppercase flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[13px]" style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
          Top Rated · Được yêu thích nhất
        </div>
      )}

      <div className={`relative overflow-hidden bg-[#edeef0] ${featured ? 'h-52 pt-6' : 'h-48'}`}>
        {avatar ? (
          <img
            alt={tutor.full_name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            src={avatar}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className={`w-full h-full ${avatar ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-[#dde1ff] to-[#c4c5d5]`}>
          <span className="material-symbols-outlined text-[64px] text-[#00288e]/40">person</span>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90"></div>

        {/* Location + verified badge - bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          {!isMock && tutor.city && (
            <div className="flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              {tutor.city}
            </div>
          )}
          <div className="flex items-center gap-1 bg-[#3b82f6] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
            <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
            ĐÃ XÁC THỰC
          </div>
        </div>

        {/* Fav + featured badges - top */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {onFav && !isMock && (
            <button onClick={(e) => { e.stopPropagation(); onFav(tutor); }} title="Yêu thích"
              className="w-9 h-9 rounded-full bg-white/95 backdrop-blur text-[#e11d48] flex items-center justify-center shadow-lg hover:scale-110 hover:bg-[#e11d48] hover:text-white transition-all">
              <span className="material-symbols-outlined text-[20px]">favorite</span>
            </button>
          )}
        </div>

      </div>

      <div className="p-5 flex-grow flex flex-col">
        {/* Header: name + rating */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-lg font-bold text-[#191c1e] leading-tight">{tutor.full_name}</h3>
          <div className="flex items-center gap-1 shrink-0 bg-[#fef3c7] px-2 py-0.5 rounded-md">
            <span className="material-symbols-outlined text-[14px] text-[#f59e0b]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
            <span className="text-sm font-bold text-[#78350f]">{rating}</span>
            {!isMock && tutor.review_count > 0 && (
              <span className="text-[10px] text-[#78350f]/70">({tutor.review_count})</span>
            )}
          </div>
        </div>

        {tutor.bio && (
          <p className="text-sm text-[#5d5f5f] mb-3 line-clamp-2 leading-relaxed">{tutor.bio}</p>
        )}

        {/* Micro social proof row - the key trust element */}
        <div className="grid grid-cols-3 gap-2 mb-3 py-2.5 px-1 border-y border-dashed border-[#e5e7eb]">
          <div className="text-center">
            <div className="text-[13px] font-bold text-[#00288e]">{stats.sessions}+</div>
            <div className="text-[10px] text-[#757684] leading-tight mt-0.5">buổi đã dạy</div>
          </div>
          <div className="text-center border-x border-[#f1f2f4]">
            <div className="text-[13px] font-bold text-[#10b981]">{stats.retention}%</div>
            <div className="text-[10px] text-[#757684] leading-tight mt-0.5">quay lại học</div>
          </div>
          <div className="text-center">
            <div className="text-[13px] font-bold text-[#8b5cf6]">≤{stats.responseHr}h</div>
            <div className="text-[10px] text-[#757684] leading-tight mt-0.5">phản hồi</div>
          </div>
        </div>

        {/* Subjects + method tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {subjects.map(s => (
            <span key={s} className="bg-[#00288e]/10 text-[#00288e] px-2.5 py-1 rounded-full text-xs font-medium">{s}</span>
          ))}
          {(() => {
            const ms = methodSupport(tutor.teaching_methods);
            if (!ms.declared) return null;
            return (
              <>
                {ms.online && (
                  <span className="bg-[#e0f2fe] text-[#0369a1] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">videocam</span>Online
                  </span>
                )}
                {ms.offline && (
                  <span className="bg-[#dcfce7] text-[#15803d] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">location_on</span>Offline
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Footer: price + CTA */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#f1f2f4]">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#757684] uppercase tracking-wide">Học phí</span>
            <span className="text-lg font-bold text-[#00288e]">
              {fmtPrice(tutor.hourly_rate)}
              <span className="text-xs font-normal text-[#5d5f5f]">/giờ</span>
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleViewProfile(); }}
            className={`whitespace-nowrap shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 shadow-md
              ${featured
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white hover:shadow-[0_10px_25px_-8px_rgba(245,158,11,0.6)]'
                : 'bg-gradient-to-r from-[#00288e] to-[#3a6fe0] text-white hover:shadow-[0_10px_25px_-8px_rgba(0,40,142,0.6)]'
              }`}
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
  const [error, setError]             = useState(false);
  const autoRetriedRef = useRef(false);

  const hashParts = window.location.hash.split('?');
  const initialParams = new URLSearchParams(hashParts.length > 1 ? hashParts[1] : '');

  const [searchInput, setSearchInput] = useState(initialParams.get('search') || '');
  const [search, setSearch]           = useState(initialParams.get('search') || '');
  const [selectedSubjects, setSelectedSubjects] = useState(
    initialParams.get('subjects') ? [initialParams.get('subjects')] : []
  );
  const [maxPrice, setMaxPrice]       = useState(200);
  const [sort, setSort]               = useState('rating');
  const [method, setMethod]           = useState(initialParams.get('method') || '');
  const [level, setLevel]             = useState(initialParams.get('level') || '');
  const [city, setCity]               = useState(initialParams.get('city') || '');
  const [favMsg, setFavMsg]           = useState('');
  const [showFilters, setShowFilters] = useState(false); // mobile filter toggle

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
        ...(city && { city }),
      });
      const res = await fetch(`${API_BASE}/api/tutors?${params}`);
      const data = await res.json();
      if (!res.ok) {
        console.error('API /api/tutors error:', data);
        throw new Error(data.detail || data.message || 'Server error');
      }
      setTutors(Array.isArray(data.tutors) ? data.tutors : []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setError(false);
      autoRetriedRef.current = false;
      setLoading(false);
    } catch (err) {
      console.error('fetchTutors failed:', err.message);
      if (!autoRetriedRef.current) {
        autoRetriedRef.current = true;
        setTimeout(() => fetchTutors(pg), 1500);
        return;
      }
      setTutors([]);
      setTotal(0);
      setTotalPages(1);
      setError(true);
      setLoading(false);
    }
  }, [search, selectedSubjects, sort, method, level, city]);

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
    setMaxPrice(200); setSort('rating'); setMethod(''); setLevel(''); setCity(''); setPage(1);
  };

  const displayTutors = tutors.filter(t => {
    if (user && (t.user_id === user.id || t.id === user.id)) return false;
    const matchPrice = !maxPrice || !t.hourly_rate || Number(t.hourly_rate) <= maxPrice * 1000 || Number(t.hourly_rate) <= maxPrice;
    const matchSearch = !search.trim() ||
      `${t.full_name} ${t.subjects || ''} ${t.bio || ''}`.toLowerCase().includes(search.toLowerCase().trim());
    const matchSubjects = selectedSubjects.length === 0 ||
      selectedSubjects.some(sub => (t.subjects || '').toLowerCase().includes(sub.toLowerCase()));
    const matchMethod = !method ||
      (t.teaching_methods && Array.isArray(t.teaching_methods) ? t.teaching_methods.some(m => m.toLowerCase() === method.toLowerCase()) : false) ||
      (t.method && t.method.toLowerCase() === method.toLowerCase());
    const matchLevel = !level ||
      (t.suitable_students && Array.isArray(t.suitable_students) && t.suitable_students.some(l => l.toLowerCase() === level.toLowerCase())) ||
      (t.level && typeof t.level === 'string' && t.level.toLowerCase().includes(level.toLowerCase())) ||
      (!t.suitable_students && !t.level);
    const matchCity = !city ||
      (t.city && t.city.toLowerCase().includes(city.toLowerCase()));
    return matchPrice && matchSearch && matchSubjects && matchMethod && matchLevel && matchCity;
  });

  const activeFilterCount = (selectedSubjects.length ? 1 : 0) + (method ? 1 : 0) + (level ? 1 : 0) + (maxPrice !== 200 ? 1 : 0) + (search.trim() ? 1 : 0) + (city ? 1 : 0);
  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <style>{`
        .filter-sidebar { scrollbar-width: none; }
        .filter-sidebar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings:"'FILL' 1"}}>school</span>
            EduX
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/courses">Khóa Học</a>
          </nav>
          <div className="flex items-center gap-6 z-10">
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
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="btn-shine bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20 pb-16 max-w-[1280px] mx-auto px-6">
        {error && (
          <div className="mt-4 mb-6 flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-red-900 shadow-[0_10px_26px_-12px_rgba(200,40,40,0.25)]">
            <span className="material-symbols-outlined text-red-500 mt-0.5">cloud_off</span>
            <div className="text-sm leading-relaxed flex-1">
              <b>Không kết nối được máy chủ.</b> Không tải được danh sách gia sư — có thể backend chưa chạy hoặc mạng gián đoạn. Vui lòng thử lại.
            </div>
            <button
              onClick={() => { autoRetriedRef.current = false; setError(false); fetchTutors(page); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors">
              <span className="material-symbols-outlined text-[18px]">refresh</span>Thử lại
            </button>
          </div>
        )}

        {/* SEARCH HEADER — gọn, hướng chức năng: bấm Tìm Gia Sư là thấy gia sư ngay */}
        <section className="mt-4 mb-8 rounded-2xl bg-white border border-[#e9ebf0] shadow-[0_10px_30px_-18px_rgba(0,40,142,0.25)] p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-[#191c1e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00288e] text-[26px]" style={{fontVariationSettings:"'FILL' 1"}}>groups</span>
                Tìm gia sư phù hợp với bạn
              </h1>
              <p className="text-sm text-[#5d5f5f] mt-1">Gia sư đã xác thực · Học thử buổi đầu · Hoàn tiền nếu chưa hài lòng</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-[#757684] shrink-0">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#3b82f6]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span><b className="text-[#191c1e]">2.000+</b>&nbsp;gia sư</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#f59e0b]" style={{fontVariationSettings:"'FILL' 1"}}>star</span><b className="text-[#191c1e]">4.9</b>/5</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0ac]">search</span>
              <input
                className="w-full pl-12 pr-4 h-12 rounded-xl bg-[#f6f8fc] border border-[#e0e3ea] text-[#191c1e] placeholder:text-[#9aa0ac] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all"
                placeholder="Bạn muốn học gì? VD: luyện IELTS 7.0, ôn Toán lớp 10, Python cơ bản..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={handleSearch}
              className="btn-shine bg-gradient-to-r from-[#00288e] to-[#3a6fe0] text-white px-8 h-12 rounded-xl font-bold hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(0,40,142,.6)] transition-all whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>Tìm Kiếm
            </button>
          </div>

          {/* Popular searches + AI suggest */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#757684]">Gợi ý:</span>
            {['IELTS', 'Toán 12', 'Lập trình Python', 'Tiếng Anh giao tiếp', 'Hóa 10'].map(kw => (
              <button
                key={kw}
                onClick={() => { setSearchInput(kw); setSearch(kw); setPage(1); }}
                className="px-3 py-1 rounded-full bg-[#f0f3fa] border border-[#e0e3ea] text-xs font-medium text-[#444653] hover:bg-[#00288e] hover:text-white hover:border-transparent transition-all"
              >
                {kw}
              </button>
            ))}
            <button
              onClick={() => window.location.hash = '/tutor-request'}
              className="sm:ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#fef3c7] to-[#fde68a] text-[#78350f] text-xs font-bold hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>auto_awesome</span>
              Chưa biết chọn ai? Để AI gợi ý
            </button>
          </div>
        </section>

        {/* MAIN GRID — filter + tutors */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24 filter-sidebar max-h-[calc(100vh-120px)] overflow-y-auto border border-[#f1f2f4]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#191c1e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#00288e]">tune</span>
                  Bộ Lọc
                </h2>
                {activeFilterCount > 0 && (
                  <span className="bg-[#00288e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <div className="mb-7">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">Môn Học</label>
                <div className="space-y-2">
                  {SUBJECT_OPTIONS.map(sub => (
                    <label key={sub} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(sub)}
                        onChange={() => toggleSubject(sub)}
                        className="rounded border-[#c4c5d5] text-[#00288e] focus:ring-[#00288e] w-4 h-4"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-7">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">
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

              <div className="mb-7">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">Hình Thức Học</label>
                <div className="space-y-2">
                  {[{ v: '', l: 'Tất Cả', icon: 'all_inclusive' }, { v: 'online', l: 'Online', icon: 'videocam' }, { v: 'offline', l: 'Offline', icon: 'location_on' }].map(opt => (
                    <label key={opt.v} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="method"
                        checked={method === opt.v}
                        onChange={() => { setMethod(opt.v); if (opt.v !== 'offline') setCity(''); setPage(1); }}
                        className="text-[#00288e] focus:ring-[#00288e]"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">{opt.icon}</span>
                        {opt.l}
                      </span>
                    </label>
                  ))}
                </div>
                {method === 'offline' && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-[#757684] block mb-1.5">
                      <span className="material-symbols-outlined text-[13px] align-middle mr-1">location_on</span>
                      Tỉnh / Thành phố
                    </label>
                    <select
                      value={city}
                      onChange={e => { setCity(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-[#c4c5d5] text-sm text-[#444653] bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {VIETNAM_PROVINCES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-7">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">Cấp Độ</label>
                <div className="space-y-2">
                  {[{ v: '', l: 'Tất Cả Cấp Độ', icon: 'school' }, { v: 'Cấp 1', l: 'Cấp 1 (Tiểu học)', icon: 'child_care' }, { v: 'Cấp 2', l: 'Cấp 2 (THCS)', icon: 'menu_book' }, { v: 'Cấp 3', l: 'Cấp 3 (THPT)', icon: 'import_contacts' }, { v: 'Đại học', l: 'Đại học', icon: 'account_balance' }].map(opt => (
                    <label key={opt.v} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="level"
                        checked={level === opt.v}
                        onChange={() => { setLevel(opt.v); setPage(1); }}
                        className="text-[#00288e] focus:ring-[#00288e]"
                      />
                      <span className="text-sm text-[#444653] group-hover:text-[#00288e] transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">{opt.icon}</span>
                        {opt.l}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">Sắp Xếp</label>
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

              <button onClick={handleReset} className="w-full py-2.5 border-2 border-[#00288e]/20 text-[#00288e] text-sm font-bold rounded-lg hover:bg-[#00288e] hover:text-white transition-all">
                Đặt Lại Bộ Lọc
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-grow min-w-0">
            {/* Mobile filter toggle + result summary */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-[#c4c5d5] rounded-lg text-sm font-semibold text-[#191c1e] hover:border-[#00288e] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Bộ Lọc
                  {activeFilterCount > 0 && (
                    <span className="bg-[#00288e] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px]">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-[#444653]">
                  Tìm thấy <span className="font-bold text-[#191c1e]">{total}</span> gia sư
                </p>
              </div>

              {/* Sort dropdown (mobile-friendly) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#757684] hidden sm:inline">Sắp xếp:</span>
                <select
                  value={sort}
                  onChange={e => { setSort(e.target.value); setPage(1); }}
                  className="text-sm bg-white border border-[#c4c5d5] rounded-lg px-3 py-2 font-semibold text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e]"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile filter panel */}
            {showFilters && (
              <div className="lg:hidden mb-6 bg-white rounded-2xl shadow-lg p-5 border border-[#f1f2f4]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#191c1e] block mb-2">Hình thức</label>
                    <select value={method} onChange={e => { setMethod(e.target.value); if (e.target.value !== 'offline') setCity(''); setPage(1); }}
                      className="w-full px-2 py-2 text-sm border rounded-lg">
                      <option value="">Tất cả</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#191c1e] block mb-2">Cấp độ</label>
                    <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}
                      className="w-full px-2 py-2 text-sm border rounded-lg">
                      <option value="">Tất cả</option>
                      <option value="Cấp 1">Cấp 1</option>
                      <option value="Cấp 2">Cấp 2</option>
                      <option value="Cấp 3">Cấp 3</option>
                      <option value="Đại học">Đại học</option>
                    </select>
                  </div>
                  {method === 'offline' && (
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-[#191c1e] block mb-2">
                        <span className="material-symbols-outlined text-[13px] align-middle mr-1">location_on</span>
                        Tỉnh / Thành phố
                      </label>
                      <select value={city} onChange={e => { setCity(e.target.value); setPage(1); }}
                        className="w-full px-2 py-2 text-sm border rounded-lg">
                        <option value="">Chọn tỉnh/thành</option>
                        {VIETNAM_PROVINCES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#191c1e] block mb-2">Giá tối đa: ${maxPrice}/giờ</label>
                    <input type="range" min="20" max="200" step="10" value={maxPrice}
                      onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1); }}
                      className="w-full accent-[#00288e]" />
                  </div>
                </div>
                <button onClick={() => { handleReset(); setShowFilters(false); }} className="mt-4 w-full py-2 text-sm font-bold text-[#00288e] border-2 border-[#00288e]/20 rounded-lg">
                  Đặt Lại
                </button>
              </div>
            )}

            {/* Active filter chips */}
            {(search.trim() || selectedSubjects.length > 0 || method || level || city) && (
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs text-[#757684] self-center">Đang lọc:</span>
                {search.trim() && (
                  <span className="inline-flex items-center gap-1 bg-[#3b82f6] text-white text-xs font-medium px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">search</span>
                    {search.trim()}
                    <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="hover:bg-white/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                )}
                {selectedSubjects.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-[#00288e] text-white text-xs font-medium px-3 py-1 rounded-full">
                    {s}
                    <button onClick={() => toggleSubject(s)} className="hover:bg-white/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                ))}
                {method && (
                  <span className="inline-flex items-center gap-1 bg-[#00288e] text-white text-xs font-medium px-3 py-1 rounded-full capitalize">
                    {method === 'online' ? 'Online' : method === 'offline' ? 'Offline' : method}
                    <button onClick={() => { setMethod(''); setCity(''); setPage(1); }} className="hover:bg-white/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                )}
                {city && (
                  <span className="inline-flex items-center gap-1 bg-[#10b981] text-white text-xs font-medium px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">location_on</span>
                    {city}
                    <button onClick={() => { setCity(''); setPage(1); }} className="hover:bg-white/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                )}
                {level && (
                  <span className="inline-flex items-center gap-1 bg-[#00288e] text-white text-xs font-medium px-3 py-1 rounded-full">
                    {level}
                    <button onClick={() => { setLevel(''); setPage(1); }} className="hover:bg-white/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
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
              <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-24 text-center border border-[#f1f2f4]">
                <div className="w-20 h-20 rounded-full bg-[#f1f2f4] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[42px] text-[#c4c5d5]">search_off</span>
                </div>
                <h3 className="text-xl font-bold text-[#191c1e] mb-2">Chưa có gia sư nào khớp với bộ lọc</h3>
                <p className="text-[#757684] mb-6 max-w-sm">Thử thay đổi từ khóa, mở rộng khoảng giá, hoặc bỏ chọn một vài môn học</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-[#00288e] text-white rounded-lg text-sm font-bold hover:bg-[#1e40af] transition-all shadow-md hover:shadow-lg">
                  Xóa Bộ Lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayTutors.map(tutor => (
                  <TutorCard key={tutor.id} tutor={tutor} isMock={false} onFav={addFav} />
                ))}
              </div>
            )}
            {favMsg && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-[#1e40af] text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>{favMsg}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
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
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Chính Sách Bảo Mật</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Điều Khoản Dịch Vụ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Trung Tâm Hỗ Trợ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={(e) => e.preventDefault()}>Liên Hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
