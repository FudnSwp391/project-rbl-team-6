import { useState, useMemo } from 'react';

const THCS_SUBJECTS = [
  {
    id: 1,
    name: 'Toán THCS',
    icon: 'functions',
    level: 'Lớp 6 - 9',
    rating: 4.8,
    desc: 'Củng cố đại số, hình học, giải bài tập và ôn thi vào lớp 10.',
    tags: ['Đại số', 'Hình học', 'Ôn thi vào 10'],
    tutors: '420+',
    price: 'Từ 120k/giờ',
    priceNum: 120,
    categories: ['Môn chính', 'Luyện thi', 'Mất gốc'],
  },
  {
    id: 2,
    name: 'Ngữ Văn THCS',
    icon: 'menu_book',
    level: 'Lớp 6 - 9',
    rating: 4.7,
    desc: 'Rèn đọc hiểu, viết đoạn văn, nghị luận và phân tích tác phẩm.',
    tags: ['Đọc hiểu', 'Viết văn', 'Ôn thi'],
    tutors: '300+',
    price: 'Từ 110k/giờ',
    priceNum: 110,
    categories: ['Môn chính', 'Luyện thi'],
  },
  {
    id: 3,
    name: 'Tiếng Anh THCS',
    icon: 'language',
    level: 'Lớp 6 - 9',
    rating: 4.8,
    desc: 'Nâng cao ngữ pháp, từ vựng, kỹ năng đọc hiểu và giao tiếp cơ bản.',
    tags: ['Ngữ pháp', 'Từ vựng', 'Giao tiếp'],
    tutors: '380+',
    price: 'Từ 130k/giờ',
    priceNum: 130,
    categories: ['Môn chính', 'Ngoại ngữ', 'Luyện thi'],
  },
  {
    id: 4,
    name: 'Vật Lý THCS',
    icon: 'science',
    level: 'Lớp 6 - 9',
    rating: 4.7,
    desc: 'Nắm chắc công thức, hiểu hiện tượng vật lý và luyện bài tập cơ bản.',
    tags: ['Cơ bản', 'Công thức', 'Bài tập'],
    tutors: '180+',
    price: 'Từ 120k/giờ',
    priceNum: 120,
    categories: ['Môn chính', 'Luyện thi', 'Mất gốc'],
  },
  {
    id: 5,
    name: 'Hóa Học THCS',
    icon: 'experiment',
    level: 'Lớp 8 - 9',
    rating: 4.7,
    desc: 'Làm quen hóa học, phản ứng hóa học, tính toán và kiến thức nền tảng.',
    tags: ['Lớp 8', 'Lớp 9', 'Bài tập'],
    tutors: '160+',
    price: 'Từ 120k/giờ',
    priceNum: 120,
    categories: ['Môn chính', 'Luyện thi', 'Mất gốc'],
  },
  {
    id: 6,
    name: 'Sinh Học THCS',
    icon: 'biotech',
    level: 'Lớp 6 - 9',
    rating: 4.6,
    desc: 'Học kiến thức sinh học cơ bản, cơ thể người, thực vật, động vật và môi trường.',
    tags: ['Lý thuyết', 'Cơ thể người', 'Môi trường'],
    tutors: '130+',
    price: 'Từ 110k/giờ',
    priceNum: 110,
    categories: ['Môn chính', 'Luyện thi'],
  },
  {
    id: 7,
    name: 'Lịch Sử THCS',
    icon: 'history_edu',
    level: 'Lớp 6 - 9',
    rating: 4.6,
    desc: 'Học theo dòng thời gian, ghi nhớ sự kiện và hiểu bối cảnh lịch sử.',
    tags: ['Sự kiện', 'Ghi nhớ', 'Ôn thi'],
    tutors: '110+',
    price: 'Từ 100k/giờ',
    priceNum: 100,
    categories: ['Môn chính', 'Luyện thi'],
  },
  {
    id: 8,
    name: 'Địa Lý THCS',
    icon: 'public',
    level: 'Lớp 6 - 9',
    rating: 4.6,
    desc: 'Nắm kiến thức địa lý tự nhiên, dân cư, kinh tế và kỹ năng đọc bản đồ.',
    tags: ['Bản đồ', 'Tự nhiên', 'Kinh tế'],
    tutors: '100+',
    price: 'Từ 100k/giờ',
    priceNum: 100,
    categories: ['Môn chính', 'Luyện thi'],
  },
  {
    id: 9,
    name: 'Tin Học THCS',
    icon: 'computer',
    level: 'Lớp 6 - 9',
    rating: 4.7,
    desc: 'Làm quen tin học, tư duy thuật toán, lập trình cơ bản và kỹ năng máy tính.',
    tags: ['Tin học', 'Thuật toán', 'Lập trình'],
    tutors: '140+',
    price: 'Từ 130k/giờ',
    priceNum: 130,
    categories: ['Kỹ năng', 'Môn chính'],
  },
];

