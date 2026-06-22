import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import LessonsTab from '../components/course/LessonsTab';
import OverviewTab from '../components/course/OverviewTab';
import AssignmentsTab from '../components/course/AssignmentsTab';
import MaterialsTab from '../components/course/MaterialsTab';
import LearningPathTab from '../components/course/LearningPathTab';
import DiscussionsTab from '../components/course/DiscussionsTab';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const TABS = ['Overview', 'Lessons', 'Assignments', 'Materials', 'Discussions', 'Learning Path'];

export default function CourseDetail() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [animateIn, setAnimateIn] = useState(false);

  // ── Real data state ─────────────────────────────────────────────────────
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ── Extract classId from hash ───────────────────────────────────────────
  const getCourseIdFromHash = () => {
    const match = window.location.hash.match(/#\/course\/([^/]+)/);
    return match ? match[1] : null;
  };

  const classId = getCourseIdFromHash();

  // ── Fetch class detail + lessons from backend ───────────────────────────
  useEffect(() => {
    if (!classId) {
      setError('Không tìm thấy ID khóa học trong URL.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch class detail
        const classRes = await fetch(`${API_BASE}/api/classes/${classId}`, { headers });
        const classJson = await classRes.json();

        if (!classRes.ok || !classJson.success) {
          throw new Error(classJson.message || 'Không thể tải thông tin khóa học.');
        }

        // Fetch lessons for this class
        let lessonsData = [];
        try {
          const lessonsRes = await fetch(`${API_BASE}/api/classes/${classId}/lessons`, { headers });
          const lessonsJson = await lessonsRes.json();
          if (lessonsJson.success && Array.isArray(lessonsJson.data)) {
            lessonsData = lessonsJson.data;
          }
        } catch (lessonErr) {
          console.warn('[CourseDetail] Could not fetch lessons:', lessonErr.message);
        }

        setCourse(classJson.data);
        setLessons(lessonsData);
      } catch (err) {
        console.error('[CourseDetail] Fetch error:', err);
        setError(err.message || 'Không thể tải khóa học.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId]);

  // ── Derived values from real data ───────────────────────────────────────
  const totalLessons = course?.total_lessons || lessons.length || 0;
  // No lesson_completions table yet → completedLessons = 0
  const completedLessons = 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  // No XP tracking table yet → xp = 0
  const xpPoints = 0;

  // Format date range from DB start_date / end_date
  const formatDateRange = () => {
    if (!course?.start_date && !course?.end_date) return 'Chưa có lịch';
    const opts = { month: 'short', day: 'numeric' };
    const start = course.start_date ? new Date(course.start_date).toLocaleDateString('en-US', opts) : '?';
    const end = course.end_date ? new Date(course.end_date).toLocaleDateString('en-US', opts) : '?';
    return `${start} - ${end}`;
  };

  // Build course object to pass to child components (OverviewTab, etc.)
  const courseForChildren = course ? {
    ...course,
    instructor: course.tutor_name || 'Chưa có giảng viên',
    dateRange: formatDateRange(),
    progress,
    lessonsCompleted: completedLessons,
    totalLessons,
    xpPoints,
  } : null;

  // ── Helper: get file icon info for materials ────────────────────────────
  const getMaterialIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return { icon: 'picture_as_pdf', bgColor: 'bg-red-100', textColor: 'text-red-600' };
      case 'ppt':
      case 'pptx':
        return { icon: 'slideshow', bgColor: 'bg-orange-100', textColor: 'text-orange-600' };
      case 'doc':
      case 'docx':
        return { icon: 'description', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
      case 'video':
      case 'mp4':
        return { icon: 'videocam', bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
      case 'link':
        return { icon: 'link', bgColor: 'bg-green-100', textColor: 'text-green-600' };
      default:
        return { icon: 'insert_drive_file', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
    }
  };

  const renderTabContent = () => {
    if (!courseForChildren) return null;
    switch (activeTab) {
      case 'Lessons':
        return <LessonsTab classId={classId} />;
      case 'Overview':
        return <OverviewTab course={courseForChildren} />;
      case 'Assignments':
        return <AssignmentsTab classId={classId} />;
      case 'Materials':
        return <MaterialsTab classId={classId} />;
      case 'Learning Path':
        return <LearningPathTab classId={classId} />;
      case 'Discussions':
        return <DiscussionsTab classId={classId} />;
      default:
        return <OverviewTab course={courseForChildren} />;
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen font-body-md">
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface border-b border-outline-variant shadow-sm">
          <a href="#/" className="text-headline-md font-bold text-primary no-underline">EduX</a>
        </header>
        <StudentSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeRoute="my-courses" logout={logout} />
        <main className="ml-[240px] mt-16 p-lg bg-surface min-h-screen flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-primary text-[48px] animate-spin mb-4 block">progress_activity</span>
            <p className="text-body-md text-on-surface-variant">Đang tải khóa học...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || !course) {
    return (
      <div className="bg-surface text-on-surface min-h-screen font-body-md">
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface border-b border-outline-variant shadow-sm">
          <a href="#/" className="text-headline-md font-bold text-primary no-underline">EduX</a>
        </header>
        <StudentSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeRoute="my-courses" logout={logout} />
        <main className="ml-[240px] mt-16 p-lg bg-surface min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-error text-[48px] mb-4 block">error</span>
            <h2 className="text-headline-md font-bold text-on-surface mb-2">Không thể tải khóa học</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              {error || 'Khóa học không tồn tại hoặc đã bị xóa.'}
            </p>
            <a href="#/my-courses" className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-xl inline-flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
              Quay lại Khóa học
            </a>
          </div>
        </main>
      </div>
    );
  }

  // ── Build upcoming session display ──────────────────────────────────────
  const upSession = course.upcoming_session;
  const hasUpcomingSession = !!upSession;

  // ── Build sidebar materials from API data ───────────────────────────────
  const sidebarMaterials = (course.materials || []).map((mat) => {
    const iconInfo = getMaterialIcon(mat.file_type);
    const updatedDate = mat.created_at
      ? new Date(mat.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
      : '';
    return {
      ...iconInfo,
      name: mat.title,
      meta: `${mat.file_size || ''} • ${updatedDate}`.replace(/^ • /, '').replace(/ • $/, '') || 'Tài liệu',
      fileUrl: mat.file_url,
    };
  });

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-md">
          <a href="#/" className="text-headline-md font-bold text-primary no-underline">
            EduX
          </a>
          <nav className="hidden md:flex gap-md ml-lg">
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <button className="relative p-xs hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <div className="flex items-center gap-xs">
            {user?.picture ? (
              <img
                alt="Ảnh đại diện người dùng"
                className="w-8 h-8 rounded-full border border-outline-variant"
                src={user.picture}
              />
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
                account_circle
              </span>
            )}
            <span className="hidden md:block text-label-md font-semibold">
              {user?.name || user?.email || ''}
            </span>
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
        <div className="max-w-container-max mx-auto grid grid-cols-12 gap-lg items-start">
          {/* Left & Center: Course Details (col-span-8) */}
          <div className="col-span-8 space-y-8">
            {/* Breadcrumbs */}
            <nav
              className={`flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant mb-2 transition-all duration-500 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <a href="#/my-courses" className="hover:text-primary transition-colors">
                Khóa học của tôi
              </a>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              {activeTab !== 'Overview' ? (
                <>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors"
                    onClick={(e) => { e.preventDefault(); setActiveTab('Overview'); }}
                  >
                    {course.title}
                  </a>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-primary font-semibold">{activeTab}</span>
                </>
              ) : (
                <span className="text-primary font-semibold">{course.title}</span>
              )}
            </nav>

            {/* Hero Section */}
            <section
              className={`bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant transition-all duration-700 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '0.05s' }}
            >
              <div className="relative h-64 w-full bg-primary-container/20">
                {course.bannerImage ? (
                  <img className="w-full h-full object-cover" src={course.bannerImage} alt="Course banner" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary-container/30">
                    <span className="material-symbols-outlined text-primary text-[80px] opacity-30">school</span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                    {course.status === 'active' ? 'Active' : course.status || 'Course'}
                  </span>
                </div>
              </div>
              <div className="p-md space-y-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-headline-lg font-bold text-on-surface mb-xs">{course.title}</h2>
                    <div className="flex items-center gap-4 text-on-surface-variant font-label-md text-label-md">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                        <span>Instructor: {course.tutor_name || 'Chưa có giảng viên'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          calendar_month
                        </span>
                        <span>{formatDateRange()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-headline-md font-bold text-primary">{progress}%</span>
                    <p className="text-label-sm text-on-surface-variant">Course Progress</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface-container-highest rounded-full h-3">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <button className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_circle
                    </span>
                    Continue Learning
                  </button>
                  {course.meet_link ? (
                    <a
                      href={course.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-2 border-primary text-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/5 transition-all active:scale-95 no-underline"
                    >
                      <span className="material-symbols-outlined">groups</span>
                      Join Live Class
                    </a>
                  ) : (
                    <button className="border-2 border-primary text-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/5 transition-all active:scale-95 opacity-50 cursor-not-allowed" disabled>
                      <span className="material-symbols-outlined">groups</span>
                      Chưa có link
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Tabs & Content */}
            <section
              className={`space-y-md transition-all duration-700 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '0.1s' }}
            >
              {/* Tab Navigation */}
              <div className="border-b border-surface-container flex gap-10">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 font-label-md text-label-md whitespace-nowrap transition-colors duration-200 ${
                      activeTab === tab
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </section>
          </div>

          {/* Right Column: Sidebar Stats & Info (col-span-4) */}
          <div className="col-span-4 space-y-md">
            {/* Course Statistics Card */}
            <div
              className={`bg-surface-container-lowest p-6 rounded-xl border border-surface-container space-y-4 transition-all duration-700 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '0.15s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
            >
              <h3 className="font-label-md text-label-md text-on-surface mb-4">Course Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-4 rounded-lg border border-surface-container">
                  <p className="text-xs text-on-surface-variant mb-1">Completed</p>
                  <p className="text-headline-md font-bold text-primary">{completedLessons}/{totalLessons}</p>
                  <p className="text-[10px] text-on-surface-variant">Lessons</p>
                </div>
                <div className="bg-surface p-4 rounded-lg border border-surface-container">
                  <p className="text-xs text-on-surface-variant mb-1">XP Earned</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-amber-500 text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      stars
                    </span>
                    <p className="text-headline-md font-bold text-on-surface">{xpPoints}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">Knowledge Points</p>
                </div>
              </div>
            </div>

            {/* Upcoming Class Card */}
            <div
              className={`bg-primary-container text-white p-6 rounded-xl relative overflow-hidden group transition-all duration-700 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
            >
              <div className="relative z-10">
                {hasUpcomingSession ? (
                  <>
                    <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wider mb-4">
                      {upSession.status === 'ongoing' ? 'Live Now' : 'Upcoming Session'}
                    </span>
                    <h3 className="font-headline-md text-headline-md leading-tight mb-2">{upSession.title}</h3>
                    <p className="font-body-md text-body-md opacity-90 mb-6">
                      {new Date(upSession.start_time).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' • '}
                      {new Date(upSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {upSession.tutor_name ? ` • With ${upSession.tutor_name}` : ''}
                    </p>
                    {upSession.meeting_url ? (
                      <a
                        href={upSession.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 no-underline"
                      >
                        <span className="material-symbols-outlined text-[20px]">video_call</span>
                        Join Session
                      </a>
                    ) : (
                      <button className="w-full py-3 bg-white/50 text-primary/70 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2" disabled>
                        <span className="material-symbols-outlined text-[20px]">video_call</span>
                        Chưa có link
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wider mb-4">
                      Lịch học
                    </span>
                    <h3 className="font-headline-md text-headline-md leading-tight mb-2">Chưa có buổi học sắp tới</h3>
                    <p className="font-body-md text-body-md opacity-90 mb-6">
                      Hiện tại không có lịch học nào được lên kế hoạch cho khóa học này.
                    </p>
                    <button className="w-full py-3 bg-white/30 text-white/80 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2" disabled>
                      <span className="material-symbols-outlined text-[20px]">event</span>
                      Chờ lịch học
                    </button>
                  </>
                )}
              </div>
              {/* Decorative background icon */}
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] opacity-10 rotate-12 group-hover:scale-110 transition-transform">podcasts</span>
            </div>



            {/* Quick Materials */}
            <div
              className={`bg-surface-container-lowest p-6 rounded-xl border border-surface-container transition-all duration-700 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '0.25s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
            >
              <h3 className="font-label-md text-label-md text-on-surface mb-4">Quick Materials</h3>
              {sidebarMaterials.length > 0 ? (
                <div className="space-y-3">
                  {sidebarMaterials.map((mat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg border border-surface-container hover:border-primary/30 transition-colors group cursor-pointer"
                      onClick={() => mat.fileUrl && window.open(mat.fileUrl, '_blank')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded ${mat.bgColor} ${mat.textColor} flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-[20px]">{mat.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">{mat.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{mat.meta}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-primary">download</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2 block opacity-40">folder_off</span>
                  <p className="text-label-sm text-on-surface-variant">Chưa có tài liệu</p>
                </div>
              )}
              <button
                className="w-full mt-6 py-2 text-primary font-label-md text-label-md hover:underline"
                onClick={() => setActiveTab('Materials')}
              >
                View All Materials
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
