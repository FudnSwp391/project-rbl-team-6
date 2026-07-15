import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { requestMethodChange } from '../services/api';
import ReportSessionModal from './ReportSessionModal';

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
  const [detailSession, setDetailSession] = useState(null);
  const [sessionInfoMap, setSessionInfoMap] = useState({});
  const [reportSession, setReportSession] = useState(null);

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

  // Thông tin buổi học lấy thẳng từ API (gia sư lưu vào DB) — không còn phụ thuộc localStorage
  useEffect(() => {
    if (!data) return;
    const allSessions = [
      ...(data.sessions || []),
      ...(data.up_next || []),
      ...(data.today || []),
    ];
    const map = {};
    allSessions.forEach(s => {
      if (s.teaching_method || s.meeting_url || s.location || s.session_topic) {
        map[s.id] = {
          mode: s.teaching_method || (s.meeting_url ? 'online' : 'offline'),
          meetLink: s.meeting_url || '',
          location: s.location || '',
          locationNote: s.location_note || '',
          topic: s.session_topic || '',
          duration: s.session_duration ? String(s.session_duration) : '',
        };
      }
    });
    setSessionInfoMap(map);
  }, [data]);

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

  // Trạng thái "báo cáo vi phạm" cho 1 session: null (chưa/không cần hiện gì),
  // 'open' (đã có dispute đang mở -> hiện badge), 'reportable' (hiện nút, còn trong hạn 48h).
  // Dùng đúng session.end_time (đã tính sẵn từ backend, cùng logic với check 48h phía server)
  // và session.status === 'completed' (đã được backend chuẩn hoá) — không tự parse time_slot lại.
  const getReportStatus = (session) => {
    if (session.status !== 'completed') return null;
    if (session.has_open_dispute) return 'open';
    const hoursSinceEnd = (Date.now() - new Date(session.end_time).getTime()) / 3600000;
    return hoursSinceEnd <= 48 ? 'reportable' : null;
  };

  // Rút đơn khiếu nại (chỉ rút, không sửa nội dung) — refetch schedule để badge/nút tự cập nhật
  const handleWithdrawDispute = async (disputeId) => {
    if (!disputeId) return;
    if (!window.confirm('Bạn có chắc muốn rút khiếu nại này không? Hành động này không thể hoàn tác.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/bookings/disputes/${disputeId}/withdraw`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchSchedule();
      } else {
        alert(data.message || 'Có lỗi xảy ra.');
      }
    } catch {
      alert('Lỗi kết nối.');
    }
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
                            const reportStatus = getReportStatus(session);

                            return (
                              <div key={session.id} onClick={() => setDetailSession(session)} className={`w-full ${style.bgColor} border ${style.borderColor} rounded-lg p-2.5 hover:shadow-md transition-shadow cursor-pointer shadow-sm`}>
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
                                {reportStatus === 'reportable' && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setReportSession(session); }}
                                    className="mt-1.5 w-full flex items-center justify-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-1.5 py-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">report</span>
                                    Khiếu nại buổi học
                                  </button>
                                )}
                                {reportStatus === 'open' && (
                                  <div className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-1">
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[11px]">hourglass_top</span>
                                      Đang chờ xử lý
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleWithdrawDispute(session.open_dispute_id); }}
                                      className="underline decoration-dotted hover:text-orange-900"
                                    >
                                      Rút khiếu nại
                                    </button>
                                  </div>
                                )}
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
                          <div className="flex flex-col gap-4 border-t border-surface-variant/50 pt-4 mt-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-white font-bold text-lg shrink-0">
                                {(session.tutor_name || 'T').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-label-md font-label-md text-on-surface truncate" title={session.tutor_name}>{session.tutor_name}</p>
                                <p className="text-[12px] text-on-surface-variant">Gia sư</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleJoinClass(sessionInfoMap[session.id]?.meetLink || session.meeting_url)} 
                              className="w-full bg-primary text-on-primary px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">videocam</span>
                              Tham gia lớp học
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailSession(session)}
                              className="w-full border border-outline-variant text-on-surface-variant px-4 py-2 rounded-lg text-label-md font-label-md hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">info</span>
                              Xem chi tiết buổi học
                            </button>
                            {sessionInfoMap[session.id] && (
                              <div className="mt-1 pt-2 border-t border-surface-variant/30 grid grid-cols-2 gap-2">
                                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold ${
                                  sessionInfoMap[session.id].mode === 'online' ? 'bg-primary/10 text-primary' : 'bg-[#f0fdf4] text-[#16a34a]'
                                }`}>
                                  <span className="material-symbols-outlined text-[13px]">
                                    {sessionInfoMap[session.id].mode === 'online' ? 'videocam' : 'location_on'}
                                  </span>
                                  {sessionInfoMap[session.id].mode === 'online' ? 'Online' : 'Offline'}
                                </div>
                                {sessionInfoMap[session.id].duration && (
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container text-[11px] font-bold text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[13px]">timer</span>
                                    {sessionInfoMap[session.id].duration} phút
                                  </div>
                                )}
                                {sessionInfoMap[session.id].topic && (
                                  <div className="col-span-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container text-[11px] text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[13px] mt-0.5 flex-shrink-0">subject</span>
                                    <span className="line-clamp-2">{sessionInfoMap[session.id].topic}</span>
                                  </div>
                                )}
                              </div>
                            )}
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

      {/* ── Session Detail Modal ── */}
      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          info={sessionInfoMap[detailSession.id] || null}
          onRequested={fetchSchedule}
          onClose={() => setDetailSession(null)}
        />
      )}

      {/* ── Report Session Modal ── */}
      {reportSession && (
        <ReportSessionModal
          booking={reportSession}
          onClose={() => setReportSession(null)}
          onSuccess={() => { setReportSession(null); fetchSchedule(); }}
        />
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

// ─── Session Detail Modal ────────────────────────────────────────────────────
function SessionDetailModal({ session, info, onClose, onRequested }) {
  const [copied, setCopied] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [checkedMaterials, setCheckedMaterials] = useState({});
  const [checkedHomework, setCheckedHomework] = useState({});
  const [countdown, setCountdown] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSent, setChangeSent] = useState(session.method_change_status === 'pending');

  const startObj = new Date(session.start_time);
  const endObj   = new Date(session.end_time);
  const isOngoing  = startObj <= Date.now() && endObj > Date.now();
  const isUpcoming = startObj > Date.now();

  // Live countdown
  useEffect(() => {
    if (!isUpcoming) return;
    const tick = () => {
      const diff = startObj - Date.now();
      if (diff <= 0) { setCountdown('Đang bắt đầu'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}g ${m}ph` : m > 0 ? `${m} phút ${s}s` : `${s} giây`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.start_time]);

  const copyText = (text, setCb) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCb(true);
    setTimeout(() => setCb(false), 1500);
  };

  const submitMethodChange = async () => {
    if (!changeTarget) { setChangeError('Vui lòng chọn hình thức muốn đổi.'); return; }
    setChangeBusy(true);
    setChangeError('');
    try {
      await requestMethodChange(session.booking_id || session.id, changeTarget, changeReason);
      setChangeSent(true);
      setChangeOpen(false);
      if (onRequested) onRequested();
    } catch (e) {
      setChangeError(e.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setChangeBusy(false);
    }
  };

  // Parse text into list items (split by newline, filter empty)
  const toList = (str) => (str || '').split('\n').map(s => s.trim()).filter(Boolean);
  const materialItems = toList(info?.materials);
  const homeworkItems = toList(info?.homework);

  const meetLink = info?.meetLink || session.meeting_url || '';
  const mode     = info?.mode || (meetLink ? 'online' : null);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#f8f9fb] rounded-[1.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.22)] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Gradient Header ── */}
        <div className={`px-6 py-5 flex-shrink-0 relative overflow-hidden ${
          isOngoing
            ? 'bg-gradient-to-br from-[#15803d] via-[#16a34a] to-[#22c55e]'
            : 'bg-gradient-to-br from-[#00288e] via-[#0a35a8] to-[#1e40af]'
        }`}>
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/[0.06]" />
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isOngoing && (
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Đang diễn ra
                  </span>
                )}
                {isUpcoming && countdown && (
                  <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[12px]">timer</span>
                    {countdown}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                  <span className="material-symbols-outlined text-[12px]">
                    {mode === 'offline' ? 'location_on' : 'videocam'}
                  </span>
                  {mode === 'offline' ? 'Offline' : 'Online'}
                </span>
              </div>
              <h2 className="text-white text-[18px] font-bold leading-snug">{session.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-white/[0.15] text-white text-[12px] font-semibold px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {info?.duration && (
                  <span className="inline-flex items-center gap-1 bg-white/[0.15] text-white text-[12px] font-semibold px-2.5 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                    {info.duration} phút
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.22] flex items-center justify-center text-white transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Chưa có thông tin */}
          {!info && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 text-[22px] flex-shrink-0 mt-0.5">info</span>
              <div>
                <p className="font-bold text-[13px] text-amber-800 mb-0.5">Gia sư chưa cập nhật thông tin</p>
                <p className="text-[12px] text-amber-700">Thông tin chi tiết buổi học sẽ được hiển thị khi gia sư điền đầy đủ.</p>
              </div>
            </div>
          )}

          {/* Online — Phòng học */}
          {mode === 'online' && meetLink && (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[17px]">videocam</span>
                </div>
                <p className="font-bold text-[13px] text-on-surface">Phòng học Online</p>
              </div>
              <div className="flex items-center gap-2 bg-[#f8f9fb] rounded-xl border border-outline-variant/30 px-3 py-2">
                <span className="text-[13px] text-primary truncate flex-1">{meetLink}</span>
                <button
                  onClick={() => copyText(meetLink, setCopied)}
                  className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all ${
                    copied ? 'bg-[#16a34a] text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Đã sao' : 'Copy'}
                </button>
              </div>
              {info?.meetPassword && (
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant bg-[#f8f9fb] rounded-xl border border-outline-variant/30 px-3 py-2">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Mật khẩu: <strong className="text-on-surface select-all">{info.meetPassword}</strong></span>
                  <button onClick={() => copyText(info.meetPassword, setCopiedPwd)} className="ml-auto text-primary hover:text-primary/80">
                    <span className="material-symbols-outlined text-[14px]">{copiedPwd ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => window.open(meetLink, '_blank')}
                className="w-full h-11 bg-primary text-on-primary rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#1e40af] transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Tham gia lớp học
              </button>
            </div>
          )}

          {/* Offline — Địa điểm */}
          {mode === 'offline' && info?.location && (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#16a34a] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[17px]">location_on</span>
                </div>
                <p className="font-bold text-[13px] text-on-surface">Địa điểm học Offline</p>
              </div>
              <div className="flex items-start gap-2 bg-[#f8f9fb] rounded-xl border border-outline-variant/30 px-3 py-2.5">
                <span className="material-symbols-outlined text-[15px] text-[#16a34a] mt-0.5 flex-shrink-0">place</span>
                <p className="text-[13px] text-on-surface">{info.location}</p>
              </div>
              {info.locationNote && (
                <div className="flex items-start gap-2 bg-[#f8f9fb] rounded-xl border border-outline-variant/30 px-3 py-2.5">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant mt-0.5 flex-shrink-0">directions</span>
                  <p className="text-[12px] text-on-surface-variant">{info.locationNote}</p>
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#16a34a] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                Xem trên Google Maps
              </a>
            </div>
          )}

          {/* Chủ đề buổi học */}
          {info?.topic && (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-primary">subject</span>
                <p className="font-bold text-[12px] uppercase tracking-wide text-outline">Chủ đề buổi học</p>
              </div>
              <p className="text-[14px] text-on-surface leading-relaxed">{info.topic}</p>
            </div>
          )}

          {/* Checklist: Tài liệu cần chuẩn bị */}
          {materialItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                  <p className="font-bold text-[12px] uppercase tracking-wide text-outline">Cần chuẩn bị</p>
                </div>
                <span className="text-[11px] font-bold text-primary">
                  {Object.values(checkedMaterials).filter(Boolean).length}/{materialItems.length} xong
                </span>
              </div>
              <div className="space-y-2">
                {materialItems.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group py-1">
                    <div
                      onClick={() => setCheckedMaterials(prev => ({ ...prev, [i]: !prev[i] }))}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        checkedMaterials[i] ? 'bg-primary border-primary' : 'border-outline-variant group-hover:border-primary/60'
                      }`}
                    >
                      {checkedMaterials[i] && <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                    </div>
                    <span className={`text-[13px] transition-all ${checkedMaterials[i] ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Bài tập / Ghi chú trước buổi học */}
          {homeworkItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">assignment</span>
                  <p className="font-bold text-[12px] uppercase tracking-wide text-outline">Bài tập trước buổi học</p>
                </div>
                <span className="text-[11px] font-bold text-amber-600">
                  {Object.values(checkedHomework).filter(Boolean).length}/{homeworkItems.length} xong
                </span>
              </div>
              <div className="space-y-2">
                {homeworkItems.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group py-1">
                    <div
                      onClick={() => setCheckedHomework(prev => ({ ...prev, [i]: !prev[i] }))}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        checkedHomework[i] ? 'bg-amber-500 border-amber-500' : 'border-outline-variant group-hover:border-amber-400'
                      }`}
                    >
                      {checkedHomework[i] && <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                    </div>
                    <span className={`text-[13px] transition-all ${checkedHomework[i] ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Gia sư */}
          <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[16px]">
                {(session.tutor_name || 'T').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-[14px] text-on-surface">{session.tutor_name}</p>
                <p className="text-[12px] text-on-surface-variant">Gia sư</p>
              </div>
            </div>
          </div>

          {/* Xin đổi hình thức học (ốm không đến được → xin học online, v.v.) */}
          {(() => {
            const currentMethod = session.teaching_method || mode || null;
            const supports = (m) => m === 'online'
              ? session.tutor_supports_online !== false
              : session.tutor_supports_offline !== false;
            const targets = ['online', 'offline'].filter(m => m !== currentMethod && supports(m));
            const canRequest = (isUpcoming || session.status === 'pending' || session.status === 'upcoming')
              && session.status !== 'completed' && session.status !== 'cancelled';
            if (!canRequest || (targets.length === 0 && !changeSent)) return null;
            return (
              <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">swap_horiz</span>
                  <p className="font-bold text-[12px] uppercase tracking-wide text-outline">Đổi hình thức học</p>
                </div>

                {changeSent ? (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">hourglass_top</span>
                    <p className="text-[12px] text-amber-800">
                      Đã gửi yêu cầu đổi sang <strong>{(session.method_change_requested || changeTarget) === 'online' ? 'Online' : 'Offline'}</strong> — đang chờ gia sư phản hồi. Bạn sẽ nhận được thông báo khi gia sư trả lời.
                    </p>
                  </div>
                ) : !changeOpen ? (
                  <>
                    <p className="text-[12px] text-on-surface-variant">
                      Có việc đột xuất (ốm, bận đi lại...)? Bạn có thể xin gia sư đổi buổi này sang {targets.map(t => t === 'online' ? 'Online' : 'Offline').join(' / ')}.
                    </p>
                    <button
                      onClick={() => { setChangeOpen(true); if (targets.length === 1) setChangeTarget(targets[0]); }}
                      className="h-9 px-4 rounded-lg border border-primary/40 text-primary text-[12px] font-bold flex items-center gap-1.5 hover:bg-primary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                      Xin đổi hình thức
                    </button>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    {targets.length > 1 && (
                      <div className="grid grid-cols-2 gap-2">
                        {targets.map(t => (
                          <button key={t} type="button" onClick={() => setChangeTarget(t)}
                            className={`h-9 rounded-lg border text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                              changeTarget === t ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant'
                            }`}>
                            <span className="material-symbols-outlined text-[14px]">{t === 'online' ? 'videocam' : 'location_on'}</span>
                            {t === 'online' ? 'Online' : 'Offline'}
                          </button>
                        ))}
                      </div>
                    )}
                    {targets.length === 1 && (
                      <p className="text-[12px] text-on-surface">
                        Đổi sang: <strong>{targets[0] === 'online' ? 'Online' : 'Offline'}</strong>
                      </p>
                    )}
                    <textarea
                      rows={2}
                      value={changeReason}
                      onChange={e => setChangeReason(e.target.value)}
                      placeholder="Lý do (vd: hôm nay em bị ốm, không đến được...)"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 text-[13px] outline-none focus:border-primary resize-none"
                    />
                    {changeError && <p className="text-[12px] text-red-600">{changeError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setChangeOpen(false); setChangeError(''); }}
                        className="h-9 px-3 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] font-semibold hover:bg-surface-container transition-colors">
                        Hủy
                      </button>
                      <button onClick={submitMethodChange} disabled={changeBusy}
                        className="h-9 px-4 rounded-lg bg-primary text-on-primary text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#1e40af] transition-colors disabled:opacity-60">
                        <span className="material-symbols-outlined text-[14px]">send</span>
                        {changeBusy ? 'Đang gửi...' : 'Gửi yêu cầu'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-outline-variant/20 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-outline-variant text-on-surface-variant text-[13px] font-semibold hover:bg-surface-container transition-colors"
          >
            Đóng
          </button>
          {meetLink && (
            <button
              onClick={() => window.open(meetLink, '_blank')}
              className="flex-1 h-10 bg-primary text-on-primary rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#1e40af] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              Tham gia lớp học
            </button>
          )}
          {mode === 'offline' && info?.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-10 bg-[#16a34a] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Chỉ đường
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
