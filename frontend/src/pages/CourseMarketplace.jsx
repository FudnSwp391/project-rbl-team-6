import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { getCourseImageUrl } from '../utils/courseImage';
import { useAuth } from '../AuthContext';

function formatMoney(value) {
  if (!value) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getSearchFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get('q') || '';
}

export default function CourseMarketplace() {
  const { user } = useAuth();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Checking if rendered as standalone page or inside home
  const [isStandalone, setIsStandalone] = useState(() => window.location.hash.startsWith('#/courses'));
  
  // Search & Filters state
  const [search, setSearch] = useState(() => getSearchFromHash());
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const courseSectionRef = useRef(null);

  const handleShowAll = () => {
    setShowAllCourses(true);
    setTimeout(() => {
      courseSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Giỏ hàng (localStorage edux_cart — cùng định dạng CartPage đọc) ──
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const readCartIds = () => {
    try {
      const arr = JSON.parse(localStorage.getItem('edux_cart') || '[]');
      return Array.isArray(arr) ? arr.map(it => it.id) : [];
    } catch { return []; }
  };
  const [cartIds, setCartIds] = useState(readCartIds);
  const [cartToast, setCartToast] = useState('');
  useEffect(() => {
    const sync = () => setCartIds(readCartIds());
    window.addEventListener('cartUpdated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('cartUpdated', sync); window.removeEventListener('storage', sync); };
  }, []);

  const showCartToast = (msg) => {
    setCartToast(msg);
    setTimeout(() => setCartToast(''), 2200);
  };

  const addToCart = (course, e) => {
    if (e) e.stopPropagation();
    if (!UUID_RE.test(String(course.id))) {
      showCartToast('Khóa học demo — không thể mua.');
      return;
    }
    let cart = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('edux_cart') || '[]');
      if (Array.isArray(parsed)) cart = parsed;
    } catch {}
    if (cart.some(it => it.id === course.id)) {
      showCartToast('Khóa học đã có trong giỏ hàng.');
      return;
    }
    cart.push({
      id: course.id,
      title: course.title,
      price: Number(course.price || 0),
      thumbnail_url: course.thumbnail_url || null,
      tutor_name: course.tutor_name || course.tutorName || 'Gia sư EduX',
      subject: course.subject || '',
      quantity: 1,
      addedAt: Date.now(),
    });
    localStorage.setItem('edux_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    showCartToast(`Đã thêm "${String(course.title).slice(0, 32)}${String(course.title).length > 32 ? '…' : ''}" vào giỏ`);
  };

  // Subjects for the filter
  const subjectsList = ['Toán học', 'Tiếng Anh', 'Lập trình', 'Ngữ văn', 'Khoa học', 'Nghệ thuật'];

  useEffect(() => {
    const handleHashChange = () => {
      const newSearch = getSearchFromHash();
      setSearch(newSearch);
      setIsStandalone(window.location.hash.startsWith('#/courses'));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await apiRequest('/api/courses?sort=rating_desc&limit=3');
        setFeaturedCourses(Array.isArray(response) ? response : response?.data || []);
      } catch (err) {
        console.error('Failed to load featured courses:', err);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.append('search', debouncedSearch);
        if (selectedSubject && selectedSubject !== 'all') queryParams.append('subject', selectedSubject);
        if (selectedFormat && selectedFormat !== 'all') queryParams.append('format', selectedFormat);
        if (sortOption) queryParams.append('sort', sortOption);
        
        const response = await apiRequest(`/api/courses?${queryParams.toString()}`);
        setCourses(Array.isArray(response) ? response : response?.data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách khóa học.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [debouncedSearch, selectedSubject, selectedFormat, sortOption]);

  const coursesToDisplay = isStandalone || showAllCourses ? courses : courses.slice(0, 3);
  const hasActiveFilters = Boolean(search) || selectedSubject !== 'all' || selectedFormat !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedSubject('all');
    setSelectedFormat('all');
  };

  const getTutorInitials = (name) => {
    if (!name) return 'T';
    return name.split(' ').pop().charAt(0).toUpperCase();
  };

  const getSubjectIcon = (subject) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('toán')) return 'calculate';
    if (s.includes('anh') || s.includes('ngôn')) return 'language';
    if (s.includes('lập trình') || s.includes('tin')) return 'code';
    if (s.includes('hóa') || s.includes('khoa')) return 'science';
    if (s.includes('thiết kế') || s.includes('design')) return 'brush';
    if (s.includes('data')) return 'database';
    return 'menu_book';
  };

  const CourseCard = ({ course }) => {
    const imageUrl = getCourseImageUrl(course);
    const tutorName = course.tutor_name || course.tutorName || 'Gia sư EduX';
    const rating = Number(course.avg_rating) || course.rating || course.averageRating || 0;
    const reviewCount = course.review_count || course.reviewCount || course.reviews || 0;
    const isVerified = course.verified || course.tutorVerified || rating >= 4.5;
    const inCart = cartIds.includes(course.id);

    return (
      <div 
        className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-outline-variant/20 flex flex-col cursor-pointer"
        onClick={() => { window.location.hash = `/course/${course.id}`; }}
      >
        <div className="relative aspect-[16/9]">
          {imageUrl ? (
            <img src={imageUrl} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              <span className="material-symbols-outlined text-primary/40 text-4xl">{getSubjectIcon(course.subject)}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="bg-primary/90 text-on-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              {course.subject || 'Đa lĩnh vực'}
            </span>
            <span className="bg-secondary-container/90 text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              {course.learning_mode || course.format || 'Online'}
            </span>
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h4 className="text-title-lg text-primary text-base mb-2 line-clamp-1">{course.title}</h4>
          <p className="text-body-md text-on-surface-variant text-xs line-clamp-2 mb-4">
            {course.short_description || course.description || 'Khóa học được thiết kế chuyên nghiệp giúp bạn đạt được mục tiêu học tập.'}
          </p>
          <div className="flex items-center gap-3 mb-4 mt-auto">
            {course.tutor_picture || course.tutorAvatar ? (
              <img src={course.tutor_picture || course.tutorAvatar} alt={tutorName} className="w-8 h-8 rounded-full border border-outline-variant/30 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full avatar-gradient text-primary flex items-center justify-center font-bold border border-outline-variant/30 text-xs">
                {getTutorInitials(tutorName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-on-surface truncate flex items-center gap-1">
                {tutorName}
                {isVerified && <span className="material-symbols-outlined text-blue-500 text-[12px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>}
              </p>
              <div className="flex items-center text-[10px] text-on-surface-variant">
                <span className="material-symbols-outlined text-yellow-500 text-[12px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <span className="ml-0.5 font-bold">{Number(rating).toFixed(1)}</span>
                <span className="ml-1">({reviewCount})</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30 gap-2">
            <div className="text-primary font-bold text-base whitespace-nowrap">
              {formatMoney(course.price || course.pricePerSession)}<span className="text-[10px] text-on-surface-variant font-normal">/buổi</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {inCart ? (
                <button
                  onClick={(e) => { e.stopPropagation(); window.location.hash = '/cart'; }}
                  className="h-8 px-2.5 rounded-lg border border-[#16a34a]/40 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold flex items-center gap-1 hover:bg-[#dcfce7] transition-all"
                  title="Đã trong giỏ — bấm để xem giỏ hàng"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  Trong giỏ
                </button>
              ) : (
                <button
                  onClick={(e) => addToCart(course, e)}
                  className="h-8 w-8 rounded-lg border border-primary/40 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all"
                  title="Thêm vào giỏ hàng"
                  aria-label="Thêm vào giỏ hàng"
                >
                  <span className="material-symbols-outlined text-[17px]">add_shopping_cart</span>
                </button>
              )}
              <button className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[11px] font-bold hover:brightness-110 transition-all whitespace-nowrap">Xem chi tiết</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="course-marketplace-container">
      {cartToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#191c1e] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#4ade80]">shopping_cart_checkout</span>
          {cartToast}
        </div>
      )}
      <style>{`
        .course-marketplace-container { 
          font-family: 'Inter', sans-serif; 
          background-color: #f7f9fb; 
          color: #191c1e;
        }
        .course-marketplace-container .material-symbols-outlined { 
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
        }
        .course-marketplace-container .premium-gradient { 
          background: linear-gradient(135deg, #00175c 0%, #00288e 100%); 
        }
        .course-marketplace-container .avatar-gradient { 
          background: linear-gradient(135deg, #dde1ff 0%, #b8c4ff 100%); 
        }
        
        /* Typography classes from Stitch */
        .text-display-lg { font-size: 48px; line-height: 56px; letter-spacing: -0.02em; font-weight: 700; }
        .text-headline-md { font-size: 30px; line-height: 38px; letter-spacing: -0.01em; font-weight: 600; }
        .text-title-lg { font-size: 20px; line-height: 28px; font-weight: 600; }
        .text-body-lg { font-size: 18px; line-height: 28px; font-weight: 400; }
        .text-body-md { font-size: 16px; line-height: 24px; font-weight: 400; }
        .text-label-md { font-size: 14px; line-height: 20px; letter-spacing: 0.05em; font-weight: 500; }

        /* Colors aligned with FindTutorsPage */
        .text-primary { color: #00288e; }
        .bg-primary { background-color: #00288e; }
        .text-on-primary { color: #ffffff; }
        .bg-secondary-container { background-color: #8455ef; }
        .text-on-secondary-container { color: #fffbff; }
        .text-on-surface-variant { color: #444653; }
        .text-on-surface { color: #191c1e; }
        .bg-surface { background-color: #f8f9fb; }
        .border-outline-variant { border-color: #c5c5d4; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .text-outline { color: #757684; }
        .text-primary-fixed { color: #dde1ff; }
      `}</style>

      {/* Navbar (Only rendered if on /courses route directly) */}
      {isStandalone && (
        <header className="w-full fixed top-0 z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
          <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
            <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
              <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>school</span>
              EduX
            </a>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/find-tutors">Tìm Gia Sư</a>
              <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
              <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
              <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/courses">Khóa Học</a>
            </nav>
            <div className="flex items-center gap-6 z-10">
            {(!user || (user.role !== 'admin' && user.role !== 'tutor')) && (
              <a href="#/cart" className="relative text-[#00288e] flex items-center" title="Giỏ hàng">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_cart</span>
                {cartIds.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {cartIds.length > 9 ? '9+' : cartIds.length}
                  </span>
                )}
              </a>
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
                  <button onClick={() => window.location.hash = '/signin'} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                  <button onClick={() => window.location.hash = '/signup'} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">
                    Tham Gia Miễn Phí
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}
      
      {!isStandalone && (
        <section className="relative overflow-hidden premium-gradient py-24 text-on-primary">
          <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10 text-center">
            <h1 className="text-display-lg mb-6 tracking-tight text-white">Khám Phá Khóa Học Phù Hợp Với Bạn</h1>
            <p className="text-body-lg text-primary-fixed mb-12 max-w-2xl mx-auto">Tìm kiếm các khóa học chất lượng từ những gia sư uy tín, giúp bạn học tập hiệu quả và đạt mục tiêu nhanh hơn.</p>
            <div className="max-w-5xl mx-auto bg-surface-container-lowest rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-[1.5] flex items-center px-4 py-3 gap-3 border-r border-outline-variant/30">
                <span className="material-symbols-outlined text-outline">search</span>
                <input 
                  className="w-full border-none focus:ring-0 text-on-surface placeholder:text-outline bg-transparent outline-none" 
                  placeholder="Tìm tên khóa học, môn học hoặc gia sư..." 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center px-4 py-3 gap-3 border-r border-outline-variant/30">
                <span className="material-symbols-outlined text-outline">category</span>
                <select 
                  className="w-full border-none focus:ring-0 text-on-surface bg-transparent cursor-pointer text-body-md outline-none"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="all">Môn học</option>
                  {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1 flex items-center px-4 py-3 gap-3 border-r border-outline-variant/30">
                <span className="material-symbols-outlined text-outline">videocam</span>
                <select 
                  className="w-full border-none focus:ring-0 text-on-surface bg-transparent cursor-pointer text-body-md outline-none"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                >
                  <option value="all">Hình thức học</option>
                  <option value="online">Online</option>
                  <option value="trực tiếp">Trực tiếp</option>
                  <option value="nhóm nhỏ">Nhóm nhỏ</option>
                </select>
              </div>
              <button 
                onClick={handleShowAll}
                className="bg-secondary-container text-on-secondary-container px-10 py-3 rounded-xl text-label-md hover:brightness-110 transition-all flex items-center justify-center gap-2">
                Tìm kiếm
              </button>
            </div>
          </div>
        </section>
      )}

      {/* All Courses */}
      {!loading && (
        <section ref={courseSectionRef} className={`${isStandalone ? 'pt-24 pb-12' : 'py-12'} bg-surface`}>
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className={isStandalone ? "grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-8 items-start" : ""}>
              {isStandalone && (
                <aside className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-5 shadow-sm lg:sticky lg:top-24">
                  <h3 className="text-primary text-xl font-bold mb-7">Bộ lọc</h3>

                  <div className="mb-7">
                    <h4 className="text-xs font-bold uppercase text-on-surface mb-4 tracking-wide">Môn học</h4>
                    <div className="space-y-3">
                      {[
                        ['all', 'Tất cả'],
                        ...subjectsList.map(subject => [subject, subject]),
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-outline-variant accent-primary cursor-pointer"
                            checked={selectedSubject === value}
                            onChange={() => setSelectedSubject(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-7">
                    <h4 className="text-xs font-bold uppercase text-on-surface mb-4 tracking-wide">Hình thức học</h4>
                    <div className="space-y-3">
                      {[
                        ['all', 'Tất Cả'],
                        ['online', 'Online'],
                        ['trực tiếp', 'Trực Tiếp'],
                        ['nhóm nhỏ', 'Nhóm Nhỏ'],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-3 text-sm font-semibold text-on-surface-variant cursor-pointer">
                          <input
                            type="radio"
                            name="learning-format"
                            className="h-4 w-4 border-outline-variant accent-primary cursor-pointer"
                            checked={selectedFormat === value}
                            onChange={() => setSelectedFormat(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="w-full rounded-lg border border-outline-variant px-4 py-2.5 text-xs font-bold text-on-surface-variant transition-all hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-60 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant"
                  >
                    Thiết lập lại
                  </button>
                </aside>
              )}

              <div>
                {isStandalone && (
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 shadow-sm">
                    <span className="material-symbols-outlined text-outline text-[22px]">search</span>
                    <input
                      className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-outline"
                      type="text"
                      placeholder="Tìm tên khóa học, môn học hoặc gia sư..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="text-on-surface-variant text-body-md text-sm">
                    Hiển thị <span className="font-bold text-primary">{coursesToDisplay.length}</span> khóa học
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-xs text-on-surface-variant font-medium">Sắp xếp theo:</span>
                    <select 
                      className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-xs font-medium focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="price_asc">Giá: Thấp đến Cao</option>
                      <option value="price_desc">Giá: Cao đến Thấp</option>
                      <option value="rating_desc">Đánh giá tốt nhất</option>
                    </select>
                  </div>
                </div>

                {coursesToDisplay.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
                    <span className="material-symbols-outlined text-[56px] text-gray-300 mb-4">search_off</span>
                    <h3 className="text-xl font-bold text-primary mb-2">Chưa tìm thấy kết quả</h3>
                    <p className="text-on-surface-variant text-sm">Vui lòng thử lại với một từ khóa tìm kiếm hoặc bộ lọc khác.</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isStandalone ? 'xl:grid-cols-3' : 'lg:grid-cols-4'} gap-6 mb-12`}>
                      {coursesToDisplay.map(course => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                    {!isStandalone && (
                      <div className="flex justify-center mb-12">
                        <a
                          href="#/courses"
                          className="inline-flex items-center gap-1 rounded-lg border border-primary px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-on-primary"
                        >
                          Xem tất cả
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </a>
                      </div>
                    )}
                    
                    {/* Pagination (Mock UI) */}
                    {isStandalone && (
                    <div className="flex items-center justify-center gap-2">
                      <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:border-primary hover:text-primary transition-all">
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-on-primary font-bold text-sm">1</button>
                      <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:border-primary hover:text-primary transition-all">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                    )}
                  </>
                )}
                </div>
              </div>
          </div>
        </section>
      )}
    </div>
  );
}
