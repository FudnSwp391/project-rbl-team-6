import { useState } from 'react';

const categories = [
  {
    name: 'Toán Học',
    icon: 'calculate',
    desc: 'Đại số, Hình học, Toán cao cấp, ôn thi Đại học.',
    tags: ['Toán 6-9', 'Toán 10-12', 'Toán Đại Cương'],
  },
  {
    name: 'Ngoại Ngữ',
    icon: 'language',
    desc: 'Tiếng Anh, IELTS, TOEIC, Tiếng Nhật, Tiếng Hàn.',
    tags: ['IELTS', 'Giao Tiếp', 'TOEIC'],
  },
  {
    name: 'Khoa Học Tự Nhiên',
    icon: 'science',
    desc: 'Vật Lý, Hóa Học, Sinh Học từ cơ bản đến nâng cao.',
    tags: ['Vật Lý THPT', 'Hóa Học', 'Sinh Học'],
  },
  {
    name: 'Ngữ Văn',
    icon: 'menu_book',
    desc: 'Đọc hiểu, nghị luận xã hội, nghị luận văn học và luyện thi.',
    tags: ['Văn 6-9', 'Văn 10-12', 'Ôn thi THPT'],
  },
  {
    name: 'Lịch Sử & Địa Lý',
    icon: 'public',
    desc: 'Kiến thức xã hội, lịch sử, địa lý và ôn thi.',
    tags: ['Lịch Sử', 'Địa Lý', 'Ôn thi'],
  },
  {
    name: 'Công Nghệ & Tin Học',
    icon: 'terminal',
    desc: 'Lập trình, tin học văn phòng và tư duy công nghệ.',
    tags: ['Python', 'React', 'Tin học'],
  },
];

const gradeLevels = [
  {
    name: 'Tiểu học',
    icon: 'child_care',
    count: '12 môn học',
    description: 'Xây dựng nền tảng Toán, Tiếng Việt, Tiếng Anh cho học sinh tiểu học.',
  },
  {
    name: 'THCS',
    icon: 'school',
    count: '18 môn học',
    description: 'Củng cố kiến thức lớp 6 - 9 và chuẩn bị tốt cho kỳ thi chuyển cấp.',
  },
  {
    name: 'THPT',
    icon: 'history_edu',
    count: '22 môn học',
    description: 'Ôn tập lớp 10 - 12, luyện thi THPT Quốc gia và cải thiện điểm số.',
  },
];

const popularSubjects = [
  {
    name: 'IELTS Academic',
    badge: 'Luyện thi',
    badgeColor: 'bg-primary-fixed/30 text-primary',
    rating: '4.9',
    tutors: '150+',
    price: '150k/giờ',
  },
  {
    name: 'Toán Lớp 12',
    badge: 'Mất gốc',
    badgeColor: 'bg-error-container text-error',
    rating: '4.8',
    tutors: '200+',
    price: '100k/giờ',
  },
  {
    name: 'Python Cơ Bản',
    badge: 'Lập trình',
    badgeColor: 'bg-tertiary-fixed/30 text-tertiary',
    rating: '4.9',
    tutors: '80+',
    price: '180k/giờ',
  },
  {
    name: 'Tiếng Anh Giao Tiếp',
    badge: 'Giao tiếp',
    badgeColor: 'bg-primary-fixed/30 text-primary',
    rating: '4.7',
    tutors: '120+',
    price: '120k/giờ',
  },
  {
    name: 'Vật Lý THPT',
    badge: 'Luyện thi',
    badgeColor: 'bg-primary-fixed/30 text-primary',
    rating: '4.8',
    tutors: '90+',
    price: '110k/giờ',
  },
  {
    name: 'Ngữ Văn Luyện Thi',
    badge: 'Ôn thi',
    badgeColor: 'bg-tertiary-fixed/30 text-tertiary',
    rating: '4.9',
    tutors: '110+',
    price: '130k/giờ',
  },
];

