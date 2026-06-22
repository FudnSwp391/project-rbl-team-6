import React, { useEffect } from 'react';
import EntityReviews from './components/EntityReviews';

export default function TutorDetailPage({ onGoSignIn, onGoSignUp, user }) {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  // Gia sư đang xem (được FindTutorsPage / AI Gợi ý / Trang chủ lưu khi điều hướng)
  let viewingTutor = null;
  try { viewingTutor = JSON.parse(sessionStorage.getItem('viewingTutor') || 'null'); } catch { viewingTutor = null; }

  return (
    <div className="aqua-bg text-[#191c1e] min-h-screen font-sans">
      <style>{`
        .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .active-interaction:active { transform: scale(0.98); transition: transform 0.1s; }
      `}</style>
      
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          {/* Logo */}
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>

          {/* Nav Links (Centered) */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/ai-suggest">AI Gợi Ý</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/courses">Khóa Học</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4 z-10">
            {user ? (
               <button
                 onClick={() => {
                   if (user.role === 'admin') window.location.hash = '/admin';
                   else if (user.role === 'tutor') window.location.hash = '/tutor';
                   else window.location.hash = '/dashboard';
                 }}
                 className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm"
               >
                 Bảng Điều Khiển
               </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="btn-shine bg-gradient-to-r from-[#00288e] via-[#2747c4] to-[#3a6fe0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(55,85,195,0.55)] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl p-6 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <button 
                onClick={() => window.location.hash = '/find-tutors'} 
                className="mb-4 text-[#444653] hover:text-[#00288e] text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Quay lại tìm kiếm
              </button>
              
              <div className="relative w-48 h-48 mx-auto mb-6">
                <img alt="Dr. Sarah Jenkins" className="w-full h-full object-cover rounded-xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqobpT8uCk4-FjJKB4jqLVq8F2qxrVvmOqZBNdRJXm_0DKvgTh89-yovdChNtF7ErnG-H51-3L0E3XD4XTIXDw-Aaf0ajDF3xdg4GIxuUP9snDfjjXBr6gznlzwPkbYnow1Nzte-0PS8ahDQ3vR0PFQmZ9wg3d37i5VlS3PeUAYnQ2cdOpw-96a4DLSmOcwAFsDiO3uOM9xiqj6HIxpy3p94fap8Ts9wM9zRa1S7WZuSKfejzQs_Z3rYaaEaartCUuMln45G2uNTE"/>
                <div className="absolute bottom-[-8px] right-[-8px] bg-[#00288e] text-white p-1 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                </div>
              </div>
              <div className="text-center mb-10">
                <h1 className="text-2xl font-semibold text-[#191c1e] mb-1">Dr. Sarah Jenkins</h1>
                <div className="flex items-center justify-center gap-1 text-[#444653]">
                  <span className="material-symbols-outlined text-[#FFB800]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                  <span className="text-sm font-bold text-[#191c1e]">4.9</span>
                  <span className="text-sm">(124 nhận xét)</span>
                </div>
              </div>
              <div className="space-y-3 mb-10">
                <button onClick={() => window.location.hash = '/booking/' + (viewingTutor?.id || '')} className="w-full h-[48px] bg-[#00288e] text-white text-sm font-semibold rounded-lg hover:bg-[#1e40af] transition-all flex items-center justify-center gap-2 active-interaction shadow-sm">
                  <span className="material-symbols-outlined">event_available</span> Đặt Lịch Học
                </button>
                <button className="btn-shine w-full h-[48px] border border-[#c4c5d5] text-[#00288e] text-sm font-semibold rounded-lg hover:text-white hover:border-transparent hover:bg-gradient-to-r hover:from-[#00288e] hover:to-[#3a6fe0] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 active-interaction bg-white">
                  <span className="material-symbols-outlined">chat_bubble</span> Nhắn Tin
                </button>
              </div>
              <div className="border-t border-[#e1e2e4] pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">payments</span>
                    <span className="text-base">Giá theo giờ</span>
                  </div>
                  <span className="text-sm font-semibold text-[#00288e]">$65/giờ</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">schedule</span>
                    <span className="text-base">Thời gian phản hồi</span>
                  </div>
                  <span className="text-sm font-semibold text-[#191c1e]">~2 giờ</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#444653]">
                    <span className="material-symbols-outlined">groups</span>
                    <span className="text-base">Học sinh đã dạy</span>
                  </div>
                  <span className="text-sm font-semibold text-[#191c1e]">450+</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* About Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-4">Giới thiệu</h2>
              <p className="text-base text-[#444653] leading-relaxed">
                Với hơn 12 năm kinh nghiệm trong giáo dục đại học, triết lý giảng dạy của tôi bắt nguồn từ việc làm cho các khái niệm toán học phức tạp trở nên dễ tiếp cận và trực quan. Tôi tin rằng mỗi học sinh đều có khả năng tỏa sáng trong lĩnh vực STEM nếu được trang bị phương pháp và sự khích lệ đúng đắn. Nền tảng Toán học Ứng dụng của tôi giúp tôi đưa bối cảnh thực tế vào các bài giảng lý thuyết về giải tích và đại số, giúp học sinh nhận ra vẻ đẹp trong những con số.
              </p>
            </section>

            {/* Demo Lesson Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-2">Bài Học Mẫu</h2>
              <p className="text-base text-[#444653] mb-4">Xem trước phong cách và phương pháp giảng dạy của tôi.</p>
              <div className="relative rounded-lg overflow-hidden cursor-pointer group bg-[#edeef0] aspect-video flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Demo preview" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[#00288e] text-[40px]" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Expertise Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">Chuyên Môn</h2>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Advanced Mathematics</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Calculus I, II &amp; III</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Linear Algebra</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Differential Equations</span>
                <span className="px-4 py-2 bg-[#00288e]/10 text-[#00288e] text-sm font-semibold rounded-full border border-[#00288e]/20 hover:bg-[#00288e]/20 transition-colors cursor-default">Statistics</span>
              </div>
            </section>

            {/* Education Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <h2 className="text-2xl font-semibold text-[#191c1e] mb-6">Học Vấn</h2>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00288e] text-3xl">school</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#191c1e]">Stanford University</h3>
                    <p className="text-base text-[#444653]">Ph.D. in Applied Mathematics</p>
                    <p className="text-xs font-medium text-[#757684] mt-1">2015</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00288e] text-3xl">history_edu</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#191c1e]">Oxford University</h3>
                    <p className="text-base text-[#444653]">M.Sc. in Mathematics</p>
                    <p className="text-xs font-medium text-[#757684] mt-1">2011</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="bg-white rounded-xl p-8 card-shadow border border-transparent hover:border-[#00288e]/10 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-[#191c1e]">Nhận Xét</h2>
                <button className="text-[#00288e] text-sm font-semibold hover:underline">Xem Tất Cả</button>
              </div>
              <div className="space-y-8 divide-y divide-[#e1e2e4]">
                <div className="pt-6 first:pt-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7e8ea] flex items-center justify-center font-bold text-[#00288e]">JD</div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e]">James D.</h4>
                        <div className="flex text-[#FFB800]">
                          {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#757684]">2 ngày trước</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"Cô Jenkins đã giúp tôi vượt qua kỳ thi Giải Tích xuất sắc! Cô ấy giải thích những thứ tôi đã vật lộn nhiều tháng chỉ trong một giờ. Rất đáng để thử."</p>
                </div>
                
                <div className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e7e8ea] flex items-center justify-center font-bold text-[#00288e]">LM</div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e]">Lisa M.</h4>
                        <div className="flex text-[#FFB800]">
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span className="material-symbols-outlined text-[16px]">star</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#757684]">1 tuần trước</span>
                  </div>
                  <p className="text-base text-[#444653] italic">"Rất kiên nhẫn và am hiểu. Cô ấy có cách hình dung các bài toán khiến tôi hiểu ngay lập tức. Chắc chắn sẽ đặt lịch lại."</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* TV3: Khu đánh giá gia sư (hiện khi tới từ danh sách/AI/trang chủ) */}
        {viewingTutor?.id && (
          <EntityReviews targetType="tutor" targetId={viewingTutor.id} title="Đánh giá gia sư" />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. Đã đăng ký bản quyền.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Chính Sách Bảo Mật</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Điều Khoản Dịch Vụ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Trung Tâm Trợ Giúp</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Liên Hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
