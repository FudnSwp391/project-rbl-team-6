import React, { useState } from 'react';
import CartButton from './components/CartButton';

export default function SubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="aqua-bg min-h-screen text-[#191c1e] font-sans flex flex-col">
      <style>{`
        .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3); }
        .card-hover:hover { transform: translateY(-4px); transition: all 0.2s ease-in-out; }
      `}</style>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          
          {/* Logo */}
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>

          {/* Nav Links (Centered) */}
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/subjects">Môn Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/courses">Khóa Học</a>
          </div>

          {/* Auth Buttons */}
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
                 <button onClick={onGoSignIn} className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80">Đăng Nhập</button>
                 <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">Tham Gia Miễn Phí</button>
               </>
             )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-10 px-6 max-w-[1280px] mx-auto w-full mt-16">
        <div className="relative overflow-hidden rounded-xl bg-[#00288e] px-6 py-16 md:px-16 md:py-24 mb-10 flex flex-col items-center text-center shadow-lg">
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 md:max-w-3xl tracking-tight leading-tight">Tìm Môn Học Phù Hợp Cho Hành Trình Học Tập Của Bạn</h1>
            <p className="text-lg text-[#b8c4ff] max-w-2xl mx-auto mb-10">Khám phá hàng nghìn môn học do các chuyên gia hướng dẫn, được thiết kế phù hợp với nhu cầu học tập của bạn, từ khoa học cơ bản đến ngoại ngữ nâng cao.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5d5f5f]">search</span>
                <input 
                  className="w-full pl-12 pr-6 py-3 rounded-lg border-none focus:ring-2 focus:ring-[#001453] bg-[#f8f9fb] text-[#191c1e] text-base" 
                  placeholder="Tìm kiếm môn học (vd: Giải Tích, Tiếng Trung)" 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Subject Categories Grid */}
      <main className="flex-grow max-w-[1280px] mx-auto px-6 w-full mb-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-[#191c1e]">Duyệt Theo Danh Mục</h2>
          <div className="flex gap-3">
            <button className="p-2 rounded-full border border-[#c4c5d5] hover:bg-[#edeef0] transition-colors">
              <span className="material-symbols-outlined text-[#191c1e]">tune</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Mathematics */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#00288e]/10 flex items-center justify-center mb-6 group-hover:bg-[#00288e] transition-colors">
              <span className="material-symbols-outlined text-[#00288e] group-hover:text-white">calculate</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Toán Học</h3>
            <p className="text-base text-[#444653] mb-6">Logic, cấu trúc và các mối quan hệ trừu tượng.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">1.240 Gia Sư</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#004c8b]/10 flex items-center justify-center mb-6 group-hover:bg-[#004c8b] transition-colors">
              <span className="material-symbols-outlined text-[#004c8b] group-hover:text-white">translate</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Ngoại Ngữ</h3>
            <p className="text-base text-[#444653] mb-6">Kỹ năng giao tiếp ngôn ngữ hiện đại và cổ điển.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">2.150 Gia Sư</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Sciences */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center mb-6 group-hover:bg-[#ba1a1a] transition-colors">
              <span className="material-symbols-outlined text-[#ba1a1a] group-hover:text-white">biotech</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Khoa Học</h3>
            <p className="text-base text-[#444653] mb-6">Khám phá thế giới tự nhiên và vật lý.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">890 Gia Sư</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>

          {/* Humanities */}
          <div className="bg-white p-10 rounded-xl shadow-sm border border-[#e1e2e4] card-hover cursor-pointer group">
            <div className="w-12 h-12 rounded-lg bg-[#dde1ff]/60 flex items-center justify-center mb-6 group-hover:bg-[#1e40af] transition-colors">
              <span className="material-symbols-outlined text-[#001453] group-hover:text-white">history_edu</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#191c1e] mb-1">Nhân Văn</h3>
            <p className="text-base text-[#444653] mb-6">Nghiên cứu phê bình về văn hóa và lịch sử nhân loại.</p>
            <div className="pt-6 border-t border-[#e1e2e4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00288e]">645 Gia Sư</span>
              <span className="material-symbols-outlined text-[#5d5f5f] text-sm">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Detailed Lists (Bento Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Popular Subjects List */}
          <section className="lg:col-span-8 bg-white rounded-xl p-10 border border-[#e1e2e4] shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-semibold text-[#191c1e]">Môn Học Phổ Biến</h2>
              <a className="text-[#00288e] text-sm font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Xem Tất Cả</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Đại Số II', cat: 'Toán Học', color: 'bg-[#00288e]', tcount: '342 Gia Sư' },
                { name: 'Hóa Hữu Cơ', cat: 'Khoa Học', color: 'bg-[#ba1a1a]', tcount: '128 Gia Sư' },
                { name: 'Hội Thoại Tiếng Tây Ban Nha', cat: 'Ngoại Ngữ', color: 'bg-[#1e40af]', tcount: '876 Gia Sư' },
                { name: 'Văn Học Thế Giới', cat: 'Nhân Văn', color: 'bg-[#004883]', tcount: '215 Gia Sư' },
                { name: 'Cấu Trúc Dữ Liệu', cat: 'Khoa Học Máy Tính', color: 'bg-[#003564]', tcount: '405 Gia Sư' },
                { name: 'Kinh Tế Vĩ Mô', cat: 'Kinh Doanh', color: 'bg-[#191c1e]', tcount: '190 Gia Sư' }
              ]
              .filter(sub => !searchTerm.trim() || `${sub.name} ${sub.cat}`.toLowerCase().includes(searchTerm.toLowerCase().trim()))
              .map(sub => (
                <div key={sub.name} className="flex items-center justify-between p-6 bg-[#f8f9fb] rounded-lg hover:bg-[#e7e8ea] transition-colors cursor-pointer border border-transparent hover:border-[#c4c5d5]">
                  <div className="flex items-center gap-6">
                    <div className={`w-2 h-2 rounded-full ${sub.color}`}></div>
                    <div>
                      <span className="block text-sm font-semibold text-[#191c1e]">{sub.name}</span>
                      <span className="text-xs font-medium text-[#444653]">{sub.cat}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-[#d4e3ff] rounded-full text-[#001c39]">{sub.tcount}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Cards Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#1e40af] text-white p-8 rounded-xl relative overflow-hidden shadow-md">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <span className="material-symbols-outlined text-4xl mb-4 text-[#b8c4ff]">school</span>
              <h3 className="text-xl font-bold mb-2">Ôn Thi AP</h3>
              <p className="text-sm text-[#dde1ff] mb-6">Tìm gia sư chuyên biệt giúp bạn đạt điểm 5 trong kỳ thi Advanced Placement sắp tới.</p>
              <button className="bg-white text-[#00288e] w-full py-3 rounded-lg text-sm font-semibold hover:bg-[#f0f1f3] transition-colors shadow-sm">
                Tìm Gia Sư AP
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#e1e2e4] shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#edeef0] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#444653]">help</span>
              </div>
              <h3 className="text-lg font-bold text-[#191c1e] mb-2">Không tìm thấy môn học?</h3>
              <p className="text-sm text-[#444653] mb-6">Hãy cho chúng tôi biết bạn đang tìm kiếm gì và chúng tôi sẽ cố gắng bổ sung vào nền tảng.</p>
              <button className="text-[#00288e] border border-[#00288e] w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-[#f3f4f6] transition-colors">
                Yêu Cầu Môn Học
              </button>
            </div>
          </aside>
          
        </div>
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