const FILTER_CHIPS = ['Tất cả', 'Môn chính', 'Luyện thi', 'Ngoại ngữ', 'Kỹ năng', 'Mất gốc'];

const LEARNING_PATH = [
  {
    num: 1,
    title: 'Kiểm tra kiến thức nền',
    desc: 'Xác định môn học còn yếu và các chuyên đề cần củng cố.',
  },
  {
    num: 2,
    title: 'Củng cố theo lớp',
    desc: 'Học lại kiến thức trọng tâm lớp 6 - 9 theo từng môn.',
  },
  {
    num: 3,
    title: 'Luyện bài & sửa lỗi',
    desc: 'Thực hành bài tập, sửa lỗi sai và rèn phương pháp làm bài.',
  },
  {
    num: 4,
    title: 'Ôn thi chuyển cấp',
    desc: 'Luyện đề, quản lý thời gian và chuẩn bị cho kỳ thi vào lớp 10.',
  },
];

const FEATURED_TUTORS = [
  {
    id: 1,
    name: 'Hoàng Đức Minh',
    subject: 'Toán THCS',
    rating: '4.8',
    reviews: 48,
    experience: '7 năm kinh nghiệm',
    price: '150.000đ/giờ',
    initials: 'HM',
    avatar: null,
  },
  {
    id: 2,
    name: 'Trần Ngọc Mai',
    subject: 'Ngữ Văn THCS',
    rating: '4.7',
    reviews: 34,
    experience: '5 năm kinh nghiệm',
    price: '130.000đ/giờ',
    initials: 'NM',
    avatar: null,
  },
  {
    id: 3,
    name: 'Phạm Anh Tuấn',
    subject: 'Tiếng Anh THCS',
    rating: '4.9',
    reviews: 61,
    experience: '6 năm kinh nghiệm',
    price: '160.000đ/giờ',
    initials: 'AT',
    avatar: null,
  },
];

function TutorCard({ tutor, onNavigate }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="snap-center flex-none w-[280px] md:w-[calc(33.333%-16px)] bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-container-high flex flex-col items-center text-center hover:shadow-md transition-shadow">
      <div className="w-24 h-24 rounded-full bg-surface-container-high mb-4 overflow-hidden shadow-sm relative shrink-0">
        {tutor.avatar && !imgFailed ? (
          <img
            src={tutor.avatar}
            alt={`Avatar ${tutor.name}`}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {tutor.initials}
          </div>
        )}
        <div className="absolute bottom-0 right-0 bg-surface-container-lowest rounded-full p-0.5 shadow-sm">
          <span
            className="material-symbols-outlined text-green-600"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
        </div>
      </div>

      <h3 className="font-label-md text-label-md text-on-surface mb-1 text-lg">{tutor.name}</h3>
      <p className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block">
        {tutor.subject}
      </p>

      <div className="flex items-center gap-1 mb-3 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
        <span
          className="material-symbols-outlined text-yellow-500"
          style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
        <span className="font-label-sm text-label-sm font-bold text-on-surface">{tutor.rating}</span>
        <span className="font-label-sm text-label-sm text-secondary">({tutor.reviews} đánh giá)</span>
      </div>

      <div className="flex flex-col gap-1 mb-4 w-full text-sm text-on-surface-variant">
        <span className="flex items-center justify-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            work_history
          </span>
          {tutor.experience}
        </span>
        <span className="flex items-center justify-center gap-1 text-primary font-semibold">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            payments
          </span>
          {tutor.price}
        </span>
      </div>

      <button
        onClick={() => onNavigate('/find-tutors')}
        className="w-full min-h-[44px] bg-surface-container-lowest border border-outline-variant text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors mt-auto"
      >
        Xem Hồ Sơ
      </button>
    </div>
  );
}

