import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const RATING_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

function GoldStars({ value, onChange, readonly = false, size = 22 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" disabled={readonly}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default leading-none' : 'cursor-pointer leading-none'}
          aria-label={`${s} sao`}>
          <span className="material-symbols-outlined gold-star-glow" style={{ fontSize: size, color: active >= s ? '#FFB800' : '#e1e2e4', fontVariationSettings: active >= s ? "'FILL' 1" : "'FILL' 0" }}>star</span>
        </button>
      ))}
    </span>
  );
}

// Chuyển link YouTube sang dạng nhúng
function toEmbed(url = '') {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

export default function CourseGoldShowcase({ course, courseId, onEnroll, enrolled }) {
  const { user } = useAuth();
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
  const [data, setData] = useState({ reviews: [], avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!courseId) { setLoading(false); return; }
    fetch(`${API_BASE}/api/entity-reviews?target_type=course&target_id=${encodeURIComponent(courseId)}`)
      .then(r => (r.ok ? r.json() : { reviews: [], avg: 0, count: 0 }))
      .then(d => setData(d && Array.isArray(d.reviews) ? d : { reviews: [], avg: 0, count: 0 }))
      .catch(() => setData({ reviews: [], avg: 0, count: 0 }))
      .finally(() => setLoading(false));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  // ── Dữ liệu thành tích ───────────────────────────────────────────────────
  const reviews = data.reviews || [];
  const count = data.count || reviews.length;
  const avg = Number(data.avg) || Number(course.avg_rating) || 0;
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  const lessons = course.total_lessons || (course.lessons || []).length || 0;
  const satisfaction = count > 0 ? Math.round(((dist[3] + dist[4]) / count) * 100) : 0;
  const myReview = user ? reviews.find(r => r.user_id === user.id) : null;

  // ── Video demo: ưu tiên bài "Xem trước" có video, rồi tới bài đầu có video ──
  const ls = course.lessons || [];
  const isVid = (u = '') => /^https?:\/\//i.test(u) || /youtu\.?be/i.test(u);
  const demo = ls.find(l => l.is_preview && isVid(l.video_url)) || ls.find(l => isVid(l.video_url)) || null;
  const demoEmbed = demo ? toEmbed(demo.video_url) : null;

  const openCreate = () => { setEditingId('new'); setRating(0); setComment(''); setErr(''); };
  const openEdit = () => { setEditingId(myReview.id); setRating(myReview.rating); setComment(myReview.comment || ''); setErr(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setErr('Vui lòng chọn số sao.'); return; }
    setBusy(true); setErr('');
    try {
      const isNew = editingId === 'new';
      const res = await fetch(isNew ? `${API_BASE}/api/entity-reviews` : `${API_BASE}/api/entity-reviews/${editingId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(isNew ? { target_type: 'course', target_id: courseId, rating, comment: comment.trim() } : { rating, comment: comment.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Không gửi được đánh giá.');
      setEditingId(null); setRating(0); setComment(''); load();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Xóa đánh giá của bạn?')) return;
    try {
      await fetch(`${API_BASE}/api/entity-reviews/${myReview.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch { /* ignore */ }
  };

  const STATS = [
    { icon: 'grade', value: avg.toFixed(1), label: 'Điểm đánh giá' },
    { icon: 'verified', value: count > 0 ? `${satisfaction}%` : '—', label: 'Học viên hài lòng' },
    { icon: 'play_lesson', value: lessons, label: 'Bài giảng' },
    { icon: 'reviews', value: count, label: 'Lượt phản hồi' },
  ];

  return (
    <div className="cgs space-y-6">
      <style>{`
        .cgs { --blue1:#bbdefb; --blue2:#1e3a8a; --blue3:#00288e; --ink:#191c1e; }
        @keyframes cgsSweep { 0%{transform:translateX(-130%)} 100%{transform:translateX(230%)} }
        @keyframes cgsGlow { 0%,100%{box-shadow:0 10px 36px -10px rgba(0,40,142,.15)} 50%{box-shadow:0 16px 52px -8px rgba(0,40,142,.3)} }
        @keyframes cgsFloat { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-7px) rotate(4deg)} }
        @keyframes cgsPop { 0%{transform:scale(.7);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes cgsStarPulse { 0%,100%{filter:drop-shadow(0 0 0 rgba(255,184,0,0))} 50%{filter:drop-shadow(0 0 6px rgba(255,184,0,.7))} }
        
        .cgs-board { position:relative; overflow:hidden; border-radius:1.5rem;
          background:linear-gradient(90deg,#e3f2fd 0%,#eaf4ff 70%,#fff8e1 100%);
          border:1px solid #bbdefb; animation:cgsGlow 4.5s ease-in-out infinite; }
        .cgs-board::after { content:''; position:absolute; top:0; left:0; width:38%; height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);
          transform:translateX(-130%); animation:cgsSweep 5s ease-in-out infinite; pointer-events:none; }
        .cgs-trophy { animation:cgsFloat 4s ease-in-out infinite; transform-origin:center; }
        
        .cgs-tile { background:rgba(255,255,255,.9); backdrop-filter:blur(4px); border:1px solid #ffffff;
          border-radius:1rem; animation:cgsPop .5s cubic-bezier(.2,.9,.3,1.4) both; }
        .cgs-tile:hover { transform:translateY(-4px); transition:transform .25s; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.05); }
        .gold-star-glow { animation:cgsStarPulse 3s ease-in-out infinite; }
        
        .blue-btn { position:relative; overflow:hidden; color:#ffffff; font-weight:700;
          background:#1e40af; border:none;
          box-shadow:0 4px 12px rgba(30,64,175,0.4);
          transition:transform .2s, box-shadow .2s, background .2s; }
        .blue-btn:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(30,64,175,0.6); background:#1e3a8a; }
        
        .cgs-card { border:1px solid #e1e2e4; border-radius:1rem; background:#ffffff; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); }
        .cgs-frame { padding:3px; border-radius:1.25rem; background:linear-gradient(135deg,#e1e2e4,#ffffff); box-shadow: 0 0 0 1px #e1e2e4 inset; }
      `}</style>

      {/* ══ 1. VIDEO DEMO ══════════════════════════════════════════════════ */}
      <section className="cgs-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#00288e] mb-4">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>ondemand_video</span>
          Video demo bài giảng
          <span className="text-xs font-normal text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full ml-2">Học thử miễn phí</span>
        </h2>
        <div className="cgs-frame">
          <div className="rounded-xl overflow-hidden bg-black relative aspect-video shadow-inner">
            {demo && demoEmbed ? (
              <iframe className="w-full h-full" src={demoEmbed} title="Video demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : demo && demo.video_url ? (
              <video className="w-full h-full" src={demo.video_url} controls poster={course.thumbnail_url || undefined} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-6"
                style={{ background: 'linear-gradient(135deg,#2a2414,#120f08)' }}>
                <span className="material-symbols-outlined cgs-trophy opacity-80" style={{ fontSize: 48, color: '#3a6fe0', fontVariationSettings: "'FILL' 1" }}>movie</span>
                <p className="text-white/90 font-semibold text-sm mt-3 mb-1">Gia sư chưa tải video demo cho khóa <span className="text-white font-bold">{course.subject}</span></p>
                <p className="text-white/60 text-xs">Video demo sẽ tự hiển thị khi gia sư thêm bài giảng "Xem trước".</p>
              </div>
            )}
          </div>
        </div>
        {demo && <p className="mt-3 text-sm text-[#5d5f5f]"><span className="font-semibold text-[#191c1e]">Bài demo:</span> {demo.title}{demo.duration_label ? ` · ${demo.duration_label}` : ''}</p>}
      </section>

      {/* ══ 2. BẢNG VÀNG THÀNH TÍCH ════════════════════════════════════════ */}
      <section className="cgs-board p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined cgs-trophy" style={{ fontSize: 32, color: '#00288e', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <div>
              <h2 className="text-lg md:text-xl font-bold tracking-wide uppercase" style={{ color: '#00288e' }}>BẢNG VÀNG THÀNH TÍCH</h2>
              <p className="text-xs md:text-sm font-semibold" style={{ color: '#00288e', opacity: 0.7 }}>Thành tích khóa học - {course.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <div key={s.label} className="cgs-tile p-4 text-center shadow-sm hover:shadow-md" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="material-symbols-outlined mb-2" style={{ fontSize: 24, color: '#00288e', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <div className="text-2xl font-black mt-1" style={{ color: '#00288e' }}>{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: '#00288e', opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {onEnroll && !enrolled && (
            <button onClick={onEnroll} className="blue-btn mt-5 w-full md:w-auto px-8 py-3 text-[14px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>military_tech</span>
              Đăng ký học ngay
            </button>
          )}
        </div>
      </section>

      {/* ══ 3. PHẢN HỒI & ĐÁNH GIÁ ═════════════════════════════════════════ */}
      <section className="cgs-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#00288e] mb-5">
          <span className="material-symbols-outlined" style={{ color: '#00288e', fontVariationSettings: "'FILL' 1" }}>rate_review</span>
          Phản hồi học viên ({count})
        </h2>

        {count > 0 && (
          <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 pb-6 border-b border-[#e1e2e4]">
            <div className="text-center shrink-0 px-6 py-4 rounded-2xl bg-[#f8f9fb]">
              <div className="text-5xl font-bold" style={{ color: '#00288e' }}>{avg.toFixed(1)}</div>
              <div className="mt-1"><GoldStars value={Math.round(avg)} readonly size={20} /></div>
              <div className="text-xs text-[#444653] mt-1">{count} đánh giá</div>
            </div>
            <div className="flex-grow w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-[#757684] w-3">{s}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#FFB800', fontVariationSettings: "'FILL' 1" }}>star</span>
                  <div className="flex-grow h-2.5 bg-[#f8f9fb] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#00288e]" style={{ width: `${count ? (dist[s - 1] / count) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-[#757684] w-6 text-right">{dist[s - 1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viết / sửa đánh giá */}
        {editingId ? (
          <form onSubmit={submit} className="mb-6 rounded-xl p-4 bg-[#f8f9fb] border border-[#e1e2e4]">
            <p className="text-sm font-semibold text-[#5d5f5f] mb-2">Chọn số sao</p>
            <GoldStars value={rating} onChange={setRating} />
            {rating > 0 && <p className="text-sm font-bold mt-1 text-[#00288e]">{RATING_LABEL[rating]}</p>}
            <textarea className="w-full mt-3 rounded-lg border border-[#c4c5d5] p-3 text-sm focus:outline-none focus:border-[#00288e]"
              rows={3} placeholder="Chia sẻ trải nghiệm khóa học..." value={comment} onChange={e => setComment(e.target.value)} />
            {err && <p className="text-sm text-[#ba1a1a] mt-1">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={busy} className="blue-btn px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                {busy ? 'Đang gửi...' : (editingId === 'new' ? 'Gửi đánh giá' : 'Lưu thay đổi')}
              </button>
              <button type="button" onClick={() => { setEditingId(null); setErr(''); }} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#444653] bg-white border border-[#c4c5d5] hover:bg-[#f8f9fb]">Hủy</button>
            </div>
          </form>
        ) : (
          <div className="mb-6">
            {!user ? (
              <p className="text-sm text-[#5d5f5f]"><a href="#/signin" className="font-semibold text-[#00288e] hover:underline">Đăng nhập</a> để viết đánh giá.</p>
            ) : myReview ? null : (
              <button onClick={openCreate} className="blue-btn px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">edit_square</span>Viết đánh giá
              </button>
            )}
          </div>
        )}

        {/* Danh sách */}
        {loading ? (
          <p className="text-sm text-[#757684]">Đang tải đánh giá...</p>
        ) : count === 0 ? (
          <p className="text-[#444653] text-sm flex items-center gap-2">Chưa có đánh giá nào — hãy là người đầu tiên để lại phản hồi vàng! <span className="material-symbols-outlined text-[#FFB800] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span></p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => {
              const isMine = user && r.user_id === user.id;
              const name = r.reviewer_name || 'Người dùng';
              return (
                <div key={r.id} className="pb-4 border-b border-[#f3eeda] last:border-0">
                  <div className="flex items-center gap-3">
                    {r.reviewer_picture ? (
                      <img src={r.reviewer_picture} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-[#dde1ff] text-[#00288e]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="text-sm font-semibold text-[#191c1e]">{name}{isMine && <span style={{ color: '#b8860b' }} className="font-medium"> (Bạn)</span>}</div>
                      <GoldStars value={r.rating} readonly size={14} />
                    </div>
                    <div className="text-xs text-[#757684] flex items-center gap-2">
                      {(r.created_at || '').slice(0, 10)}
                      {isMine && (
                        <span className="flex gap-1">
                          <button onClick={openEdit} title="Sửa" className="text-[#757684] hover:text-[#b8860b]"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                          <button onClick={remove} title="Xóa" className="text-[#757684] hover:text-[#ba1a1a]"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </span>
                      )}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-[#444653] mt-2 ml-12">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
