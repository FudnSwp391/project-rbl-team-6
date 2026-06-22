import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SchedulePage = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');   // what user types
  const [searchQuery, setSearchQuery] = useState('');   // what actually triggers API
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [tutorFilter, setTutorFilter] = useState('All Tutors');

  // Day detail modal
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeFrame, setTimeFrame] = useState('This Week');

  const fetchSchedule = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter !== 'All Status') queryParams.append('status', statusFilter);
      if (subjectFilter !== 'All Subjects') queryParams.append('subject', subjectFilter);
      if (tutorFilter !== 'All Tutors') queryParams.append('tutor', tutorFilter);

      const res = await fetch(`${API_BASE}/api/student/schedule?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch schedule data');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'API Error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [searchQuery, statusFilter, subjectFilter, tutorFilter, token]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleJoinClass = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Link Google Meet sẽ được gửi cho bạn khi buổi học bắt đầu.');
    }
  };

  const markCompleted = async (sessionId) => {
    // This is a dev placeholder based on user's original code
    alert('Vui lòng vào chi tiết buổi học để đánh giá và hoàn thành.');
  };

  // Create an array of 7 days for the week view (starting from Monday)
  const getDisplayDates = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dates = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (timeFrame === 'Today') {
      dates.push({
        dayName: days[today.getDay()],
        date: today.getDate(),
        fullDate: today,
        isToday: true
      });
    } else if (timeFrame === 'This Week') {
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push({
          dayName: days[d.getDay()],
          date: d.getDate(),
          fullDate: d,
          isToday: d.toDateString() === new Date().toDateString()
        });
      }
    } else if (timeFrame === 'This Month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1);
      const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
      
      for (let i = 0; i < firstDayIndex; i++) {
        dates.push(null);
      }
      for (let i = 1; i <= numDays; i++) {
        const d = new Date(year, month, i);
        dates.push({
          dayName: days[d.getDay()],
          date: d.getDate(),
          fullDate: d,
          isToday: d.toDateString() === new Date().toDateString()
        });
      }
    }
    return dates;
  };

  const displayDates = getDisplayDates();

  // Helper: get status-based styling for a session card
  const getSessionStyle = (status) => {
    if (status === 'ongoing') return { bgColor: 'bg-primary-container/20', borderColor: 'border-primary/30', labelBg: 'bg-primary', labelColor: 'text-on-primary' };
    if (status === 'upcoming' || status === 'accepted' || status === 'pending') return { bgColor: 'bg-tertiary-container/10', borderColor: 'border-tertiary/20', labelBg: 'bg-tertiary-container', labelColor: 'text-tertiary' };
    if (status === 'completed') return { bgColor: 'bg-secondary-container/10', borderColor: 'border-secondary/20', labelBg: 'bg-secondary', labelColor: 'text-on-secondary' };
    if (status === 'cancelled' || status === 'declined') return { bgColor: 'bg-error-container/10', borderColor: 'border-error/20', labelBg: 'bg-error', labelColor: 'text-on-error' };
    return { bgColor: 'bg-surface', borderColor: 'border-outline-variant', labelBg: 'bg-surface-variant', labelColor: 'text-on-surface' };
  };

  // Format a full day title like "Tuesday, June 17"
  const formatDayTitle = (date) => {
    return date.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-lg pb-4">
      {/* Header Section */}
      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Lịch học của tôi</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Theo dõi và quản lý tất cả các buổi học của bạn trong {timeFrame === 'Today' ? 'hôm nay' : timeFrame === 'This Week' ? 'tuần này' : 'tháng này'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-surface-container rounded-lg p-1 hidden sm:flex">
            <button type="button" onClick={() => setTimeFrame('Today')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === 'Today' ? 'bg-surface shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>Today</button>
            <button type="button" onClick={() => setTimeFrame('This Week')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === 'This Week' ? 'bg-surface shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>This Week</button>
            <button type="button" onClick={() => setTimeFrame('This Month')} className={`px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors ${timeFrame === 'This Month' ? 'bg-surface shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>This Month</button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="p-8 text-center text-on-surface-variant">Loading schedule...</div>
      ) : error ? (
        <div className="p-8 text-center text-error">Error: {error}</div>
      ) : (
        <>
          {/* Stats Row */}
          <section className="bg-primary-container/5 border border-primary/20 rounded-xl p-5 flex items-center shadow-sm gap-6 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">military_tech</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface">Tiến độ tuần này</h3>
                <p className="text-label-md text-on-surface-variant">{data.summary.weekly_completed} / {data.summary.weekly_total} buổi hoàn thành</p>
              </div>
            </div>
            
            <div className="flex-1 px-4 border-l border-r border-outline-variant/30 min-w-[200px] max-w-[300px] shrink-0">
              <div className="flex justify-between mb-1">
                <span className="text-label-sm font-bold text-primary">
                  {data.summary.weekly_total > 0 ? Math.round((data.summary.weekly_completed / data.summary.weekly_total) * 100) : 0}%
                </span>
                <span className="text-[11px] text-on-surface-variant">Mục tiêu: {data.summary.weekly_goal_hours}h</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${data.summary.weekly_total > 0 ? (data.summary.weekly_completed / data.summary.weekly_total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <div className="bg-surface border border-outline-variant/50 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-primary">school</span>
                <span className="text-label-sm font-bold text-on-surface">{data.summary.completed} Buổi học</span>
              </div>
              <div className="bg-surface border border-outline-variant/50 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-tertiary">timer</span>
                <span className="text-label-sm font-bold text-on-surface">{data.summary.learning_hours}h Đã học</span>
              </div>
              <div className="bg-surface border border-outline-variant/50 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-error">local_fire_department</span>
                <span className="text-label-sm font-bold text-on-surface">{data.summary.streak_days} Chuỗi</span>
              </div>
              <div className="bg-surface border border-outline-variant/50 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[14px] text-primary">stars</span>
                <span className="text-label-sm font-bold text-on-surface">+{data.summary.xp_earned} XP</span>
              </div>
            </div>
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-2px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Tổng số buổi</p>
                <p className="text-headline-md font-headline-md text-on-surface">{data.summary.total_classes}</p>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-2px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Đã hoàn thành</p>
                <p className="text-headline-md font-headline-md text-on-surface">{data.summary.completed}</p>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-2px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Sắp diễn ra</p>
                <p className="text-headline-md font-headline-md text-on-surface">{data.summary.upcoming}</p>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-2px_rgba(0,0,0,0.05)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Giờ học</p>
                <p className="text-headline-md font-headline-md text-on-surface">{data.summary.learning_hours}h</p>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="flex flex-col sm:flex-row gap-4">
            <form className="relative flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input 
                  className="w-full pl-10 pr-10 py-2.5 bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md font-body-md transition-all h-12" 
                  placeholder="Nhập tên môn học, lớp..." 
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Xóa"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm h-12 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                Tìm kiếm
              </button>
            </form>
            <div className="flex gap-2 overflow-x-auto">
              <select 
                className="px-4 py-2.5 bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md font-body-md text-on-surface h-12 min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <select 
                className="px-4 py-2.5 bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md font-body-md text-on-surface h-12 min-w-[140px]"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option>All Subjects</option>
                <option value="Toán học">Toán học</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
              </select>
            </div>
          </section>

          {/* Main Layout: Left Schedule Board + Right Panel */}
          <div className="flex flex-col lg:flex-row gap-gutter items-stretch min-h-[calc(100vh-450px)] mb-4">
            {/* Weekly Schedule Board */}
            <section className="bg-surface rounded-xl shadow-sm border border-surface-variant w-full lg:w-[70%] flex flex-col h-full overflow-x-auto">
              {/* Days Header */}
              <div className={`grid ${timeFrame === 'Today' ? 'grid-cols-1' : 'grid-cols-7 min-w-[1100px]'} ${timeFrame === 'This Month' ? 'border-b-0' : 'border-b'} border-surface-variant bg-surface-container-lowest rounded-t-xl shrink-0`}>
                {displayDates.map((wd, index) => {
                  if (!wd) return <div key={index} className="py-3 border-r border-b border-surface-variant last:border-r-0 bg-surface/30"></div>;
                  return (
                  <div key={index} className={`py-3 text-center border-r border-surface-variant last:border-0 ${wd.isToday ? 'bg-primary/10' : ''}`}>
                    <p className={`text-label-sm font-label-sm uppercase tracking-wider ${wd.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                      {wd.dayName}
                    </p>
                    <p className={`text-headline-md font-headline-md mt-1 ${wd.isToday ? 'text-primary' : 'text-on-surface'}`}>
                      {wd.date}
                    </p>
                    {wd.isToday && <div className="text-[10px] font-bold text-primary mt-1">Hôm nay</div>}
                  </div>
                );
              })}
              </div>

              {/* Compact Calendar Grid */}
              <div className={`grid ${timeFrame === 'Today' ? 'grid-cols-1' : 'grid-cols-7 min-w-[1100px]'} bg-surface-container-lowest rounded-b-xl flex-1`}>

                {displayDates.map((wd, index) => {
                  if (!wd) return <div key={index} className="border-r border-b border-surface-variant last:border-r-0 p-2 bg-surface/30 h-full min-h-[120px]"></div>;
                  // Find sessions that happen on this day
                  const daySessions = data.sessions.filter(s => {
                    const sessionDate = new Date(s.start_time);
                    return sessionDate.toDateString() === wd.fullDate.toDateString();
                  });

                  const visibleSessions = daySessions.slice(0, 2);
                  const hiddenCount = daySessions.length - 2;

                  return (
                    <div key={index} className={`border-r border-b border-surface-variant last:border-r-0 p-2 flex flex-col gap-2 ${wd.isToday ? 'bg-primary/5' : 'bg-surface'} h-full ${timeFrame === 'This Month' ? 'min-h-[120px]' : 'min-h-[200px]'}`}>
                      {daySessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant opacity-50 flex-1">
                          <span className="material-symbols-outlined text-2xl mb-1">event_busy</span>
                          <span className="text-[11px] font-medium text-center">Không có lịch</span>
                        </div>
                      ) : (
                        <>
                          {visibleSessions.map((session) => {
                            const startObj = new Date(session.start_time);
                            const endObj = new Date(session.end_time);
                            const style = getSessionStyle(session.status);

                            return (
                              <div key={session.id} className={`w-full ${style.bgColor} border ${style.borderColor} rounded-lg p-2.5 hover:shadow-md transition-shadow cursor-pointer shadow-sm`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${style.labelBg} ${style.labelColor}`}>
                                    {session.status === 'ongoing' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                                    {session.status === 'completed' && <span className="material-symbols-outlined text-[10px]">check</span>}
                                    {session.status === 'ongoing' ? 'Live now' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                  </span>
                                  {session.xp_earned > 0 && <span className="text-[10px] font-bold text-primary">+{session.xp_earned} XP</span>}
                                </div>
                                <h4 className="text-label-md font-bold text-on-surface leading-tight mb-1 line-clamp-2" title={session.title}>{session.title}</h4>
                                <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mb-2">
                                  <span className="material-symbols-outlined text-[12px]">schedule</span> 
                                  {startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-surface-variant/50">
                                  <div className="w-4 h-4 rounded-full bg-surface-variant flex items-center justify-center text-[8px] font-bold text-white">
                                    {(session.tutor_name || 'T').charAt(0)}
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant font-medium truncate">{session.tutor_name}</span>
                                </div>
                              </div>
                            );
                          })}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedDay({ date: wd.fullDate, sessions: daySessions })}
                              className="mt-auto w-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">expand_more</span>
                              +{hiddenCount} nữa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Panel */}
            <div className="w-full lg:w-[30%] flex flex-col">
              {/* Up Next / Today's Classes */}
              <section className="bg-surface rounded-xl p-5 shadow-sm border border-surface-variant flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-headline-md font-headline-md text-on-surface">Tiếp theo</h3>
                  <button type="button" className="text-primary hover:underline text-label-sm font-label-sm font-bold">Xem tất cả</button>
                </div>
                
                <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10 shrink-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-label-sm font-bold text-on-surface">Lịch học hôm nay</span>
                    <span className="text-label-sm text-primary font-bold">{data.today.filter(s => s.status === 'completed').length} / {data.today.length}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all" 
                      style={{ width: `${data.today.length > 0 ? (data.today.filter(s => s.status === 'completed').length / data.today.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 flex-1 overflow-visible">
                  {data.up_next.length === 0 ? (
                    <p className="text-center text-on-surface-variant text-label-md py-4">Không có lịch học sắp tới</p>
                  ) : (
                    data.up_next.map((session, index) => (
                      <div key={session.id} className={`${index === 0 ? 'bg-primary-container/5 border border-primary/20' : 'bg-surface border border-outline-variant'} rounded-lg p-4 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] transition-all`}>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`inline-block px-2.5 py-1 ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-tertiary-container/20 text-tertiary-container'} text-[11px] font-bold rounded-md uppercase tracking-wide`}>
                            {session.subject}
                          </span>
                          <span className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant bg-surface px-2 py-1 rounded shadow-sm border border-surface-variant">
                            <span className={`material-symbols-outlined text-[16px] ${session.meeting_platform === 'Zoom' ? 'text-error' : 'text-primary'}`}>
                              {session.meeting_platform === 'Zoom' ? 'videocam' : 'link'}
                            </span> 
                            {session.meeting_platform || 'Google Meet'}
                          </span>
                        </div>
                        <h4 className={`text-body-${index === 0 ? 'lg' : 'md'} font-bold text-on-surface mb-1`}>{session.title}</h4>
                        <p className="text-label-sm font-label-sm text-on-surface-variant mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">schedule</span> 
                          {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        
                        {index === 0 && (
                          <div className="flex items-center justify-between border-t border-surface-variant/50 pt-4 mt-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-white font-bold text-lg shrink-0">
                                {(session.tutor_name || 'T').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-label-md font-label-md text-on-surface truncate" title={session.tutor_name}>{session.tutor_name}</p>
                                <p className="text-[12px] text-on-surface-variant">Tutor</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleJoinClass(session.meeting_url)} 
                              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-primary/90 transition-colors shadow-sm h-10 shrink-0 whitespace-nowrap"
                            >
                              Join Class
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* ── Day Detail Modal ── */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* Modal */}
          <div
            className="relative bg-surface rounded-2xl shadow-2xl border border-surface-variant w-full max-w-2xl max-h-[85vh] flex flex-col animate-[fadeInScale_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-variant shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <h3 className="text-title-lg font-bold text-on-surface">Lịch học ngày {formatDayTitle(selectedDay.date)}</h3>
                  <p className="text-label-sm text-on-surface-variant">{selectedDay.sessions.length} buổi học</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-3">
                {selectedDay.sessions.map((session) => {
                  const startObj = new Date(session.start_time);
                  const endObj = new Date(session.end_time);
                  const style = getSessionStyle(session.status);

                  return (
                    <div key={session.id} className={`${style.bgColor} border ${style.borderColor} rounded-xl p-4 hover:shadow-md transition-shadow`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${style.labelBg} ${style.labelColor}`}>
                            {session.status === 'ongoing' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                            {session.status === 'completed' && <span className="material-symbols-outlined text-[12px]">check</span>}
                            {session.status === 'ongoing' ? 'Live now' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                          {session.xp_earned > 0 && (
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">+{session.xp_earned} XP</span>
                          )}
                        </div>
                        {session.meeting_platform && (
                          <span className="flex items-center gap-1 text-label-sm text-on-surface-variant bg-surface px-2 py-1 rounded-lg shadow-sm border border-surface-variant">
                            <span className={`material-symbols-outlined text-[14px] ${session.meeting_platform === 'Zoom' ? 'text-error' : 'text-primary'}`}>
                              {session.meeting_platform === 'Zoom' ? 'videocam' : 'link'}
                            </span>
                            {session.meeting_platform}
                          </span>
                        )}
                      </div>

                      <h4 className="text-body-lg font-bold text-on-surface mb-1">{session.title}</h4>
                      {session.subject && <p className="text-label-sm text-primary font-medium mb-2">{session.subject}</p>}

                      <div className="flex items-center gap-4 text-label-sm text-on-surface-variant mb-3">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-surface-variant/50 pt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-white font-bold text-sm">
                            {(session.tutor_name || 'T').charAt(0)}
                          </div>
                          <div>
                            <p className="text-label-md font-medium text-on-surface">{session.tutor_name}</p>
                            <p className="text-[11px] text-on-surface-variant">Tutor</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.status === 'ongoing' && (
                            <button type="button" onClick={() => handleJoinClass(session.meeting_url)} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-bold hover:bg-primary/90 transition-colors shadow-sm">
                              Join Class
                            </button>
                          )}
                          {(session.status === 'upcoming' || session.status === 'accepted' || session.status === 'pending') && (
                            <button type="button" onClick={() => handleJoinClass(session.meeting_url)} className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-label-md font-bold hover:bg-primary/20 transition-colors">
                              View Materials
                            </button>
                          )}
                          {session.status === 'completed' && (
                            <button type="button" className="bg-secondary-container/20 text-secondary px-4 py-2 rounded-lg text-label-md font-bold hover:bg-secondary-container/30 transition-colors">
                              View Notes
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
