import React, { useState, useEffect } from 'react';
import CartButton from './components/CartButton';
import { API_BASE_URL } from './config';

// Trang Môn Học — toàn bộ số liệu lấy thật từ /api/subjects/overview
// (số gia sư, số khóa, học phí thấp nhất, điểm đánh giá). Mọi thẻ đều bấm được
// để lọc sang trang Tìm Gia Sư / Khóa Học.

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

export default function SubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [openSubject, setOpenSubject] = useState(null);
  const [highlights, setHighlights] = useState(null);
  const [hlLoading, setHlLoading] = useState(false);

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

  const q = searchTerm.trim().toLowerCase();
  const subjects = allSubjects
    .filter(s => activeCat === 'all' || s.category === activeCat)
    .filter(s => !q || s.name.toLowerCase().includes(q));

  const submitSearch = e => {
    e.preventDefault();
    const hit = allSubjects.find(s => s.name.toLowerCase() === q);
    if (hit) setOpenSubject(hit.name);
    else if (q) goTutors(`search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans flex flex-col">
      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .card-hover:hover { transform: translateY(-4px); transition: all 0.2s ease-in-out; }
      `}</style>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/subjects">Môn Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/courses">Khóa Học</a>
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
        <div className="relative overflow-hidden rounded-xl bg-[#00288e] px-6 py-14 md:px-16 md:py-20 mb-8 flex flex-col items-center text-center shadow-lg">
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
            {/* Danh mục thật */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#191c1e]">Duyệt Theo Danh Mục</h2>
              <button onClick={() => { setActiveCat('all'); setSearchTerm(''); }}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${activeCat === 'all' ? 'bg-[#00288e] text-white border-transparent' : 'text-[#00288e] border-[#c4c5d5] hover:bg-[#edeef0]'}`}>
                Tất cả ({allSubjects.length})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-14">
              {categories.map(c => {
                const st = styleOf(c.key);
                const active = activeCat === c.key;
                return (
                  <button key={c.key} onClick={() => setActiveCat(active ? 'all' : c.key)}
                    className={`text-left bg-white p-6 rounded-xl shadow-sm border card-hover cursor-pointer group transition-all ${active ? 'border-[#00288e] ring-2 ring-[#00288e]/20' : 'border-[#e1e2e4]'}`}>
                    <div className={`w-12 h-12 rounded-lg ${st.soft} flex items-center justify-center mb-4 transition-colors group-hover:${st.bg}`}>
                      <span className={`material-symbols-outlined ${st.text}`}>{c.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#191c1e] mb-1 leading-snug">{c.label}</h3>
                    <p className="text-xs text-[#444653] mb-4 line-clamp-2">{c.desc}</p>
                    <div className="pt-3 border-t border-[#e1e2e4] flex items-center justify-between">
                      <span className={`text-xs font-bold ${st.text}`}>{c.tutorCount} gia sư</span>
                      <span className="text-xs text-[#5d5f5f]">{c.subjectCount} môn</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bảng môn học chi tiết */}
            <section className="bg-white rounded-xl p-6 md:p-8 border border-[#e1e2e4] shadow-sm mb-14">
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
                <p className="py-10 text-center text-sm text-[#444653]">Không tìm thấy môn học phù hợp với “{searchTerm}”.</p>
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

                        {/* Mở rộng: gia sư + khóa học nổi bật của môn */}
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

            {/* Lộ trình theo cấp học (bối cảnh Việt Nam) */}
            <section className="mb-14">
              <h2 className="text-2xl font-bold text-[#191c1e] mb-1">Chọn Theo Cấp Học</h2>
              <p className="text-sm text-[#444653] mb-6">Từ nền tảng tiểu học, luyện thi chuyển cấp đến sinh viên và người đi làm.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {levels.map(l => (
                  <button key={l.label} onClick={() => goTutors(`level=${encodeURIComponent(l.filter)}`)}
                    className="bg-white p-5 rounded-xl border border-[#e1e2e4] shadow-sm card-hover text-left group">
                    <div className="w-10 h-10 rounded-lg bg-[#00288e]/10 flex items-center justify-center mb-3 group-hover:bg-[#00288e] transition-colors">
                      <span className="material-symbols-outlined text-[#00288e] group-hover:text-white text-[20px]">{l.icon}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#191c1e] leading-snug">{l.label}</h3>
                    <p className="text-[11px] font-medium text-[#5d5f5f] mb-2">{l.sub}</p>
                    <div className="pt-2.5 border-t border-[#e1e2e4] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#00288e]">{l.tutorCount} gia sư</span>
                      <span className="material-symbols-outlined text-[#5d5f5f] text-[15px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* CTA cuối */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
