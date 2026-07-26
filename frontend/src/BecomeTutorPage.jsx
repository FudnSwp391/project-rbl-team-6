import React, { useState, useEffect, useMemo } from 'react';
import CartButton from './components/CartButton';
import { API_BASE_URL } from './config';

// Trang tuyển gia sư — dựng như một dashboard: số liệu thật từ nền tảng,
// máy tính thu nhập tương tác (áp đúng mức hoa hồng 10% của hệ thống),
// biểu đồ học phí theo môn và lịch dạy linh hoạt. Không dùng thư viện biểu đồ.

const COMMISSION = 0.10;            // khớp PLATFORM_COMMISSION_RATE ở backend
const fmtVnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const fmtShort = n => {
  const v = Number(n || 0);
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '') + ' tr';
  if (v >= 1e3) return Math.round(v / 1e3) + 'k';
  return String(v);
};

// 2 gia sư tiêu biểu — hiển thị trong poster award ở hero
const TUTORS = [
  {
    id: 1,
    name: 'Trịnh Nhật Khánh',
    photo: '/tutor1.jpg',
    badge: 'Top Gia Sư 2024',
    rating: 4.9,
    courses: ['Toán 10–12', 'Giải tích', 'Lập trình C++'],
  },
  {
    id: 2,
    name: 'Lê Văn Hùng Linh',
    photo: '/tutor2.jpg',
    badge: 'Gia Sư Được Yêu Thích',
    rating: 4.8,
    courses: ['Vật Lý 10–12', 'Cơ học', 'Hóa Đại Cương'],
  },
];