const processSteps = [
  {
    num: '1',
    icon: 'search',
    title: 'Chọn môn học',
    desc: 'Tìm kiếm môn học bạn cần cải thiện trong kho dữ liệu khổng lồ.',
  },
  {
    num: '2',
    icon: 'person_search',
    title: 'Tìm gia sư',
    desc: 'Xem hồ sơ, đánh giá và chọn người hướng dẫn phù hợp nhất.',
  },
  {
    num: '3',
    icon: 'calendar_month',
    title: 'Đặt lịch học',
    desc: 'Linh hoạt sắp xếp thời gian học tập phù hợp với lịch trình của bạn.',
  },
  {
    num: '4',
    icon: 'trending_up',
    title: 'Theo dõi tiến bộ',
    desc: 'Nhận báo cáo học tập và đánh giá kết quả sau mỗi buổi học.',
  },
];

const suggestionChips = ['Toán lớp 12', 'IELTS', 'Lập trình Python', 'Tiếng Anh Giao Tiếp'];

const aiRows = [
  { label: 'Mục tiêu:', value: 'Cải thiện điểm Toán' },
  { label: 'Trình độ:', value: 'Mất gốc' },
  { label: 'Môn nên học:', value: 'Toán lớp 10' },
  { label: 'Gia sư phù hợp:', value: '24 gia sư' },
];

