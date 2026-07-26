import { useState, useRef, useEffect } from 'react';

// Khu người dùng trên navbar — đồng bộ với trang chủ học sinh (avatar + tên + menu xổ).
// Dùng chung cho các trang phụ (Tìm Gia Sư, Môn Học...) để navbar nhất quán toàn site.
export default function NavUserMenu({ user, onGoSignIn, onGoSignUp }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '/';
    window.location.reload();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <button onClick={onGoSignUp} className="hidden lg:block text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors">
          Đăng Ký
        </button>
        <button onClick={onGoSignIn}
          className="bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
          Đăng Nhập
        </button>
      </div>
    );
  }

  const item = 'px-4 py-3 text-sm text-[#333] hover:bg-[#f0f3fa] transition-colors border-b border-[#eef0f4] text-left';
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 cursor-pointer">
        {user.picture
          ? <img src={user.picture} alt={user.name || ''} className="w-9 h-9 rounded-full object-cover border border-[#e1e2e4]" />
          : <span className="material-symbols-outlined text-[#00288e] text-[32px]">account_circle</span>}
        <span className="hidden sm:block text-sm font-semibold text-[#191c1e] max-w-[140px] truncate">{user.name || user.email}</span>
        <span className="text-[#5d5f5f] text-[10px]">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[180px] bg-white border border-[#e1e2e4] rounded-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)] overflow-hidden z-[1000] flex flex-col">
          <a href="#/dashboard" className={item}>Bảng điều khiển</a>
          {user.role === 'student' && (
            <a href="#/my-courses" className={item}>Khóa học của tôi</a>
          )}
          {(user.role === 'student' || user.role === 'tutor' || user.role === 'parent') && (
            <a href="#/my-ai-cases" className={item}>Khiếu nại &amp; AI</a>
          )}
          <button onClick={logout} className="px-4 py-3 text-sm text-left text-[#d32f2f] hover:bg-[#fef2f2] transition-colors w-full font-medium">
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