export default function BecomeTutorPage({ onGoSignIn, onGoSignUp, user }) {
  const [data, setData] = useState(null);
  const [subject, setSubject] = useState('');
  const [rate, setRate] = useState(180000);
  const [sessions, setSessions] = useState(8);   // buổi / tuần
  const [hours, setHours] = useState(1.5);       // giờ / buổi

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/subjects/overview`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        const top = (d.subjects || []).find(s => s.avgPrice > 0);
        if (top) { setSubject(top.name); setRate(top.avgPrice); }
      })
      .catch(() => {});
  }, []);

  const subjects = data?.subjects || [];
  const totals = data?.totals;

  const onPickSubject = name => {
    setSubject(name);
    const s = subjects.find(x => x.name === name);
    if (s?.avgPrice) setRate(s.avgPrice);
  };

  // ── Tính thu nhập ────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const perWeek = rate * hours * sessions;
    const gross = Math.round(perWeek * 4.33);          // ~4.33 tuần / tháng
    const fee = Math.round(gross * COMMISSION);
    const net = gross - fee;
    return { gross, fee, net, perWeek: Math.round(perWeek), perYear: net * 12 };
  }, [rate, hours, sessions]);

  // Biểu đồ 6 tháng — mô phỏng lớp tăng dần khi có thêm đánh giá tốt
  const growth = useMemo(() => {
    const factors = [0.5, 0.7, 0.85, 1, 1.1, 1.2];
    return factors.map((f, i) => ({ month: `T${i + 1}`, value: Math.round(calc.net * f) }));
  }, [calc.net]);

  const maxGrowth = Math.max(...growth.map(g => g.value), 1);
  const topPaid = [...subjects].filter(s => s.avgPrice > 0).sort((a, b) => b.avgPrice - a.avgPrice).slice(0, 6);
  const maxPaid = Math.max(...topPaid.map(s => s.avgPrice), 1);

  const handleApplyNow = () => {
    if (!user) { window.location.hash = '/signup?role=tutor'; return; }
    if (user.role === 'student' || user.role === 'parent' || user.role === 'user') window.location.hash = '/tutor-profile';
    else if (user.role === 'tutor') window.location.hash = '/tutor';
    else if (user.role === 'admin') window.location.hash = '/admin';
  };

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans flex flex-col">
      <style>{`
        .bt-card { background:#fff; border:1px solid #e1e2e4; border-radius:16px; }
        .bt-rise { transition: transform .25s ease, box-shadow .25s ease; }
        .bt-rise:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -18px rgba(0,40,142,.35); }
        input[type=range] { -webkit-appearance:none; appearance:none; height:6px; border-radius:99px; background:#dde1ff; outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:#00288e; cursor:pointer; border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,.25); }
        @keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .bar-anim { transform-origin: bottom; animation: growBar .5s cubic-bezier(.22,1,.36,1); }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md border-b border-[#c4c5d5]/40 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-[80px]">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/courses">Khóa Học</a>
            <a className="text-base font-medium text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-base font-medium text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/subjects">Môn Học</a>
          </div>
          <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && <CartButton />}
            {user ? (
              <button onClick={() => {
                if (user.role === 'admin') window.location.hash = '/admin';
                else if (user.role === 'tutor') window.location.hash = '/tutor';
                else window.location.hash = '/dashboard';
              }} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">Bảng Điều Khiển</button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">Tham Gia Miễn Phí</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24">
        {/* ═══ HERO + mockup dashboard ═══ */}
        <section className="max-w-[1280px] mx-auto px-6 py-10 md:py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-[#dde1ff] text-[#00288e] px-3 py-1.5 rounded-full text-xs font-bold mb-5">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              Bạn giữ 90% học phí — nền tảng chỉ thu 10%
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight mb-5">
              Chia sẻ kiến thức.<br />
              <span className="text-[#00288e]">Chủ động thu nhập.</span>
            </h1>
            <p className="text-lg text-[#444653] mb-8 max-w-xl">
              Tự đặt học phí, tự chọn lịch dạy, nhận học sinh phù hợp qua gợi ý AI.
              Tiền học được giữ an toàn và tự động chuyển về ví của bạn sau mỗi buổi hoàn thành.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <button onClick={handleApplyNow}
                className="bg-[#00288e] text-white px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-[#1e40af] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(0,40,142,.8)] active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px]">rocket_launch</span>
                Đăng ký dạy ngay
              </button>
              <button onClick={() => scrollTo('income-calc')}
                className="bg-white border-2 border-[#00288e] text-[#00288e] px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-[#00288e] hover:text-white transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px]">calculate</span>
                Ước tính thu nhập
              </button>
            </div>

            {totals && (
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#d5d8e0]">
                {[
                  [totals.tutors, 'Gia sư đang dạy'],
                  [totals.students.toLocaleString('vi-VN'), 'Học viên & phụ huynh'],
                  [totals.avgRating || '—', 'Đánh giá trung bình'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-3xl font-extrabold text-[#00288e] leading-none">{v}</p>
                    <p className="text-xs text-[#444653] mt-1.5">{l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Poster giải thưởng gold luxury — 2 gia sư tiêu biểu (đen + vàng) */}
          <div className="relative">
            <style>{`
              @keyframes goldShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
              @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(560px) rotate(720deg);opacity:0}}
              .gold-poster{background:radial-gradient(ellipse at top,#3a2810 0%,#1a0f05 40%,#0a0602 100%);border:1px solid rgba(212,175,55,.35);box-shadow:0 30px 80px -20px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,215,120,.15);}
              .gold-text{background:linear-gradient(90deg,#c99617 0%,#f8e08e 25%,#fff5c8 50%,#f8e08e 75%,#c99617 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:goldShimmer 3s linear infinite;}
              .gold-line{height:1px;background:linear-gradient(90deg,transparent,#d4af37 30%,#fff5c8 50%,#d4af37 70%,transparent);}
              .gold-ring{background:linear-gradient(#1a0f05,#1a0f05) padding-box,conic-gradient(from 0deg,#c99617,#fff5c8,#c99617,#f8e08e,#c99617) border-box;border:2px solid transparent;}
              .chip-gold{background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(255,215,120,.08));border:1px solid rgba(212,175,55,.45);color:#f8e08e;}
              .confetti{position:absolute;width:8px;height:14px;border-radius:2px;pointer-events:none;}
              @media (prefers-reduced-motion:reduce){.confetti,.gold-text{animation:none!important}}
            `}</style>

            <div className="gold-poster relative rounded-[24px] p-7 overflow-hidden">
              {/* Confetti */}
              {[
                {l:'8%',d:'0s',c:'#d4af37',dur:'4s'},{l:'22%',d:'.6s',c:'#fff5c8',dur:'3.5s'},
                {l:'38%',d:'1.2s',c:'#c99617',dur:'4.5s'},{l:'55%',d:'.3s',c:'#f8e08e',dur:'3.8s'},
                {l:'72%',d:'.9s',c:'#d4af37',dur:'4.2s'},{l:'88%',d:'1.5s',c:'#fff5c8',dur:'3.6s'},
              ].map((f,i) => (
                <span key={i} className="confetti"
                  style={{left:f.l,top:'-14px',background:f.c,animation:`confettiFall ${f.dur} ${f.d} linear infinite`}} />
              ))}

              {/* Ribbon FES-style */}
              <div className="relative text-center mb-3 z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full chip-gold text-[10px] font-bold tracking-[.2em]">
                  <span className="material-symbols-outlined text-[13px]" style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                  EDUX AWARDS 2026
                </div>
              </div>

              <div className="gold-line mb-6" />

              <div className="relative text-center mb-8 z-10">
                <p className="text-[10px] text-[#c99617] font-bold tracking-[.3em] mb-1">GIA SƯ TIÊU BIỂU</p>
                <h3 className="gold-text text-2xl font-extrabold tracking-wider" style={{fontFamily:'Georgia,serif',textShadow:'0 0 30px rgba(255,215,120,.3)'}}>
                  ĐỘI NGŨ EDUX
                </h3>
              </div>

              {/* 2 gia sư cùng 1 dòng */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                {TUTORS.map(t => (
                  <div key={t.id} className="relative text-center">
                    {/* Avatar + lá nguyệt quế */}
                    <div className="relative flex items-center justify-center mb-3">
                      <svg width="150" height="140" viewBox="0 0 150 140" className="absolute inset-0 mx-auto"
                        style={{filter:'drop-shadow(0 0 8px rgba(212,175,55,.4))'}}>
                        <defs>
                          <linearGradient id={`gold-${t.id}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#c99617"/>
                            <stop offset=".5" stopColor="#fff5c8"/>
                            <stop offset="1" stopColor="#c99617"/>
                          </linearGradient>
                        </defs>
                        <g fill="none" stroke={`url(#gold-${t.id})`} strokeWidth="1.2">
                          <path d="M20 70 Q 15 40 30 20" strokeWidth="1.8"/>
                          {[0,1,2,3,4,5].map(i => {
                            const y = 20 + i*10; const x = 30 - i*2;
                            return <ellipse key={'l'+i} cx={x-6} cy={y} rx="5" ry="9" transform={`rotate(-40 ${x-6} ${y})`} fill={`url(#gold-${t.id})`} opacity="0.85"/>;
                          })}
                          {[0,1,2,3,4,5].map(i => {
                            const y = 20 + i*10; const x = 30 - i*2;
                            return <ellipse key={'l2'+i} cx={x+2} cy={y+4} rx="5" ry="9" transform={`rotate(-15 ${x+2} ${y+4})`} fill={`url(#gold-${t.id})`} opacity="0.85"/>;
                          })}
                          <path d="M130 70 Q 135 40 120 20" strokeWidth="1.8"/>
                          {[0,1,2,3,4,5].map(i => {
                            const y = 20 + i*10; const x = 120 + i*2;
                            return <ellipse key={'r'+i} cx={x+6} cy={y} rx="5" ry="9" transform={`rotate(40 ${x+6} ${y})`} fill={`url(#gold-${t.id})`} opacity="0.85"/>;
                          })}
                          {[0,1,2,3,4,5].map(i => {
                            const y = 20 + i*10; const x = 120 + i*2;
                            return <ellipse key={'r2'+i} cx={x-2} cy={y+4} rx="5" ry="9" transform={`rotate(15 ${x-2} ${y+4})`} fill={`url(#gold-${t.id})`} opacity="0.85"/>;
                          })}
                        </g>
                      </svg>

                      <div className="relative z-10 gold-ring rounded-full p-1" style={{width:'88px',height:'88px'}}>
                        <img
                          src={t.photo}
                          alt={t.name}
                          className="w-full h-full rounded-full object-cover block"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
                          style={{background:'linear-gradient(135deg,#c99617,#fff5c8)',borderColor:'#1a0f05'}}>
                          <span className="material-symbols-outlined text-[13px] text-[#5a3d0a]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                        </span>
                      </div>
                    </div>

                    <p className="gold-text text-sm font-extrabold uppercase tracking-wider mb-1 leading-tight" style={{fontFamily:'Georgia,serif'}}>
                      {t.name}
                    </p>
                    <p className="text-[10px] text-[#d4af37] font-semibold mb-2 leading-tight">
                      {t.badge}
                    </p>

                    <div className="inline-flex items-center gap-1 mb-2.5">
                      {[0,1,2,3,4].map(i => (
                        <span key={i} className="text-[12px]" style={{color:'#f8e08e',textShadow:'0 0 6px rgba(255,215,120,.6)'}}>★</span>
                      ))}
                      <span className="text-[10px] font-bold text-[#f8e08e] ml-1">{t.rating}</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1 px-1">
                      {t.courses.map(c => (
                        <span key={c} className="chip-gold text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="gold-line mt-7 mb-3" />

              <div className="text-center relative z-10">
                <p className="text-[9px] text-[#c99617] font-bold tracking-[.25em]">
                  KHỐI GIA SƯ NỔI BẬT · SPRING 2026
                </p>
              </div>
            </div>

            {/* Floating badges quanh poster */}
            <div className="absolute -bottom-5 -left-4 bg-white p-3.5 rounded-xl shadow-xl border border-[#e1e2e4] flex items-center gap-3">
              <div className="w-10 h-10 bg-[#dcfce7] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#15803d] text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>verified_user</span>
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Đã xác minh danh tính</p>
                <p className="text-[11px] text-[#5d5f5f]">bằng cấp & CCCD</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white px-4 py-2.5 rounded-xl shadow-xl border border-violet-200/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-500 text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>auto_awesome</span>
              <p className="text-xs font-bold">AI gợi ý học sinh phù hợp</p>
            </div>
          </div>
        </section>

        {/* ═══ MÁY TÍNH THU NHẬP ═══ */}
        <section id="income-calc" className="bg-white py-16 border-y border-[#e1e2e4]">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-2">Bạn có thể kiếm bao nhiêu?</h2>
              <p className="text-[#444653]">Kéo thanh trượt để ước tính — mức học phí gợi ý lấy từ dữ liệu thật của gia sư đang dạy trên EduX.</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Bảng điều khiển */}
              <div className="lg:col-span-2 bt-card p-6">
                <label className="block text-xs font-bold text-[#5d5f5f] uppercase tracking-wide mb-2">Môn bạn dạy</label>
                <select value={subject} onChange={e => onPickSubject(e.target.value)}
                  className="w-full mb-6 bg-[#f8f9fb] border border-[#c4c5d5] rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15">
                  {subjects.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name}{s.avgPrice > 0 ? ` — TB ${fmtShort(s.avgPrice)}/giờ` : ''}
                    </option>
                  ))}
                </select>

                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-xs font-bold text-[#5d5f5f] uppercase tracking-wide">Học phí / giờ</label>
                    <span className="text-lg font-extrabold text-[#00288e]">{fmtVnd(rate)}</span>
                  </div>
                  <input type="range" min="80000" max="600000" step="10000" value={rate}
                    onChange={e => setRate(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[10px] text-[#5d5f5f] mt-1"><span>80k</span><span>600k</span></div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-xs font-bold text-[#5d5f5f] uppercase tracking-wide">Số buổi / tuần</label>
                    <span className="text-lg font-extrabold text-[#00288e]">{sessions} buổi</span>
                  </div>
                  <input type="range" min="1" max="20" value={sessions}
                    onChange={e => setSessions(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[10px] text-[#5d5f5f] mt-1"><span>1</span><span>20</span></div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#5d5f5f] uppercase tracking-wide block mb-2">Thời lượng mỗi buổi</label>
                  <div className="flex gap-2">
                    {[1, 1.5, 2].map(h => (
                      <button key={h} onClick={() => setHours(h)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${hours === h ? 'bg-[#00288e] text-white border-transparent' : 'bg-white text-[#444653] border-[#c4c5d5] hover:border-[#00288e]'}`}>
                        {h} giờ
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kết quả + biểu đồ */}
              <div className="lg:col-span-3 rounded-2xl p-6 bg-gradient-to-br from-[#00288e] to-[#2747c4] text-white relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <p className="text-sm text-[#c7d3f7] mb-1">Thực nhận mỗi tháng (sau phí nền tảng)</p>
                  <p className="text-5xl font-extrabold mb-1 tracking-tight">{fmtVnd(calc.net)}</p>
                  <p className="text-sm text-[#c7d3f7] mb-6">≈ {fmtVnd(calc.perYear)} / năm nếu duy trì đều đặn</p>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      ['Tổng học phí thu', fmtVnd(calc.gross)],
                      ['Phí nền tảng (10%)', '– ' + fmtVnd(calc.fee)],
                      ['Mỗi tuần', fmtVnd(calc.perWeek)],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-[11px] text-[#c7d3f7] mb-0.5">{l}</p>
                        <p className="text-sm font-bold">{v}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-[#c7d3f7] uppercase tracking-wide mb-3">Dự phóng 6 tháng đầu</p>
                  <div className="flex items-end gap-2.5 h-32">
                    {growth.map((g, i) => (
                      <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{fmtShort(g.value)}</span>
                        <div className="w-full rounded-t-md bar-anim bg-white/85 hover:bg-white transition-colors"
                          style={{ height: `${Math.max(10, (g.value / maxGrowth) * 100)}%`, animationDelay: `${i * 60}ms` }} />
                        <span className="text-[10px] text-[#c7d3f7]">{g.month}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#c7d3f7] mt-3">
                    Dự phóng giả định lượng học sinh tăng dần khi bạn tích lũy đánh giá tốt. Con số thực tế phụ thuộc lịch dạy và tỉ lệ lấp đầy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HỌC PHÍ THEO MÔN (dữ liệu thật) ═══ */}
        {topPaid.length > 0 && (
          <section className="max-w-[1280px] mx-auto px-6 py-16">
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-3xl font-bold mb-2">Môn nào đang được trả cao?</h2>
                <p className="text-[#444653] mb-6">Học phí trung bình theo từng môn, tính từ hồ sơ gia sư và khóa học thật đang hoạt động trên nền tảng.</p>
                <div className="space-y-3">
                  {topPaid.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-[#5d5f5f]">{i + 1}</span>
                      <span className="w-28 text-sm font-semibold shrink-0">{s.name}</span>
                      <div className="flex-1 h-7 bg-[#edeef0] rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg bg-gradient-to-r from-[#00288e] to-[#3a6fe0] flex items-center justify-end pr-2 transition-all duration-700"
                          style={{ width: `${Math.max(18, (s.avgPrice / maxPaid) * 100)}%` }}>
                          <span className="text-[11px] font-bold text-white">{fmtShort(s.avgPrice)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-[#5d5f5f] w-16 text-right shrink-0">{s.tutorCount} GS</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { window.location.hash = '/subjects'; }}
                  className="mt-6 text-sm font-bold text-[#00288e] hover:underline flex items-center gap-1">
                  Xem tất cả môn học<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* Lịch dạy linh hoạt */}
              <div className="bt-card p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#00288e]">calendar_month</span>
                  <h3 className="text-xl font-bold">Bạn toàn quyền chọn lịch</h3>
                </div>
                <p className="text-sm text-[#444653] mb-5">Mở khung giờ rảnh, học sinh chỉ đặt được trong khung đó. Bận thì đóng — không ai ép lịch bạn.</p>
                <div className="grid grid-cols-7 gap-1.5 mb-4">
                  {['T2','T3','T4','T5','T6','T7','CN'].map(d => (
                    <div key={d} className="text-center text-[11px] font-bold text-[#5d5f5f] pb-1">{d}</div>
                  ))}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const open = [2,3,5,9,10,12,16,17,19,23,24,26].includes(i);
                    const booked = [3,10,17,24].includes(i);
                    return (
                      <div key={i}
                        className={`h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                          booked ? 'bg-[#00288e] text-white' : open ? 'bg-[#dde1ff] text-[#00288e]' : 'bg-[#f4f5f7] text-[#c4c5d5]'}`}>
                        {booked ? '●' : open ? '' : '–'}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#444653]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#00288e] inline-block" />Đã có học sinh đặt</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dde1ff] inline-block" />Bạn đang mở</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f4f5f7] border border-[#e1e2e4] inline-block" />Đã đóng</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ TẠI SAO EDUX (tính năng thật) ═══ */}
        <section className="bg-white py-16 border-y border-[#e1e2e4]">
          <div className="max-w-[1280px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-3">Tại sao dạy học với EduX?</h2>
            <p className="text-[#444653] text-center max-w-2xl mx-auto mb-12">Những thứ nền tảng lo giúp bạn, để bạn chỉ tập trung vào việc dạy.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ['savings', 'Thanh toán được đảm bảo', 'Học phí được giữ trong quỹ đảm bảo ngay khi học sinh đặt lịch, và tự động chuyển vào ví bạn sau khi buổi học hoàn thành. Không lo bị quỵt tiền.'],
                ['notifications_active', 'Không bao giờ quên lịch', 'Hệ thống gửi email nhắc tự động trước buổi học 24 giờ và 1 giờ cho cả bạn lẫn học sinh, kèm link phòng học online.'],
                ['auto_awesome', 'AI đưa học sinh đến bạn', 'Học sinh mô tả nhu cầu, AI phân tích và gợi ý gia sư phù hợp nhất về môn, hình thức học và ngân sách — bạn không cần tự đi tìm.'],
                ['schedule', 'Lịch dạy do bạn quyết', 'Tự mở khung giờ rảnh, dạy Online hay Offline tùy bạn. Học sinh xin đổi hình thức đều phải chờ bạn duyệt.'],
                ['account_balance', 'Rút tiền về ngân hàng', 'Yêu cầu rút bất cứ lúc nào từ ví EduX. Toàn bộ giao dịch có lịch sử minh bạch để bạn đối soát.'],
                ['reviews', 'Uy tín tích lũy theo thời gian', 'Mỗi đánh giá tốt giúp hồ sơ bạn xếp hạng cao hơn trong kết quả tìm kiếm, kéo thêm học sinh mới.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="bt-card p-7 bt-rise">
                  <div className="w-12 h-12 rounded-xl bg-[#00288e]/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[#00288e]">{icon}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{title}</h3>
                  <p className="text-sm text-[#444653] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ QUY TRÌNH 4 BƯỚC ═══ */}
        <section className="max-w-[1280px] mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-3">Bắt đầu chỉ với 4 bước</h2>
          <p className="text-[#444653] text-center mb-12">Hồ sơ được duyệt thường trong 1–2 ngày làm việc.</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              ['1', 'edit_note', 'Tạo hồ sơ', 'Điền thông tin, môn dạy, học phí và tải lên bằng cấp/chứng chỉ của bạn.'],
              ['2', 'verified_user', 'Chờ xác minh', 'Đội ngũ EduX kiểm tra giấy tờ và năng lực. Kết quả được gửi qua email.'],
              ['3', 'event_available', 'Mở lịch dạy', 'Chọn khung giờ rảnh và hình thức dạy. Học sinh bắt đầu đặt lịch với bạn.'],
              ['4', 'payments', 'Nhận thu nhập', 'Dạy xong, tiền tự động vào ví. Rút về ngân hàng bất cứ lúc nào.'],
            ].map(([num, icon, title, desc]) => (
              <div key={num} className="bt-card p-6 relative bt-rise">
                <span className="absolute top-5 right-5 text-4xl font-extrabold text-[#00288e]/10">{num}</span>
                <div className="w-11 h-11 rounded-xl bg-[#00288e] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-white text-[21px]">{icon}</span>
                </div>
                <h3 className="text-base font-bold mb-1.5">{title}</h3>
                <p className="text-sm text-[#444653] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CTA CUỐI ═══ */}
        <section className="max-w-[1280px] mx-auto px-6 pb-20">
          <div className="bg-gradient-to-br from-[#001a5e] via-[#00288e] to-[#2747c4] rounded-3xl p-10 md:p-14 text-white relative overflow-hidden shadow-2xl text-center">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-[#ffd166]/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Sẵn sàng đứng lớp đầu tiên?</h2>
              <p className="text-[#c7d3f7] max-w-xl mx-auto mb-8">
                Tạo hồ sơ miễn phí, không phí duy trì. Bạn chỉ chia sẻ 10% khi thực sự có thu nhập.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={handleApplyNow}
                  className="bg-white text-[#00288e] px-8 py-3.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,.45)] active:scale-95 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px]">how_to_reg</span>
                  Đăng ký làm gia sư
                </button>
                <button onClick={() => { window.location.hash = '/find-tutors'; }}
                  className="border-2 border-white/50 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-white/10 hover:border-white transition-all">
                  Xem gia sư khác đang dạy
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#edeef0] w-full mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. Đã đăng ký bản quyền.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {['Chính Sách Bảo Mật', 'Điều Khoản Dịch Vụ', 'Trung Tâm Hỗ Trợ', 'Liên Hệ'].map(t => (
              <a key={t} className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#" onClick={e => e.preventDefault()}>{t}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
