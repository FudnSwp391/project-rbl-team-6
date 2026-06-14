import React from 'react';

export default function BecomeTutorPage({ onGoSignIn, onGoSignUp, user }) {

  const handleApplyNow = () => {
    if (!user) {
      window.location.hash = '/signup?role=tutor';
      return;
    }
    
    // Auth logic for Apply Now
    if (user.role === 'student' || user.role === 'parent' || user.role === 'user') {
      window.location.hash = '/tutor-profile';
    } else if (user.role === 'tutor') {
      window.location.hash = '/tutor';
    } else if (user.role === 'admin') {
      window.location.hash = '/admin';
    }
  };

  return (
    <div className="bg-[#f8f9fb] min-h-screen text-[#191c1e] font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          
          {/* Logo */}
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
            EduX
          </a>

          {/* Nav Links (Centered) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] transition-colors pb-1" href="#/subjects">Môn Học</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4 z-10">
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

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="max-w-[1280px] mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 flex flex-col items-start text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#191c1e] mb-6 leading-tight tracking-tight">
              Chia sẻ kiến thức. <span className="text-[#00288e]">Định hình tương lai.</span>
            </h1>
            <p className="text-lg text-[#444653] mb-8 max-w-lg leading-relaxed">
              Tham gia cộng đồng nhà giáo dục chuyên nghiệp toàn cầu của chúng tôi. Tự đặt mức phí, quản lý lịch dạy và giúp học sinh đạt được mục tiêu học tập.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
              <button onClick={handleApplyNow} className="bg-[#00288e] text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#1e40af] transition-all shadow-md">
                Đăng Ký Ngay
              </button>
              <button className="bg-white border border-[#c4c5d5] text-[#191c1e] px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-[#edeef0] transition-all">
                Tìm Hiểu Thêm
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-8 md:gap-12 pt-8 border-t border-[#e1e2e4] w-full">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">500+</span>
                <span className="text-sm font-medium text-[#757684]">Gia Sư Đang Hoạt Động</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">10k+</span>
                <span className="text-sm font-medium text-[#757684]">Học Sinh</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#00288e]">4.9</span>
                <span className="text-sm font-medium text-[#757684]">Đánh Giá Trung Bình</span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 relative w-full h-[400px] md:h-[500px]">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnf8aQn4Hovs8D784l2_3yM0Q5E_oXwG-1j-Gk2s0x8oJ9l8lH8yT2H1wR2qU-9dG5O-0O-rXzY-x2S4Z_n1t5g8q6W-r0d6P_7I9D9yM8J5xL9D6N9I8e2o8Z_f-V8t3s9U8_m9G9O3_H_P1g5R4D8k_C5S0S1wT9j_W6v-E1F5X6P-oV" 
              alt="Minh họa dạy học trực tuyến" 
              className="w-full h-full object-cover rounded-2xl shadow-xl"
            />
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-[#e1e2e4] flex items-center gap-4 animate-bounce">
              <div className="w-12 h-12 bg-[#00288e]/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#00288e]">workspace_premium</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#191c1e]">Nền Tảng Được Đánh Giá Cao</p>
                <p className="text-xs text-[#757684]">bởi các nhà giáo dục</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why teach with EduX */}
        <section className="bg-white py-20 border-y border-[#e1e2e4]">
          <div className="max-w-[1280px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-[#191c1e] text-center mb-16">Tại sao dạy học với EduX?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#00288e] mb-6">schedule</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Lịch Dạy Linh Hoạt</h3>
                <p className="text-base text-[#444653]">Bạn là người quyết định. Chọn chính xác thời gian và số giờ dạy bạn muốn.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#1e40af] mb-6">payments</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Thu Nhập Cao Hơn</h3>
                <p className="text-base text-[#444653]">Tự đặt mức phí theo giờ và giữ lại tỷ lệ lợi nhuận cao từ thu nhập của bạn.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#ba1a1a] mb-6">trending_up</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Phát Triển Hồ Sơ</h3>
                <p className="text-base text-[#444653]">Xây dựng danh tiếng vững chắc với các nhận xét và đánh giá được xác minh từ học sinh.</p>
              </div>
              <div className="flex flex-col items-start p-6 bg-[#f8f9fb] rounded-xl border border-[#edeef0] hover:-translate-y-2 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl text-[#004c8b] mb-6">laptop_mac</span>
                <h3 className="text-xl font-bold text-[#191c1e] mb-3">Trực Tuyến hoặc Trực Tiếp</h3>
                <p className="text-base text-[#444653]">Kết nối với học sinh toàn cầu qua video call hoặc dạy trực tiếp tại khu vực của bạn.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-[1280px] mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-[#191c1e] text-center mb-16">Quy Trình Hoạt Động</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] w-[70%] h-0.5 bg-[#e1e2e4] z-0"></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#dde1ff] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <span className="text-3xl font-bold text-[#001453]">1</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Tạo Hồ Sơ Của Bạn</h3>
              <p className="text-base text-[#444653] max-w-xs">Đăng ký, xây dựng hồ sơ chuyên nghiệp và liệt kê các môn học, kinh nghiệm và mức phí theo giờ của bạn.</p>
            </div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#dde1ff] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <span className="text-3xl font-bold text-[#001453]">2</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Xác Minh Danh Tính</h3>
              <p className="text-base text-[#444653] max-w-xs">Tải lên CMND và các chứng chỉ học thuật để đội ngũ chúng tôi xem xét. Sau khi được chấp thuận, bạn sẽ được kích hoạt!</p>
            </div>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 bg-[#00288e] rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-3">Bắt Đầu Giảng Dạy</h3>
              <p className="text-base text-[#444653] max-w-xs">Nhận đặt lịch từ các học sinh nhiệt huyết và bắt đầu kiếm thu nhập khi làm điều bạn yêu thích.</p>
            </div>
          </div>
        </section>

        {/* Testimonial & Final CTA */}
        <section className="bg-white py-10 pb-20">
          <div className="max-w-[1000px] mx-auto px-6">
            <div className="bg-[#00288e] rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <div className="md:w-1/3 flex flex-col items-center z-10">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_U-x_Y9u_1tP_1eP2yG-lO6X_4j-wZ1P9vP5H8wO-1aC4N8hH6vY-eX_M_y-1P_N_6-vW9S_P6A_4G6P9lP_1R_X3o_yC_4K_mZ6E4aP-2O4A8dZ6P_qT1dZ_6Y9C_qW9Q" 
                  alt="Gia Sư" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#b8c4ff] shadow-md mb-4"
                />
                <div className="flex gap-1 text-[#FFB800] mb-2">
                  {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                </div>
                <p className="font-bold">Jessica W.</p>
                <p className="text-sm text-[#b8c4ff]">Gia Sư Tiếng Anh</p>
              </div>

              <div className="md:w-2/3 flex flex-col z-10">
                <span className="material-symbols-outlined text-6xl text-white/20 mb-4 -ml-2">format_quote</span>
                <p className="text-xl md:text-2xl font-medium italic mb-10 leading-relaxed">
                  "EduX giúp tôi chuyển sang dạy học trực tuyến một cách dễ dàng đến không ngờ. Nền tảng xử lý toàn bộ việc lên lịch và thanh toán, để tôi tập trung hoàn toàn vào học sinh của mình."
                </p>
                <div className="bg-white/10 p-6 rounded-xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Sẵn sàng bắt đầu giảng dạy?</h3>
                    <p className="text-sm text-[#dde1ff]">Tham gia cùng hàng nghìn gia sư thành công ngay hôm nay.</p>
                  </div>
                  <button onClick={handleApplyNow} className="bg-white text-[#00288e] px-8 py-3 rounded-lg text-base font-bold hover:bg-[#f0f1f3] transition-all whitespace-nowrap shadow-sm">
                    Trở Thành Gia Sư
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#edeef0] w-full mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-2xl font-bold text-[#00288e]">EduX</span>
            <p className="text-xs font-medium text-[#444653]">© 2024 EduX. Đã đăng ký bản quyền.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Chính Sách Bảo Mật</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Điều Khoản Dịch Vụ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Trung Tâm Hỗ Trợ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Liên Hệ</a>
            <a className="text-xs font-medium text-[#444653] hover:text-[#00288e] underline transition-all" href="#">Tuyển Dụng</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
