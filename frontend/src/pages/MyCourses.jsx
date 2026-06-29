import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import { apiRequest } from '../services/api';
import { uploadEvidenceFile } from '../services/upload';

export default function MyCourses() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalCourses: 0, completedCourses: 0, weeklyHours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestedCourses, setSuggestedCourses] = useState([]);

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCourseToReport, setSelectedCourseToReport] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSeverity, setReportSeverity] = useState('medium');
  const [reportEvidence, setReportEvidence] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState(null);

  const handleOpenReport = (e, course) => {
    e.stopPropagation();
    setSelectedCourseToReport(course);
    setReportReason('');
    setReportSeverity('medium');
    setReportEvidence(null);
    setReportError(null);
    setReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      setReportError('Vui lòng nhập lý do khiếu nại.');
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      let evidenceUrl = null;
      if (reportEvidence) {
        evidenceUrl = await uploadEvidenceFile(reportEvidence, user?.id || 'anonymous');
      }
      const res = await apiRequest(`/api/courses/${selectedCourseToReport.course_id}/report`, 'POST', {
        reason: reportReason,
        severity: reportSeverity,
        evidenceUrl
      });
      if (res.success || res.message) {
        alert(res.message || 'Gửi khiếu nại thành công!');
        setReportModalOpen(false);
      } else {
        setReportError(res.message || 'Lỗi gửi khiếu nại');
      }
    } catch (e) {
      setReportError(e.message || 'Đã xảy ra lỗi.');
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const resData = await apiRequest('/api/student/my-courses');
        
        if (resData.success) {
          setCourses(resData.data.courses);
          setStats(resData.data.stats);
        } else {
          setError(resData.message || 'Lỗi lấy dữ liệu');
        }
      } catch (err) {
        console.error(err);
        setError('Đã xảy ra lỗi khi kết nối với máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, []);

  // Fetch suggested courses from DB
  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const data = await apiRequest('/api/courses');
        const allCourses = Array.isArray(data) ? data : (data.courses || []);
        // Exclude courses the student already enrolled in
        const enrolledIds = courses.map(c => c.course_id || c.id);
        const filtered = allCourses.filter(c => !enrolledIds.includes(c.id));
        setSuggestedCourses(filtered.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch suggested courses:', err);
      }
    };
    fetchSuggested();
  }, [courses]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredCourses = courses.filter(course => {
    if (filter === 'all') return true;
    if (filter === 'active') return (course.progress_percent || 0) < 100;
    if (filter === 'completed') return (course.progress_percent || 0) >= 100;
    return true;
  });

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-md">
          <a href="#/" className="text-headline-md font-bold text-primary no-underline">EduX</a>
          <nav className="hidden md:flex gap-md ml-lg">
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <button className="p-xs hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <div className="flex items-center gap-xs">
            {user?.picture ? (
               <img alt="Ảnh đại diện người dùng" className="w-8 h-8 rounded-full border border-outline-variant" src={user.picture} />
            ) : (
               <span className="material-symbols-outlined text-on-surface-variant text-[32px]">account_circle</span>
            )}
            <span className="hidden md:block text-label-md font-semibold">{user?.name || user?.email || 'Minh Phan'}</span>
          </div>
        </div>
      </header>

      <StudentSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeRoute="my-courses"
        logout={logout}
      />

      {/* Main Content */}
      <main className="ml-[240px] mt-16 p-lg bg-surface min-h-screen">
        <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* Left Column: Main List */}
          <div className="lg:col-span-8">
            {/* Breadcrumbs */}
            <nav className="flex text-label-sm font-label-sm text-secondary mb-xs">
              <a href="#/" className="hover:underline">Trang chủ</a>
              <span className="mx-base">/</span>
              <span className="text-primary font-bold">Khóa học của tôi</span>
            </nav>
            <h1 className="text-headline-lg font-bold text-primary mb-lg">Khóa học của tôi</h1>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-md mb-xl">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">search</span>
                <input className="w-full pl-xl pr-md py-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Tìm kiếm khóa học của bạn..." type="text" />
              </div>
              <select 
                className="px-md py-md bg-surface-container-lowest border border-outline-variant rounded-lg text-label-md font-label-md text-on-surface-variant min-w-[160px] focus:border-primary outline-none cursor-pointer"
                value={filter}
                onChange={handleFilterChange}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang học</option>
                <option value="completed">Đã hoàn thành</option>
              </select>
            </div>

            {/* Error or Loading State */}
            {loading && <p className="text-center text-secondary py-xl">Đang tải danh sách khóa học...</p>}
            {error && <p className="text-center text-red-500 py-xl">{error}</p>}
            
            {/* Empty State */}
            {!loading && !error && filteredCourses.length === 0 && (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-[64px] text-outline-variant mb-md">school</span>
                <h3 className="text-headline-sm font-bold text-on-surface mb-xs">Không tìm thấy khóa học nào</h3>
                <p className="text-body-md text-secondary mb-md">Bạn chưa đăng ký khóa học nào hoặc không có khóa học khớp với bộ lọc.</p>
                <button className="px-xl py-sm bg-primary text-white font-label-md rounded-full hover:bg-primary-container transition-colors" onClick={() => window.location.hash = '/courses'}>
                  Khám phá khóa học
                </button>
              </div>
            )}

            {/* Course Grid */}
            {!loading && !error && filteredCourses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {filteredCourses.map(course => (
                  <div key={course.enrollment_id} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer" onClick={() => window.location.hash = `/course/${course.course_id}`}>
                    <div className="relative aspect-video overflow-hidden bg-surface-variant">
                      <img alt={course.title} className="w-full h-full object-cover" src={course.thumbnail_url || "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=2000&auto=format&fit=crop"} />
                      <span className="absolute top-md left-md bg-primary text-white text-[10px] uppercase tracking-wider font-bold px-sm py-xs rounded-full">
                        {course.subject || 'Khác'}
                      </span>
                    </div>
                    <div className="p-md flex flex-col flex-grow">
                      <h3 className="text-headline-md font-bold text-on-surface mb-xs line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-xs mb-md">
                        <span className="material-symbols-outlined text-secondary text-[20px]">person</span>
                        <span className="text-label-sm text-secondary">Giảng viên: {course.tutor_name || 'Đang cập nhật'}</span>
                      </div>
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-base">
                          <span className={`text-label-sm font-bold ${(course.progress_percent || 0) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                            Tiến độ: {course.progress_percent || 0}%
                          </span>
                          <span className="text-label-sm text-secondary">{course.completed_lessons || 0}/{course.total_lessons || 0} Bài học</span>
                        </div>
                        <div className="w-full bg-surface-container h-1.5 rounded-full mb-md overflow-hidden">
                          <div className={`${(course.progress_percent || 0) >= 100 ? 'bg-outline-variant' : 'bg-primary'} h-full rounded-full`} style={{ width: (course.progress_percent || 0) + '%' }}></div>
                        </div>
                        {(course.progress_percent || 0) >= 100 ? (
                          <button className="w-full py-md bg-secondary-container text-primary font-label-md rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-xs">
                            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                            Xem chứng chỉ
                          </button>
                        ) : (
                          <button className="w-full py-md bg-primary text-white font-label-md rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-xs" onClick={(e) => { e.stopPropagation(); window.location.hash = `/course/${course.course_id}`; }}>
                            <span className="material-symbols-outlined text-[18px]">play_circle</span>
                            Tiếp tục học
                          </button>
                        )}
                        <button className="w-full mt-sm py-sm text-red-500 font-label-md rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-xs" onClick={(e) => handleOpenReport(e, course)}>
                          <span className="material-symbols-outlined text-[18px]">report</span>
                          Khiếu nại / Hoàn tiền
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            {/* Learning Statistics Card */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <h2 className="text-headline-md font-bold text-primary mb-md">Thống kê học tập</h2>
              <div className="space-y-md">
                <div className="flex items-center justify-between p-md bg-surface rounded-lg border border-outline-variant/30">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary bg-secondary-container p-xs rounded-lg">menu_book</span>
                    <span className="text-body-md text-secondary">Tổng số khóa học</span>
                  </div>
                  <span className="text-headline-md font-bold text-primary">{String(stats.totalCourses).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center justify-between p-md bg-surface rounded-lg border border-outline-variant/30">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-green-600 bg-green-50 p-xs rounded-lg">check_circle</span>
                    <span className="text-body-md text-secondary">Khóa học đã xong</span>
                  </div>
                  <span className="text-headline-md font-bold text-on-surface">{String(stats.completedCourses).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center justify-between p-md bg-surface rounded-lg border border-outline-variant/30">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-tertiary-container bg-tertiary-fixed p-xs rounded-lg">schedule</span>
                    <span className="text-body-md text-secondary">Giờ học tuần này</span>
                  </div>
                  <span className="text-headline-md font-bold text-on-surface">{stats.weeklyHours}h</span>
                </div>
              </div>
            </div>

            {/* Suggested Courses */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h2 className="text-headline-md font-bold text-primary">Khóa học gợi ý</h2>
                <a className="text-label-sm font-bold text-primary hover:underline" href="#/courses">Xem thêm</a>
              </div>
              <div className="flex flex-col gap-md">
                {suggestedCourses.length === 0 ? (
                  <p className="text-label-sm text-secondary text-center py-md">Chưa có khóa học gợi ý nào.</p>
                ) : suggestedCourses.map(sc => (
                  <div key={sc.id} className="flex gap-md p-xs hover:bg-surface rounded-lg transition-colors cursor-pointer group" onClick={() => window.location.hash = `#/course/${sc.id}`}>
                    {sc.thumbnail_url ? (
                      <img alt={sc.title} className="w-20 h-16 rounded-md object-cover border border-outline-variant" src={sc.thumbnail_url} />
                    ) : (
                      <div className="w-20 h-16 rounded-md bg-primary/10 border border-outline-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">school</span>
                      </div>
                    )}
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{sc.title}</h4>
                      <span className="text-label-sm text-secondary line-clamp-1">{sc.tutor_name || sc.instructor_name || 'Giảng viên'}</span>
                      <span className="text-label-sm font-bold text-primary mt-xs">{Number(sc.price) > 0 ? Number(sc.price).toLocaleString('vi-VN') + 'đ' : 'Miễn phí'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad/Promotion Banner */}
            <div className="relative bg-primary-container rounded-xl p-lg overflow-hidden h-40 flex items-center">
              <div className="relative z-10">
                <h3 className="text-headline-md font-bold text-white mb-xs">Ưu đãi mùa hè!</h3>
                <p className="text-label-sm text-primary-fixed-dim mb-md">Giảm 50% tất cả các khóa học ngoại ngữ.</p>
                <button className="px-md py-xs bg-white text-primary font-label-md rounded-lg hover:bg-surface-container-high transition-all">Nhận ngay</button>
              </div>
              <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-[120px] text-white/10 rotate-12">percent</span>
            </div>
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {reportModalOpen && selectedCourseToReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md">
          <div className="bg-surface rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-bold text-on-surface">Khiếu nại khóa học</h3>
              <button className="text-on-surface-variant hover:text-error transition-colors" onClick={() => setReportModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg overflow-y-auto">
              <p className="text-body-md text-on-surface-variant mb-md">
                Bạn đang khiếu nại khóa học <strong className="text-primary">{selectedCourseToReport.title}</strong>. 
                <br/>Hệ thống sẽ tự động hoàn tiền nếu bạn chưa học quá 20% và đăng ký chưa quá 7 ngày.
              </p>
              {reportError && <div className="p-sm bg-red-100 text-red-600 rounded mb-md text-label-md">{reportError}</div>}
              
              <label className="block text-label-md font-bold text-on-surface mb-xs mt-md">Mức độ nghiêm trọng</label>
              <select className="w-full p-sm border border-outline-variant rounded mb-md focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={reportSeverity} onChange={e => setReportSeverity(e.target.value)}>
                <option value="low">Thấp (Góp ý, nội dung chưa tốt)</option>
                <option value="medium">Trung bình (Giảng viên không hỗ trợ, chất lượng kém)</option>
                <option value="high">Cao (Lừa đảo, nội dung sai lệch nghiêm trọng)</option>
              </select>

              <label className="block text-label-md font-bold text-on-surface mb-xs">Lý do khiếu nại</label>
              <textarea 
                className="w-full p-sm border border-outline-variant rounded mb-md min-h-[100px] focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
              ></textarea>

              <label className="block text-label-md font-bold text-on-surface mb-xs">Bằng chứng (Hình ảnh/Video nếu có)</label>
              <input 
                type="file" 
                accept="image/*,video/*"
                className="w-full text-body-sm text-on-surface-variant file:mr-sm file:py-xs file:px-md file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-primary hover:file:bg-primary/20"
                onChange={e => setReportEvidence(e.target.files[0])}
              />
            </div>
            <div className="p-lg border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-md">
              <button className="px-lg py-sm text-on-surface-variant font-label-md rounded hover:bg-surface-variant transition-colors" onClick={() => setReportModalOpen(false)}>Hủy</button>
              <button 
                className="px-lg py-sm bg-error text-white font-label-md rounded hover:bg-red-600 transition-colors flex items-center gap-sm disabled:opacity-50"
                onClick={submitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Gửi khiếu nại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
