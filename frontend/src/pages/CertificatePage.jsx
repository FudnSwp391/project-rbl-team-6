import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function CertificatePage({ courseId, user, onGoSignIn }) {
  const { token } = useAuth();
  const [cert, setCert] = useState(null);
  const [notReady, setNotReady] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const id = courseId || window.location.hash.match(/#\/certificate\/([^/]+)/)?.[1];
    if (!token) { setLoading(false); return; }
    if (!id) { setError('Không tìm thấy khóa học.'); setLoading(false); return; }
    fetch(`${API_BASE}/api/student/certificate/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d && d.eligible) setCert(d); else setNotReady(d || { message: 'Bạn chưa đủ điều kiện nhận chứng chỉ.' }); })
      .catch(() => setError('Không tải được chứng chỉ.'))
      .finally(() => setLoading(false));
  }, [courseId, token]);

  const dateStr = cert ? new Date(cert.issuedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const cid = courseId || (typeof window !== 'undefined' ? window.location.hash.match(/#\/certificate\/([^/]+)/)?.[1] : '');

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .cert-card { box-shadow: none !important; } }`}</style>

      <header className="no-print sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-[1000px] mx-auto px-6 h-[68px] flex items-center gap-6">
          <a href="#/" className="flex items-center gap-2 text-2xl font-extrabold text-[#00288e]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
          </a>
          <a href="#/orders" className="ml-auto text-sm font-semibold text-[#5d5f5f] hover:text-[#00288e]">← Đơn hàng của tôi</a>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-10">
        {!user || !token ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#00288e] text-5xl">lock</span>
            <p className="text-[#444653] mt-3 mb-4">Bạn cần đăng nhập để xem chứng chỉ.</p>
            <button onClick={onGoSignIn} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Đăng nhập</button>
          </div>
        ) : loading ? (
          <div className="text-center py-16 text-[#757684]">Đang tải chứng chỉ...</div>
        ) : error ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#9aa3b8] text-6xl">workspace_premium</span>
            <p className="text-lg font-semibold mt-3">{error}</p>
            <a href="#/courses" className="inline-block mt-4 bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Về khóa học</a>
          </div>
        ) : notReady ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto">
            <span className="material-symbols-outlined text-[#e0a82e] text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <p className="text-lg font-semibold mt-3 text-[#191c1e]">Chưa đủ điều kiện nhận chứng chỉ</p>
            <p className="text-[#5d5f5f] text-sm mt-2">{notReady.message}</p>
            {typeof notReady.total === 'number' && notReady.total > 0 && (
              <div className="mt-5 text-left">
                <div className="flex justify-between text-xs text-[#757684] mb-1">
                  <span>Tiến độ học</span><span>{notReady.completed}/{notReady.total} bài · {notReady.progress}%</span>
                </div>
                <div className="h-3 bg-[#eef0f4] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#00288e] to-[#3b6fe0]" style={{ width: `${notReady.progress}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-6">
              <a href={`#/course/${cid}`} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Tiếp tục học</a>
              <a href="#/orders" className="border-2 border-[#00288e] text-[#00288e] px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#00288e]/5">Đơn hàng</a>
            </div>
          </div>
        ) : cert && (
          <>
            {/* Chứng chỉ */}
            <div className="cert-card relative bg-white rounded-2xl shadow-2xl overflow-hidden border-[6px] border-[#e0a82e]"
              style={{ boxShadow: '0 30px 70px -20px rgba(0,40,142,.35)' }}>
              {/* viền vàng trong */}
              <div className="absolute inset-3 border-2 border-[#e0a82e]/40 rounded-xl pointer-events-none" />
              {/* hoa văn nền */}
              <span className="material-symbols-outlined absolute -right-8 -bottom-10 text-[#00288e]/5 select-none" style={{ fontSize: 280 }}>school</span>

              <div className="relative px-10 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-extrabold text-[#00288e] mb-2">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
                </div>
                <div className="inline-flex items-center gap-2 text-[#b8860b] font-bold tracking-[0.2em] text-sm uppercase">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  Chứng chỉ hoàn thành
                </div>

                <p className="text-[#5d5f5f] mt-8">Chứng nhận rằng</p>
                <h1 className="text-[40px] leading-tight font-black text-[#191c1e] mt-2"
                  style={{ fontFamily: 'Georgia, serif' }}>{cert.studentName}</h1>
                <div className="w-40 h-[3px] bg-gradient-to-r from-transparent via-[#e0a82e] to-transparent mx-auto mt-3" />

                <p className="text-[#5d5f5f] mt-6 max-w-xl mx-auto">đã hoàn thành xuất sắc khóa học</p>
                <h2 className="text-2xl font-extrabold text-[#00288e] mt-2">"{cert.courseTitle}"</h2>
                {cert.subject && <p className="text-sm text-[#757684] mt-1">Lĩnh vực: {cert.subject}</p>}

                <div className="flex items-end justify-between mt-12 px-4">
                  <div className="text-center">
                    <p className="font-[Georgia] italic text-[#00288e] text-lg border-b border-[#c4c5d5] pb-1 px-6">{cert.tutorName}</p>
                    <p className="text-xs text-[#757684] mt-1">Giảng viên</p>
                  </div>
                  <div className="text-center">
                    <span className="material-symbols-outlined text-[#e0a82e]" style={{ fontSize: 54, fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#191c1e] border-b border-[#c4c5d5] pb-1 px-6">{dateStr}</p>
                    <p className="text-xs text-[#757684] mt-1">Ngày cấp</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#9aa3b8] mt-8">Mã chứng chỉ: {cert.certId}</p>
              </div>
            </div>

            {/* Nút (ẩn khi in) */}
            <div className="no-print flex justify-center gap-3 mt-6">
              <button onClick={() => window.print()} className="bg-gradient-to-r from-[#f5b301] to-[#d4900e] text-[#2a1f04] font-extrabold px-6 py-3 rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">download</span>In / Tải chứng chỉ
              </button>
              <a href="#/orders" className="border-2 border-[#00288e] text-[#00288e] font-bold px-6 py-3 rounded-xl hover:bg-[#00288e]/5 transition-colors">Quay lại</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