export default function SubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = (path) => {
    window.location.hash = path;
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) navigate(`/find-tutors?subject=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleChip = (chip) => {
    navigate(`/find-tutors?subject=${encodeURIComponent(chip)}`);
  };

  const handleCategory = (name) => {
    navigate(`/find-tutors?category=${encodeURIComponent(name)}`);
  };

  const handleSubject = (name) => {
    navigate(`/find-tutors?subject=${encodeURIComponent(name)}`);
  };

  const handleLevel = (name) => {
    if (name === 'THPT') {
      navigate('/subjects/thpt');
    } else if (name === 'Tiểu học') {
      navigate('/subjects/tieu-hoc');
    } else if (name === 'THCS') {
      navigate('/subjects/thcs');
    } else {
      navigate(`/find-tutors?level=${encodeURIComponent(name)}`);
    }
  };

  const handleDashboard = () => {
    if (!user) return;
    if (user.role === 'admin') window.location.hash = '/admin';
    else if (user.role === 'tutor') window.location.hash = '/tutor';
    else window.location.hash = '/dashboard';
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Navbar ── */}
      <header className="bg-surface-container-lowest sticky top-0 z-50 shadow-sm w-full">
        <div className="flex justify-between items-center h-16 px-gutter max-w-[1280px] mx-auto">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-8">
            <a href="#/" className="flex items-center gap-2 font-bold text-primary text-2xl shrink-0">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
              EduX
            </a>

            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#/"
                className="text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200"
              >
                Trang Chủ
              </a>
              <a
                href="#/find-tutors"
                className="text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200"
              >
                Tìm Gia Sư
              </a>
              <a
                href="#/subjects"
                className="text-primary font-label-md text-label-md font-bold border-b-2 border-primary pb-px"
              >
                Môn Học
              </a>
              <a
                href="#/become-tutor"
                className="text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200"
              >
                Về Chúng Tôi
              </a>
            </nav>
          </div>

          {/* Right: auth buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={handleDashboard}
                className="font-label-md text-label-md text-primary hover:bg-surface-variant px-4 py-2 rounded-lg transition-colors duration-200 h-12"
              >
                Bảng Điều Khiển
              </button>
            ) : (
              <>
                <button
                  onClick={onGoSignIn}
                  className="font-label-md text-label-md text-primary hover:bg-surface-variant px-4 py-2 rounded-lg transition-colors duration-200 h-12"
                >
                  Đăng Nhập
                </button>
                <button
                  onClick={onGoSignUp}
                  className="font-label-md text-label-md bg-primary text-on-primary hover:bg-primary-container px-6 py-2 rounded-lg transition-colors duration-200 h-12 shadow-sm"
                >
                  Đăng Ký
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-on-surface p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {/* ── Hero ── */}
        <section className="bg-primary text-on-primary relative overflow-hidden py-xl px-gutter">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 20%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.8) 0%, transparent 20%)',
              backgroundSize: '100px 100px',
            }}
          />
          <div className="max-w-[1280px] mx-auto text-center relative z-10">
            <h1
              className="font-headline-xl text-headline-xl mb-6 max-w-4xl mx-auto leading-tight"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)' }}
            >
              Khám Phá Hàng Ngàn Môn Học Cùng Gia Sư Hàng Đầu
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed-dim mb-10 max-w-2xl mx-auto">
              Tìm kiếm người hướng dẫn hoàn hảo cho mục tiêu học tập của bạn. Từ cơ bản đến chuyên sâu, chúng tôi có tất cả.
            </p>

            {/* Search bar */}
            <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-xl p-2 flex items-center shadow-lg mb-8">
              <span className="material-symbols-outlined text-outline ml-4 shrink-0">search</span>
              <input
                className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface font-body-md px-4 py-3 placeholder:text-outline h-12 outline-none text-base"
                placeholder="Bạn muốn học môn gì?"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSearch}
                className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-container transition-colors duration-200 h-12 shrink-0"
              >
                Tìm Kiếm
              </button>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-3">
              <span className="text-primary-fixed-dim font-label-sm text-label-sm mt-2">Gợi ý:</span>
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="bg-white/10 hover:bg-white/20 text-on-primary font-label-sm text-label-sm px-4 py-2 rounded-full border border-white/20 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="py-xl px-gutter">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-center mb-12">Duyệt Theo Danh Mục</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => handleCategory(cat.name)}
                  className="bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer border border-transparent hover:border-primary/10"
                >
                  <div className="w-16 h-16 bg-primary-fixed/30 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {cat.icon}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-3">{cat.name}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6">{cat.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {cat.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-tertiary-fixed/30 text-tertiary font-label-sm text-label-sm px-3 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-primary font-label-md text-label-md flex items-center gap-2 group-hover:gap-3 transition-all">
                    Khám phá
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Grade Levels ── */}
        <section className="py-xl px-gutter">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-headline-lg text-headline-lg mb-2">Tìm Theo Cấp Học</h2>
              <p className="text-on-surface-variant font-body-lg text-body-lg">
                Chọn cấp học phù hợp để xem các môn học và gia sư liên quan.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {gradeLevels.map((level) => (
                <div
                  key={level.name}
                  className="group bg-surface-container-lowest flex flex-col p-8 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center border border-outline-variant/30 hover:border-primary/20"
                >
                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary-fixed/20 group-hover:bg-primary-fixed/40 rounded-full flex items-center justify-center mx-auto mb-5 text-primary transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl">{level.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-headline-md text-headline-md mb-1">{level.name}</h3>

                  {/* Subject count badge */}
                  <span className="inline-block bg-primary-fixed/30 text-primary font-label-sm text-label-sm px-3 py-1 rounded-full mx-auto mb-4">
                    {level.count}
                  </span>

                  {/* Description */}
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 flex-grow">
                    {level.description}
                  </p>

                  {/* Button */}
                  <button
                    onClick={() => handleLevel(level.name)}
                    className="mt-auto w-full bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-xl hover:bg-primary-container transition-colors duration-200"
                  >
                    Xem môn học
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Popular Subjects ── */}
        <section className="py-xl px-gutter bg-surface-container-low rounded-3xl my-lg max-w-[1280px] mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-center mb-2">Môn Học Phổ Biến</h2>
          <p className="text-center text-on-surface-variant font-body-lg text-body-lg mb-12">
            Những lựa chọn hàng đầu từ học viên của chúng tôi.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularSubjects.map((sub) => (
              <div
                key={sub.name}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`${sub.badgeColor} font-label-sm text-label-sm px-2 py-1 rounded`}>
                    {sub.badge}
                  </span>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                    <span
                      className="material-symbols-outlined text-amber-500"
                      style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface">{sub.rating}</span>
                  </div>
                </div>
                <h4 className="font-headline-md text-headline-md mb-2">{sub.name}</h4>
                <div className="text-on-surface-variant font-label-sm text-label-sm mb-4 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                    {sub.tutors} Gia sư
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
                    {sub.price}
                  </p>
                </div>
                <button
                  onClick={() => handleSubject(sub.name)}
                  className="mt-auto w-full border border-outline-variant text-primary font-label-md text-label-md py-2 rounded-lg hover:bg-surface-variant transition-colors h-10"
                >
                  Tìm Gia Sư
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI Recommendation ── */}
        <section className="py-xl px-gutter bg-primary text-on-primary rounded-3xl my-lg max-w-[1280px] mx-auto overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 10% 10%, white 0%, transparent 20%)',
              backgroundSize: '200px 200px',
            }}
          />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left */}
              <div>
                <h2 className="font-headline-lg text-headline-lg mb-6">
                  Bạn Chưa Biết Nên Bắt Đầu Từ Đâu?
                </h2>
                <p className="font-body-lg text-body-lg text-primary-fixed-dim mb-8">
                  Hãy để AI của EduX giúp bạn tìm ra lộ trình học tập tối ưu nhất dựa trên trình độ và mục tiêu của bạn.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    'Xác định môn học mục tiêu',
                    'Gợi ý gia sư phù hợp nhất',
                    'Xây dựng lộ trình cá nhân hóa',
                    'Theo dõi tiến bộ hàng tuần',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed-dim">check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="bg-surface-container-lowest text-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-surface-variant transition-all shadow-lg">
                  Nhận Gợi Ý Ngay
                </button>
              </div>

              {/* Right: AI card */}
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md">Gợi ý từ EduX AI</p>
                    <p className="text-xs text-primary-fixed-dim">Dựa trên hồ sơ của bạn</p>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  {aiRows.map((row, i) => (
                    <div
                      key={row.label}
                      className={`flex justify-between ${i < aiRows.length - 1 ? 'border-b border-white/10 pb-2' : ''}`}
                    >
                      <span className="text-primary-fixed-dim">{row.label}</span>
                      <span className="font-bold">{row.value}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-3 rounded-xl hover:opacity-90 transition-opacity">
                  Xem gợi ý chi tiết
                </button>
              </div>
            </div>
        </section>

        {/* ── Process Steps ── */}
        <section className="py-xl px-gutter">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-center mb-12">Quy Trình Học Cùng EduX</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {processSteps.map((step) => (
                <div key={step.num} className="text-center">
                  <div className="relative w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                    <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-2">{step.title}</h3>
                  <p className="text-on-surface-variant font-body-md text-body-md">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-xl px-gutter bg-surface-container-low">
          <div className="max-w-4xl mx-auto text-center bg-primary text-on-primary p-12 rounded-3xl shadow-xl relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 90% 90%, white 0%, transparent 30%)' }}
            />
            <h2
              className="font-headline-xl text-headline-xl mb-6"
              style={{ fontSize: 'clamp(24px, 4vw, 48px)' }}
            >
              Sẵn Sàng Bắt Đầu Hành Trình Học Tập?
            </h2>
            <p className="font-body-lg text-body-lg text-primary-fixed-dim mb-10">
              Tham gia cộng đồng EduX ngay hôm nay để trải nghiệm môi trường học tập chuyên nghiệp, hiệu quả.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button
                onClick={() => navigate('/find-tutors')}
                className="bg-surface-container-lowest text-primary font-label-md text-label-md px-8 py-4 rounded-xl hover:bg-surface-variant transition-all font-bold"
              >
                Tìm Gia Sư Ngay
              </button>
              <button
                onClick={() => navigate('/become-tutor')}
                className="border-2 border-white text-on-primary font-label-md text-label-md px-8 py-4 rounded-xl hover:bg-white/10 transition-all font-bold"
              >
                Trở Thành Gia Sư
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-high border-t border-outline-variant w-full py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-[1280px] mx-auto gap-4">
          <div className="text-on-surface-variant font-label-sm text-label-sm">
            © 2026 EduX. Đã đăng ký bản quyền.
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <a href="#" className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all">
              Điều khoản dịch vụ
            </a>
            <a href="#" className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all">
              Chính sách bảo mật
            </a>
            <a href="#" className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all">
              Hỗ trợ
            </a>
            <a href="#" className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all">
              Liên hệ
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
