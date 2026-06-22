import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import StudentSidebar from '../components/StudentSidebar';

export default function MyCourses() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    console.log('Filtering by:', e.target.value);
  };

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

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {/* Course Card 1: In Progress */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer" onClick={() => window.location.hash = '/course/1'}>
                <div className="relative aspect-video overflow-hidden">
                  <img alt="UI/UX Design Course" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <span className="absolute top-md left-md bg-primary text-white text-[10px] uppercase tracking-wider font-bold px-sm py-xs rounded-full">Lập trình</span>
                </div>
                <div className="p-md flex flex-col flex-grow">
                  <h3 className="text-headline-md font-bold text-on-surface mb-xs">Thiết kế UI/UX Nâng cao cho Mobile App</h3>
                  <div className="flex items-center gap-xs mb-md">
                    <img alt="Instructor" className="w-6 h-6 rounded-full object-cover" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&amp;w=200&amp;auto=format&amp;fit=crop" />
                    <span className="text-label-sm text-secondary">Giảng viên: Jane Doe</span>
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-base">
                      <span className="text-label-sm font-bold text-primary">Tiến độ: 45%</span>
                      <span className="text-label-sm text-secondary">12/28 Bài học</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mb-md overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <button className="w-full py-md bg-primary text-white font-label-md rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-xs" onClick={(e) => { e.stopPropagation(); window.location.hash = '/course/1'; }}>
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      Tiếp tục học
                    </button>
                  </div>
                </div>
              </div>

              {/* Course Card 2: Completed */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="relative aspect-video overflow-hidden">
                  <img alt="IELTS Masterclass" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <span className="absolute top-md left-md bg-tertiary-container text-white text-[10px] uppercase tracking-wider font-bold px-sm py-xs rounded-full">Ngoại ngữ</span>
                </div>
                <div className="p-md flex flex-col flex-grow">
                  <h3 className="text-headline-md font-bold text-on-surface mb-xs">IELTS Masterclass: Road to 8.5 Band</h3>
                  <div className="flex items-center gap-xs mb-md">
                    <img alt="Instructor" className="w-6 h-6 rounded-full object-cover" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&amp;w=200&amp;auto=format&amp;fit=crop" />
                    <span className="text-label-sm text-secondary">Giảng viên: Michael Smith</span>
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-base">
                      <span className="text-label-sm font-bold text-secondary">Tiến độ: 100%</span>
                      <span className="text-label-sm text-secondary">32/32 Bài học</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mb-md overflow-hidden">
                      <div className="bg-outline-variant h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <button className="w-full py-md bg-secondary-container text-primary font-label-md rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-xs">
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                      Xem chứng chỉ
                    </button>
                  </div>
                </div>
              </div>

              {/* Course Card 3: In Progress */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="relative aspect-video overflow-hidden">
                  <img alt="Python Fundamentals" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <span className="absolute top-md left-md bg-primary text-white text-[10px] uppercase tracking-wider font-bold px-sm py-xs rounded-full">Lập trình</span>
                </div>
                <div className="p-md flex flex-col flex-grow">
                  <h3 className="text-headline-md font-bold text-on-surface mb-xs">Lập trình Python từ Cơ bản đến Nâng cao</h3>
                  <div className="flex items-center gap-xs mb-md">
                    <img alt="Instructor" className="w-6 h-6 rounded-full object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&amp;w=200&amp;auto=format&amp;fit=crop" />
                    <span className="text-label-sm text-secondary">Giảng viên: Trần Hoàng</span>
                  </div>
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-base">
                      <span className="text-label-sm font-bold text-primary">Tiến độ: 12%</span>
                      <span className="text-label-sm text-secondary">4/40 Bài học</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mb-md overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '12%' }}></div>
                    </div>
                    <button className="w-full py-md bg-primary text-white font-label-md rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-xs">
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      Tiếp tục học
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                  <span className="text-headline-md font-bold text-primary">08</span>
                </div>
                <div className="flex items-center justify-between p-md bg-surface rounded-lg border border-outline-variant/30">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-green-600 bg-green-50 p-xs rounded-lg">check_circle</span>
                    <span className="text-body-md text-secondary">Khóa học đã xong</span>
                  </div>
                  <span className="text-headline-md font-bold text-on-surface">03</span>
                </div>
                <div className="flex items-center justify-between p-md bg-surface rounded-lg border border-outline-variant/30">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-tertiary-container bg-tertiary-fixed p-xs rounded-lg">schedule</span>
                    <span className="text-body-md text-secondary">Giờ học tuần này</span>
                  </div>
                  <span className="text-headline-md font-bold text-on-surface">12.5h</span>
                </div>
              </div>
            </div>

            {/* Suggested Courses */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h2 className="text-headline-md font-bold text-primary">Khóa học gợi ý</h2>
                <a className="text-label-sm font-bold text-primary hover:underline" href="#">Xem thêm</a>
              </div>
              <div className="flex flex-col gap-md">
                {/* Horizontal Suggested Card */}
                <div className="flex gap-md p-xs hover:bg-surface rounded-lg transition-colors cursor-pointer group">
                  <img alt="Data Science" className="w-20 h-16 rounded-md object-cover border border-outline-variant" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <div className="flex flex-col justify-center">
                    <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">Data Science Specialization</h4>
                    <span className="text-label-sm text-secondary">Dr. Alan Turing</span>
                    <span className="text-label-sm font-bold text-primary mt-xs">1.200.000đ</span>
                  </div>
                </div>
                {/* Horizontal Suggested Card */}
                <div className="flex gap-md p-xs hover:bg-surface rounded-lg transition-colors cursor-pointer group">
                  <img alt="React Native" className="w-20 h-16 rounded-md object-cover border border-outline-variant" src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <div className="flex flex-col justify-center">
                    <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">React Native for Beginners</h4>
                    <span className="text-label-sm text-secondary">Nguyễn Văn A</span>
                    <span className="text-label-sm font-bold text-primary mt-xs">850.000đ</span>
                  </div>
                </div>
                {/* Horizontal Suggested Card */}
                <div className="flex gap-md p-xs hover:bg-surface rounded-lg transition-colors cursor-pointer group">
                  <img alt="Digital Marketing" className="w-20 h-16 rounded-md object-cover border border-outline-variant" src="https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&amp;w=2000&amp;auto=format&amp;fit=crop" />
                  <div className="flex flex-col justify-center">
                    <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">Digital Marketing 4.0</h4>
                    <span className="text-label-sm text-secondary">Sarah Jenkins</span>
                    <span className="text-label-sm font-bold text-primary mt-xs">550.000đ</span>
                  </div>
                </div>
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
    </div>
  );
}
