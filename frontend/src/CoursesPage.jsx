import { useState, useEffect, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ── Style ảnh bìa theo danh mục môn học (gradient + icon) ──────────────────────
const CAT_STYLE = {
  'Kỹ Thuật Phần Mềm': { gradient: 'linear-gradient(135deg,#0ea5e9,#1e3a8a)', icon: 'code' },
  'Toán Học':          { gradient: 'linear-gradient(135deg,#6366f1,#312e81)', icon: 'calculate' },
  'Ngoại Ngữ':         { gradient: 'linear-gradient(135deg,#f59e0b,#b45309)', icon: 'translate' },
  'Vi Mạch':           { gradient: 'linear-gradient(135deg,#10b981,#065f46)', icon: 'memory' },
  'Khóa Học Miễn Phí': { gradient: 'linear-gradient(135deg,#f43f5e,#831843)', icon: 'redeem' },
  _default:            { gradient: 'linear-gradient(135deg,#3b82f6,#1e3a8a)', icon: 'school' },
};

const CATEGORIES = ['Kỹ Thuật Phần Mềm', 'Toán Học', 'Khóa Học Miễn Phí', 'Ngoại Ngữ', 'Vi Mạch'];
const LEVELS = ['Khóa học sinh', 'Khóa đại học'];
const SORTS = [
  { v: 'newest', l: 'Mới nhất' },
  { v: 'price_asc', l: 'Giá: Thấp đến Cao' },
  { v: 'price_desc', l: 'Giá: Cao đến Thấp' },
  { v: 'rating', l: 'Đánh giá cao nhất' },
];

// Dữ liệu mẫu (hiển thị đẹp khi DB chưa có khóa học thật)
const MOCK_COURSES = [
  { id: 'm1', title: 'Cấp tốc FE PRF192 / MAE101 - FA25', description: 'Ôn tập kiến thức FE PRF192 với 100 câu bài tập phân hóa đa dạng, kĩ năng bấm máy (trick casio) và phân tích để chọn nhanh đáp án FE MAE101.', category: 'Toán Học', level: 'Khóa đại học', price: 123000, original_price: 200000, rating: 5.0, reviews: 128, lessons: 24 },
  { id: 'm2', title: 'CSD201 - CTDL và Giải Thuật cùng Java (Video Only)', description: 'Làm việc trực tiếp với Java: mảng, danh sách liên kết, ngăn xếp, hàng đợi, cây, đồ thị và các thuật toán sắp xếp, tìm kiếm, đệ quy.', category: 'Kỹ Thuật Phần Mềm', level: 'Khóa đại học', price: 299000, original_price: 400000, rating: 5.0, reviews: 95, lessons: 40 },
  { id: 'm3', title: 'Lập trình OOP với Java', description: 'Nền tảng lập trình hướng đối tượng: class, kế thừa, đa hình, đóng gói — kèm dự án thực hành cuối khóa.', category: 'Kỹ Thuật Phần Mềm', level: 'Khóa đại học', price: 199000, original_price: 350000, rating: 4.8, reviews: 73, lessons: 32 },
  { id: 'm4', title: 'IELTS 6.5+ Cấp tốc 8 tuần', description: 'Lộ trình luyện 4 kỹ năng Listening - Reading - Writing - Speaking, chữa đề thực chiến, cam kết đầu ra 6.5+.', category: 'Ngoại Ngữ', level: 'Khóa học sinh', price: 499000, original_price: 800000, rating: 4.9, reviews: 210, lessons: 48 },
  { id: 'm5', title: 'Giải tích 1 - Cơ bản đến nâng cao', description: 'Giới hạn, đạo hàm, tích phân và ứng dụng — giảng giải trực quan, nhiều ví dụ và bài tập có lời giải.', category: 'Toán Học', level: 'Khóa đại học', price: 0, original_price: 0, rating: 4.7, reviews: 64, lessons: 28 },
  { id: 'm6', title: 'Thiết kế Vi mạch số cơ bản (Verilog)', description: 'Nhập môn thiết kế mạch số với Verilog HDL: cổng logic, FSM, mô phỏng và tổng hợp trên FPGA.', category: 'Vi Mạch', level: 'Khóa đại học', price: 350000, original_price: 500000, rating: 4.6, reviews: 31, lessons: 36 },
  { id: 'm7', title: 'Tiếng Anh giao tiếp cho người mới', description: 'Phản xạ giao tiếp hằng ngày, phát âm chuẩn, từ vựng và mẫu câu thông dụng — học là nói được.', category: 'Ngoại Ngữ', level: 'Khóa học sinh', price: 0, original_price: 0, rating: 4.8, reviews: 156, lessons: 30 },
  { id: 'm8', title: 'Python cho người mới bắt đầu', description: 'Từ cú pháp cơ bản đến xử lý dữ liệu, viết script tự động hóa và mini-project thực tế.', category: 'Kỹ Thuật Phần Mềm', level: 'Khóa học sinh', price: 149000, original_price: 250000, rating: 4.9, reviews: 188, lessons: 26 },
  { id: 'm9', title: 'Đại số tuyến tính - MAS291', description: 'Ma trận, định thức, hệ phương trình, không gian vector và trị riêng — trọng tâm thi cử.', category: 'Toán Học', level: 'Khóa đại học', price: 199000, original_price: 300000, rating: 4.5, reviews: 42, lessons: 22 },
];

function fmtVnd(v) {
  if (!v || Number(v) === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(Number(v)) + ' đ';
}

function Stars({ value, size = 16 }) {
  const r = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: size, color: i <= r ? '#f5a623' : '#d1d5db', fontVariationSettings: i <= r ? "'FILL' 1" : "'FILL' 0" }}>star</span>
      ))}
    </span>
  );
}

