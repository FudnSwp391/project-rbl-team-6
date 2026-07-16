import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));

function MiniHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
      <div className="max-w-[1100px] mx-auto px-6 h-[68px] flex items-center gap-6">
        <a href="#/" className="flex items-center gap-2 text-2xl font-extrabold text-[#00288e]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
        </a>
        <nav className="ml-auto flex items-center gap-6 text-sm font-semibold">
          <a href="#/courses" className="text-[#5d5f5f] hover:text-[#00288e]">Khóa học</a>
          <a href="#/find-tutors" className="text-[#5d5f5f] hover:text-[#00288e]">Tìm gia sư</a>
          <a href="#/orders" className="text-[#5d5f5f] hover:text-[#00288e]">Đơn hàng</a>
        </nav>
      </div>
    </header>
  );
}

export default function WishlistPage({ user, onGoSignIn }) {
  const { token } = useAuth();
  const [data, setData] = useState({ courses: [], tutors: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : { courses: [], tutors: [] }))
      .then(d => setData({ courses: d.courses || [], tutors: d.tutors || [] }))
      .catch(() => setData({ courses: [], tutors: [] }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { window.scrollTo(0, 0); load(); }, [load]);

  const remove = async (type, id) => {
    try {
      await fetch(`${API_BASE}/api/wishlist/${type}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch { /* ignore */ }
  };

  const empty = data.courses.length === 0 && data.tutors.length === 0;

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <MiniHeader />
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-[28px] font-extrabold mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#e11d48]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          Yêu thích
        </h1>
        <p className="text-[#5d5f5f] mb-6">Khóa học & gia sư bạn đã lưu.</p>

        {!user || !token ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#00288e] text-5xl">lock</span>
            <p className="text-[#444653] mt-3 mb-4">Bạn cần đăng nhập để xem danh sách yêu thích.</p>
            <button onClick={onGoSignIn} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Đăng nhập</button>
          </div>
        ) : loading ? (
          <div className="text-center py-16 text-[#757684]">Đang tải...</div>
        ) : empty ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#c4c5d5] text-6xl">favorite_border</span>
            <p className="text-lg font-semibold mt-3">Chưa có mục yêu thích</p>
            <p className="text-[#757684] text-sm mt-1">Bấm ❤ trên khóa học/gia sư để lưu vào đây.</p>
            <a href="#/courses" className="inline-block mt-4 bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Khám phá khóa học</a>
          </div>
        ) : (
          <div className="space-y-8">
            {data.courses.length > 0 && (
              <section>
                <h2 className="font-extrabold text-lg mb-3">Khóa học ({data.courses.length})</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.courses.map(c => (
                    <div key={c.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm flex gap-3 hover:border-[#00288e]/30 transition-colors">
                      <a href={`#/course/${c.id}`} className="w-20 h-16 shrink-0 rounded-lg bg-gradient-to-br from-[#00288e] to-[#3a6fe0] flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/70">school</span>
                      </a>
                      <div className="flex-grow min-w-0">
                        <a href={`#/course/${c.id}`} className="font-bold text-[#191c1e] hover:text-[#00288e] line-clamp-2 block">{c.title}</a>
                        <p className="text-xs text-[#757684] mt-0.5">{c.subject || 'Khóa học'} · {c.tutor_name || 'EduX'}</p>
                        <p className="text-[#00288e] font-extrabold mt-1">{Number(c.price) > 0 ? `${fmt(c.price)} đ` : 'Miễn phí'}</p>
                      </div>
                      <button onClick={() => remove('course', c.id)} title="Bỏ yêu thích" className="text-[#e11d48] hover:scale-110 transition-transform self-start">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.tutors.length > 0 && (
              <section>
                <h2 className="font-extrabold text-lg mb-3">Gia sư ({data.tutors.length})</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.tutors.map(t => (
                    <div key={t.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm flex gap-3 hover:border-[#00288e]/30 transition-colors">
                      <a href={`#/tutor-detail/${t.id}`} className="w-14 h-14 shrink-0 rounded-full overflow-hidden bg-[#dde1ff] flex items-center justify-center">
                        {t.picture ? <img src={t.picture} alt={t.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#00288e]">person</span>}
                      </a>
                      <div className="flex-grow min-w-0">
                        <a href={`#/tutor-detail/${t.id}`} className="font-bold text-[#191c1e] hover:text-[#00288e] block truncate">{t.full_name}</a>
                        <p className="text-xs text-[#757684] mt-0.5 line-clamp-1">{t.subjects || 'Gia sư'}</p>
                        <p className="text-xs text-[#757684] mt-0.5">⭐ {Number(t.avg_r || 0).toFixed(1)} ({t.review_count || 0}) {t.hourly_rate ? `· ${fmt(t.hourly_rate)}đ/giờ` : ''}</p>
                      </div>
                      <button onClick={() => remove('tutor', t.id)} title="Bỏ yêu thích" className="text-[#e11d48] hover:scale-110 transition-transform self-start">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
