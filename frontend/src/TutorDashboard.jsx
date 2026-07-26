/**
 * TutorDashboard.jsx
 * Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬Ă¢â€ â‚¬
 * Dashboard dÄ‚Â nh cho gia sĂ†Â° (role: tutor).
 * HiĂ¡Â»Æ’n thĂ¡Â»â€¹: thu nhĂ¡ÂºÂ­p, giĂ¡Â»Â  dĂ¡ÂºÂ¡y, hĂ¡Â»Â c sinh, yÄ‚Âªu cĂ¡ÂºÂ§u chĂ¡Â»Â  duyĂ¡Â»â€¡t, lĂ¡Â»â€¹ch hÄ‚Â´m nay.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from './AuthContext'
import AIChatBox from './AIChatBox'
import TutorFeedbackModal from './components/MicroFeedback/TutorFeedbackModal'
import { getBookings, updateBookingStatus,
         getTutorProfile, updateTutorBio, updateTutorAvatar, updateTutorCv,
         addTutorCredential, deleteTutorCredential,
         updateTutorAvailability, getUnreadCount, getTutorStudents, markBookingAttendance, getTutorEarnings,
         saveSessionInfo, resolveMethodChange,
         getTutorRescheduleRequests, acceptRescheduleRequest, rejectRescheduleRequest } from './services/api'
import ProofUploader from './components/ProofUploader'
import TutorCoursesTab from './components/TutorCourses'
import { uploadAvatarFile, uploadDemoVideo } from './services/upload'
import MessagesSection from './components/MessagesSection'
import TutorAssessmentManager from './components/TutorAssessmentManager'
import TutorScheduleEditor from './components/TutorScheduleEditor'
import TutorGradingDashboard from './components/TutorGradingDashboard'
import WalletWidget from './components/WalletWidget'
import TutorDisputesTab from './components/TutorDisputesTab'
import NotificationDropdown from './components/NotificationDropdown'
import MessageIcon from './components/MessageIcon'
import WalletDashboard from './components/Wallet/WalletDashboard'
import WalletDeposit from './components/Wallet/WalletDeposit'
import WalletWithdraw from './components/Wallet/WalletWithdraw'
import { supabase } from './services/supabase'
import { API_BASE_URL } from './config';

const API_BASE = API_BASE_URL

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Tổng Quan' },
  { icon: 'calendar_today', label: 'Lịch Trình' },
  { icon: 'group', label: 'Học Viên' },
  { icon: 'video_library', label: 'Khóa Học' },
  { icon: 'description', label: 'Bài Kiểm Tra' },
  { icon: 'fact_check', label: 'Chấm Điểm' },
  { icon: 'payments', label: 'Thu Nhập' },
  { icon: 'account_balance_wallet', label: 'Ví Tiền' },
  { icon: 'chat', label: 'Tin Nhắn' },
  { icon: 'gavel', label: 'Khiếu Nại' },
  { icon: 'account_circle', label: 'Hồ Sơ' },
]

export default function TutorDashboard() {
  const { user, token, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const getInitialTab = () => {
    try {
      const searchParams = new URLSearchParams(window.location.hash.split('?')[1]);
      if (searchParams.has('tab')) return searchParams.get('tab');
    } catch (e) {}
    return 'Tổng Quan';
  }
  const [activeTab, setActiveTab] = useState(getInitialTab)

  useEffect(() => {
    const handleHashChange = () => {
      try {
        const searchParams = new URLSearchParams(window.location.hash.split('?')[1]);
        if (searchParams.has('tab')) setActiveTab(searchParams.get('tab'));
      } catch (e) {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const editCourseId = searchParams.get('editCourseId');

  const [requests, setRequests] = useState([])
  const [activeRequestTab, setActiveRequestTab] = useState('single')
  const [rescheduleRequests, setRescheduleRequests] = useState([])
  const [scheduleToday, setScheduleToday] = useState([])
  
  // Instant Learning Modal State
  const [instantRequest, setInstantRequest] = useState(null);
  const [instantCountdown, setInstantCountdown] = useState(60);
  
  const conflictingIds = useMemo(() => {
    const conflicts = new Set();
    const occupiedSlots = new Set();
    
    // Sort pending requests by createdAt ascending
    const sortedRequests = [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sortedRequests.forEach(req => {
      let hasConflict = false;
      const reqSlots = [];
      
      if (req.isPackage) {
        req.packageSessions.forEach(s => {
          reqSlots.push(`${s.lessonDate || s.date}_${s.timeSlot || s.time}`);
        });
      } else {
        reqSlots.push(`${req.lessonDate || req.date}_${req.timeSlot || req.time}`);
      }

      for (const slot of reqSlots) {
        if (occupiedSlots.has(slot)) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        conflicts.add(req.id);
      } else {
        reqSlots.forEach(slot => occupiedSlots.add(slot));
      }
    });

    return conflicts;
  }, [requests]);
  const [overviewStats, setOverviewStats] = useState({
    thisMonthEarned: 0,
    completedLessons: 0,
    activeStudents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileStatus, setProfileStatus] = useState('loading')

  const displayName = user?.name || user?.email?.split('@')[0] || 'Tutor'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {})
    const timer = setInterval(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // ── Instant Booking: Nhận yêu cầu realtime + polling fallback ──
  // Dùng polling mỗi 3 giây làm primary (đảm bảo luôn hoạt động kể cả khi
  // Supabase Realtime chưa được cấu hình ở frontend).
  // Supabase Realtime (khi có) dùng làm fast-path để popup nhanh hơn.
  useEffect(() => {
    if (!user?.id || !token) return;

    let lastSeenId = null; // Tránh hiển thị popup trùng

    // ── Hàm poll backend mỗi 3 giây ──
    const pollPending = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tutor/instant-pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const booking = data.booking;

        if (booking && booking.id !== lastSeenId) {
          // Có yêu cầu mới chưa thấy → hiển thị popup
          lastSeenId = booking.id;
          setInstantRequest(booking);
          setInstantCountdown(booking.seconds_left ?? 60);
          try { new Audio('/notification.mp3').play().catch(() => {}) } catch (e) {}
        } else if (!booking && lastSeenId) {
          // Yêu cầu đã hết hạn hoặc bị xử lý → ẩn popup
          setInstantRequest(prev => {
            if (prev?.id === lastSeenId) { lastSeenId = null; return null; }
            return prev;
          });
        }
      } catch (e) { /* bỏ qua lỗi mạng */ }
    };

    // Poll ngay lần đầu, sau đó mỗi 3 giây
    pollPending();
    const pollInterval = setInterval(pollPending, 3000);

    // ── Supabase Realtime fast-path (chỉ khi supabase client có sẵn) ──
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`tutor-instant-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tutor_id=eq.${user.id}` },
          (payload) => {
            if (payload.new.booking_type === 'Instant' && payload.new.status === 'Pending') {
              if (payload.new.id !== lastSeenId) {
                lastSeenId = payload.new.id;
                // Trigger poll để lấy đủ thông tin (tên học sinh, ảnh, seconds_left)
                pollPending();
              }
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `tutor_id=eq.${user.id}` },
          (payload) => {
            if (payload.new.booking_type === 'Instant' && payload.new.status !== 'Pending') {
              setInstantRequest(prev => prev?.id === payload.new.id ? null : prev);
              if (lastSeenId === payload.new.id) lastSeenId = null;
            }
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(pollInterval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [user?.id, token]);

  // Đếm ngược 60 giây khi có yêu cầu Học Ngay
  useEffect(() => {
    if (!instantRequest) { setInstantCountdown(60); return; }
    // Không reset về 60 — giá trị đã được polling set từ server (seconds_left chính xác)
    const interval = setInterval(() => {
      setInstantCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [instantRequest?.id]);

  const handleInstantAction = async (bookingId, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/tutor/bookings/${bookingId}/instant-${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống');

      setInstantRequest(null);

      if (action === 'accept') {
        window.location.hash = `/session/${bookingId}`;
      }
    } catch (e) {
      alert(e.message);
      setInstantRequest(null);
    }
  };

  useEffect(() => {
    async function loadTutorData() {
      try {
        let profile = null;
        try {
          profile = await getTutorProfile()
          setProfileStatus(profile.status)
        } catch (e) {
          console.warn('Profile fetch error or not found:', e)
          setProfileStatus('missing')
        }

        if (!profile || profile.status !== 'approved') {
          setLoading(false)
          return
        }

        const [bookingsList, earningsData, rescheduleReqs] = await Promise.all([
          getBookings(),
          getTutorEarnings().catch(() => null),
          getTutorRescheduleRequests('PENDING').catch(() => []),
        ])

        const toInitials = (name = 'Student') =>
          name
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'ST'

        const toStudentName = (booking) =>
          booking.childName || booking.studentName || 'Student'

        const toScheduleDate = (booking) => {
          const d = booking.lesson_date || booking.lessonDate || booking.date;
          const t = booking.time_slot || booking.timeSlot || booking.time;
          const dateStr = d ? String(d).slice(0, 10) : 'No date';
          const timeStr = t || 'No time';
          return `${dateStr} - ${timeStr}`;
        }

        const pendingBookings = bookingsList
          .filter(b => b.status === 'Pending' && b.booking_type !== 'Instant' && b.bookingType !== 'Instant')
          .map(b => ({
            id: b.id,
            initials: toInitials(toStudentName(b)),
            name: toStudentName(b),
            studentName: b.studentName,
            childName: b.childName,
            subject: b.subject || 'General',
            date: toScheduleDate(b),
            lessonDate: b.lesson_date || b.lessonDate || b.date || '',
            timeSlot: b.time_slot || b.timeSlot || b.time || '',
            bookingType: b.bookingType || b.booking_type || 'regular',
            teachingMethod: b.teaching_method || b.teachingMethod || '',
            level: b.level || '',
            sessionsRequested: b.sessions_requested || b.sessionsRequested || b.sessions || 1,
            pricePerSession: b.price_per_session || b.pricePerSession || b.price || 0,
            note: b.notes || b.note || b.student_note || b.studentNote || '',
            studentAge: b.student_age || b.studentAge || '',
            grade: b.grade || b.student_grade || '',
            createdAt: b.created_at || b.createdAt || '',
            avatarUrl: b.student_avatar || b.studentAvatar || b.avatar_url || '',
            packageId: b.package_id || null,
          }))

        // Group pending bookings by packageId
        const groupedPendingBookings = [];
        const packageGroups = {};

        pendingBookings.forEach(b => {
          if (b.packageId) {
            if (!packageGroups[b.packageId]) {
              packageGroups[b.packageId] = {
                ...b,
                isPackage: true,
                packageBookingIds: [b.id],
                packageSessions: [b]
              };
              groupedPendingBookings.push(packageGroups[b.packageId]);
            } else {
              packageGroups[b.packageId].packageBookingIds.push(b.id);
              packageGroups[b.packageId].packageSessions.push(b);
            }
          } else {
            groupedPendingBookings.push(b);
          }
        });

        // Format summaries for packages
        Object.values(packageGroups).forEach(g => {
          g.date = `Gói tháng: ${g.packageSessions.length} buổi`;
          g.sessionsRequested = g.packageSessions.length;
          
          const sortedSessions = [...g.packageSessions].sort((a, b) => new Date(a.lessonDate || a.date) - new Date(b.lessonDate || b.date));
          if (sortedSessions.length > 0) {
            g.startDate = sortedSessions[0].lessonDate || sortedSessions[0].date;
            
            const uniqueSchedules = new Set();
            sortedSessions.forEach(s => {
              try {
                const d = new Date(s.lessonDate || s.date);
                const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' });
                uniqueSchedules.add(`Mỗi ${weekday} - ${s.timeSlot || s.timeSlot}`);
              } catch (e) {}
            });
            g.scheduleSummary = Array.from(uniqueSchedules).join(', ');
          }
          g.timeSlot = 'Lịch học cố định';
        });

        const approvedBookings = bookingsList
          .filter(b => b.status === 'Approved')
          .map(b => ({
            id: b.id,
            initials: toInitials(toStudentName(b)),
            name: toStudentName(b),
            studentName: b.studentName,
            childName: b.childName,
            subject: b.subject || 'General lesson',
            time: toScheduleDate(b),
            bookingType: b.bookingType || b.booking_type || 'regular',
            isNow: false
          }))

        setRequests(groupedPendingBookings)
        setRescheduleRequests(rescheduleReqs || [])
        setScheduleToday(approvedBookings)
        const activeStudentKeys = new Set(
          bookingsList
            .filter(b => b.status === 'Approved')
            .map(b => `${b.studentId || ''}:${b.childName || b.studentName || ''}`)
        )
        setOverviewStats({
          thisMonthEarned: earningsData?.summary?.thisMonthEarned || 0,
          completedLessons: earningsData?.summary?.completedLessons || 0,
          activeStudents: activeStudentKeys.size,
        })
      } catch (err) {
        console.error('Error loading tutor dashboard bookings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTutorData()
  }, [])

  const handleAccept = async (id) => {
    try {
      const targetReq = requests.find(r => r.id === id);
      if (!targetReq) return;

      const idsToAccept = targetReq.isPackage ? targetReq.packageBookingIds : [id];

      await Promise.all(idsToAccept.map(bookingId => updateBookingStatus(bookingId, 'Approved')));

      if (targetReq.isPackage) {
        // Add all sessions to schedule today (or just the first one if it's too much, but let's add them)
        const newApproved = targetReq.packageSessions.map(s => ({
          id: s.id,
          initials: s.initials,
          name: s.name,
          subject: s.subject,
          time: s.date,
          isNow: false
        }));
        setScheduleToday(prev => [...newApproved, ...prev]);
      } else {
        setScheduleToday(prev => [
          {
            id: targetReq.id,
            initials: targetReq.initials,
            name: targetReq.name,
            subject: targetReq.subject,
            time: targetReq.date,
            isNow: false
          },
          ...prev
        ]);
      }

      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to approve booking:", err);
      alert(err.message || 'Failed to approve booking.');
    }
  }

  const handleDecline = async (id) => {
    try {
      const targetReq = requests.find(r => r.id === id);
      if (!targetReq) return;

      const idsToDecline = targetReq.isPackage ? targetReq.packageBookingIds : [id];
      await Promise.all(idsToDecline.map(bookingId => updateBookingStatus(bookingId, 'Declined')));

      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to decline booking:", err);
      alert(err.message || 'Failed to decline booking.');
    }
  }

  const handleAcceptReschedule = async (id) => {
    try {
      await acceptRescheduleRequest(id);
      setRescheduleRequests((prev) => prev.filter((r) => r.id !== id));
      alert("Đã chấp nhận yêu cầu đổi lịch!");
    } catch (error) {
      alert("Lỗi khi duyệt yêu cầu: " + error.message);
    }
  };

  const handleRejectReschedule = async (id) => {
    try {
      const reason = prompt("Nhập lý do từ chối đổi lịch (Tùy chọn):");
      if (reason === null) return;
      await rejectRescheduleRequest(id, reason);
      setRescheduleRequests((prev) => prev.filter((r) => r.id !== id));
      alert("Đã từ chối yêu cầu đổi lịch.");
    } catch (error) {
      alert("Lỗi khi từ chối yêu cầu: " + error.message);
    }
  };


  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-x-hidden min-h-screen flex h-screen">

      {/* Ă¢â€â‚¬Ă¢â€â‚¬ Mobile overlay Ă¢â€â‚¬Ă¢â€â‚¬ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â
          SIDEBAR
      Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â */}
      <nav
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col py-4 w-64
          bg-surface-container-low border-r border-surface-variant/50
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-6 mb-4 flex-shrink-0">
          <a href="#/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">school</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] leading-tight font-black text-primary">
                EduX
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Cổng Gia Sư</p>
            </div>
          </a>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 px-4 flex-1 mt-2 overflow-y-auto custom-scrollbar pb-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.label === activeTab
            const isMessages = item.label === 'Tin Nhắn'
            return (
              <a
                key={item.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab(item.label)
                  setSidebarOpen(false)
                }}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg
                  transition-all duration-200 active:scale-95
                  ${isActive
                    ? 'text-primary font-bold bg-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }
                `}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-label-md text-[14px] flex-1">{item.label}</span>
                {isMessages && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
            )
          })}
        </div>

        {/* Bottom */}
        <div className="px-6 pt-4 border-t border-surface-variant/50 flex flex-col gap-1 flex-shrink-0 mt-auto">
          <a
            href="#" onClick={(e) => e.preventDefault()}
            className="text-on-surface-variant flex items-center gap-3 px-4 py-2 hover:bg-surface-container-high rounded-lg transition-all duration-200 hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-label-md text-[14px]">Cài đặt</span>
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); logout() }}
            className="text-on-surface-variant flex items-center gap-3 px-4 py-2 hover:bg-surface-container-high hover:text-error rounded-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-md text-[14px]">Đăng xuất</span>
          </a>
          <button className="mt-2 w-full h-10 bg-primary text-on-primary font-label-md text-[14px] font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            Nhận hỗ trợ
          </button>
        </div>
      </nav>

      {/* Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â
          MAIN CONTENT
      Ă¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢ÂĂ¢â€¢Â */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden">

        {/* Ă¢â€â‚¬Ă¢â€â‚¬ Top Bar Ă¢â€â‚¬Ă¢â€â‚¬ */}
        <header className="w-full h-16 bg-surface/80 backdrop-blur-sm z-30 sticky top-0 border-b border-surface-variant/30">
          <div className="flex justify-between items-center px-gutter w-full h-full gap-md">

            {/* Mobile hamburger */}
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary rounded-full transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Search (Removed) */}
            <div className="flex-1"></div>

            {/* Right actions */}
            <div className="flex items-center gap-md">
              {/* Notification bell */}
              <MessageIcon token={token} />
              <NotificationDropdown token={token} />

              <WalletWidget token={token} />

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-on-primary font-label-md font-bold cursor-pointer border-2 border-surface select-none">
                {user?.picture ? (
                  <img src={user.picture} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Ă¢â€ â‚¬Ă¢â€ â‚¬ Scrollable main Ă¢â€ â‚¬Ă¢â€ â‚¬ */}
        <main className="flex-1 overflow-y-auto p-gutter lg:p-lg space-y-lg relative">

          {/* Decorative background glow */}
          <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary-fixed-dim/20 to-transparent pointer-events-none -z-10 blur-3xl rounded-full" />

          {['pending', 'rejected', 'missing'].includes(profileStatus) && activeTab !== 'My Profile' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-20 bg-surface/90 backdrop-blur-sm animate-fade-in min-h-[500px]">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-[48px]">
                  {profileStatus === 'rejected' ? 'cancel' : profileStatus === 'missing' ? 'post_add' : 'hourglass_empty'}
                </span>
              </div>
              <h2 className="text-[28px] font-bold text-on-surface mb-3">
                {profileStatus === 'rejected' ? 'Hồ sơ của bạn đã bị từ chối' : 
                 profileStatus === 'missing' ? 'Bạn chưa có hồ sơ gia sư' : 
                 'Hồ sơ của bạn đang chờ duyệt'}
              </h2>
              <p className="text-on-surface-variant max-w-md text-[15px] mb-8 leading-relaxed">
                {profileStatus === 'rejected' 
                  ? 'Vui lòng kiểm tra lại thông tin trên hồ sơ của bạn hoặc liên hệ với bộ phận hỗ trợ để biết thêm chi tiết.' 
                  : profileStatus === 'missing'
                  ? 'Vui lòng chuyển sang tab "My Profile" để điền thông tin và nộp đơn đăng ký làm gia sư.'
                  : 'Cảm ơn bạn đã đăng ký làm gia sư tại EduX. Quản trị viên đang xem xét hồ sơ của bạn. Quá trình này có thể mất từ 1-2 ngày làm việc.'}
              </p>
              <button 
                onClick={() => setActiveTab('My Profile')}
                className="h-12 px-8 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                {profileStatus === 'missing' ? 'Tạo hồ sơ ngay' : 'Xem & Cập nhật hồ sơ'}
              </button>
            </div>
          ) : null}

          {(profileStatus === 'approved' || activeTab === 'Hồ Sơ') && activeTab === 'Tổng Quan' && (
            <>
          {/* Ă¢â€ â‚¬Ă¢â€ â‚¬ Welcome Ă¢â€ â‚¬Ă¢â€ â‚¬ */}
          <div className="space-y-1">
            <h2 className="font-headline-sm text-[24px] font-bold text-on-surface">
              Chào buổi sáng, {displayName}
            </h2>
            <p className="font-body-md text-on-surface-variant">
              Đây là tổng quan hàng ngày của bạn.
            </p>
          </div>

          {/* Ă¢â€ â‚¬Ă¢â€ â‚¬ Stats Grid Ă¢â€ â‚¬Ă¢â€ â‚¬ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Earnings */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#16a34a] bg-[#dcfce7] px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +12%
                </span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Tổng Thu Nhập (Tháng Này)
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{formatMoney(overviewStats.thisMonthEarned)}</p>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Lớp Học Đã Dạy
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{overviewStats.completedLessons}</p>
              </div>
            </div>

            {/* Students */}
            <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">
                  Học Viên Đang Học
                </p>
                <p className="text-[36px] leading-[44px] font-bold text-on-surface">{overviewStats.activeStudents}</p>
              </div>
            </div>
          </div>

          {/* Ă¢â€â‚¬Ă¢â€â‚¬ Two-column section Ă¢â€â‚¬Ă¢â€â‚¬ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

            {/* Ă¢â€â‚¬Ă¢â€â‚¬ LEFT: Pending Requests Ă¢â€â‚¬Ă¢â€â‚¬ */}
            <div className="lg:col-span-2 space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Pending Requests
                </h3>
                {requests.length > 0 && (
                  <span className="bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                )}
              </div>

              {/* Tabs for Pending Requests */}
              <div className="flex bg-surface-container-low p-1 rounded-xl mb-4 w-fit">
                <button
                  onClick={() => setActiveRequestTab('single')}
                  className={`px-6 py-2 rounded-lg font-bold text-[14px] transition-all ${activeRequestTab === 'single' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Lịch dạy lẻ ({requests.filter(r => !r.isPackage).length})
                </button>
                <button
                  onClick={() => setActiveRequestTab('monthly')}
                  className={`px-6 py-2 rounded-lg font-bold text-[14px] transition-all ${activeRequestTab === 'monthly' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Gói tháng ({requests.filter(r => r.isPackage).length})
                </button>
                <button
                  onClick={() => setActiveRequestTab('reschedule')}
                  className={`px-6 py-2 rounded-lg font-bold text-[14px] transition-all ${activeRequestTab === 'reschedule' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Đổi lịch ({rescheduleRequests.length})
                </button>
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden">
                {activeRequestTab === 'reschedule' ? (
                  rescheduleRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px]">task_alt</span>
                      <p className="font-label-md text-label-md">Không có yêu cầu nào!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-variant/50">
                      {rescheduleRequests.map((req) => (
                        <RescheduleRequestRow
                          key={req.id}
                          request={req}
                          onAccept={() => handleAcceptReschedule(req.id)}
                          onDecline={() => handleRejectReschedule(req.id)}
                        />
                      ))}
                    </div>
                  )
                ) : requests.filter(r => activeRequestTab === 'monthly' ? r.isPackage : !r.isPackage).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px]">task_alt</span>
                    <p className="font-label-md text-label-md">Không có yêu cầu nào!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-variant/50">
                    {requests.filter(r => activeRequestTab === 'monthly' ? r.isPackage : !r.isPackage).map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        isConflicting={conflictingIds.has(req.id)}
                        onAccept={() => handleAccept(req.id)}
                        onDecline={() => handleDecline(req.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ă¢â€â‚¬Ă¢â€â‚¬ RIGHT: Today's Schedule Ă¢â€â‚¬Ă¢â€â‚¬ */}
            <div className="space-y-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Lịch Hôm Nay
              </h3>
              <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col">
                <div className="relative border-l-2 border-surface-variant ml-3 space-y-6 flex-1">
                  {scheduleToday.length === 0 ? (
                    <div className="pl-6 py-8 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[40px] mb-2">event_available</span>
                      <p className="font-label-md text-label-md">Chưa có buổi học nào được xác nhận.</p>
                    </div>
                  ) : (
                    scheduleToday.map((slot) => (
                      <ScheduleItem key={slot.id} slot={slot} />
                    ))
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('My Schedule')}
                  className="mt-6 w-full h-10 border border-outline-variant rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Xem Toàn Bộ Lịch
                </button>
              </div>
            </div>

          </div>
            </>
          )}

          {activeTab === 'Hồ Sơ' && (
            <TutorProfileTab user={user} displayName={displayName} initials={initials} />
          )}

          {profileStatus === 'approved' && activeTab === 'Lịch Trình' && (
            <MyScheduleTab />
          )}

          {profileStatus === 'approved' && activeTab === 'Học Viên' && (
            <TutorStudentsTab />
          )}

          {profileStatus === 'approved' && activeTab === 'Khóa Học' && (
            <TutorCoursesTab user={user} editCourseId={editCourseId} />
          )}

          {profileStatus === 'approved' && activeTab === 'Khiếu Nại' && (
            <TutorDisputesTab />
          )}

          {profileStatus === 'approved' && activeTab === 'Bài Kiểm Tra' && (
            <TutorAssessmentManager token={token} />
          )}

          {profileStatus === 'approved' && activeTab === 'Chấm Điểm' && (
            <TutorGradingDashboard token={token} />
          )}

          {profileStatus === 'approved' && activeTab === 'Thu Nhập' && (
            <TutorEarningsTab />
          )}

          {profileStatus === 'approved' && activeTab === 'Tin Nhắn' && (
            <MessagesSection token={token} user={user} />
          )}

          {activeTab === 'Ví Tiền' && (
            <WalletDashboard 
              onDepositClick={() => setActiveTab('WalletDeposit')} 
              onWithdrawClick={() => setActiveTab('WalletWithdraw')}
            />
          )}

          {activeTab === 'WalletDeposit' && (
            <WalletDeposit onBack={() => setActiveTab('Ví Tiền')} />
          )}

          {activeTab === 'WalletWithdraw' && (
            <WalletWithdraw onBack={() => setActiveTab('Ví Tiền')} />
          )}

          {/* Instant Request Modal */}
          {instantRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[32px] text-amber-600">bolt</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Yêu cầu Học Ngay!</h3>
                  <p className="text-[14px] text-on-surface-variant mb-1">
                    Học viên <span className="font-bold text-primary">{instantRequest.student_name || 'Học viên'}</span> muốn học ngay môn <span className="font-bold">{instantRequest.subject}</span>.
                  </p>
                  {instantRequest.lesson_fee > 0 && (
                    <p className="text-[13px] text-green-600 font-semibold mb-3">
                      Học phí: {Number(instantRequest.lesson_fee).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                  <div className={`px-4 py-3 rounded-xl w-full mb-6 text-[13px] border ${instantCountdown <= 10 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <p className="font-semibold flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">timer</span>
                      Tự hủy sau <span className="font-bold text-[16px] ml-1">{instantCountdown}s</span>
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => handleInstantAction(instantRequest.id, 'reject')}
                      className="flex-1 h-11 border-2 border-red-200 text-red-600 font-label-lg rounded-xl hover:bg-red-50 transition-colors">
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleInstantAction(instantRequest.id, 'accept')}
                      className="flex-1 h-11 bg-primary text-on-primary font-label-lg rounded-xl shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">check</span> Chấp nhận
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Request Row Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
function RequestRow({ request, isConflicting, onAccept, onDecline }) {
  const [expanded, setExpanded] = useState(false)
  const isTrial = request.bookingType === 'trial'

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return dateStr }
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000)
    if (diff < 1) return 'Vừa xong'
    if (diff < 60) return `${diff} phút trước`
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`
    return `${Math.floor(diff / 1440)} ngày trước`
  }

  const methodLabel = request.teachingMethod === 'online' ? 'Trực tuyến' : request.teachingMethod === 'offline' ? 'Trực tiếp' : request.teachingMethod || ''
  const methodIcon = request.teachingMethod === 'online' ? 'videocam' : request.teachingMethod === 'offline' ? 'location_on' : 'school'
  const displayDate = request.isPackage ? request.date : (request.lessonDate ? formatDate(request.lessonDate) : request.date || '')

  return (
    <div className={`border-b border-gray-100 last:border-0 transition-colors ${expanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'} ${isConflicting ? 'opacity-60 grayscale-[30%]' : ''}`}>
      {/* ── Collapsed summary row (always visible) ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {request.avatarUrl ? (
            <img src={request.avatarUrl} alt={request.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
              {request.initials}
            </div>
          )}
          {isTrial && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-white text-[10px]">star</span>
            </span>
          )}
        </div>

        {/* Summary text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-[14px] ${isConflicting ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{request.name}</span>
            {isConflicting && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                <span className="material-symbols-outlined text-[10px]">error</span>
                Trùng lịch
              </span>
            )}
            {isTrial && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                <span className="material-symbols-outlined text-[10px]">workspace_premium</span>
                Buổi thử
              </span>
            )}
          </div>
          <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
              <span className="material-symbols-outlined text-[13px]">menu_book</span>
              {request.subject}
            </span>
            {displayDate && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  {displayDate}
                </span>
              </>
            )}
            {request.timeSlot && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {request.timeSlot}
                </span>
              </>
            )}
            {request.createdAt && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400">{timeAgo(request.createdAt)}</span>
              </>
            )}
          </p>
        </div>

        {/* Chevron */}
        <span className={`material-symbols-outlined text-[20px] text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="px-5 pb-5">
          {/* Divider */}
          <div className="border-t border-blue-100 mb-4" />

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-[16px] text-indigo-500">menu_book</span>
              <div>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Môn học</p>
                <p className="text-[13px] font-bold text-indigo-800">{request.subject}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-sky-50 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-[16px] text-sky-500">calendar_today</span>
              <div>
                <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wide">
                  {request.isPackage ? 'Bắt đầu từ' : 'Ngày học'}
                </p>
                <p className="text-[13px] font-bold text-sky-800">
                  {request.isPackage && request.startDate ? formatDate(request.startDate) : (displayDate || 'Chưa xác định')}
                </p>
              </div>
            </div>

            {(request.timeSlot || request.scheduleSummary) && (
              <div className={`flex items-center gap-1.5 bg-violet-50 rounded-lg px-3 py-2 ${request.isPackage ? 'col-span-2' : ''}`}>
                <span className="material-symbols-outlined text-[16px] text-violet-500">schedule</span>
                <div>
                  <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wide">
                    {request.isPackage ? 'Lịch học hàng tuần' : 'Giờ học'}
                  </p>
                  <p className="text-[13px] font-bold text-violet-800">
                    {request.isPackage && request.scheduleSummary ? request.scheduleSummary : request.timeSlot}
                  </p>
                </div>
              </div>
            )}

            {methodLabel && (
              <div className="flex items-center gap-1.5 bg-teal-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-teal-500">{methodIcon}</span>
                <div>
                  <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wide">Hình thức</p>
                  <p className="text-[13px] font-bold text-teal-800">{methodLabel}</p>
                </div>
              </div>
            )}

            {request.level && (
              <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-orange-500">signal_cellular_alt</span>
                <div>
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">Trình độ</p>
                  <p className="text-[13px] font-bold text-orange-800">{request.level}</p>
                </div>
              </div>
            )}

            {Number(request.sessionsRequested) > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-rose-500">repeat</span>
                <div>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Số buổi</p>
                  <p className="text-[13px] font-bold text-rose-800">{request.sessionsRequested} buổi</p>
                </div>
              </div>
            )}

            {(request.grade || request.studentAge) && (
              <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-green-500">school</span>
                <div>
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Học sinh</p>
                  <p className="text-[13px] font-bold text-green-800">{request.grade || `${request.studentAge} tuổi`}</p>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          {request.note && (
            <div className="mt-3 flex items-start gap-2 bg-white rounded-lg px-3 py-2.5 border border-gray-100 shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-gray-400 mt-0.5 shrink-0">chat_bubble</span>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                <span className="font-bold text-gray-700">Yêu cầu: </span>{request.note}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 h-10 rounded-xl border-2 border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); onDecline() }}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Từ chối
            </button>
            <button
              className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isConflicting 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed border border-gray-400' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
              disabled={isConflicting}
              onClick={(e) => { e.stopPropagation(); onAccept() }}
            >
              <span className="material-symbols-outlined text-[18px]">{isConflicting ? 'block' : 'check'}</span>
              {isConflicting ? 'Trùng lịch' : 'Chấp nhận'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Schedule Item Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
function ScheduleItem({ slot }) {
  if (slot.isNow) {
    return (
      <div className="relative pl-6">
        {/* Active dot */}
        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="font-label-sm text-primary mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {slot.time} <span className="ml-1 font-bold">(Đang diễn ra)</span>
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-sm font-bold">
              {slot.initials}
            </div>
            <div>
              <p className="font-label-md text-on-surface">{slot.name}</p>
              <p className="font-label-sm text-on-surface-variant flex items-center gap-1 flex-wrap">
                {slot.subject}
                {slot.bookingType === 'trial' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Học thử</span>}
              </p>
            </div>
          </div>
          <button className="w-full h-10 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Bắt Đầu Buổi Học
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative pl-6 opacity-70 hover:opacity-100 transition-opacity">
      {/* Inactive dot */}
      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-variant ring-4 ring-white" />
      <div>
        <p className="font-label-sm text-on-surface-variant mb-1">{slot.time}</p>
        <div className="flex items-center gap-3 bg-surface-container-lowest/50 p-3 rounded-lg border border-outline-variant/30">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-sm font-bold">
            {slot.initials}
          </div>
          <div>
            <p className="font-label-md text-on-surface">{slot.name}</p>
            <p className="font-label-sm text-on-surface-variant flex items-center gap-1 flex-wrap">
              {slot.subject}
              {slot.bookingType === 'trial' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Học thử</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ My Profile Tab Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬

function TutorEarningsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEarnings() {
      setLoading(true)
      setError('')
      try {
        const result = await getTutorEarnings()
        setData(result)
      } catch (e) {
        setError(e.message || 'Failed to load earnings.')
      } finally {
        setLoading(false)
      }
    }
    loadEarnings()
  }, [])

  if (loading) {
    return (
      <div className="bg-white/70 border border-outline-variant/20 rounded-2xl p-12 text-center text-on-surface-variant">
        Loading earnings...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
        {error}
      </div>
    )
  }

  const summary = data?.summary || {}
  const transactions = data?.transactions || []
  const breakdown = data?.monthlyBreakdown || []
  const maxAmount = Math.max(...breakdown.map(item => item.amount), 1)

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Thu Nhập</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Theo dõi doanh thu thực tế từ các buổi học đã điểm danh và phê duyệt.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2 text-primary font-label-md w-fit">
          <span className="material-symbols-outlined text-[18px]">payments</span>
          Mức lương: {formatMoney(data?.hourlyRate || 0)}/giờ
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <EarningStatCard icon="account_balance_wallet" label="Tháng này" value={formatMoney(summary.thisMonthEarned || 0)} tone="primary" />
        <EarningStatCard icon="verified" label="Tổng thu nhập" value={formatMoney(summary.totalEarned || 0)} tone="success" />
        <EarningStatCard icon="hourglass_top" label="Chờ điểm danh" value={formatMoney(summary.pendingAttendanceAmount || 0)} tone="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <div className="xl:col-span-2 bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">6 Tháng Gần Nhất</h3>
              <p className="text-[13px] text-on-surface-variant">Chỉ tính các buổi học đã được đánh dấu "Có mặt".</p>
            </div>
          </div>
          <div className="h-64 flex items-end gap-3 border-b border-outline-variant/20 pt-6">
            {breakdown.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="text-[11px] font-bold text-on-surface">{formatCompactMoney(item.amount)}</div>
                <div
                  className="w-full max-w-[56px] rounded-t-xl bg-primary/85 min-h-[8px] transition-all"
                  style={{ height: `${Math.max((item.amount / maxAmount) * 180, 8)}px` }}
                  title={`${item.label}: ${formatMoney(item.amount)}`}
                />
                <div className="text-[12px] text-on-surface-variant">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">Thống Kê Buổi Học</h3>
          <EarningMiniStat label="Đã nhận tiền" value={summary.completedLessons || 0} color="text-[#16a34a]" />
          <EarningMiniStat label="Chờ giải ngân" value={summary.pendingReleaseLessons || 0} color="text-blue-600" />
          <EarningMiniStat label="Cần điểm danh" value={summary.pendingAttendanceLessons || 0} color="text-amber-600" />
          {summary.disputedLessons > 0 && (
            <EarningMiniStat label="Đang khiếu nại" value={summary.disputedLessons || 0} color="text-orange-600" />
          )}
          <EarningMiniStat label="Không tính phí" value={summary.noChargeLessons || 0} color="text-red-600" />
          <div className="rounded-xl bg-surface-container-low p-3 text-[12px] text-on-surface-variant">
            Mẹo: Hãy điểm danh trong mục Học sinh sau mỗi buổi. Các buổi học có mặt sẽ tự động tính phí.
          </div>
        </div>
      </div>

      <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Lịch Sử Giao Dịch</h3>
            <p className="text-[13px] text-on-surface-variant">Các buổi học thực tế được ghi nhận trên hệ thống.</p>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            Chưa có buổi học nào được phê duyệt.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {transactions.map((item) => (
              <EarningTransactionRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EarningStatCard({ icon, label, value, tone }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#dcfce7] text-[#16a34a]',
    warning: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${tones[tone] || tones.primary}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-[13px] font-bold text-on-surface-variant uppercase">{label}</p>
      <p className="text-[30px] leading-[38px] font-black text-on-surface mt-1">{value}</p>
    </div>
  )
}

function EarningMiniStat({ label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 p-3">
      <span className="text-[13px] text-on-surface-variant">{label}</span>
      <span className={`font-black ${color}`}>{value}</span>
    </div>
  )
}

function EarningTransactionRow({ item }) {
  const status = earningStatusConfig(item.paymentStatus)
  const attendanceDisplay = item.attendanceStatus === 'present' ? 'Có mặt' 
                          : item.attendanceStatus === 'absent' ? 'Vắng mặt' 
                          : item.attendanceStatus === 'excused' ? 'Có phép' 
                          : 'Chưa điểm danh';
  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-3 items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
          {getInitials(item.studentName)}
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface">{item.studentName}</p>
          <p className="text-[13px] text-on-surface-variant">{item.subject || 'Chung'} - {item.date} - {item.timeSlot}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`px-2 py-1 rounded-full border text-[11px] font-bold ${status.classes}`}>
          {status.label}
        </span>
        <span className="px-2 py-1 rounded-full border border-outline-variant/30 text-[11px] font-bold text-on-surface-variant">
          Điểm danh: {attendanceDisplay}
        </span>
      </div>
      <div className="text-left lg:text-right">
        <p className={`font-black ${item.amount > 0 ? 'text-[#16a34a]' : 'text-on-surface-variant'}`}>
          {formatMoney(item.amount || 0)}
        </p>
      </div>
    </div>
  )
}

function earningStatusConfig(status) {
  if (status === 'released') {
    return { label: 'Đã nhận tiền', classes: 'bg-[#dcfce7] text-[#16a34a] border-[#86efac]' }
  }
  if (status === 'pending_release') {
    return { label: 'Chờ giải ngân', classes: 'bg-blue-50 text-blue-700 border-blue-200' }
  }
  if (status === 'pending_attendance') {
    return { label: 'Chờ điểm danh', classes: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  if (status === 'disputed') {
    return { label: 'Đang khiếu nại', classes: 'bg-orange-50 text-orange-700 border-orange-200' }
  }
  return { label: 'Không tính phí', classes: 'bg-red-50 text-red-600 border-red-200' }
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatCompactMoney(value) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${Math.round(amount / 100000) / 10}M`
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`
  return String(amount)
}

function getInitials(name = 'Student') {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'
}
function TutorStudentsTab() {
  const [students, setStudents] = useState([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState({})
  const [feedbackLesson, setFeedbackLesson] = useState(null)

  const loadStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTutorStudents()
      setStudents(Array.isArray(data) ? data : [])
      if (!selectedKey && data?.length) setSelectedKey(`${data[0].studentId}:${data[0].childName || ''}`)
    } catch (e) {
      setError(e.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [])

  const selectedStudent = students.find((student) => `${student.studentId}:${student.childName || ''}` === selectedKey) || students[0]
  const allLessons = students.flatMap((student) => student.lessons || [])
  const totalStudents = students.length
  const totalLessons = students.reduce((sum, student) => sum + (student.totalLessons || 0), 0)
  const totalAbsent = students.reduce((sum, student) => sum + (student.absentCount || 0), 0)
  const markedLessons = students.reduce((sum, student) => sum + (student.markedLessons || 0), 0)
  const presentLessons = students.reduce((sum, student) => sum + (student.presentCount || 0), 0)
  const excusedLessons = students.reduce((sum, student) => sum + (student.excusedCount || 0), 0)
  const rateBase = presentLessons + totalAbsent
  const attendanceRate = rateBase > 0 ? Math.round((presentLessons / rateBase) * 100) : 0

  const handleAttendance = async (lesson, status) => {
    setSavingId(lesson.bookingId)
    try {
      const note = attendanceNotes[lesson.bookingId] ?? lesson.attendanceNote ?? ''
      await markBookingAttendance(lesson.bookingId, status, note)
      await loadStudents()
    } catch (e) {
      alert(e.message || 'Failed to update attendance.')
    } finally {
      setSavingId('')
    }
  }

  const handleFeedbackSubmit = async (data) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const payload = {
        lesson_id: feedbackLesson.bookingId,
        student_id: selectedStudent.studentId,
        subject_name: feedbackLesson.subject || selectedStudent.subjects[0] || 'General',
        focus_rating: data.focusRating,
        understanding_level: data.understandingLevel,
        homework_status: data.homeworkStatus,
        tutor_note: data.tutorNote
      };

      const res = await fetch(`${API_BASE}/api/feedbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFeedbackLesson(null);
        alert('Đã gửi đánh giá thành công!');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
    } catch (error) {
      console.error('Lỗi khi gửi feedback:', error);
      alert('Không thể gửi đánh giá: ' + error.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Quản Lý Học Sinh</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Quản lý danh sách học sinh, điểm danh, xin phép và ghi chú buổi học.</p>
        </div>
        <button onClick={loadStudents} className="h-10 px-4 border border-outline-variant rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StudentStatCard icon="groups" label="Học sinh" value={totalStudents} />
        <StudentStatCard icon="event_available" label="Buổi học" value={totalLessons} />
        <StudentStatCard icon="person_off" label="Vắng mặt" value={totalAbsent} />
        <StudentStatCard icon="fact_check" label="Chuyên cần" value={markedLessons ? `${attendanceRate}%` : '--'} />
      </div>

      {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      {loading ? (
        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-12 text-center text-on-surface-variant">Đang tải dữ liệu học sinh...</div>
      ) : students.length === 0 ? (
        <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">group_off</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mt-2">Chưa có học sinh nào</h3>
          <p className="text-on-surface-variant mt-1">Học sinh sẽ hiển thị ở đây sau khi bạn chấp nhận yêu cầu học.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20">
              <h3 className="font-headline-md text-headline-md text-on-surface">Danh sách học sinh</h3>
              <p className="text-[12px] text-on-surface-variant">Chọn một học sinh để xem lịch sử buổi học.</p>
            </div>
            <div className="divide-y divide-outline-variant/10 max-h-[620px] overflow-auto">
              {students.map((student) => {
                const key = `${student.studentId}:${student.childName || ''}`
                const active = key === selectedKey
                return (
                  <button key={key} onClick={() => setSelectedKey(key)} className={`w-full text-left p-4 flex gap-3 hover:bg-surface-container-low transition-colors ${active ? 'bg-primary/5' : ''}`}>
                    {student.studentAvatar ? <img src={student.studentAvatar} alt={student.studentName} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">{(student.childName || student.studentName || 'S').charAt(0)}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-label-md text-label-md text-on-surface truncate">{student.childName || student.studentName}</p>
                      {student.childName && <p className="text-[12px] text-on-surface-variant truncate">Phụ huynh: {student.studentName}</p>}
                      <p className="text-[12px] text-primary truncate">{student.subjects.join(', ') || 'Chung'}</p>
                      <div className="flex gap-2 mt-2 text-[11px]"><span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{student.totalLessons} buổi</span><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600">{student.absentCount} vắng</span></div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-5">
            <StudentDetailCard student={selectedStudent} />
            <div className="bg-white/80 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between gap-3">
                <div><h3 className="font-headline-md text-headline-md text-on-surface">Điểm danh & Ghi chú</h3><p className="text-[12px] text-on-surface-variant">Chỉ có thể điểm danh các buổi học đã được phê duyệt.</p></div>
                <span className="text-[12px] font-bold text-on-surface-variant">{selectedStudent?.lessons?.length || 0} bản ghi</span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {(selectedStudent?.lessons || []).map((lesson) => <AttendanceRow key={lesson.bookingId} lesson={lesson} saving={savingId === lesson.bookingId} note={attendanceNotes[lesson.bookingId] ?? lesson.attendanceNote ?? ''} onNoteChange={(value) => setAttendanceNotes((prev) => ({ ...prev, [lesson.bookingId]: value }))} onMark={(status) => handleAttendance(lesson, status)} onFeedback={() => setFeedbackLesson(lesson)} />)}
              </div>
            </div>
            <AbsenceTimeline lessons={selectedStudent?.lessons || allLessons} />
          </div>
        </div>
      )}

      {feedbackLesson && (
        <TutorFeedbackModal
          isOpen={!!feedbackLesson}
          onClose={() => setFeedbackLesson(null)}
          lessonData={{ studentName: selectedStudent?.childName || selectedStudent?.studentName, datetime: `${feedbackLesson.date} ${feedbackLesson.timeSlot}` }}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  )
}

function StudentStatCard({ icon, label, value }) {
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-4 shadow-sm flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined">{icon}</span></div><div><p className="text-[12px] uppercase font-bold text-outline">{label}</p><p className="font-headline-sm text-headline-sm text-on-surface">{value}</p></div></div>
}

function StudentDetailCard({ student }) {
  if (!student) return null
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-[12px] uppercase font-bold text-outline">Đang chọn</p><h3 className="font-headline-md text-headline-md text-on-surface">{student.childName || student.studentName}</h3><p className="text-[13px] text-on-surface-variant">{student.studentEmail || 'Chưa có email'}</p></div><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-surface-container-low p-3"><p className="font-bold text-on-surface">{student.totalLessons}</p><p className="text-[11px] text-outline">Buổi</p></div><div className="rounded-xl bg-red-50 p-3"><p className="font-bold text-red-600">{student.absentCount}</p><p className="text-[11px] text-red-500">Vắng</p></div><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold text-primary">{student.attendanceRate ?? '--'}{student.attendanceRate != null ? '%' : ''}</p><p className="text-[11px] text-primary">Tỉ lệ</p></div></div></div>{student.nextLesson ? <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[13px] text-on-surface-variant">Buổi tiếp theo: <strong>{student.nextLesson.date}</strong> lúc <strong>{student.nextLesson.timeSlot}</strong> - {student.nextLesson.subject}</div> : <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 text-[13px] text-on-surface-variant italic">Chưa có buổi học sắp tới.</div>}</div>
}

function AttendanceRow({ lesson, saving, note, onNoteChange, onMark, onFeedback }) {
  const approved = lesson.bookingStatus === 'Approved';
  const statusConfig = { present: 'bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]', absent: 'bg-red-50 text-red-600 border-red-200', excused: 'bg-amber-50 text-amber-700 border-amber-200' };

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(lesson.tutorCheckInAt);

  const isWithinCheckInWindow = () => {
    if (!lesson.date || !lesson.timeSlot) return false;
    let [timeStr, modifier] = lesson.timeSlot.split(' ');
    let [hours, minutes] = timeStr.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    const dateStr = `${lesson.date}T${String(hours).padStart(2, '0')}:${minutes}:00`;
    const lessonTime = new Date(dateStr);
    if (isNaN(lessonTime.getTime())) return false;
    
    const now = new Date();
    const diffMs = lessonTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins <= 30 && diffMins >= -120; // within 30 min before, or up to 2 hours after
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const token = localStorage.getItem('token');
      const apiBase = API_BASE_URL;
      const res = await fetch(`${apiBase}/api/tutor/bookings/${lesson.bookingId}/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCheckInTime(data.tutorCheckInAt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIn(false);
    }
  };

  const canCheckIn = approved && isWithinCheckInWindow() && !checkInTime;
  
  const isPastLesson = () => {
    if (!lesson.date || !lesson.timeSlot) return false;
    let [timeStr, modifier] = lesson.timeSlot.split(' ');
    let [hours, minutes] = timeStr.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    const lessonTime = new Date(`${lesson.date}T${String(hours).padStart(2, '0')}:${minutes}:00`);
    return lessonTime < new Date();
  };

  const canEvaluate = approved && isPastLesson() && !lesson.isEvaluated;

  // ATTENDANCE_SETTLEMENT_V1: đánh vắng/có phép ảnh hưởng trực tiếp tới tiền —
  // bắt xác nhận và nêu rõ hệ quả trước khi gửi.
  const confirmMark = (status) => {
    if (status === 'absent') {
      const moneyLine = checkInTime
        ? 'Bạn đã check-in buổi học — theo chính sách, học phí sẽ KHÔNG hoàn cho học sinh và bạn nhận 90% bồi hoàn vào ví.'
        : '⚠️ Bạn CHƯA check-in buổi học này. Không có bằng chứng có mặt, học phí sẽ được HOÀN LẠI cho học sinh và bạn không nhận được bồi hoàn.';
      if (!window.confirm(`Xác nhận học sinh VẮNG MẶT KHÔNG PHÉP?\n\n${moneyLine}\n\nHọc sinh và phụ huynh sẽ được thông báo, và có 48 giờ để khiếu nại nếu thông tin không đúng.`)) return;
    } else if (status === 'excused') {
      if (!window.confirm('Xác nhận NGHỈ CÓ PHÉP?\n\nToàn bộ học phí sẽ được hoàn lại cho học sinh và bạn không nhận thù lao buổi này.')) return;
    }
    onMark(status);
  };

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_auto] gap-3 items-center">
      <div>
        <p className="font-label-md text-label-md text-on-surface">{lesson.subject || 'Chung'}</p>
        <p className="text-[13px] text-on-surface-variant">{lesson.date} - {lesson.timeSlot}</p>
        <div className="flex gap-2 items-center mt-2">
          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-bold ${lesson.attendanceStatus ? statusConfig[lesson.attendanceStatus] : 'bg-surface-container text-on-surface-variant border-outline-variant/30'}`}>
            {lesson.attendanceStatus === 'present' ? 'Có mặt' 
            : lesson.attendanceStatus === 'absent' ? 'Vắng mặt'
            : lesson.attendanceStatus === 'excused' ? 'Có phép'
            : lesson.bookingStatus === 'Approved' ? 'Chưa điểm danh'
            : lesson.bookingStatus}
          </span>
          {checkInTime && (
            <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-[11px] font-bold items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              Đã bắt đầu lúc {new Date(checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          )}
        </div>
      </div>
      <input 
        value={note} 
        onChange={(e) => onNoteChange(e.target.value)} 
        placeholder="Ghi chú buổi học..." 
        disabled={!approved || saving} 
        className="h-10 px-3 rounded-xl border border-outline-variant text-[13px] outline-none focus:border-primary disabled:opacity-50" 
      />
      <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
        {canCheckIn && (
          <button 
            disabled={checkingIn} 
            onClick={handleCheckIn} 
            className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold disabled:opacity-40 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
            Bắt đầu dạy
          </button>
        )}
        <button disabled={!approved || saving} onClick={() => onMark('present')} className="h-9 px-3 rounded-lg bg-[#16a34a] text-white text-[12px] font-bold disabled:opacity-40">Có mặt</button>
        <button disabled={!approved || saving} onClick={() => confirmMark('absent')} title={checkInTime ? 'Học sinh vắng không phép — bạn nhận 90% bồi hoàn' : 'Chưa check-in: đánh vắng sẽ hoàn tiền cho học sinh'} className="h-9 px-3 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Vắng</button>
        <button disabled={!approved || saving} onClick={() => confirmMark('excused')} title="Nghỉ có phép — hoàn 100% học phí cho học sinh" className="h-9 px-3 rounded-lg bg-amber-500 text-white text-[12px] font-bold disabled:opacity-40">Có phép</button>
        {canEvaluate ? (
          <button onClick={onFeedback} className="h-9 px-3 rounded-lg border border-blue-500 text-blue-600 text-[12px] font-bold hover:bg-blue-50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">edit_note</span>Đánh giá
          </button>
        ) : lesson.isEvaluated ? (
          <button disabled className="h-9 px-3 rounded-lg border border-gray-300 text-gray-400 text-[12px] font-bold flex items-center gap-1 bg-gray-50">
            <span className="material-symbols-outlined text-[14px]">check</span>Đã đánh giá
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AbsenceTimeline({ lessons }) {
  const absences = lessons.filter((lesson) => lesson.attendanceStatus === 'absent' || lesson.attendanceStatus === 'excused')
  return <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-5 shadow-sm"><h3 className="font-headline-md text-headline-md text-on-surface mb-3">Lịch sử vắng mặt</h3>{absences.length === 0 ? <p className="text-[13px] text-on-surface-variant italic">Chưa có lịch sử vắng mặt.</p> : <div className="space-y-2">{absences.map((lesson) => <div key={lesson.bookingId} className={`rounded-xl border p-3 ${lesson.attendanceStatus === 'absent' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><p className={`text-[13px] font-bold ${lesson.attendanceStatus === 'absent' ? 'text-red-700' : 'text-amber-700'}`}>{lesson.date} - {lesson.timeSlot}</p><p className={`text-[12px] ${lesson.attendanceStatus === 'absent' ? 'text-red-600' : 'text-amber-600'}`}>{lesson.subject || 'Chung'}{lesson.attendanceNote ? ` - ${lesson.attendanceNote}` : ''}</p></div>)}</div>}</div>
}
function pad2(value) {
  return String(value).padStart(2, '0')
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfWeek(date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function monthDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonthTitle(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDayName(date) {
  return DAY_ORDER[(date.getDay() + 6) % 7]
}

function normalizeBookingDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : toDateKey(parsed)
}

// ── Hình thức dạy: chuẩn hóa từ teaching_methods (mảng text tự do) ──────────
function methodSupportOf(methods) {
  const txt = (Array.isArray(methods) ? methods : []).join(' ').toLowerCase()
  const online  = /online|trực tuyến|truc tuyen/.test(txt)
  const offline = /offline|trực tiếp|truc tiep|tại nhà|tai nha|tại địa điểm/.test(txt)
  return { online, offline }
}
function methodChoiceOf(methods) {
  const s = methodSupportOf(methods)
  if (s.online && s.offline) return 'both'
  if (s.online) return 'online'
  if (s.offline) return 'offline'
  return ''
}
const METHOD_LABELS = { online: 'Online', offline: 'Offline (truc tiep)', both: 'Ca hai (Online + Offline)' }

function MyScheduleTab() {
  const [view, setView] = useState('week')
  const [cursor, setCursor] = useState(new Date())
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionModal, setSessionModal] = useState(null)
  const [sessionInfoMap, setSessionInfoMap] = useState({})

  useEffect(() => {
    let active = true
    async function loadSchedule() {
      setLoading(true)
      setError('')
      try {
        const [profileData, bookingData] = await Promise.all([getTutorProfile(), getBookings()])
        if (!active) return
        setProfile(profileData)
        setBookings(Array.isArray(bookingData) ? bookingData : [])
      } catch (e) {
        if (!active) return
        setError(e.message || 'Failed to load schedule.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSchedule()
    return () => { active = false }
  }, [])

  // Thông tin buổi học đọc từ DB (bookings) — học sinh cũng thấy được, thay cho localStorage cũ
  useEffect(() => {
    const map = {}
    bookings.filter(b => String(b.status).toLowerCase() === 'approved').forEach(b => {
      if (b.teaching_method || b.meeting_link || b.location || b.session_topic) {
        map[`booking-${b.id}`] = {
          mode: b.teaching_method || (b.meeting_link ? 'online' : 'offline'),
          meetLink: b.meeting_link || '',
          meetPassword: b.meeting_password || '',
          location: b.location || '',
          locationNote: b.location_note || '',
          topic: b.session_topic || '',
          duration: b.session_duration ? String(b.session_duration) : '60',
          materials: b.session_materials || '',
          homework: b.session_homework || '',
        }
      }
    })
    setSessionInfoMap(map)
  }, [bookings])

  const availability = profile?.availability || {}
  const approvedBookings = bookings.filter((booking) => String(booking.status).toLowerCase() === 'approved')
  const weekStart = startOfWeek(cursor)
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const monthGrid = monthDays(cursor)
  const totalAvailable = DAY_ORDER.reduce((sum, day) => sum + (availability[day] || []).length, 0)
  const totalClasses = approvedBookings.length

  const eventsForDate = (date) => {
    const dayName = getDayName(date)
    const dateKey = toDateKey(date)
    
    const bookedSlots = approvedBookings
      .filter((booking) => normalizeBookingDate(booking.lesson_date || booking.date) === dateKey)
      .map((booking) => ({
        id: `booking-${booking.id}`,
        type: 'booking',
        time: booking.time_slot || booking.timeSlot || booking.time || 'Scheduled',
        title: booking.subject || 'Lớp học',
        meta: booking.childName || booking.studentName || 'Học sinh',
        attendanceStatus: booking.attendance_status || null,
        attendanceNote: booking.attendance_note || null,
      }))
      
    const bookedTimesMins = bookedSlots.map(b => parseTimeToMinutes(b.time));

    const availableSlots = (availability[dayName] || [])
      .filter(time => !bookedTimesMins.includes(parseTimeToMinutes(time)))
      .map((time) => ({
        id: `available-${dateKey}-${time}`,
        type: 'available',
        time,
        title: 'Trống',
        meta: dayName,
      }))
      
    return [...bookedSlots, ...availableSlots].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  }

  const goPrev = () => setCursor((current) => view === 'week' ? addDays(current, -7) : addMonths(current, -1))
  const goNext = () => setCursor((current) => view === 'week' ? addDays(current, 7) : addMonths(current, 1))
  const goToday = () => setCursor(new Date())

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Lịch giảng dạy</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Xem thời gian rảnh và lịch dạy đã duyệt theo tuần hoặc tháng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <button type="button" onClick={() => setView('week')} className={`h-9 px-4 rounded-lg font-label-md text-label-md transition-colors ${view === 'week' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>Tuần</button>
            <button type="button" onClick={() => setView('month')} className={`h-9 px-4 rounded-lg font-label-md text-label-md transition-colors ${view === 'month' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>Tháng</button>
          </div>
          <button onClick={goToday} className="h-10 px-4 border border-outline-variant rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container transition-colors">Hôm nay</button>
          <button onClick={goPrev} className="w-10 h-10 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
          <button onClick={goNext} className="w-10 h-10 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScheduleSummaryCard icon="event_available" label="LỊCH TRỐNG" value={totalAvailable} />
        <ScheduleSummaryCard icon="school" label="LỚP ĐÃ DUYỆT" value={totalClasses} />
        <ScheduleSummaryCard icon="calendar_month" label={view === 'week' ? 'TUẦN HIỆN TẠI' : 'THÁNG HIỆN TẠI'} value={view === 'week' ? `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])}` : formatMonthTitle(cursor)} />
      </div>

      {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      <div className="bg-white/80 backdrop-blur-md border border-outline-variant/20 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="min-h-[320px] flex items-center justify-center text-on-surface-variant">Đang tải lịch trình...</div>
        ) : view === 'week' ? (
          <div className="border-t border-outline-variant/20 relative">
            <TimeGridWeekView weekDates={weekDates} eventsForDate={eventsForDate} onEventClick={setSessionModal} sessionInfoMap={sessionInfoMap} />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-7 border-b border-outline-variant/20 bg-surface-container-lowest">
              {DAY_ORDER.map((day) => <div key={day} className="px-3 py-2 text-[11px] font-bold uppercase text-outline text-center">{DAY_NAMES_VI[day]}</div>)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-7">
              {monthGrid.map((date) => <ScheduleMonthCell key={toDateKey(date)} date={date} events={eventsForDate(date)} isCurrentMonth={date.getMonth() === cursor.getMonth()} onEventClick={setSessionModal} sessionInfoMap={sessionInfoMap} />)}
            </div>
          </div>
        )}
      </div>

      {sessionModal && (
        <SessionInfoModal
          event={sessionModal}
          booking={bookings.find(b => `booking-${b.id}` === sessionModal.id) || null}
          onSaved={async () => {
            try {
              const fresh = await getBookings()
              setBookings(Array.isArray(fresh) ? fresh : [])
            } catch {}
          }}
          onClose={() => setSessionModal(null)}
        />
      )}
    </div>
  )
}

function ScheduleSummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-[12px] uppercase font-bold text-outline">{label}</p>
        <p className="font-headline-sm text-headline-sm text-on-surface">{value}</p>
      </div>
    </div>
  )
}

const ATTENDANCE_BADGE = {
  present: { label: 'Có mặt', icon: 'check_circle', className: 'bg-green-600 text-white' },
  absent: { label: 'Vắng', icon: 'cancel', className: 'bg-red-600 text-white' },
  excused: { label: 'Có phép', icon: 'info', className: 'bg-amber-500 text-white' },
}

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 84; // Increased from 64 to 84px for better text fit

function TimeGridWeekView({ weekDates, eventsForDate, onEventClick, sessionInfoMap }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentTop = ((currentMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="flex bg-white overflow-hidden">
      {/* Time Gutter */}
      <div className="w-14 flex-shrink-0 bg-white border-r border-gray-100 pt-14 relative">
        {hours.map((hour) => (
          <div key={hour} className="absolute w-full pr-2 text-right" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + 56 }}>
            <span className="text-[10px] font-medium text-gray-400 transform -translate-y-1/2 block">
              {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 flex overflow-x-auto relative">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 pointer-events-none mt-14">
          {hours.map((hour) => (
            <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }} />
          ))}
        </div>

        {weekDates.map((date) => {
          const events = eventsForDate(date);
          const isToday = toDateKey(date) === toDateKey(new Date());

          return (
            <div key={toDateKey(date)} className={`flex-1 min-w-[120px] relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50/20' : ''}`}>
              {/* Day Header */}
              <div className="h-14 border-b border-gray-100 flex flex-col items-center justify-center bg-white sticky top-0 z-20">
                <span className={`text-[11px] font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{getDayName(date).slice(0, 3)}</span>
                <div className={`mt-0.5 text-[18px] w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Events Container */}
              <div className="relative w-full" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
                {/* Current Time Indicator */}
                {isToday && currentMins >= START_HOUR * 60 && currentMins <= END_HOUR * 60 && (
                  <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${currentTop}px` }}>
                    <div className="h-0.5 bg-red-500 w-full relative">
                      <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                  </div>
                )}

                {(() => {
                  const groupedEvents = {};
                  events.forEach((event) => {
                    const startMins = parseTimeToMinutes(event.time);
                    if (startMins < START_HOUR * 60 || startMins >= END_HOUR * 60) return;
                    if (!groupedEvents[startMins]) groupedEvents[startMins] = [];
                    groupedEvents[startMins].push(event);
                  });
                  
                  // Filter out "available" if there is a "booking" in the same time slot
                  Object.keys(groupedEvents).forEach(startMins => {
                    const hasBooking = groupedEvents[startMins].some(e => e.type === 'booking');
                    if (hasBooking) {
                       groupedEvents[startMins] = groupedEvents[startMins].filter(e => e.type === 'booking');
                    }
                  });

                  return Object.entries(groupedEvents).map(([startMinsStr, timeEvents]) => {
                    const startMins = parseInt(startMinsStr, 10);
                    const top = ((startMins - (START_HOUR * 60)) / 60) * HOUR_HEIGHT;
                    const durationMins = 60; // Default 1 hr
                    const height = (durationMins / 60) * HOUR_HEIGHT;

                    return (
                      <div key={startMins} className="absolute left-1.5 right-1.5 flex gap-1" style={{ top: `${top + 2}px`, height: `${height - 4}px` }}>
                        {timeEvents.map((event) => {
                          const isBooking = event.type === 'booking';
                          const hasInfo = !!sessionInfoMap?.[event.id];
                          const attendance = isBooking ? ATTENDANCE_BADGE[event.attendanceStatus] : null;
                          return (
                            <div
                              key={event.id}
                              onClick={isBooking ? () => onEventClick?.(event) : undefined}
                              className={`flex-1 rounded-[6px] p-1.5 px-2 overflow-hidden transition-all text-xs border shadow-sm group relative ${
                                isBooking
                                  ? 'bg-blue-600 text-white border-blue-700 cursor-pointer hover:bg-blue-700 hover:shadow-md hover:z-30'
                                  : 'bg-indigo-50/80 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between text-[10px] leading-tight opacity-90">
                                <span>{event.time}</span>
                                {isBooking && hasInfo && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                              </div>
                              <div className="font-semibold truncate text-[11px] leading-tight mt-0.5">
                                {isBooking ? event.title : 'Trống'}
                              </div>
                              {isBooking && (
                                <div className="truncate opacity-80 text-[10px] leading-tight mt-0.5">{event.meta}</div>
                              )}
                              {attendance && (
                                <div className={`mt-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold leading-none ${attendance.className}`} title={event.attendanceNote || attendance.label}>
                                  <span className="material-symbols-outlined text-[10px] leading-none">{attendance.icon}</span>
                                  {attendance.label}
                                </div>
                              )}

                              {isBooking && (
                                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="material-symbols-outlined text-[12px] bg-white/20 rounded-full p-0.5">{hasInfo ? 'edit' : 'add'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleMonthCell({ date, events, isCurrentMonth, onEventClick, sessionInfoMap }) {
  const isToday = toDateKey(date) === toDateKey(new Date())
  return (
    <div className={`min-h-[120px] border-b sm:border-r border-outline-variant/20 p-3 ${isCurrentMonth ? 'bg-white' : 'bg-surface-container-low/40 opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[12px] font-bold ${isToday ? 'bg-primary text-on-primary rounded-full w-7 h-7 flex items-center justify-center' : 'text-on-surface'}`}>{date.getDate()}</span>
        {events.length > 0 && <span className="text-[10px] text-primary font-bold">{events.length}</span>}
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => {
          const attendance = event.type === 'booking' ? ATTENDANCE_BADGE[event.attendanceStatus] : null;
          return (
            <div
              key={event.id}
              onClick={event.type === 'booking' ? () => onEventClick?.(event) : undefined}
              title={attendance ? (event.attendanceNote || attendance.label) : undefined}
              className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold flex items-center gap-1 ${
                event.type === 'booking'
                  ? 'bg-primary text-on-primary cursor-pointer hover:bg-primary/80 active:scale-95 transition-all'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <span className="truncate">{event.time}</span>
              {event.type === 'booking' && sessionInfoMap?.[event.id] && (
                <span className="material-symbols-outlined text-[9px] flex-shrink-0">check_circle</span>
              )}
              {attendance && (
                <span className="ml-auto flex-shrink-0 material-symbols-outlined text-[10px]">{attendance.icon}</span>
              )}
            </div>
          );
        })}
        {events.length > 3 && <p className="text-[10px] text-outline">+{events.length - 3} lớp khác</p>}
      </div>
    </div>
  )
}



// ─── Session Info Modal ─────────────────────────────────────────────────────
function SessionInfoModal({ event, booking, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    mode: booking?.teaching_method || (booking?.meeting_link ? 'online' : 'online'),
    meetLink: booking?.meeting_link || '',
    meetPassword: booking?.meeting_password || '',
    location: booking?.location || '',
    locationNote: booking?.location_note || '',
    topic: booking?.session_topic || '',
    duration: booking?.session_duration ? String(booking.session_duration) : '60',
    materials: booking?.session_materials || '',
    homework: booking?.session_homework || '',
    notifyStudent: true,
  }))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [changeStatus, setChangeStatus] = useState(booking?.method_change_status || null)
  const [resolving, setResolving] = useState(false)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  // Hình thức do học sinh chọn khi đặt lịch → khóa, gia sư không tự đổi được
  // (chỉ đổi qua luồng học sinh gửi yêu cầu). Booking cũ không có → cho chọn.
  const lockedMethod = (() => {
    const m = String(
      (changeStatus === 'accepted' && booking?.method_change_requested) ||
      booking?.teaching_method || ''
    ).toLowerCase()
    return m === 'online' || m === 'offline' ? m : null
  })()

  const handleSave = async () => {
    setError('')
    if (!booking?.id) {
      setError('Không tìm thấy buổi học tương ứng. Vui lòng tải lại trang.')
      return
    }
    if (form.mode === 'online' && !form.meetLink.trim()) {
      setError('Vui lòng nhập link phòng học online.')
      return
    }
    if (form.mode === 'offline' && !form.location.trim()) {
      setError('Vui lòng nhập địa điểm học offline.')
      return
    }
    setSaving(true)
    try {
      await saveSessionInfo(booking.id, form)
      if (onSaved) await onSaved()
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 900)
    } catch (e) {
      setError(e.message || 'Lưu thông tin buổi học thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const handleResolveChange = async (decision) => {
    if (!booking?.id) return
    setResolving(true)
    setError('')
    try {
      await resolveMethodChange(booking.id, decision)
      setChangeStatus(decision)
      if (decision === 'accepted') set('mode', booking.method_change_requested)
      if (onSaved) await onSaved()
    } catch (e) {
      setError(e.message || 'Phản hồi yêu cầu thất bại.')
    } finally {
      setResolving(false)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-outline-variant text-[14px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white transition-all'
  const textareaCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[14px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none transition-all'
  const fieldLabel = (icon, text, required = false, color = 'text-on-surface-variant') => (
    <label className={`flex items-center gap-1.5 text-[12px] font-bold ${color} mb-1.5`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#f8f9fb] rounded-[1.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.22)] w-full max-w-[900px] max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Gradient Header ── */}
        <div className="bg-gradient-to-br from-[#00288e] via-[#0a35a8] to-[#1e40af] px-6 py-5 flex-shrink-0 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/[0.06]" />
          <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full bg-white/[0.04] translate-y-1/2" />
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-white/70 text-[16px]">edit_calendar</span>
                <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Thông tin buổi học</span>
              </div>
              <h2 className="text-white text-[18px] font-bold leading-snug truncate">{event.title}</h2>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-white/[0.15] text-white text-[12px] font-semibold px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {event.time}
                </span>
                <span className="inline-flex items-center gap-1 bg-white/[0.15] text-white text-[12px] font-semibold px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[13px]">person</span>
                  {event.meta}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.22] flex items-center justify-center text-white transition-colors flex-shrink-0"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Yêu cầu đổi hình thức từ học sinh */}
          {booking?.method_change_requested && changeStatus === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">swap_horiz</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-amber-800">
                    Học sinh xin đổi sang {booking.method_change_requested === 'online' ? 'Online' : 'Offline'}
                  </p>
                  {booking.method_change_reason && (
                    <p className="text-[12px] text-amber-700 mt-0.5">Lý do: {booking.method_change_reason}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={resolving}
                  onClick={() => handleResolveChange('accepted')}
                  className="h-9 px-4 rounded-lg bg-[#16a34a] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#15803d] transition-colors disabled:opacity-60">
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  Đồng ý đổi
                </button>
                <button type="button" disabled={resolving}
                  onClick={() => handleResolveChange('declined')}
                  className="h-9 px-4 rounded-lg border border-amber-300 text-amber-700 text-[12px] font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-colors disabled:opacity-60">
                  <span className="material-symbols-outlined text-[15px]">close</span>
                  Từ chối
                </button>
              </div>
              {booking.method_change_requested === 'online' && (
                <p className="text-[11px] text-amber-600">Nếu đồng ý, nhớ điền link phòng học online bên dưới rồi bấm Lưu.</p>
              )}
            </div>
          )}
          {changeStatus === 'accepted' && booking?.method_change_requested && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#16a34a] text-[18px]">check_circle</span>
              <p className="text-[12px] font-semibold text-green-800">
                Đã đồng ý đổi sang {booking.method_change_requested === 'online' ? 'Online' : 'Offline'} — học sinh đã được thông báo.
              </p>
            </div>
          )}

          {/* CARD 1 — Hình thức học */}
          <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-outline-variant/15">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary text-[11px] font-black">1</div>
              <p className="text-[12px] font-bold text-on-surface uppercase tracking-wider">Hình thức học</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Hình thức đã được học sinh chọn khi đặt lịch → hiển thị cố định */}
              {lockedMethod ? (
                <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
                  lockedMethod === 'online' ? 'border-primary bg-primary/5' : 'border-[#16a34a] bg-[#f0fdf4]'
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    lockedMethod === 'online' ? 'bg-primary text-on-primary' : 'bg-[#16a34a] text-white'
                  }`}>
                    <span className="material-symbols-outlined text-[22px]">
                      {lockedMethod === 'online' ? 'videocam' : 'location_on'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-[13px] ${lockedMethod === 'online' ? 'text-primary' : 'text-[#16a34a]'}`}>
                        {lockedMethod === 'online' ? 'Online' : 'Offline'}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white border ${
                        lockedMethod === 'online' ? 'border-primary/30 text-primary' : 'border-[#16a34a]/30 text-[#16a34a]'
                      }`}>
                        <span className="material-symbols-outlined text-[11px]">lock</span>
                        Học sinh đã chọn
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {lockedMethod === 'online' ? 'Zoom · Meet · Teams' : 'Học trực tiếp'} — hình thức do học sinh chọn khi đặt lịch, chỉ thay đổi khi học sinh gửi yêu cầu đổi.
                    </p>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'online',  icon: 'videocam',    label: 'Online',  sub: 'Zoom · Meet · Teams' },
                  { value: 'offline', icon: 'location_on', label: 'Offline', sub: 'Học trực tiếp' },
                ].map(opt => {
                  const isActive = form.mode === opt.value
                  const isOnline = opt.value === 'online'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('mode', opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? isOnline
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-[#16a34a] bg-[#f0fdf4] shadow-sm'
                          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? isOnline ? 'bg-primary text-on-primary' : 'bg-[#16a34a] text-white'
                          : 'bg-surface-container text-outline'
                      }`}>
                        <span className="material-symbols-outlined text-[22px]">{opt.icon}</span>
                      </div>
                      <div className="text-center">
                        <p className={`font-bold text-[13px] ${
                          isActive ? (isOnline ? 'text-primary' : 'text-[#16a34a]') : 'text-on-surface-variant'
                        }`}>{opt.label}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{opt.sub}</p>
                      </div>
                      {isActive && (
                        <span
                          className={`material-symbols-outlined text-[16px] ${isOnline ? 'text-primary' : 'text-[#16a34a]'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >check_circle</span>
                      )}
                    </button>
                  )
                })}
              </div>
              )}

              {/* Online fields */}
              {form.mode === 'online' && (
                <div className="space-y-3 pt-3 border-t border-outline-variant/15">
                  <div>
                    {fieldLabel('link', 'Link phòng học', true, 'text-primary')}
                    <input value={form.meetLink} onChange={e => set('meetLink', e.target.value)}
                      placeholder="https://zoom.us/j/... hoặc meet.google.com/..."
                      className={inputCls} />
                  </div>
                  <div>
                    {fieldLabel('lock', 'Mật khẩu phòng (nếu có)')}
                    <input value={form.meetPassword} onChange={e => set('meetPassword', e.target.value)}
                      placeholder="Nhập mật khẩu phòng học..."
                      className={inputCls} />
                  </div>
                </div>
              )}

              {/* Offline fields */}
              {form.mode === 'offline' && (
                <div className="space-y-3 pt-3 border-t border-outline-variant/15">
                  <div>
                    {fieldLabel('location_on', 'Địa điểm học', true, 'text-[#16a34a]')}
                    <input value={form.location} onChange={e => set('location', e.target.value)}
                      placeholder="VD: 123 Nguyễn Văn Linh, Q7, TP.HCM..."
                      className={inputCls.replace('focus:border-primary focus:ring-primary/10', 'focus:border-[#16a34a] focus:ring-[#16a34a]/10')} />
                  </div>
                  <div>
                    {fieldLabel('directions', 'Hướng dẫn đường đi (tùy chọn)')}
                    <textarea value={form.locationNote} onChange={e => set('locationNote', e.target.value)}
                      rows={2} placeholder="VD: Vào cổng A, lên tầng 2, phòng 201. Có bãi đậu xe máy miễn phí..."
                      className={textareaCls.replace('focus:border-primary focus:ring-primary/10', 'focus:border-[#16a34a] focus:ring-[#16a34a]/10')} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2 — Nội dung & Thời lượng */}
          <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-outline-variant/15">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary text-[11px] font-black">2</div>
              <p className="text-[12px] font-bold text-on-surface uppercase tracking-wider">Nội dung & Thời lượng</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                {fieldLabel('subject', 'Chủ đề / Nội dung buổi học')}
                <input value={form.topic} onChange={e => set('topic', e.target.value)}
                  placeholder="VD: Ôn tập chương 3 — Phương trình bậc 2, luyện đề thi..."
                  className={inputCls} />
              </div>
              <div>
                {fieldLabel('timer', 'Thời lượng dự kiến')}
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[['45','45 phút'],['60','1 giờ'],['90','1.5 giờ'],['120','2 giờ']].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => set('duration', val)}
                      className={`h-10 rounded-xl border text-[12px] font-bold transition-all ${
                        form.duration === val
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/50 bg-white'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3 — Chuẩn bị trước buổi học */}
          <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-outline-variant/15">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary text-[11px] font-black">3</div>
              <p className="text-[12px] font-bold text-on-surface uppercase tracking-wider">Chuẩn bị trước buổi học</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                {fieldLabel('menu_book', 'Tài liệu / Dụng cụ cần mang')}
                <textarea value={form.materials} onChange={e => set('materials', e.target.value)}
                  rows={2} placeholder="VD: SGK Toán 10, bút + vở nháp, máy tính bỏ túi..."
                  className={textareaCls} />
              </div>
              <div>
                {fieldLabel('assignment', 'Bài tập / Ghi chú trước buổi học')}
                <textarea value={form.homework} onChange={e => set('homework', e.target.value)}
                  rows={3} placeholder="VD: Hoàn thành bài tập trang 45–47. Xem lại định lý Pythagore. Ghi câu hỏi cần hỏi..."
                  className={textareaCls} />
              </div>
            </div>
          </div>

          {/* Toggle gửi thông báo */}
          <button
            type="button"
            onClick={() => set('notifyStudent', !form.notifyStudent)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
              form.notifyStudent
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/30 bg-white hover:border-outline-variant'
            }`}
          >
            <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${form.notifyStudent ? 'bg-primary' : 'bg-outline/25'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${form.notifyStudent ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
            <div>
              <p className={`text-[14px] font-bold ${form.notifyStudent ? 'text-primary' : 'text-on-surface'}`}>
                Gửi thông báo cho học sinh
              </p>
              <p className="text-[12px] text-on-surface-variant">Học sinh sẽ nhận thông tin buổi học qua hệ thống</p>
            </div>
            {form.notifyStudent && (
              <span className="material-symbols-outlined text-primary text-[18px] ml-auto flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                notifications_active
              </span>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-outline-variant/20 bg-white flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">devices</span>
            Lưu trên thiết bị này
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-xl border border-outline-variant text-on-surface-variant text-[13px] font-semibold hover:bg-surface-container transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`h-10 px-6 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 ${
                saved
                  ? 'bg-[#16a34a] text-white'
                  : 'bg-primary text-on-primary hover:bg-[#1e40af]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={saved ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {saved ? 'check_circle' : 'save'}
              </span>
              {saved ? 'Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu & gửi cho học sinh'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_NAMES_VI = {
  Monday: 'Thứ 2',
  Tuesday: 'Thứ 3',
  Wednesday: 'Thứ 4',
  Thursday: 'Thứ 5',
  Friday: 'Thứ 6',
  Saturday: 'Thứ 7',
  Sunday: 'Chủ Nhật'
}
const TIME_SLOTS = [
  '07:00 AM','08:00 AM','09:00 AM','10:00 AM','10:30 AM','11:00 AM',
  '12:00 PM','01:00 PM','01:30 PM','02:00 PM','03:00 PM','03:30 PM',
  '04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM',
]

// Chuyển slot string ("09:00 AM") thành phút kể từ nửa đêm
function parseSlotMins(slot) {
  const [time, period] = slot.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + m
}

// Kiểm tra slot có bị chặn bởi một slot đã chọn không (dựa theo duration)
// VD: 09:00 AM đã chọn với 2h → 10:00 AM và 10:30 AM bị block
function isSlotBlocked(slot, selectedSlots, durationMins) {
  if (durationMins <= 60) return false // 1h: không block gì
  const slotMins = parseSlotMins(slot)
  for (const sel of selectedSlots) {
    const selMins = parseSlotMins(sel)
    // Slot bị block nếu nằm trong khoảng [selStart, selStart+duration) của một slot đã chọn
    // hoặc nếu chọn slot này sẽ đè lên slot đã chọn khác
    const overlap = slotMins < selMins + durationMins && slotMins + durationMins > selMins
    if (overlap && slotMins !== selMins) return true
  }
  return false
}

// Badge hiĂ¡Â»Æ’n thĂ¡Â»â€¹ trĂ¡ÂºÂ¡ng thÄ‚Â¡i duyĂ¡Â»â€¡t
function StatusBadge({ status }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#bbf7d0]">
      <span className="material-symbols-outlined icon-fill text-[13px]">check_circle</span>Đã duyệt
    </span>
  )
  if (status === 'rejected') return (
    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
      <span className="material-symbols-outlined text-[13px]">cancel</span>Từ chối
    </span>
  )
  if (status === 'draft') return (
    <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant text-[11px] font-bold px-2 py-0.5 rounded-full border border-outline-variant">
      <span className="material-symbols-outlined text-[13px]">edit_note</span>Bản nháp
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
      <span className="material-symbols-outlined text-[13px]">pending</span>Chờ duyệt
    </span>
  )
}

function TutorProfileTab({ user, displayName, initials, updateUserContext }) {
  const { updateUser } = useAuth()

  // Profile state
  const [profile, setProfile]           = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Bio edit
  const [bioEdit, setBioEdit]           = useState(false)
  const [bioValue, setBioValue]         = useState('')
  const [bioSaving, setBioSaving]       = useState(false)

  // Avatar
  const [avatarUrl, setAvatarUrl]       = useState(user?.picture || '')
  const [avatarEdit, setAvatarEdit]     = useState(false)
  const [avatarInput, setAvatarInput]   = useState('')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError]   = useState('')

  // CV edit
  const [cvEdit, setCvEdit]             = useState(false)
  const [cvForm, setCvForm]             = useState({
    full_name: displayName,
    headline: '',
    phone: '',
    location: '',
    subjects: '',
    hourly_rate: '',
    experience_years: '',
    bio: '',
    teaching_style: '',
    demo_video_url: '',
    teaching_methods: [],
  })
  const [cvSaving, setCvSaving]         = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [cvError, setCvError]           = useState('')

  // Credential add modal
  const [credModal, setCredModal]       = useState(null) // 'education' | 'certificate' | 'experience' | null
  const [credForm, setCredForm]         = useState({ title: '', description: '', proof_url: '' })
  const [credSaving, setCredSaving]     = useState(false)
  const [credError, setCredError]       = useState('')
  const [credToast, setCredToast]       = useState('') // toast thông báo sau khi thêm

  // Availability edit
  const [availEdit, setAvailEdit]       = useState(false)
  const [availData, setAvailData]       = useState({})
  const [availRanges, setAvailRanges]   = useState({})
  const [monthlyAvailRanges, setMonthlyAvailRanges] = useState({})
  const [monthlyAvailData, setMonthlyAvailData] = useState({})
  const [availSaving, setAvailSaving]   = useState(false)
  const [slotDuration, setSlotDuration] = useState(60) // 60 | 120 | 180 phút

  // Instant Learning settings
  const [instantEdit, setInstantEdit]   = useState(false)
  const [instantForm, setInstantForm]   = useState({ price: '', duration: 30, online: false })
  const [instantSaving, setInstantSaving] = useState(false)

  const handleInstantSave = async () => {
    try {
      setInstantSaving(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/tutor/instant-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          instant_price: instantForm.price,
          instant_price_unit: 'VND',
          instant_duration_mins: instantForm.duration,
          availability_status: profile?.availability_status === 'Online' ? 'Online' : 'Offline'
        })
      })
      if (!res.ok) throw new Error('Cập nhật thất bại')
      setProfile(p => ({ ...p, instant_price: instantForm.price, instant_duration: instantForm.duration }))
      setInstantEdit(false)
      alert('Đã cập nhật cài đặt Học Ngay')
    } catch (e) {
      alert(e.message)
    } finally {
      setInstantSaving(false)
    }
  }


  const handleToggleOnlineStatus = async (isOnline) => {
    try {
      const token = localStorage.getItem('token')
      const newStatus = isOnline ? 'Online' : 'Offline'
      const res = await fetch(`${API_BASE}/api/tutor/instant-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          instant_price: profile?.instant_price || '',
          instant_price_unit: 'VND',
          availability_status: newStatus
        })
      })
      if (!res.ok) throw new Error('Cập nhật thất bại')
      setProfile(p => ({ ...p, availability_status: newStatus }))
      setInstantForm(f => ({ ...f, online: isOnline }))
    } catch (e) {
      alert(e.message)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getTutorProfile()
        setProfile(data)
        setBioValue(data.bio_pending || data.bio || '')
        setAvailData(data.availability || {})
        setAvailRanges(data.availability_ranges || {})
        setMonthlyAvailData(data.monthly_availability || {})
        setMonthlyAvailRanges(data.monthly_availability_ranges || {})
        setSlotDuration(Number(data.slot_duration_mins) || 60)
        setAvatarUrl(data.picture || user?.picture || '')
        setCvForm({
          full_name: data.full_name || displayName,
          headline: data.headline || '',
          phone: data.phone || '',
          location: data.location || '',
          subjects: data.subjects || '',
          hourly_rate: data.hourly_rate || '',
          experience_years: data.experience_years || '',
          bio: data.bio || '',
          teaching_style: data.teaching_style || '',
          demo_video_url: data.demo_video_url || '',
          teaching_methods: Array.isArray(data.teaching_methods) ? data.teaching_methods : [],
        })
        setInstantForm({
          price: data.instant_price || '',
          online: data.availability_status === 'Online'
        })
      } catch (e) {
        setProfile({ bio: '', bio_status: 'approved', status: 'draft', credentials: [], availability: {}, monthly_availability: {} })
      } finally {
        setProfileLoading(false)
      }
    }
    load()
  }, [])

  const handleBioSave = async () => {
    setBioSaving(true)
    try {
      await updateTutorBio(bioValue)
      setProfile(p => ({ ...p, bio: bioValue, bio_pending: null, bio_status: 'approved' }))
      setBioEdit(false)
    } catch { /* ignore */ }
    finally { setBioSaving(false) }
  }

  const handleAvatarSave = async () => {
    if (!avatarInput.trim()) return
    setAvatarSaving(true)
    try {
      await updateTutorAvatar(avatarInput.trim())
      setAvatarUrl(avatarInput.trim())
      updateUser({ picture: avatarInput.trim() })
      setAvatarEdit(false)
      setAvatarInput('')
    } catch { /* ignore */ }
    finally { setAvatarSaving(false) }
  }

  const handleAvatarFile = async (file) => {
    if (!file) return
    setAvatarError('')
    setAvatarSaving(true)
    try {
      const url = await uploadAvatarFile(file, user?.id)
      await updateTutorAvatar(url)
      setAvatarUrl(url)
      updateUser({ picture: url })
      setAvatarEdit(false)
    } catch (e) {
      setAvatarError(e.message || 'Upload avatar failed.')
    } finally {
      setAvatarSaving(false)
    }
  }

  const handleVideoFile = async (file) => {
    if (!file) return
    setCvError('')
    setVideoUploading(true)
    try {
      const url = await uploadDemoVideo(file, user?.id)
      setCvForm(f => ({ ...f, demo_video_url: url }))
    } catch (e) {
      setCvError(e.message || 'Upload video failed.')
    } finally {
      setVideoUploading(false)
    }
  }

  const handleCvSave = async () => {
    setCvError('')

    setCvSaving(true)
    try {
      const updated = await updateTutorCv(cvForm)
      setProfile(p => ({ ...p, ...updated }))
      setBioValue(cvForm.bio)
      updateUser({ name: cvForm.full_name })
      setCvEdit(false)
    } catch (e) {
      setCvError(e.message || 'Save CV failed.')
    } finally {
      setCvSaving(false)
    }
  }

  const handleAddCredential = async () => {
    setCredError('')
    if (!credForm.title.trim()) { setCredError('Tiêu đề là bắt buộc.'); return }
    if (credModal !== 'experience' && !credForm.proof_url.trim()) {
      setCredError('Ảnh / File minh chứng là bắt buộc.'); return
    }
    setCredSaving(true)
    try {
      const newCred = await addTutorCredential({
        type: credModal,
        title: credForm.title,
        description: credForm.description,
        proof_url: credForm.proof_url,
      })
      setProfile(p => ({ ...p, credentials: [...(p.credentials || []), newCred] }))
      setCredModal(null)
      setCredForm({ title: '', description: '', proof_url: '' })
      // Hiện toast thông báo chờ duyệt
      const isPending = !newCred.status || newCred.status === 'pending'
      setCredToast(isPending
        ? '✅ Đã gửi! Admin sẽ xét duyệt trong thời gian sớm nhất.'
        : '✅ Đã thêm thành công!'
      )
      setTimeout(() => setCredToast(''), 5000)
    } catch (e) { setCredError(e.message || 'Failed to add.') }
    finally { setCredSaving(false) }
  }

  const handleDeleteCred = async (id, status) => {
    try {
      await deleteTutorCredential(id)
      setProfile(p => ({ ...p, credentials: p.credentials.filter(c => c.id !== id) }))
    } catch { /* ignore */ }
  }

  const toggleSlot = (day, slot) => {
    setAvailData(prev => {
      const current = prev[day] || []
      if (current.includes(slot)) {
        return { ...prev, [day]: current.filter(s => s !== slot) }
      }
      if (isSlotBlocked(slot, current, slotDuration)) return prev
      return { ...prev, [day]: [...current, slot].sort() }
    })
  }

  const toggleMonthlySlot = (day, slot) => {
    setMonthlyAvailData(prev => {
      const current = prev[day] || []
      if (current.includes(slot)) {
        return { ...prev, [day]: current.filter(s => s !== slot) }
      }
      if (isSlotBlocked(slot, current, slotDuration)) return prev
      return { ...prev, [day]: [...current, slot].sort() }
    })
  }

  const handleAvailSave = async () => {
    setAvailSaving(true)
    try {
      const result = await updateTutorAvailability(availData, monthlyAvailData, slotDuration, availRanges, monthlyAvailRanges)
      const updatedProfile = { 
        ...profile, 
        availability: result.availability || availData, 
        monthly_availability: result.monthly_availability || monthlyAvailData, 
        availability_ranges: availRanges,
        monthly_availability_ranges: monthlyAvailRanges,
        slot_duration_mins: slotDuration 
      };
      setProfile(updatedProfile)
      setAvailData(updatedProfile.availability)
      setMonthlyAvailData(updatedProfile.monthly_availability)
      setAvailEdit(false)
    } catch { /* ignore */ }
    finally { setAvailSaving(false) }
  }

  if (profileLoading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
    </div>
  )

  const credentials = profile?.credentials || []
  const education   = credentials.filter(c => c.type === 'education')
  const certs       = credentials.filter(c => c.type === 'certificate')
  const experience  = credentials.filter(c => c.type === 'experience')
  const isVerified  = profile?.status === 'approved'
  const profileStatus = profile?.status || 'draft'
  const approvedAtMs = profile?.approved_at ? new Date(profile.approved_at).getTime() : 0
  const fallbackApprovedAtMs = profile?.updated_at ? new Date(profile.updated_at).getTime() : 0
  const isNewTutor = isVerified && (
    profile?.isNewTutor ||
    profile?.is_new_tutor ||
    (approvedAtMs && approvedAtMs >= Date.now() - 30 * 24 * 60 * 60 * 1000) ||
    (!approvedAtMs && fallbackApprovedAtMs && fallbackApprovedAtMs >= Date.now() - 30 * 24 * 60 * 60 * 1000)
  )
  const isPending = profileStatus === 'pending'
  const isRejected = profileStatus === 'rejected'
  const statusConfig = isVerified
    ? { icon: 'verified_user', title: 'Tài Khoản Đã Xác Thực', box: 'bg-[#f0fdf4] border-[#bbf7d0]', iconColor: 'text-[#16a34a]', titleColor: 'text-[#16a34a]', textColor: 'text-[#166534]', text: 'Hồ sơ đã được admin duyệt. Học sinh và phụ huynh sẽ thấy tick xanh xác thực trên tên gia sư.' }
    : isRejected
      ? { icon: 'cancel', title: 'Hồ Sơ Bị Từ Chối', box: 'bg-red-50 border-red-200', iconColor: 'text-red-600', titleColor: 'text-red-700', textColor: 'text-red-700', text: profile?.reject_reason ? `Lý do: ${profile.reject_reason}` : 'Hồ sơ bị từ chối. Vui lòng chỉnh sửa thông tin và lưu lại.' }
      : isPending
        ? { icon: 'pending', title: 'Đang Chờ Duyệt', box: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-500', titleColor: 'text-amber-700', textColor: 'text-amber-700', text: 'Hồ sơ đang chờ admin duyệt.' }
        : { icon: 'edit_note', title: 'Bản Nháp', box: 'bg-surface-container-low border-outline-variant/40', iconColor: 'text-on-surface-variant', titleColor: 'text-on-surface', textColor: 'text-on-surface-variant', text: 'Đây là bản nháp. Hãy điền đầy đủ thông tin và lưu lại để gửi yêu cầu xét duyệt.' }

  return (
    <div className="space-y-6 pb-10">

      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Hồ Sơ Gia Sư</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Quản lý thông tin hiển thị công khai của bạn.
          </p>
        </div>
        <a href="#/" className="h-10 px-4 border border-outline-variant text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-1.5 bg-white shadow-sm">
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>Xem hồ sơ công khai
        </a>
      </div>

      <div className="bg-gradient-to-br from-[#eef1ff] to-[#eaf3ff] rounded-2xl p-6 border border-primary/10 shadow-sm flex flex-wrap gap-5 items-center">
        <div className="relative flex-shrink-0 group">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-on-primary text-3xl font-bold border-4 border-white shadow-md">
              {initials}
            </div>
          )}
          {isVerified && (
            <span className="material-symbols-outlined icon-fill absolute -bottom-2 -right-2 text-[22px] bg-white rounded-full p-0.5 shadow" style={{ color: '#16a34a' }} title="Đã xác thực bởi EduX">verified</span>
          )}
          <button
            onClick={() => setAvatarEdit(true)}
            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Thay đổi ảnh đại diện"
          >
            <span className="material-symbols-outlined text-white text-[24px]">photo_camera</span>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{displayName}</h3>
            {isNewTutor && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
                Mới
              </span>
            )}
            {isVerified
              ? <span className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#bbf7d0]"><span className="material-symbols-outlined icon-fill text-[13px]">verified</span>Đã xác thực bởi EduX</span>
              : <StatusBadge status={profileStatus} />
            }
          </div>
          <p className="text-[13px] text-on-surface-variant">{user?.email}</p>
        </div>

        <button onClick={() => setAvatarEdit(true)}
          className="h-9 px-4 bg-white border border-outline-variant text-on-surface-variant font-label-sm text-[13px] font-bold rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          Đổi ảnh đại diện
        </button>
      </div>

      {avatarEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Đổi Ảnh Đại Diện</h3>
            <p className="text-[13px] text-on-surface-variant">Tải ảnh từ thiết bị của bạn lên hệ thống EduX.</p>
            <label className="border-2 border-dashed border-outline-variant/60 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="material-symbols-outlined text-[32px] text-primary">upload_file</span>
              <span className="text-[14px] font-semibold text-primary">Nhấp để chọn ảnh</span>
              <span className="text-[11px] text-outline">JPG, PNG, WebP - Tối đa 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                disabled={avatarSaving}
                onChange={e => handleAvatarFile(e.target.files?.[0])}
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="h-px bg-outline-variant/40 flex-1" />
              <span className="text-[11px] text-outline font-semibold tracking-wider uppercase">hoặc dán URL</span>
              <div className="h-px bg-outline-variant/40 flex-1" />
            </div>
            <input
              className="w-full h-11 px-3 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary"
              placeholder="https://example.com/photo.jpg"
              value={avatarInput}
              onChange={e => setAvatarInput(e.target.value)}
            />
            {avatarError && <p className="text-[12px] text-red-600">{avatarError}</p>}
            {avatarInput && (
              <img src={avatarInput} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-outline-variant mx-auto shadow-sm" onError={e => e.target.style.display='none'} />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setAvatarEdit(false); setAvatarInput('') }}
                className="flex-1 h-10 border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-[14px] font-bold hover:bg-surface-container transition-colors">
                Hủy
              </button>
              <button onClick={handleAvatarSave} disabled={avatarSaving || !avatarInput.trim()}
                className="flex-1 h-10 bg-primary text-on-primary rounded-xl font-label-md text-[14px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {avatarSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Thông Tin Chuyên Môn (CV)
                </h4>
                <p className="text-[12px] text-on-surface-variant mt-1">Cập nhật thông tin lý lịch và tải lên video giới thiệu.</p>
              </div>
              {!cvEdit && (
                <button onClick={() => setCvEdit(true)}
                  className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1 bg-white">
                  <span className="material-symbols-outlined text-[15px]">edit</span>Chỉnh sửa CV
                </button>
              )}
            </div>

            {cvError && <p className="mb-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{cvError}</p>}

            {cvEdit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CvInput label="Họ tên" value={cvForm.full_name} onChange={v => setCvForm(f => ({ ...f, full_name: v }))} />
                  <CvInput label="Tiêu đề nghề nghiệp" value={cvForm.headline} onChange={v => setCvForm(f => ({ ...f, headline: v }))} placeholder="VD: Gia sư Toán THPT" />
                  <CvInput label="Số điện thoại" value={cvForm.phone} onChange={v => setCvForm(f => ({ ...f, phone: v }))} />
                  <CvInput label="Khu vực" value={cvForm.location} onChange={v => setCvForm(f => ({ ...f, location: v }))} placeholder="VD: Online / TP. Hồ Chí Minh" />
                  <CvInput label="Môn dạy" value={cvForm.subjects} onChange={v => setCvForm(f => ({ ...f, subjects: v }))} placeholder="VD: Toán học, Vật lý" />
                  <CvInput label="Học phí (VNĐ/giờ)" type="number" value={cvForm.hourly_rate} onChange={v => setCvForm(f => ({ ...f, hourly_rate: v }))} />
                  <CvInput label="Số năm kinh nghiệm" type="number" value={cvForm.experience_years} onChange={v => setCvForm(f => ({ ...f, experience_years: v }))} />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-on-surface mb-2">Hình thức dạy</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { v: 'online',  icon: 'videocam',    label: 'Online' },
                      { v: 'offline', icon: 'location_on', label: 'Offline' },
                      { v: 'both',    icon: 'sync_alt',    label: 'Cả hai' },
                    ].map(opt => {
                      const active = methodChoiceOf(cvForm.teaching_methods) === opt.v
                      return (
                        <button key={opt.v} type="button"
                          onClick={() => setCvForm(f => ({ ...f, teaching_methods: opt.v === 'both' ? ['online', 'offline'] : [opt.v] }))}
                          className={`h-11 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${active ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                          <span className="material-symbols-outlined text-[17px]">{opt.icon}</span>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[12px] text-outline">Học sinh chỉ đặt lịch được theo hình thức bạn chọn. Chọn "Cả hai" để linh hoạt nhất.</p>
                </div>
                <CvTextarea label="Giới thiệu bản thân" rows={4} value={cvForm.bio} onChange={v => setCvForm(f => ({ ...f, bio: v }))} />
                <CvTextarea label="Phong cách giảng dạy" rows={3} value={cvForm.teaching_style} onChange={v => setCvForm(f => ({ ...f, teaching_style: v }))} />
                <div>
                  <label className="block text-[13px] font-bold text-on-surface mb-2">Video demo giảng dạy</label>
                  <label className="border-2 border-dashed border-outline-variant/60 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <span className="material-symbols-outlined text-[36px] text-primary">video_library</span>
                    <span className="text-[14px] font-semibold text-primary">{videoUploading ? 'Đang tải video lên...' : 'Nhấp để tải video lên'}</span>
                    <span className="text-[12px] text-outline">MP4, WebM, MOV - Tối đa 100MB</span>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" disabled={videoUploading} onChange={e => handleVideoFile(e.target.files?.[0])} />
                  </label>
                  <input className="mt-3 w-full h-11 px-3 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" placeholder="Hoặc dán URL video có sẵn" value={cvForm.demo_video_url} onChange={e => setCvForm(f => ({ ...f, demo_video_url: e.target.value }))} />
                  {cvForm.demo_video_url && <video className="mt-3 w-full max-h-64 rounded-xl bg-black" src={cvForm.demo_video_url} controls />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCvEdit(false)} className="h-10 px-5 border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-[14px] font-bold hover:bg-surface-container transition-colors">Hủy</button>
                  <button onClick={handleCvSave} disabled={cvSaving || videoUploading} className="h-10 px-6 bg-primary text-on-primary rounded-xl font-label-md text-[14px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {cvSaving ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon="work" label="Tiêu đề nghề nghiệp" value={profile?.headline} />
                <InfoItem icon="location_on" label="Khu vực" value={profile?.location} />
                <InfoItem icon="menu_book" label="Môn dạy" value={profile?.subjects} />
                <InfoItem icon="payments" label="Học phí" value={profile?.hourly_rate} isCurrency={true} />
                <InfoItem icon="history" label="Kinh nghiệm" value={profile?.experience_years ? `${profile.experience_years} năm` : ''} />
                <InfoItem icon="phone" label="Điện thoại" value={profile?.phone} />
                <InfoItem icon="sync_alt" label="Hình thức dạy" value={METHOD_LABELS[methodChoiceOf(profile?.teaching_methods)] || 'Chưa chọn'} />
                <div className="md:col-span-2"><InfoItem icon="lightbulb" label="Phong cách giảng dạy" value={profile?.teaching_style} /></div>
                {profile?.demo_video_url && <div className="md:col-span-2 mt-2"><p className="font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary">play_circle</span>Video Demo</p><video className="w-full max-h-80 rounded-2xl bg-black border border-outline-variant/30 shadow-md" src={profile.demo_video_url} controls /></div>}
              </div>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Giới Thiệu Bản Thân
              </h4>
              <div className="flex items-center gap-2">
                {!bioEdit && (
                  <button onClick={() => { setBioEdit(true); setBioValue(profile?.bio || '') }}
                    className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1 bg-white">
                    <span className="material-symbols-outlined text-[15px]">edit</span>Chỉnh sửa
                  </button>
                )}
              </div>
            </div>

            {bioEdit ? (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow resize-y leading-relaxed"
                  value={bioValue}
                  onChange={e => setBioValue(e.target.value)}
                  placeholder="Hãy giới thiệu ngắn gọn về bản thân, kinh nghiệm giảng dạy và phương pháp sư phạm của bạn để thu hút học viên..."
                />
                <div className="flex gap-2">
                  <button onClick={() => setBioEdit(false)}
                    className="h-9 px-4 border border-outline-variant text-on-surface-variant font-label-sm rounded-lg hover:bg-surface-container transition-colors font-bold">
                    Hủy
                  </button>
                  <button onClick={handleBioSave} disabled={bioSaving}
                    className="h-9 px-4 bg-primary text-on-primary font-label-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1 font-bold">
                    {bioSaving ? 'Đang lưu...' : <><span className="material-symbols-outlined text-[15px]">check</span>Lưu lại</>}
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {profile?.bio || <span className="italic text-outline">Chưa có lời giới thiệu. Bấm Chỉnh sửa để cập nhật.</span>}
              </p>
            )}
          </div>

          <CredentialSection
            title="Học Vấn & Bằng Cấp"
            icon="school"
            items={education}
            type="education"
            onAdd={() => { setCredModal('education'); setCredForm({ title:'', description:'', proof_url:'' }) }}
            onDelete={handleDeleteCred}
            proofLabel="URL hình ảnh Bằng cấp / Bảng điểm"
          />

          <CredentialSection
            title="Chứng Chỉ Chuyên Môn"
            icon="workspace_premium"
            items={certs}
            type="certificate"
            onAdd={() => { setCredModal('certificate'); setCredForm({ title:'', description:'', proof_url:'' }) }}
            onDelete={handleDeleteCred}
            proofLabel="URL hình ảnh Chứng chỉ"
          />

        </div>

        <div className="space-y-5">
          {/* Instant Learning Settings */}
          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[24px]">bolt</span>
                Cài đặt Học Ngay (Instant Learning)
              </h4>
              {!instantEdit ? (
                <button onClick={() => { setInstantEdit(true); setInstantForm({ ...instantForm, price: profile?.instant_price || '', duration: profile?.instant_duration || 30 }); }}
                  className="h-9 px-4 border border-outline-variant text-on-surface-variant font-label-md text-[13px] rounded-xl hover:bg-surface-container transition-colors flex items-center gap-1.5 flex-shrink-0 bg-white shadow-sm font-bold">
                  <span className="material-symbols-outlined text-[16px]">edit</span>Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setInstantEdit(false); setInstantForm({ ...instantForm, price: profile?.instant_price || '', duration: profile?.instant_duration || 30 }); }}
                    className="h-9 px-4 border border-outline-variant text-on-surface-variant font-label-md text-[13px] rounded-xl hover:bg-surface-container transition-colors font-bold bg-white shadow-sm">
                    Hủy
                  </button>
                  <button onClick={handleInstantSave} disabled={instantSaving}
                    className="h-9 px-5 bg-primary text-on-primary font-label-md text-[13px] rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 font-bold shadow-sm">
                    {instantSaving ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              )}
            </div>

            {instantEdit ? (
              <div className="space-y-5">
                {/* Row: Mức phí + Đơn vị thời gian */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-on-surface">Mức phí Học Ngay</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="h-11 pl-4 pr-12 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full transition-shadow"
                        value={instantForm.price}
                        onChange={(e) => setInstantForm({ ...instantForm, price: e.target.value })}
                        placeholder="VD: 200000"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant font-bold select-none">VNĐ</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-on-surface">Đơn vị thời gian</label>
                    <select
                      className="h-11 px-4 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white transition-shadow cursor-pointer"
                      value={instantForm.duration}
                      onChange={(e) => setInstantForm({ ...instantForm, duration: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 phút</option>
                      <option value={45}>45 phút</option>
                      <option value={60}>60 phút</option>
                      <option value={90}>90 phút</option>
                      <option value={120}>120 phút</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container/40 p-5 flex flex-col items-center">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Học sinh sẽ nhìn thấy</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[24px]">bolt</span>
                    <span className="text-[20px] font-black text-amber-600">
                      {instantForm.price ? Number(instantForm.price).toLocaleString('vi-VN') : '—'} VNĐ
                    </span>
                    <span className="text-[15px] text-on-surface-variant font-bold">
                      / {instantForm.duration} phút
                    </span>
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-[13px] font-bold text-blue-700 flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                    Lưu ý
                  </p>
                  <ul className="space-y-1.5 text-[13px] text-blue-800/80 leading-relaxed pl-1">
                    <li>• Học viên chỉ có thể gửi yêu cầu khi bạn <strong>Online</strong>.</li>
                    <li>• Bạn có <strong>60 giây</strong> để phản hồi yêu cầu.</li>
                    <li>• Khi chấp nhận, trạng thái sẽ tự chuyển sang <strong>Đang Bận (Busy)</strong>.</li>
                    <li>• Sau khi kết thúc, hệ thống tự chuyển về <strong>Online</strong>.</li>
                  </ul>
                </div>
              </div>
            ) : (

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="rounded-xl border border-outline-variant/40 bg-white/60 p-4 shadow-sm hover:bg-white transition-colors">
                  <p className="text-[12px] font-bold text-on-surface-variant mb-2">Giá Học Ngay</p>
                  <p className="font-bold text-amber-600 text-[16px] bg-amber-50 px-3 py-1.5 rounded-lg inline-block border border-amber-200 shadow-sm">
                    {profile?.instant_price ? `${Number(profile.instant_price).toLocaleString('vi-VN')} VNĐ` : <span className="italic text-amber-600/70 font-medium text-[14px]">Chưa cấu hình</span>}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/40 bg-white/60 p-4 shadow-sm hover:bg-white transition-colors flex flex-col gap-2">
                  <p className="text-[12px] font-bold text-on-surface-variant">Trạng thái Nhận Yêu Cầu</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => handleToggleOnlineStatus(profile?.availability_status !== 'Online')}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-inner ${profile?.availability_status === 'Online' ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${profile?.availability_status === 'Online' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`font-bold text-[14px] flex items-center gap-1 ${profile?.availability_status === 'Online' ? 'text-green-600' : profile?.availability_status === 'Busy' ? 'text-amber-600' : 'text-outline'}`}>
                      {profile?.availability_status === 'Online' ? 'Đang Online' : profile?.availability_status === 'Busy' ? 'Đang Bận (Dạy)' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">
                    Học viên có thể gửi yêu cầu học ngay cho bạn bất cứ lúc nào khi trạng thái này được bật.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Lịch Giảng Dạy (Hàng Tuần)
              </h4>
              <button onClick={() => { 
                  setAvailEdit(true); 
                  setAvailRanges(profile?.availability_ranges || {});
                  setMonthlyAvailRanges(profile?.monthly_availability_ranges || {});
                  setSlotDuration(profile?.slot_duration_mins || 60);
                }}
                className="h-8 px-3 border border-outline-variant text-on-surface-variant font-label-sm text-[12px] rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1 bg-white">
                <span className="material-symbols-outlined text-[15px]">edit</span>Chỉnh sửa
              </button>
            </div>

            <div className="space-y-2">
              {/* Badge thời lượng hiện tại */}
              {profile?.slot_duration_mins && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span className="text-[12px] text-on-surface-variant">
                    Mỗi buổi dạy:
                  </span>
                  <span className="text-[12px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full border border-primary/20">
                    {profile.slot_duration_mins === 60 ? '1 tiếng' : profile.slot_duration_mins === 120 ? '2 tiếng' : profile.slot_duration_mins === 180 ? '3 tiếng' : `${profile.slot_duration_mins} phút`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* View: Lẻ */}
                <div>
                  <p className="font-label-md text-[13px] font-bold mb-3 border-b pb-2">Lịch dạy lẻ từng buổi</p>
                  {DAY_ORDER.map(day => {
                    const ranges = (profile?.availability_ranges || {})[day] || []
                    return (
                      <div key={day} className={`mb-2 rounded-xl p-3 border ${ranges.length > 0 ? 'bg-white border-outline-variant/20' : 'bg-surface-container-low/40 border-dashed border-outline-variant/30 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`font-label-md text-[13px] font-bold ${ranges.length > 0 ? 'text-on-surface' : 'text-outline'}`}>{DAY_NAMES_VI[day]}</p>
                          {ranges.length === 0 && <span className="text-[11px] text-outline italic">Trống</span>}
                        </div>
                        {ranges.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1.5">
                            {ranges.map((r, idx) => (
                              <span key={idx} className="text-[12px] font-medium text-primary bg-primary/5 px-2 py-1 rounded-md inline-block w-fit">
                                {r.start} - {r.end}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* View: Tháng */}
                <div>
                  <p className="font-label-md text-[13px] font-bold mb-3 border-b pb-2">Lịch cố định theo gói tháng</p>
                  {DAY_ORDER.map(day => {
                    const ranges = (profile?.monthly_availability_ranges || {})[day] || []
                    return (
                      <div key={day} className={`mb-2 rounded-xl p-3 border ${ranges.length > 0 ? 'bg-white border-outline-variant/20' : 'bg-surface-container-low/40 border-dashed border-outline-variant/30 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`font-label-md text-[13px] font-bold ${ranges.length > 0 ? 'text-on-surface' : 'text-outline'}`}>{DAY_NAMES_VI[day]}</p>
                          {ranges.length === 0 && <span className="text-[11px] text-outline italic">Trống</span>}
                        </div>
                        {ranges.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1.5">
                            {ranges.map((r, idx) => (
                              <span key={idx} className="text-[12px] font-medium text-green-700 bg-green-700/5 px-2 py-1 rounded-md inline-block w-fit">
                                {r.start} - {r.end}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {availEdit && (
              <TutorScheduleEditor 
                availRanges={availRanges}
                setAvailRanges={setAvailRanges}
                monthlyAvailRanges={monthlyAvailRanges}
                setMonthlyAvailRanges={setMonthlyAvailRanges}
                slotDuration={slotDuration}
                setSlotDuration={setSlotDuration}
                onCancel={() => setAvailEdit(false)}
                onSave={handleAvailSave}
                availSaving={availSaving}
              />
            )}
          </div>

          {/* Verification status */}
          <div className={`rounded-2xl p-5 border ${statusConfig.box}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined icon-fill text-[22px] ${statusConfig.iconColor}`}>
                {statusConfig.icon}
              </span>
              <h4 className={`font-label-md font-bold ${statusConfig.titleColor}`}>
                {statusConfig.title}
              </h4>
            </div>
            <p className={`text-[12px] leading-relaxed ${statusConfig.textColor}`}>
              {statusConfig.text}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Add Credential Modal ─── */}

      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
              Thêm Thông Tin
            </h3>

            {credError && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>{credError}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-bold text-on-surface mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-11 px-4 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  placeholder={credModal === 'education' ? 'VD: Cử nhân Toán học - Đại học Sư phạm (2020)' : credModal === 'certificate' ? 'VD: Chứng chỉ IELTS 8.0' : 'VD: Giáo viên dạy Toán tại trường ABC (2019-2023)'}
                  value={credForm.title}
                  onChange={e => setCredForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-on-surface mb-1.5">Mô tả thêm (Tùy chọn)</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow resize-y"
                  placeholder="Thêm thông tin chi tiết..."
                  value={credForm.description}
                  onChange={e => setCredForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {credModal !== 'experience' && (
                <div>
                  <label className="block text-[13px] font-bold text-on-surface mb-1.5">
                    Ảnh / File minh chứng <span className="text-red-500">*</span>
                  </label>
                  <ProofUploader
                    value={credForm.proof_url}
                    onChange={url => setCredForm(f => ({ ...f, proof_url: url }))}
                    folder={credModal === 'education' ? 'education' : 'certificates'}
                    disabled={credSaving}
                  />
                  <p className="mt-2 text-[12px] text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">info</span>
                    Admin sẽ xem ảnh này để xác minh thông tin của bạn.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setCredModal(null); setCredError('') }}
                className="flex-1 h-11 border border-outline-variant text-on-surface-variant font-label-md text-[14px] font-bold rounded-xl hover:bg-surface-container transition-colors">
                Hủy
              </button>
              <button onClick={handleAddCredential} disabled={credSaving}
                className="flex-1 h-11 bg-primary text-on-primary font-label-md text-[14px] font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {credSaving ? 'Đang lưu...' : <><span className="material-symbols-outlined text-[18px]">add_circle</span>Lưu lại</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CvInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-on-surface mb-1">{label}</span>
      <input
        type={type}
        className="w-full h-10 px-3 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function CvTextarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-on-surface mb-1">{label}</span>
      <textarea
        rows={rows}
        className="w-full px-3 py-2 border border-outline-variant rounded-xl text-[14px] text-on-surface outline-none focus:border-primary resize-y"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function InfoItem({ label, value, icon, isCurrency }) {
  const displayValue = value ? (isCurrency ? `${Number(value).toLocaleString('vi-VN')} VNĐ/giờ` : value) : 'Chưa cập nhật';
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-white/60 p-3.5 hover:bg-white transition-colors flex gap-3 items-start shadow-sm group">
      {icon && (
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      )}
      <div className="flex-1">
        <p className="text-[12px] font-bold text-on-surface-variant mb-0.5">{label}</p>
        <p className={`text-[14px] whitespace-pre-wrap leading-relaxed ${!value ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
          {displayValue}
        </p>
      </div>
    </div>
  )
}

// Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬ Credential Section sub-component Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬Ă¢â€â‚¬
function CredentialSection({ title, icon, items, type, onAdd, onDelete, noProof }) {
  const iconMap = { education: 'menu_book', certificate: 'workspace_premium', experience: 'history_edu' }
  const colorMap = { education: '#1d9bf0', certificate: '#16a34a', experience: '#7c3aed' }
  const bgMap   = { education: '#eff6ff', certificate: '#f0fdf4', experience: '#faf5ff' }
  const borderMap = { education: '#bfdbfe', certificate: '#bbf7d0', experience: '#ddd6fe' }

  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-sm rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          {title}
        </h4>
        <button onClick={onAdd}
          className="h-8 px-3 bg-primary text-on-primary font-label-sm text-[12px] rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-sm font-bold">
          <span className="material-symbols-outlined text-[15px]">add</span>Thêm mới
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-outline italic text-center py-4">Chưa có thông tin nào được thêm.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}
              style={{ background: bgMap[type], borderColor: borderMap[type] }}
              className="rounded-xl border p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5"
                style={{ color: colorMap[type] }}>
                {iconMap[type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-label-md text-[14px] text-on-surface font-semibold">{item.title}</p>
                  {item.status === 'pending' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Chờ duyệt</span>
                  )}
                  {item.status === 'rejected' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Bị từ chối</span>
                  )}
                  {item.status === 'approved' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Đã duyệt</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[12px] text-on-surface-variant mt-0.5">{item.description}</p>
                )}
                {item.proof_url && !noProof && (
                  <a href={item.proof_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1 font-bold">
                    <span className="material-symbols-outlined text-[13px]">attachment</span>Xem minh chứng
                  </a>
                )}
              </div>
              <button onClick={() => onDelete(item.id, item.status)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-red-500 hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined text-[17px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Reschedule Request Row Component ───────────────────────────────────────
function RescheduleRequestRow({ request, onAccept, onDecline }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
    return `${Math.floor(diff / 1440)} ngày trước`;
  };

  const studentName = request.student_name_full || request.studentName || 'Học sinh';

  return (
    <div className={`border-b border-gray-100 last:border-0 transition-colors ${expanded ? 'bg-amber-50/40' : 'hover:bg-gray-50/60'}`}>
      {/* ── Collapsed summary row ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
            <span className="material-symbols-outlined text-amber-500 text-[10px]">edit_calendar</span>
          </span>
        </div>

        {/* Summary text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[14px] text-gray-900">{studentName}</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              Xin đổi lịch
            </span>
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">menu_book</span>{request.subject || 'Khác'}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{timeAgo(request.created_at || request.createdAt)}</span>
          </div>
        </div>

        <span className={`material-symbols-outlined text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 flex gap-4 border-t border-gray-100/50">
          <div className="w-10 shrink-0" />
          <div className="flex-1 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">event_busy</span> Lịch cũ
                </p>
                <p className="text-[13px] text-gray-900 font-semibold">{formatDate(request.old_lesson_date || request.oldDate)}</p>
                <p className="text-[13px] text-gray-700">{request.old_time_slot || request.oldTimeSlot}</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">event_available</span> Lịch mới đề xuất
                </p>
                <p className="text-[13px] text-gray-900 font-bold">{formatDate(request.new_lesson_date || request.newDate)}</p>
                <p className="text-[13px] text-gray-700 font-semibold">{request.new_time_slot || request.newTimeSlot}</p>
              </div>
            </div>

            {request.reason && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">chat_bubble</span> Lý do đổi lịch:
                </p>
                <p className="text-[13px] text-gray-700 italic">"{request.reason}"</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={onDecline}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-[13px] hover:bg-red-50 transition-colors"
              >
                Từ chối
              </button>
              <button
                onClick={onAccept}
                className="px-6 py-2 rounded-lg bg-primary text-white font-bold text-[13px] shadow hover:bg-[#1e40af] hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Chấp nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