function CourseCover({ course }) {
  const s = CAT_STYLE[course.category] || CAT_STYLE._default;
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: s.gradient }}>
      <span className="material-symbols-outlined absolute select-none" style={{ right: -14, bottom: -18, fontSize: 130, color: 'rgba(255,255,255,0.14)' }}>{s.icon}</span>
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <span className="self-start text-[10px] font-bold tracking-wider uppercase bg-white/20 text-white px-2 py-1 rounded">{course.category}</span>
        <div className="text-white font-extrabold leading-tight text-base line-clamp-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>{course.title}</div>
      </div>
    </div>
  );
}

function CourseCard({ course, onAdd }) {
  const discount = course.original_price && course.original_price > course.price
    ? Math.round((1 - course.price / course.original_price) * 100) : 0;
  return (
    <div className="group flex gap-4 bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm hover:border-[#00288e]/40 hover:shadow-[0_12px_40px_-12px_rgba(0,40,142,0.25)] transition-all">
      <div className="w-[200px] min-w-[200px] h-[150px] shrink-0"><CourseCover course={course} /></div>
      <div className="flex-grow py-4 pr-2 min-w-0">
        <h3 className="text-[#191c1e] font-bold text-lg leading-snug">{course.title}</h3>
        <p className="text-[#5d5f5f] text-sm mt-1.5 line-clamp-2">{course.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[#191c1e] font-bold text-sm">{(course.rating || 0).toFixed(1)}</span>
          <Stars value={course.rating || 0} />
          {course.reviews ? <span className="text-[#757684] text-xs">({course.reviews})</span> : null}
          <span className="text-[#757684] text-xs ml-2 inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_lesson</span>{course.lessons || 0} bài</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between py-4 pr-4 shrink-0">
        <div className="text-right">
          {course.original_price > course.price && (
            <div className="text-[#9aa3b8] text-sm line-through">{fmtVnd(course.original_price)}</div>
          )}
          <div className="text-[#00288e] font-extrabold text-xl">{fmtVnd(course.price)}</div>
          {discount > 0 && <div className="text-[#16a34a] text-xs font-semibold">-{discount}%</div>}
        </div>
        <button onClick={() => onAdd(course)} title="Thêm vào giỏ"
          className="btn-shine w-11 h-11 rounded-xl bg-gradient-to-r from-[#1e40af] to-[#3b6fe0] text-white flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(59,111,224,0.6)] transition-all">
          <span className="material-symbols-outlined">add_shopping_cart</span>
        </button>
      </div>
    </div>
  );
}

export default function CoursesPage({ user }) {
  const [apiCourses, setApiCourses] = useState([]);
  const [search, setSearch]   = useState('');
  const [cat, setCat]         = useState('');
  const [level, setLevel]     = useState('');
  const [minRating, setMin]   = useState(0);
  const [sort, setSort]       = useState('newest');
  const [toast, setToast]     = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/courses`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rows = (d && Array.isArray(d.courses) ? d.courses : [])
          .filter(c => (c.title || '').trim().length >= 6 && CATEGORIES.includes(c.subject))
          .map(c => ({
            id: c.id, title: c.title, description: c.description || '',
            category: c.subject, level: c.level || 'Khóa đại học',
            price: c.price || 0, original_price: c.original_price || 0,
            rating: Number(c.avg_rating) || 0, reviews: c.review_count || 0, lessons: c.total_lessons || 0,
          }));
        if (rows.length) setApiCourses(rows);
      })
      .catch(() => {});
  }, []);

  const all = useMemo(() => [...apiCourses, ...MOCK_COURSES], [apiCourses]);

  const filtered = useMemo(() => {
    let list = all.filter(c =>
      (!cat || c.category === cat) &&
      (!level || c.level === level) &&
      (!minRating || (c.rating || 0) >= minRating) &&
      (!search.trim() || `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    );
    if (sort === 'price_asc')  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating')     list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
  }, [all, cat, level, minRating, search, sort]);

  const addToCart = (c) => {
    setToast(`Đã thêm "${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}" vào giỏ`);
    setTimeout(() => setToast(''), 2200);
  };
  const resetFilters = () => { setCat(''); setLevel(''); setMin(0); setSearch(''); setSort('newest'); };

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center gap-6">
          <a href="#/" className="flex items-center gap-2 text-2xl font-extrabold text-[#00288e] shrink-0">
            <span className="material-symbols-outlined text-[#00288e]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
          </a>
          <div className="flex-grow max-w-[560px] relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa3b8]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              className="w-full pl-12 pr-4 py-3 rounded-full bg-white border border-[#d6d9e0] text-[#191c1e] placeholder:text-[#9aa3b8] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15" />
          </div>
          <nav className="hidden md:flex items-center gap-7 ml-auto text-sm font-semibold">
            <a href="#/" className="text-[#5d5f5f] hover:text-[#00288e] transition-colors">Trang chủ</a>
            <a href="#/courses" className="text-[#00288e]">Khóa học</a>
            <a href="#/find-tutors" className="text-[#5d5f5f] hover:text-[#00288e] transition-colors">Tìm gia sư</a>
          </nav>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold mb-6 text-[#191c1e]">{filtered.length} kết quả tất cả khóa học</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-3 flex items-center gap-2 text-[#191c1e]"><span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 20 }}>kid_star</span>Xếp hạng</h2>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setMin(minRating === s ? 0 : s)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: s <= minRating ? '#f5a623' : '#d1d5db', fontVariationSettings: s <= minRating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  </button>
                ))}
              </div>
              {minRating > 0 && <button onClick={() => setMin(0)} className="text-[#757684] text-xs mt-2 hover:text-[#00288e]">Bỏ chọn ({minRating}★ trở lên)</button>}
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-3 text-[#191c1e]">Danh mục khóa học</h2>
              <div className="space-y-2.5">
                {CATEGORIES.map(c => (
                  <label key={c} className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="cat" checked={cat === c} onChange={() => setCat(cat === c ? '' : c)}
                      onClick={() => cat === c && setCat('')}
                      className="accent-[#00288e] w-4 h-4" />
                    <span className="text-sm text-[#444653] group-hover:text-[#00288e]">{c}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-3 text-[#191c1e]">Cấp độ</h2>
              <div className="space-y-2.5">
                {LEVELS.map(l => (
                  <label key={l} className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" name="level" checked={level === l} onChange={() => setLevel(level === l ? '' : l)}
                      onClick={() => level === l && setLevel('')}
                      className="accent-[#00288e] w-4 h-4" />
                    <span className="text-sm text-[#444653] group-hover:text-[#00288e]">{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={resetFilters} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1e40af] to-[#3b6fe0] text-white font-bold hover:-translate-y-0.5 transition-all btn-shine">
              Xóa bộ lọc
            </button>
          </aside>

          {/* List */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[#5d5f5f] text-sm">Sắp xếp theo</span>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-white border border-[#d6d9e0] rounded-lg px-4 py-2 text-sm text-[#191c1e] focus:outline-none focus:border-[#00288e]">
                {SORTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div className="space-y-5">
              {filtered.length === 0 ? (
                <div className="text-center text-[#757684] py-16">Không tìm thấy khóa học phù hợp. Thử xóa bớt bộ lọc nhé.</div>
              ) : filtered.map(c => <CourseCard key={c.id} course={c} onAdd={addToCart} />)}
            </div>
          </div>
        </div>
      </main>

      {/* Toast thêm giỏ hàng */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#1e40af] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>{toast}
        </div>
      )}
    </div>
  );
}
