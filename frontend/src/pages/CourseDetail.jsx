import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import LessonsTab from '../components/course/LessonsTab';
import OverviewTab from '../components/course/OverviewTab';
import AssignmentsTab from '../components/course/AssignmentsTab';
import MaterialsTab from '../components/course/MaterialsTab';
import LearningPathTab from '../components/course/LearningPathTab';
import DiscussionsTab from '../components/course/DiscussionsTab';

const COURSE_DATA = {
  id: 1,
  title: 'UI/UX Advanced Mobile App Design',
  badge: 'Design Excellence',
  instructor: 'Jane Doe',
  dateRange: 'Jan 15 - May 20',
  progress: 45,
  lessonsCompleted: 12,
  totalLessons: 24,
  xpPoints: 850,
  bannerImage:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_KcMsAP377EF8EhDYTzr9aMGjZgUW8nCwtack2L40Hz5elV_HtLynBqX4pHE3CiLo3wWJF4rW2fiO6XsOpY8Ez3OYmQMNWuMI-Tlny058n1-Begw-zE2pUTHb93o3kJFIIsxiPHDMlRfJowhb1PP1zRF6TKs2N5mqs7qpaC8mMhx13GAK-rz77NleW-hIM3EQMFMu_gW3UfksgkVQhBG_6UMw7BvWwKIrTX2RDJwSaCMlb9MJAeK1osk_XL2Tf763botyHD1A9fQI',

  badges: [
    { icon: 'rocket_launch', title: 'Early Bird', bgClass: 'bg-primary-fixed', iconClass: 'text-primary' },
    { icon: 'bolt', title: 'Quick Learner', bgClass: 'bg-tertiary-fixed', iconClass: 'text-on-tertiary-fixed-variant' },
    { icon: 'emoji_events', title: 'Champion', bgClass: 'bg-surface-container-highest', iconClass: 'text-outline', locked: true },
  ],
  nextClass: {
    label: 'Live Session',
    title: 'Next Class: Today',
    time: '05:00 PM - 06:30 PM',
  },
  deadline: {
    title: 'Low-Fi Wireframing',
    daysLeft: 2,
    description: "Submit the hi-fi iteration for the 'Eco-Tracker' app design challenge.",
  },
  materials: [
    {
      icon: 'picture_as_pdf',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      name: 'Course Syllabus.pdf',
      meta: '2.4 MB • Updated yesterday',
      action: 'download',
    },
    {
      icon: 'description',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      name: 'Mobile UI Kit v2.sketch',
      meta: '45.8 MB • Library',
      action: 'link',
    },
  ],
};

const TABS = ['Overview', 'Lessons', 'Assignments', 'Materials', 'Discussions', 'Learning Path'];

export default function CourseDetail() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getCourseIdFromHash = () => {
    const match = window.location.hash.match(/#\/course\/([^/]+)/);
    return match ? match[1] : null;
  };

  const classIdFromHash = getCourseIdFromHash();
  const classId = classIdFromHash && classIdFromHash !== '1' ? classIdFromHash : 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Lessons':
        return <LessonsTab classId={classId} />;
      case 'Overview':
        return <OverviewTab course={course} />;
      case 'Assignments':
        return <AssignmentsTab classId={classId} />;
      case 'Materials':
        return <MaterialsTab classId={classId} />;
      case 'Learning Path':
        return <LearningPathTab classId={classId} />;
      case 'Discussions':
        return <DiscussionsTab classId={classId} />;
      default:
        return <OverviewTab course={course} />;
    }
  };

  const course = COURSE_DATA;

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
              {user?.name || user?.email || 'Văn kiên Nguyễn'}
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
              <div className="relative h-64 w-full">
                <img className="w-full h-full object-cover" src={course.bannerImage} alt="Course banner" />
                <div className="absolute top-4 left-4">
                  <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                    {course.badge}
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
                        <span>Instructor: {course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          calendar_month
                        </span>
                        <span>{course.dateRange}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-headline-md font-bold text-primary">{course.progress}%</span>
                    <p className="text-label-sm text-on-surface-variant">Course Progress</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface-container-highest rounded-full h-3">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-700"
                    style={{ width: `${course.progress}%` }}
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
                  <button className="border-2 border-primary text-primary font-label-md text-label-md px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/5 transition-all active:scale-95">
                    <span className="material-symbols-outlined">groups</span>
                    Join Live Class
                  </button>
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
                  <p className="text-headline-md font-bold text-primary">{course.lessonsCompleted}/{course.totalLessons}</p>
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
                    <p className="text-headline-md font-bold text-on-surface">{course.xpPoints}</p>
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
                <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wider mb-4">
                  {course.nextClass.label}
                </span>
                <h3 className="font-headline-md text-headline-md leading-tight mb-2">Interactive Motion Design</h3>
                <p className="font-body-md text-body-md opacity-90 mb-6">Today, 5:00 PM • With Prof. Sterling</p>
                <button className="w-full py-3 bg-white text-primary font-bold rounded-lg hover:bg-opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">video_call</span>
                  Join Session
                </button>
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
              <div className="space-y-3">
                {course.materials.map((mat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-surface rounded-lg border border-surface-container hover:border-primary/30 transition-colors group cursor-pointer"
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
              <button className="w-full mt-6 py-2 text-primary font-label-md text-label-md hover:underline">
                View All Materials
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
