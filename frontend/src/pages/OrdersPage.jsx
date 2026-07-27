import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));

const STATUS = {
  active:    { label: 'Đang học',   cls: 'bg-[#dcfce7] text-[#16a34a]' },
  completed: { label: 'Hoàn thành', cls: 'bg-[#dbeafe] text-[#1e40af]' },
  pending:   { label: 'Chờ xử lý',  cls: 'bg-[#fef9c3] text-[#a16207]' },
  cancelled: { label: 'Đã hủy',     cls: 'bg-[#fee2e2] text-[#b91c1c]' },
};

function MiniHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
      <div className="max-w-[1100px] mx-auto px-6 h-[68px] flex items-center gap-6">
        <a href="#/" className="flex items-center gap-2 text-2xl font-extrabold text-[#00288e]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
        </a>
        <nav className="ml-auto flex items-center gap-6 text-sm font-semibold">
          <a href="#/courses" className="text-[#5d5f5f] hover:text-[#00288e]">Khóa học</a>
          <a href="#/my-courses" className="text-[#5d5f5f] hover:text-[#00288e]">Khóa của tôi</a>
          <a href="#/wishlist" className="text-[#5d5f5f] hover:text-[#00288e]">Yêu thích</a>
        </nav>
      </div>
    </header>
  );
}

export default function OrdersPage({ user, onGoSignIn }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/student/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [token]);

  const total = orders.reduce((s, o) => s + (Number(o.price) || 0), 0);

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans">
      <MiniHeader />
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-[28px] font-extrabold mb-1">Lịch sử đơn hàng</h1>
        <p className="text-[#5d5f5f] mb-6">Các khóa học bạn đã đăng ký / mua.</p>

        {!user || !token ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#00288e] text-5xl">lock</span>
            <p className="text-[#444653] mt-3 mb-4">Bạn cần đăng nhập để xem lịch sử đơn hàng.</p>
            <button onClick={onGoSignIn} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Đăng nhập</button>
          </div>
        ) : loading ? (
          <div className="text-center py-16 text-[#757684]">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#c4c5d5] text-6xl">receipt_long</span>
            <p className="text-lg font-semibold mt-3">Chưa có đơn hàng nào</p>
            <a href="#/courses" className="inline-block mt-4 bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af]">Khám phá khóa học</a>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between bg-white border border-[#e5e7eb] rounded-xl px-5 py-3 mb-4 shadow-sm">
              <span className="text-sm text-[#5d5f5f]"><b className="text-[#191c1e]">{orders.length}</b> đơn hàng</span>
              <span className="text-sm text-[#5d5f5f]">Tổng chi: <b className="text-[#00288e]">{fmt(total)} đ</b></span>
            </div>
            <div className="space-y-4">
              {orders.map(o => {
                const st = STATUS[o.status] || { label: o.status || '—', cls: 'bg-[#f1f5f9] text-[#475569]' };
                return (
                  <div key={o.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-[#00288e]/30 transition-colors">
                    <div className="w-20 h-16 shrink-0 rounded-lg bg-gradient-to-br from-[#00288e] to-[#3a6fe0] flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/70">school</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#191c1e] truncate">{o.title}</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-[#757684] mt-0.5">{o.subject || 'Khóa học'} · GV: {o.tutor_name || 'EduX'}</p>
                      <p className="text-xs text-[#9aa3b8] mt-0.5">Ngày đăng ký: {(o.created_at || '').slice(0, 10)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[#00288e] font-extrabold">{Number(o.price) > 0 ? `${fmt(o.price)} đ` : 'Miễn phí'}</div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <a href={`#/course/${o.course_id}`} className="text-xs font-semibold text-[#00288e] border border-[#00288e] px-3 py-1.5 rounded-lg hover:bg-[#00288e]/5">Vào học</a>
                        <a href={`#/certificate/${o.course_id}`} className="text-xs font-semibold text-white bg-gradient-to-r from-[#f5b301] to-[#d4900e] px-3 py-1.5 rounded-lg hover:-translate-y-0.5 transition-all flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">workspace_premium</span>Chứng chỉ
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
