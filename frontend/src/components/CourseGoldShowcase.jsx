import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const RATING_LABEL = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

// ── Ngôi sao vàng ──────────────────────────────────────────────────────────
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
          <span className="material-symbols-outlined gold-star-glow" style={{ fontSize: size, color: active >= s ? '#f5b301' : '#d9c9a3', fontVariationSettings: active >= s ? "'FILL' 1" : "'FILL' 0" }}>star</span>
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
        .cgs { --gold1:#f7d774; --gold2:#e0a82e; --gold3:#b8860b; --ink:#3a2c05; }
        @keyframes cgsSweep { 0%{transform:translateX(-130%)} 100%{transform:translateX(230%)} }
        @keyframes cgsGlow { 0%,100%{box-shadow:0 10px 36px -10px rgba(224,168,46,.55)} 50%{box-shadow:0 16px 52px -8px rgba(224,168,46,.85)} }
        @keyframes cgsFloat { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-7px) rotate(4deg)} }
        @keyframes cgsPop { 0%{transform:scale(.7);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes cgsStarPulse { 0%,100%{filter:drop-shadow(0 0 0 rgba(245,179,1,0))} 50%{filter:drop-shadow(0 0 6px rgba(245,179,1,.7))} }
        .cgs-board { position:relative; overflow:hidden; border-radius:1.5rem;
          background:linear-gradient(135deg,#fff6da 0%,#ffe9a8 35%,#f3c34e 70%,#e0a82e 100%);
          border:1px solid rgba(184,134,11,.45); animation:cgsGlow 4.5s ease-in-out infinite; }
        .cgs-board::after { content:''; position:absolute; top:0; left:0; width:38%; height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);
          transform:translateX(-130%); animation:cgsSweep 5s ease-in-out infinite; pointer-events:none; }
        .cgs-trophy { animation:cgsFloat 4s ease-in-out infinite; transform-origin:center; }
        .cgs-tile { background:rgba(255,255,255,.55); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.7);
          border-radius:1rem; animation:cgsPop .5s cubic-bezier(.2,.9,.3,1.4) both; }
        .cgs-tile:hover { transform:translateY(-4px); transition:transform .25s; background:rgba(255,255,255,.8); }
        .gold-star-glow { animation:cgsStarPulse 3s ease-in-out infinite; }
        .gold-btn { position:relative; overflow:hidden; color:#3a2c05; font-weight:800;
          background:linear-gradient(135deg,#fde68a,#f5b301 55%,#d4900e);
          box-shadow:0 8px 22px -6px rgba(224,168,46,.7), inset 0 1px 0 rgba(255,255,255,.6);
          transition:transform .2s, box-shadow .2s; }
        .gold-btn:hover { transform:translateY(-2px); box-shadow:0 14px 30px -8px rgba(224,168,46,.9); }
        .gold-btn::before { content:''; position:absolute; top:0; left:0; width:40%; height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);
          transform:translateX(-150%); }
        .gold-btn:hover::before { animation:cgsSweep 1.1s ease; }
        .cgs-card { border:1px solid #f0e6c8; border-radius:1rem; background:#fffdf7; }
        .cgs-frame { padding:3px; border-radius:1.25rem; background:linear-gradient(135deg,#fde68a,#e0a82e,#b8860b); animation:cgsGlow 5s ease-in-out infinite; }
      `}</style>

      {/* ══ 1. VIDEO DEMO ══════════════════════════════════════════════════ */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#191c1e] mb-3">
          <span className="material-symbols-outlined" style={{ color: '#e0a82e', fontVariationSettings: "'FILL' 1" }}>smart_display</span>
          Video demo bài giảng
          <span className="text-[11px] font-bold text-[#b8860b] bg-[#fff3cf] border border-[#f0d98a] px-2 py-0.5 rounded-full">Học thử miễn phí</span>
        </h2>
        <div className="cgs-frame">
          <div className="rounded-[1.1rem] overflow-hidden bg-black relative aspect-video">
            {demo && demoEmbed ? (
              <iframe className="w-full h-full" src={demoEmbed} title="Video demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : demo && demo.video_url ? (
              <video className="w-full h-full" src={demo.video_url} controls poster={course.thumbnail_url || undefined} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-6"
                style={{ background: 'linear-gradient(135deg,#1a1407,#3a2c05)' }}>
                <span className="material-symbols-outlined cgs-trophy" style={{ fontSize: 60, color: '#f5b301' }}>movie</span>
                <p className="text-[#f7d774] font-bold mt-3">Gia sư chưa tải video demo cho khóa <span className="text-white">{course.subject}</span></p>
                <p className="text-[#c9b78a] text-sm mt-1">Video demo sẽ tự hiển thị khi gia sư thêm bài giảng "Xem trước".</p>
              </div>
            )}
          </div>
        </div>
        {demo && <p className="mt-2 text-sm text-[#5d5f5f]"><span className="font-semibold text-[#191c1e]">Bài demo:</span> {demo.title}{demo.duration_label ? ` · ${demo.duration_label}` : ''}</p>}
      </section>

      {/* ══ 2. BẢNG VÀNG THÀNH TÍCH ════════════════════════════════════════ */}
      <section className="cgs-board p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined cgs-trophy" style={{ fontSize: 40, color: '#9a6a04', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: '#5c4406' }}>BẢNG VÀNG THÀNH TÍCH</h2>
              <p className="text-[13px] font-semibold" style={{ color: '#8a6a04' }}>Thành tích khóa học · {course.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <div key={s.label} className="cgs-tile p-4 text-center" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#c98a0a', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <div className="text-2xl font-black mt-1" style={{ color: '#4a3705' }}>{s.value}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: '#8a6a04' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {onEnroll && !enrolled && (
            <button onClick={onEnroll} className="gold-btn mt-5 w-full md:w-auto px-8 py-3 rounded-xl text-[15px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>military_tech</span>
              Đăng ký học ngay
            </button>
          )}
        </div>
      </section>

      {/* ══ 3. PHẢN HỒI & ĐÁNH GIÁ ═════════════════════════════════════════ */}
      <section className="cgs-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#191c1e] mb-5">
          <span className="material-symbols-outlined" style={{ color: '#e0a82e', fontVariationSettings: "'FILL' 1" }}>reviews</span>
          Phản hồi học viên ({count})
        </h2>

        {count > 0 && (
          <div className="flex flex-col sm:flex-row gap-6 items-center mb-6 pb-6 border-b border-[#f0e6c8]">
            <div className="text-center shrink-0 px-6 py-4 rounded-2xl" style={{ background: 'linear-gradient(135deg,#fff6da,#ffe9a8)', border: '1px solid #f0d98a' }}>
              <div className="text-5xl font-black" style={{ color: '#b8860b' }}>{avg.toFixed(1)}</div>
              <GoldStars value={Math.round(avg)} readonly size={18} />
              <div className="text-xs text-[#8a6a04] font-semibold mt-1">{count} đánh giá</div>
            </div>
            <div className="flex-grow w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-[#757684] w-3">{s}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#f5b301', fontVariationSettings: "'FILL' 1" }}>star</span>
                  <div className="flex-grow h-2.5 bg-[#f3eeda] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${count ? (dist[s - 1] / count) * 100 : 0}%`, background: 'linear-gradient(90deg,#f5b301,#e0a82e)' }} />
                  </div>
                  <span className="text-xs text-[#757684] w-6 text-right">{dist[s - 1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viết / sửa đánh giá */}
        {editingId ? (
          <form onSubmit={submit} className="mb-6 rounded-xl p-4" style={{ background: '#fffdf7', border: '1px solid #f0e6c8' }}>
            <p className="text-sm font-semibold text-[#5d5f5f] mb-2">Chọn số sao</p>
            <GoldStars value={rating} onChange={setRating} />
            {rating > 0 && <p className="text-sm font-bold mt-1" style={{ color: '#b8860b' }}>{RATING_LABEL[rating]}</p>}
            <textarea className="w-full mt-3 rounded-lg border border-[#e6dcc0] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e0a82e]/30 focus:border-[#e0a82e]"
              rows={3} placeholder="Chia sẻ trải nghiệm khóa học..." value={comment} onChange={e => setComment(e.target.value)} />
            {err && <p className="text-sm text-[#ba1a1a] mt-1">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={busy} className="gold-btn px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                {busy ? 'Đang gửi...' : (editingId === 'new' ? 'Gửi đánh giá' : 'Lưu thay đổi')}
              </button>
              <button type="button" onClick={() => { setEditingId(null); setErr(''); }} className="px-5 py-2 rounded-lg text-sm font-semibold text-[#444653] hover:bg-[#f3eeda]">Hủy</button>
            </div>
          </form>
        ) : (
          <div className="mb-6">
            {!user ? (
              <p className="text-sm text-[#5d5f5f]"><a href="#/signin" className="font-semibold hover:underline" style={{ color: '#b8860b' }}>Đăng nhập</a> để viết đánh giá.</p>
            ) : myReview ? null : (
              <button onClick={openCreate} className="gold-btn inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm">
                <span className="material-symbols-outlined text-[18px]">rate_review</span>Viết đánh giá
              </button>
            )}
          </div>
        )}

        {/* Danh sách */}
        {loading ? (
          <p className="text-sm text-[#757684]">Đang tải đánh giá...</p>
        ) : count === 0 ? (
          <p className="text-sm text-[#757684]">Chưa có đánh giá nào — hãy là người đầu tiên để lại phản hồi vàng! ⭐</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => {
              const isMine = user && r.user_id === user.id;
              const name = r.reviewer_name || 'Người dùng';
              return (
                <div key={r.id} className="pb-4 border-b border-[#f3eeda] last:border-0">
                  <div className="flex items-center gap-3">
                    {r.reviewer_picture ? (
                      <img src={r.reviewer_picture} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-[#f0d98a]" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-[#f0d98a]" style={{ background: '#fff3cf', color: '#b8860b' }}>{name.charAt(0).toUpperCase()}</div>
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
