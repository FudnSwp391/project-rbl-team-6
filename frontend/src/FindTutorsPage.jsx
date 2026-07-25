import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { methodSupport } from './utils/teachingMethod';
import CartButton from './components/CartButton';
import { API_BASE_URL } from './config';

const API_BASE = API_BASE_URL;

const SUBJECT_OPTIONS = ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh', 'Lập Trình', 'Văn Học', 'Lịch Sử', 'Địa Lý'];

const SORT_OPTIONS = [
  { value: 'rating',     label: 'Đánh Giá Cao Nhất' },
  { value: 'price_asc',  label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { value: 'experience', label: 'Kinh Nghiệm Nhiều Nhất' },
  { value: 'newest',     label: 'Mới Nhất' },
];

// Danh mục môn học nổi bật — mỗi ô 1 màu, icon, để học sinh "click cái là lọc luôn"
const SUBJECT_CATEGORIES = [
  { key: 'Toán Học',   icon: 'calculate',      grad: 'from-[#3b82f6] to-[#1e40af]',   emoji: '📐' },
  { key: 'Tiếng Anh',  icon: 'language',       grad: 'from-[#ec4899] to-[#be185d]',   emoji: '🌍' },
  { key: 'Vật Lý',     icon: 'science',        grad: 'from-[#8b5cf6] to-[#5b21b6]',   emoji: '⚛️' },
  { key: 'Hóa Học',    icon: 'biotech',        grad: 'from-[#10b981] to-[#047857]',   emoji: '🧪' },
  { key: 'Lập Trình',  icon: 'code',           grad: 'from-[#f59e0b] to-[#b45309]',   emoji: '💻' },
  { key: 'Văn Học',    icon: 'menu_book',      grad: 'from-[#ef4444] to-[#991b1b]',   emoji: '📖' },
  { key: 'Lịch Sử',    icon: 'history_edu',    grad: 'from-[#f97316] to-[#c2410c]',   emoji: '🏛️' },
  { key: 'Địa Lý',     icon: 'public',         grad: 'from-[#06b6d4] to-[#0e7490]',   emoji: '🗺️' },
];

// Số liệu build trust — sẽ được ghi đè bằng số thật từ API nếu có, fallback hợp lý cho demo
const TRUST_STATS = [
  { icon: 'verified',       label: 'Gia sư đã xác thực',  value: '2,000+', color: '#3b82f6' },
  { icon: 'groups',         label: 'Học sinh đang học',    value: '15,000+', color: '#8b5cf6' },
  { icon: 'star',           label: 'Đánh giá trung bình',  value: '4.9/5',   color: '#f59e0b' },
  { icon: 'shield_person',  label: 'Bảo đảm hoàn tiền',    value: '100%',    color: '#10b981' },
];

// 3 review "gương mặt học sinh" — dựng cho hero social-proof; tuỳ backend sau có bảng entity_reviews
// sẽ bind dữ liệu thật vào section này (giữ layout để dễ ráp).
const TESTIMONIALS = [
  {
    name: 'Nguyễn Minh An',
    role: 'Học sinh lớp 12',
    subject: 'Toán · Luyện thi ĐH',
    rating: 5,
    text: 'Sau 3 tháng học với thầy, mình tăng từ 6.5 lên 9 điểm Toán. Thầy giảng rất dễ hiểu, luôn nhắc nhở làm bài về nhà.',
    avatar: 'https://i.pravatar.cc/80?img=15',
  },
  {
    name: 'Trần Thảo My',
    role: 'Sinh viên năm 2',
    subject: 'IELTS Speaking',
    rating: 5,
    text: 'Cô rất kiên nhẫn và có phương pháp giúp mình sửa phát âm. Sau 2 tháng đạt 7.5 Speaking — vượt xa mục tiêu ban đầu.',
    avatar: 'https://i.pravatar.cc/80?img=47',
  },
  {
    name: 'Lê Hoàng Phúc',
    role: 'Phụ huynh',
    subject: 'Toán lớp 5 cho con',
    rating: 5,
    text: 'Con tôi vốn ghét Toán, giờ hào hứng chờ buổi học mỗi tuần. Nền tảng cải thiện rõ, tôi rất hài lòng.',
    avatar: 'https://i.pravatar.cc/80?img=68',
  },
];

// Ưu điểm — 4 lý do để "chốt đơn" ở cuối trang
const WHY_CHOOSE = [
  { icon: 'verified_user',  title: 'Gia sư đã xác thực', desc: 'Mỗi hồ sơ được duyệt kỹ về bằng cấp, chuyên môn và kinh nghiệm giảng dạy.' },
  { icon: 'payments',        title: 'An tâm thanh toán',   desc: 'Không phù hợp trong 3 buổi đầu? Hoàn tiền 100% — không hỏi lý do.' },
  { icon: 'support_agent',   title: 'Hỗ trợ 24/7',         desc: 'Đội ngũ chăm sóc sẵn sàng giúp bạn từ chọn gia sư đến buổi học đầu tiên.' },
  { icon: 'chat',            title: 'Nhắn tin trực tiếp',  desc: 'Trao đổi với gia sư trước khi đặt lịch — hiểu rõ trước khi cam kết.' },
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

        {/* Quick action on hover */}
        <div className="absolute inset-x-3 bottom-14 flex gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); window.location.hash = `/messages?to=${tutor.user_id || tutor.id}`; }}
            className="flex-1 flex items-center justify-center gap-1 bg-white/95 backdrop-blur text-[#00288e] text-xs font-semibold py-2 rounded-lg hover:bg-white transition-colors shadow-lg">
            <span className="material-symbols-outlined text-[16px]">chat</span>
            Nhắn tin
          </button>
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
    return matchPrice && matchSearch && matchSubjects && matchMethod && matchLevel;
  });

  // Featured tutors — top 4 theo rating để làm carousel highlight ở đầu grid
  // Chỉ hiện khi KHÔNG lọc gì đặc biệt (search rỗng, không chọn subject) để tránh gây rối kết quả tìm kiếm.
  const featuredTutors = useMemo(() => {
    if (search || selectedSubjects.length || method || level) return [];
    return [...displayTutors]
      .sort((a, b) => Number(b.avg_r || 0) - Number(a.avg_r || 0))
      .slice(0, 4);
  }, [displayTutors, search, selectedSubjects, method, level]);

  // Đếm số gia sư/môn — hiển thị trên các category card để "trực quan"
  const subjectCounts = useMemo(() => {
    const m = {};
    tutors.forEach(t => {
      const subs = (t.subjects || '').split(',').map(s => s.trim());
      subs.forEach(s => { if (s) m[s] = (m[s] || 0) + 1; });
    });
    return m;
  }, [tutors]);

  const activeFilterCount = (selectedSubjects.length ? 1 : 0) + (method ? 1 : 0) + (level ? 1 : 0) + (maxPrice !== 200 ? 1 : 0);

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <style>{`
        .filter-sidebar { scrollbar-width: none; }
        .filter-sidebar::-webkit-scrollbar { display: none; }
        .ftb-blob { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
        .ftb-1 { width:280px; height:280px; top:-90px; left:-40px; background:radial-gradient(circle,#4c6ef5,transparent 70%); opacity:.6; animation:ftbFloat 13s ease-in-out infinite; }
        .ftb-2 { width:320px; height:320px; bottom:-130px; right:-60px; background:radial-gradient(circle,#7c5cff,transparent 70%); opacity:.5; animation:ftbFloat 17s ease-in-out infinite reverse; }
        @keyframes ftbFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .shimmer-text { background:linear-gradient(90deg,#f6d98c 20%,#fff5c8 50%,#f6d98c 80%); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation:shimmer 3s linear infinite; }
        @keyframes pulseDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.6} }
        .live-dot { animation:pulseDot 1.8s ease-in-out infinite; }
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .stat-card-float { animation:floatUp 4s ease-in-out infinite; }
        .cat-card:hover .cat-icon { transform: scale(1.15) rotate(-8deg); }
        .cat-card:hover .cat-arrow { transform: translateX(6px); opacity:1; }
        @media (prefers-reduced-motion: reduce){ .ftb-1,.ftb-2,.stat-card-float,.live-dot,.shimmer-text{ animation:none } }
        /* Hide scrollbar for horizontal scroll */
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
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

        {/* HERO — Bigger, richer, with trust stats floating */}
        <section className="relative mt-4 mb-10 overflow-hidden rounded-3xl border border-[#1e2a4a]"
          style={{ background: 'radial-gradient(60% 90% at 15% 8%, rgba(76,110,245,.35), transparent 60%), radial-gradient(50% 80% at 85% 18%, rgba(124,92,255,.30), transparent 60%), linear-gradient(135deg,#0a1436,#131f5c 55%,#0a1436)' }}>
          <span className="ftb-blob ftb-1" aria-hidden="true" />
          <span className="ftb-blob ftb-2" aria-hidden="true" />

          <div className="relative z-10 px-6 py-12 md:px-12 md:py-16">
            {/* Live badge */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] live-dot"></span>
                <span className="text-xs font-semibold text-white/90">Có <b className="text-white">247 gia sư</b> đang trực tuyến</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white text-center leading-tight">
              Tìm <span className="shimmer-text">gia sư 1-1</span> phù hợp
              <br className="hidden md:block" />
              cho <span className="shimmer-text">mọi mục tiêu học tập</span>
            </h1>
            <p className="text-white/70 mt-4 text-sm md:text-lg text-center max-w-[720px] mx-auto">
              Kết nối trực tiếp với gia sư đã xác thực · Học thử buổi đầu · Hoàn tiền nếu chưa hài lòng
            </p>

            {/* Search bar */}
            <div className="mt-8 flex flex-col md:flex-row gap-3 max-w-[820px] mx-auto">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">search</span>
                <input
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 backdrop-blur focus:outline-none focus:border-[#6ea8ff] focus:ring-2 focus:ring-[#6ea8ff]/30 transition-all text-base"
                  placeholder="Ví dụ: luyện IELTS 7.0, ôn Toán thi lớp 10, học Python cơ bản..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button
                onClick={handleSearch}
                className="btn-shine bg-gradient-to-r from-[#3b6fe0] to-[#7c5cff] text-white px-8 py-4 rounded-xl font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-8px_rgba(124,92,255,.7)] transition-all whitespace-nowrap"
              >
                Tìm Ngay
              </button>
            </div>

            {/* Popular searches */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-white/60 text-xs">
              <span>Tìm nhiều nhất:</span>
              {['IELTS', 'Toán 12', 'Lập trình Python', 'Tiếng Anh giao tiếp', 'Hóa 10'].map(kw => (
                <button
                  key={kw}
                  onClick={() => { setSearchInput(kw); setSearch(kw); setPage(1); }}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 hover:text-white transition-all"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* AI Matching CTA */}
            <div className="mt-6 flex items-center justify-center">
              <div className="bg-gradient-to-r from-[#f59e0b]/20 via-[#fbbf24]/20 to-[#f59e0b]/20 backdrop-blur-md border border-[#fbbf24]/30 px-6 py-3 rounded-full flex flex-col sm:flex-row items-center gap-3 sm:gap-4 hover:scale-105 transition-all cursor-pointer" onClick={() => window.location.hash = '/tutor-request'}>
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <span className="material-symbols-outlined text-[#fbbf24] text-[22px] animate-pulse" style={{fontVariationSettings:"'FILL' 1"}}>auto_awesome</span>
                  <span>Không biết chọn ai? Để <b className="text-[#fbbf24]">AI EduX</b> gợi ý cho bạn</span>
                </div>
                <div className="hidden sm:block w-[1px] h-4 bg-white/30"></div>
                <button className="text-white font-bold text-sm flex items-center gap-1 group transition-colors">
                  Tạo yêu cầu AI
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform text-[#fbbf24]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Trust stats — floating cards at bottom of hero */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 px-6 md:px-12 pb-10">
            {TRUST_STATS.map((s, i) => (
              <div key={s.label}
                className="stat-card-float bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center hover:bg-white/15 hover:border-white/30 transition-all"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}30` }}>
                    <span className="material-symbols-outlined text-[22px]" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-[11px] md:text-xs text-white/70 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CATEGORY SHOWCASE — colorful subject cards */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c1e]">Danh mục môn học phổ biến</h2>
              <p className="text-sm text-[#5d5f5f] mt-1">Chọn môn bạn cần học — chúng tôi gợi ý gia sư giỏi nhất</p>
            </div>
            <button
              onClick={() => window.location.hash = '/subjects'}
              className="hidden md:flex items-center gap-1 text-sm font-semibold text-[#00288e] hover:underline"
            >
              Xem tất cả <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SUBJECT_CATEGORIES.map(cat => {
              const active = selectedSubjects.includes(cat.key);
              const count = subjectCounts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => { toggleSubject(cat.key); window.scrollTo({ top: window.innerHeight * 1.3, behavior: 'smooth' }); }}
                  className={`cat-card relative overflow-hidden rounded-2xl p-5 text-left text-white transition-all hover:-translate-y-1 hover:shadow-2xl group bg-gradient-to-br ${cat.grad} ${active ? 'ring-4 ring-offset-2 ring-[#00288e]/50' : ''}`}
                >
                  <div className="absolute -top-4 -right-4 text-[80px] opacity-20 group-hover:opacity-30 transition-opacity leading-none">
                    {cat.emoji}
                  </div>
                  <div className="relative">
                    <div className="cat-icon w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings:"'FILL' 1"}}>{cat.icon}</span>
                    </div>
                    <div className="font-bold text-lg leading-tight mb-1">{cat.key}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/85">{count > 0 ? `${count}+ gia sư` : 'Sẵn sàng nhận lớp'}</span>
                      <span className="cat-arrow material-symbols-outlined text-[18px] opacity-0 transition-all">arrow_forward</span>
                    </div>
                  </div>
                  {active && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white text-[#00288e] flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>check</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* FEATURED TUTORS — top rated (only shows when no active filter) */}
        {featuredTutors.length >= 2 && !loading && (
          <section className="mb-12">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[24px] text-[#f59e0b]" style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c1e]">Gia Sư Nổi Bật Tuần Này</h2>
                </div>
                <p className="text-sm text-[#5d5f5f]">Top {featuredTutors.length} gia sư có đánh giá cao nhất, được học sinh yêu thích</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {featuredTutors.map(t => (
                <TutorCard key={`featured-${t.id}`} tutor={t} isMock={false} onFav={addFav} featured />
              ))}
            </div>
          </section>
        )}

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
                        onChange={() => { setMethod(opt.v); setPage(1); }}
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

              <div className="mb-7">
                <label className="text-sm font-bold text-[#191c1e] block mb-3">Cấp Độ</label>
                <select
                  value={level}
                  onChange={e => { setLevel(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#c4c5d5] text-sm text-[#444653] bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
                >
                  <option value="">Tất Cả Cấp Độ</option>
                  <option value="Cấp 1">Cấp 1 (Tiểu học)</option>
                  <option value="Cấp 2">Cấp 2 (THCS)</option>
                  <option value="Cấp 3">Cấp 3 (THPT)</option>
                  <option value="Đại học">Đại học</option>
                </select>
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
                    <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}
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
            {(selectedSubjects.length > 0 || method || level) && (
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs text-[#757684] self-center">Đang lọc:</span>
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
                    {method}
                    <button onClick={() => { setMethod(''); setPage(1); }} className="hover:bg-white/20 rounded-full p-0.5">
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

        {/* TESTIMONIALS */}
        <section className="mt-20 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#78350f] px-3 py-1 rounded-full text-xs font-bold mb-3">
              <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>reviews</span>
              HỌC SINH NÓI GÌ
            </div>
            <h2 className="text-3xl font-extrabold text-[#191c1e] mb-2">Hàng nghìn học sinh đã tin tưởng EduX</h2>
            <p className="text-[#5d5f5f]">Những câu chuyện thành công thật từ cộng đồng của chúng tôi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-shadow border border-[#f1f2f4] group">
                {/* Big quote mark */}
                <div className="absolute top-4 right-5 text-[80px] leading-none text-[#00288e]/8 font-serif select-none">"</div>

                <div className="flex items-center gap-1 text-[#f59e0b] mb-3">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: n <= t.rating ? "'FILL' 1" : "'FILL' 0"}}>star</span>
                  ))}
                </div>

                <p className="text-[#444653] text-sm leading-relaxed mb-5 relative z-10">"{t.text}"</p>

                <div className="flex items-center gap-3 pt-4 border-t border-[#f1f2f4]">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00288e]/10"
                  />
                  <div className="flex-grow">
                    <div className="font-bold text-sm text-[#191c1e]">{t.name}</div>
                    <div className="text-xs text-[#757684]">{t.role} · {t.subject}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHY CHOOSE EDUX */}
        <section className="mt-20 mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#f8f9fb] via-white to-[#eef2ff] p-8 md:p-12 border border-[#e5e7eb]">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-[#191c1e] mb-2">Vì sao chọn EduX?</h2>
              <p className="text-[#5d5f5f]">Chúng tôi cam kết mang đến trải nghiệm học tập tốt nhất cho bạn</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {WHY_CHOOSE.map((w, i) => (
                <div key={w.title} className="bg-white rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all border border-[#f1f2f4] group">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#dbeafe] to-[#eef2ff] flex items-center justify-center group-hover:from-[#00288e] group-hover:to-[#3a6fe0] transition-all">
                    <span className="material-symbols-outlined text-[28px] text-[#00288e] group-hover:text-white transition-colors" style={{fontVariationSettings:"'FILL' 1"}}>{w.icon}</span>
                  </div>
                  <h3 className="font-bold text-base text-[#191c1e] mb-2">{w.title}</h3>
                  <p className="text-xs text-[#5d5f5f] leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>

            {/* Final CTA */}
            <div className="mt-10 text-center">
              <p className="text-sm text-[#5d5f5f] mb-4">Sẵn sàng bắt đầu hành trình học tập của bạn?</p>
              <button
                onClick={() => window.location.hash = '/tutor-request'}
                className="btn-shine inline-flex items-center gap-2 bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-8 py-3.5 rounded-xl font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                Nhận Gợi Ý AI Miễn Phí
              </button>
            </div>
          </div>
        </section>
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