export default function THCSSubjectsPage({ onGoSignIn, onGoSignUp, user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('Phổ biến nhất');
  const [showAll, setShowAll] = useState(false);

  const navigate = (path) => {
    window.location.hash = path;
  };

  const handleDashboard = () => {
    if (!user) return;
    if (user.role === 'admin') window.location.hash = '/admin';
    else if (user.role === 'tutor') window.location.hash = '/tutor';
    else window.location.hash = '/dashboard';
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = THCS_SUBJECTS.filter((sub) => {
      const matchesSearch =
        !q ||
        sub.name.toLowerCase().includes(q) ||
        sub.tags.some((t) => t.toLowerCase().includes(q));
      const matchesFilter =
        activeFilter === 'Tất cả' || sub.categories.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });

    if (sortBy === 'Giá thấp đến cao') {
      result = [...result].sort((a, b) => a.priceNum - b.priceNum);
    } else if (sortBy === 'Đánh giá cao nhất') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'Nhiều gia sư nhất') {
      result = [...result].sort((a, b) => parseInt(b.tutors) - parseInt(a.tutors));
    }

    return result;
  }, [searchQuery, activeFilter, sortBy]);

  const displayedSubjects = showAll ? filteredAndSorted : filteredAndSorted.slice(0, 9);
  const hasMore = filteredAndSorted.length > 9 && !showAll;

  return (
    <div
      className="bg-background text-on-background min-h-screen flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Navbar ── */}
      <header className="bg-surface-container-lowest sticky top-0 z-50 shadow-sm w-full">
        <div className="flex justify-between items-center h-16 px-gutter max-w-[1280px] mx-auto">
          <div className="flex items-center gap-8">
            <a
              href="#/"
              className="flex items-center gap-2 font-bold text-primary text-2xl shrink-0"
            >
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

          <button className="md:hidden text-on-surface p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-[1280px] mx-auto w-full px-gutter pb-16">
        {/* Back link */}
        <div className="py-4">
          <button
            onClick={() => navigate('/subjects')}
            className="inline-flex items-center text-primary font-label-md text-label-md hover:underline gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_back
            </span>
            Quay lại trang Môn Học
          </button>
        </div>

        {/* ── Hero ── */}
        <section className="bg-primary-container rounded-xl p-6 md:p-8 text-white shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="md:w-1/2">
              <h1
                className="font-bold mb-3"
                style={{ fontSize: 'clamp(24px, 4vw, 32px)', lineHeight: '1.25' }}
              >
                Môn Học Cấp THCS
              </h1>
              <p className="font-body-md text-body-md opacity-90 leading-relaxed max-w-xl">
                Củng cố kiến thức lớp 6 - 9, chuẩn bị thi chuyển cấp và cải thiện điểm số cùng
                gia sư EduX.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:w-1/2">
              {[
                { value: '18', label: 'môn học' },
                { value: '980+', label: 'gia sư' },
                { value: 'Từ 110k', label: '/giờ' },
                { value: 'Linh hoạt', label: 'Online & trực tiếp' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm border border-white/20 flex flex-col justify-center"
                >
                  <span className="font-bold leading-tight text-xl">{stat.value}</span>
                  <span className="text-xs opacity-80 mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Search & Filter ── */}
        <section className="mb-8 space-y-4">
          <div className="relative group max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm font-body-md text-body-md"
              placeholder="Tìm môn học cấp THCS..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowAll(false);
              }}
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div
              className="flex overflow-x-auto pb-2 gap-2 flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setActiveFilter(chip);
                    setShowAll(false);
                  }}
                  className={`flex-none px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap min-h-[40px] transition-colors shadow-sm ${
                    activeFilter === chip
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64 flex-shrink-0">
              <select
                className="w-full h-12 pl-4 pr-10 appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option>Phổ biến nhất</option>
                <option>Giá thấp đến cao</option>
                <option>Đánh giá cao nhất</option>
                <option>Nhiều gia sư nhất</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </section>

        {/* ── Subject Grid ── */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              Danh Sách Môn Học THCS
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Chọn môn học phù hợp để củng cố kiến thức và chuẩn bị tốt cho kỳ thi chuyển cấp.
            </p>
          </div>

          {displayedSubjects.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span
                className="material-symbols-outlined block mb-3"
                style={{ fontSize: '48px' }}
              >
                search_off
              </span>
              <p className="font-body-lg text-body-lg">Không tìm thấy môn học phù hợp.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('Tất cả');
                }}
                className="mt-4 text-primary font-label-md text-label-md hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {displayedSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-surface-container-high group hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Icon + title + rating */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <span className="material-symbols-outlined">{sub.icon}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-headline-md text-headline-md text-base text-on-surface leading-tight">
                          {sub.name}
                        </h3>
                        <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 shrink-0">
                          <span
                            className="material-symbols-outlined text-yellow-500"
                            style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="text-xs font-bold text-on-surface">{sub.rating}</span>
                        </div>
                      </div>
                      <p className="font-label-sm text-label-sm text-secondary mt-0.5">{sub.level}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm mb-4 flex-grow line-clamp-2">
                    {sub.desc}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-primary/5 text-primary rounded-md font-label-sm text-label-sm border border-primary/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between border-t border-surface-variant pt-3 mb-4">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-secondary">Gia sư</span>
                      <span className="font-label-md text-label-md text-on-surface">{sub.tutors}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-label-sm text-label-sm text-secondary">Chỉ từ</span>
                      <span className="font-label-md text-label-md text-primary font-bold">
                        {sub.price}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={() =>
                        navigate(`/find-tutors?subject=${encodeURIComponent(sub.name)}`)
                      }
                      className="w-full min-h-[40px] bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                    >
                      Xem Chi Tiết
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/find-tutors?subject=${encodeURIComponent(sub.name)}`)
                      }
                      className="w-full min-h-[40px] bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
                    >
                      Tìm Gia Sư
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center justify-center px-6 py-3 border border-outline-variant rounded-lg text-primary font-label-md text-label-md hover:bg-surface-container-low transition-colors min-h-[48px] w-full md:w-auto md:min-w-[300px]"
              >
                Xem thêm môn học khác
                <span className="material-symbols-outlined ml-2">expand_more</span>
              </button>
            </div>
          )}
        </section>

        {/* ── Learning Path ── */}
        <section className="mb-12 bg-white rounded-xl p-6 md:p-8 shadow-sm border border-surface-container-high">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-8 text-center">
            Lộ Trình Học THCS Gợi Ý
          </h2>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden relative pl-8 space-y-8">
            <div className="absolute inset-y-0 left-3.5 w-0.5 bg-outline-variant/30" />
            {LEARNING_PATH.map((step, i) => (
              <div key={step.num} className="relative">
                <div
                  className={`absolute -left-[37px] top-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white ${
                    i === 0
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-highest text-primary'
                  }`}
                >
                  {step.num}
                </div>
                <h3 className="font-label-md text-label-md text-on-surface mb-1">{step.title}</h3>
                <p className="font-body-md text-body-md text-sm text-on-surface-variant">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden md:flex relative justify-between pt-8 pb-4">
            <div className="absolute top-[45px] left-8 right-8 h-0.5 bg-outline-variant/30 z-0" />
            {LEARNING_PATH.map((step, i) => (
              <div
                key={step.num}
                className="relative z-10 flex flex-col items-center text-center w-1/4 px-4"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-4 border-white mb-4 ${
                    i === 0
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-highest text-primary'
                  }`}
                >
                  {step.num}
                </div>
                <h3 className="font-label-md text-label-md text-on-surface mb-2">{step.title}</h3>
                <p className="font-body-md text-body-md text-sm text-on-surface-variant">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured Tutors ── */}
        <section className="mb-12">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-6">
            Gia Sư Nổi Bật Cho THCS
          </h2>
          <div
            className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-4 md:gap-6 snap-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {FEATURED_TUTORS.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} onNavigate={navigate} />
            ))}
          </div>
        </section>

        {/* ── AI CTA ── */}
        <section className="bg-primary rounded-xl p-8 shadow-md text-center relative overflow-hidden mb-4">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '40px' }}
              >
                psychology
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold mb-3 text-white">
              Chưa Biết Nên Tập Trung Môn Nào?
            </h2>
            <p className="font-body-md text-body-md opacity-90 mb-8 text-white">
              Trả lời vài câu hỏi ngắn, EduX sẽ gợi ý môn học và gia sư phù hợp với mục tiêu học
              tập, điểm số hiện tại và kỳ thi sắp tới.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button className="min-h-[48px] px-8 bg-white text-primary rounded-lg font-label-md text-label-md font-bold hover:bg-surface-container-lowest transition-colors shadow-sm">
                Nhận Gợi Ý Môn Học
              </button>
              <button
                onClick={() => navigate('/find-tutors')}
                className="min-h-[48px] px-8 bg-transparent border border-white/40 text-white rounded-lg font-label-md text-label-md hover:bg-white/10 transition-colors"
              >
                Tìm Gia Sư Ngay
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-high border-t border-outline-variant w-full py-8 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-[1280px] mx-auto gap-4">
          <div className="text-on-surface-variant font-label-sm text-label-sm">
            © 2026 EduX. Đã đăng ký bản quyền.
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <a
              href="#"
              className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all"
            >
              Điều khoản dịch vụ
            </a>
            <a
              href="#"
              className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all"
            >
              Chính sách bảo mật
            </a>
            <a
              href="#"
              className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all"
            >
              Hỗ trợ
            </a>
            <a
              href="#"
              className="text-secondary hover:text-primary font-label-sm text-label-sm hover:underline transition-all"
            >
              Liên hệ
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
