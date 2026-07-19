import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { getTutorDetail, getTutorAvailability, createBooking } from '../services/api';
import BookingConfirmationModal from '../components/BookingConfirmationModal';
import { methodSupport, methodLabel, METHOD_OPTIONS } from '../utils/teachingMethod';

const toDateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getVisibleRange = (year, month) => {
  const from = toDateKey(new Date(year, month, 1));
  const to = toDateKey(new Date(year, month + 1, 0));
  return { from, to };
};

function getTutorIdentifiers(tutor = {}) {
  return [
    tutor.id,
    tutor.user_id,
    tutor.userId,
    tutor.tutor_id,
    tutor.tutorId,
    tutor.profile_id,
    tutor.profileId,
    tutor.account_id,
    tutor.accountId,
  ].filter((value) => value !== undefined && value !== null).map(String);
}

function normalizeBookingTutor(tutor = {}, fallbackId = '') {
  const subject = tutor.subject || (Array.isArray(tutor.subjects) ? tutor.subjects[0] : '') || 'General';
  return {
    ...tutor,
    id: tutor.id || tutor.profile_id || tutor.profileId || fallbackId,
    profile_id: tutor.profile_id || tutor.profileId || tutor.id || fallbackId,
    user_id: tutor.user_id || tutor.userId || tutor.account_id || tutor.accountId || tutor.tutor_id || tutor.tutorId || tutor.id || fallbackId,
    tutor_id: tutor.tutor_id || tutor.tutorId || tutor.user_id || tutor.userId || tutor.id || fallbackId,
    name: tutor.name || tutor.full_name || tutor.tutorName || 'Tutor',
    avatar: tutor.avatar || tutor.picture || tutor.tutorAvatar || '',
    rate: tutor.rate ?? tutor.hourly_rate ?? tutor.hourlyRate ?? null,
    subjects: Array.isArray(tutor.subjects) && tutor.subjects.length ? tutor.subjects : [subject],
    availability: tutor.availability || {},
  };
}

function getCachedBookingTutor(tutorId) {
  try {
    const raw = sessionStorage.getItem('edux_last_booking_tutor');
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const ids = getTutorIdentifiers(cached);
    if (!ids.includes(String(tutorId))) return null;
    return normalizeBookingTutor(cached, tutorId);
  } catch {
    return null;
  }
}

function getAvailabilityLookupId(tutor, fallbackId) {
  return tutor.profile_id || tutor.profileId || tutor.user_id || tutor.userId || tutor.id || fallbackId;
}

/**
 * BookingCalendar Page
 * Improved: responsive mobile, today highlight, month transition animation.
 */
export default function BookingCalendar({ tutorId, onGoHome }) {
  const { user } = useAuth();

  const [tutor, setTutor]               = useState(null);
  const [availability, setAvailability] = useState({});
  const [bookedSlots, setBookedSlots]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [selectedDate, setSelectedDate]         = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedBookings, setSelectedBookings] = useState({});
  const [subject, setSubject]                   = useState('');
  const [teachingMethod, setTeachingMethod]     = useState('');
  const [notes, setNotes]                       = useState('');
  const [selectedChild, setSelectedChild]       = useState('');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [slideDir, setSlideDir]         = useState(''); // 'left' | 'right'
  const [animKey, setAnimKey]           = useState(0);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting]             = useState(false);
  const [submitError, setSubmitError]               = useState(null);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  const CHILDREN = [{ id: 1, name: 'Alex Davis' }, { id: 2, name: 'Mia Davis' }];

  // Khôi phục lựa chọn đặt lịch sau khi người dùng đăng nhập xong quay lại (đúng gia sư này).
  useEffect(() => {
    if (!user) return;
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem('edux_pending_booking') || 'null'); } catch { pending = null; }
    if (!pending || String(pending.tutorId) !== String(tutorId)) return;
    sessionStorage.removeItem('edux_pending_booking');
    if (pending.bookingMode) setBookingMode(pending.bookingMode);
    if (pending.selectedBookings) setSelectedBookings(pending.selectedBookings);
    if (pending.subject) setSubject(pending.subject);
    if (pending.teachingMethod) setTeachingMethod(pending.teachingMethod);
    if (pending.notes) setNotes(pending.notes);
    if (typeof pending.currentYear === 'number') setCurrentYear(pending.currentYear);
    if (typeof pending.currentMonth === 'number') setCurrentMonth(pending.currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tutorId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!tutorId) { setError('No Tutor ID provided.'); setLoading(false); return; }
      console.log('Booking tutorId from URL:', tutorId);
      setLoading(true); setError(null);
      try {
        const cachedTutor = getCachedBookingTutor(tutorId);
        let tutorData = null;
        try {
          tutorData = await getTutorDetail(tutorId);
          console.log('Fetched tutor:', tutorData);
        } catch (detailError) {
          console.log('Fetch error:', detailError);
          if (!cachedTutor) throw detailError;
          tutorData = cachedTutor;
          console.log('Fetched tutor from clicked Schedule card:', tutorData);
        }
        tutorData = normalizeBookingTutor(tutorData, tutorId);
        let availData = tutorData.availability || {};
        let bookedData = {};
        try {
          const apiAvailability = await getTutorAvailability(getAvailabilityLookupId(tutorData, tutorId), getVisibleRange(today.getFullYear(), today.getMonth()));
          if (apiAvailability?.availability) {
            availData = apiAvailability.availability;
            bookedData = apiAvailability.bookedSlots || {};
          } else {
            availData = apiAvailability;
          }
        } catch (availabilityError) {
          console.log('Fetch error:', availabilityError);
          console.warn('[BookingCalendar] Availability API failed; using tutor detail availability.', availabilityError);
        }
        if (active) {
          setTutor(tutorData);
          setAvailability(availData);
          setBookedSlots(bookedData);
          if (tutorData.subjects?.length > 0) setSubject(tutorData.subjects[0]);
          if (user?.role === 'parent') setSelectedChild(CHILDREN[0].name);
          // Gia sư chỉ dạy 1 hình thức → tự chọn luôn hình thức đó
          const ms = methodSupport(tutorData.teaching_methods);
          if (ms.online && !ms.offline) setTeachingMethod('online');
          else if (!ms.online && ms.offline) setTeachingMethod('offline');
          setLoading(false);
        }
      } catch (err) {
        console.log('Fetch error:', err);
        if (active) { setError(err.message || 'Failed to load.'); setLoading(false); }
      }
    }
    load();
    return () => { active = false; };
  }, [tutorId, user]);

  useEffect(() => {
    let active = true;
    async function refreshBookedSlots() {
      if (!tutor) return;
      try {
        const data = await getTutorAvailability(getAvailabilityLookupId(tutor, tutorId), getVisibleRange(currentYear, currentMonth));
        if (!active) return;
        if (data?.availability) {
          setAvailability(data.availability);
          setBookedSlots(data.bookedSlots || {});
        }
      } catch (err) {
        console.warn('[BookingCalendar] Failed to refresh booked slots.', err);
      }
    }
    refreshBookedSlots();
    return () => { active = false; };
  }, [tutor, tutorId, currentYear, currentMonth]);

  /* Calendar helpers */
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const DAYS_MAP    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const changeMonth = useCallback((dir) => {
    setSlideDir(dir);
    setAnimKey(k => k + 1);
    if (dir === 'left') {
      setCurrentMonth(m => {
        if (m === 0) { setCurrentYear(y => y - 1); return 11; }
        return m - 1;
      });
    } else {
      setCurrentMonth(m => {
        if (m === 11) { setCurrentYear(y => y + 1); return 0; }
        return m + 1;
      });
    }
    setSelectedDate(null); setSelectedTimeSlot('');
  }, []);

  const getDayStatus = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    if (d < today) return { ok: false };
    const dayName = DAYS_MAP[d.getDay()];
    const slots   = availability[dayName] || [];
    const dateKey = toDateKey(d);
    const bookedForDay = bookedSlots[dateKey] || [];
    const openSlots = slots.filter(slot => !bookedForDay.some(booked => booked.timeSlot === slot));
    return slots.length ? { ok: true, slots, openSlots, bookedForDay, fullyBooked: openSlots.length === 0, dayName } : { ok: false };
  };

  const isToday = (day) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const handleSelectDay = (day) => {
    const s = getDayStatus(day);
    if (s.ok && !s.fullyBooked) {
      const nextDate = new Date(currentYear, currentMonth, day);
      const dateKey = toDateKey(nextDate);
      setSelectedDate(nextDate);
      setSelectedTimeSlot((selectedBookings[dateKey] || [])[0] || '');
    }
  };

  const getSelectedSlots = () => {
    if (!selectedDate) return [];
    return availability[DAYS_MAP[selectedDate.getDay()]] || [];
  };

  const getSlotBooking = (slot) => {
    if (!selectedDate) return null;
    const dateKey = toDateKey(selectedDate);
    return (bookedSlots[dateKey] || []).find(item => item.timeSlot === slot) || null;
  };

  const getSelectedBookingItems = () =>
    Object.entries(selectedBookings)
      .flatMap(([date, slots]) => slots.map(timeSlot => ({ date, timeSlot })))
      .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));

  const isSlotPicked = (slot) => {
    if (!selectedDate) return false;
    return (selectedBookings[toDateKey(selectedDate)] || []).includes(slot);
  };

  const toggleSelectedSlot = (slot) => {
    if (!selectedDate || getSlotBooking(slot)) return;
    const dateKey = toDateKey(selectedDate);
    setSelectedBookings(prev => {
      const current = prev[dateKey] || [];
      const exists = current.includes(slot);
      const nextForDate = exists ? current.filter(item => item !== slot) : [...current, slot].sort();
      const next = { ...prev };
      if (nextForDate.length) next[dateKey] = nextForDate;
      else delete next[dateKey];
      return next;
    });
    setSelectedTimeSlot(prev => prev === slot ? '' : slot);
  };

  /* Booking */
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!user) {
      // Chưa đăng nhập: lưu lại đúng trang đặt lịch + các lựa chọn để đăng nhập xong quay lại y như cũ.
      try {
        sessionStorage.setItem('redirectAfterLogin', `#/booking/${tutorId}`);
        sessionStorage.setItem('edux_pending_booking', JSON.stringify({
          tutorId,
          bookingMode,
          selectedBookings,
          subject,
          teachingMethod,
          notes,
          currentYear,
          currentMonth,
        }));
      } catch { /* sessionStorage không khả dụng */ }
      window.location.hash = '/signin';
      return;
    }
    if (getSelectedBookingItems().length === 0) { alert('Please select at least one date and time slot.'); return; }
    setIsConfirmModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsConfirmModalOpen(false);
    setSubmitError(null);
    if (bookingSuccessData) {
      setBookingSuccessData(null);
      setSelectedBookings({});
      setSelectedTimeSlot('');
    }
  };

  const handleConfirmBooking = async () => {
    // ── Frontend validation ───────────────────────────────────────────────
    if (!tutor) {
      setSubmitError('Không tìm thấy thông tin gia sư. Vui lòng thử lại.');
      return;
    }
    const sessions = getSelectedBookingItems().filter(session => {
      const bookedForDay = bookedSlots[session.date] || [];
      return !bookedForDay.some(booked => booked.timeSlot === session.timeSlot);
    });
    if (sessions.length === 0) {
      setSubmitError('All selected slots have already been booked. Please choose another slot.');
      return;
    }

    const tutorIdToSend = tutor.user_id || tutor.tutor_id || tutor.id;
    if (!tutorIdToSend) {
      setSubmitError('Không xác định được ID gia sư. Vui lòng tải lại trang.');
      return;
    }

    // Gia sư dạy cả 2 hình thức → bắt buộc học sinh chọn 1
    const ms = methodSupport(tutor.teaching_methods);
    if (ms.online && ms.offline && !teachingMethod) {
      setSubmitError('Vui lòng chọn hình thức học (Online hoặc Offline).');
      return;
    }

    // ── Build payload (matches backend: tutor_id, lesson_date, time_slot) ─
    const bookingPayload = {
      tutorId:   String(tutorIdToSend),
      tutorName: tutor.name || tutor.full_name || null,
      sessions:  sessions.map(s => ({ date: s.date, timeSlot: s.timeSlot })),
      subject:   subject || (tutor.subjects?.[0] ?? null),
      notes:     notes || null,
      teachingMethod: teachingMethod || null,
    };

    console.log('[BookingCalendar] handleConfirmBooking payload:', JSON.stringify(bookingPayload, null, 2));

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking(bookingPayload);
      console.log('[BookingCalendar] Booking success result:', result);
      const createdBookings = result.bookings || [result];
      setBookedSlots(prev => {
        const next = { ...prev };
        for (const booking of createdBookings) {
          const dateKey = String(booking.lesson_date || booking.date || '').slice(0, 10);
          if (dateKey) {
            next[dateKey] = [
              ...(next[dateKey] || []),
              { timeSlot: booking.time_slot || booking.timeSlot, status: booking.status || 'Pending' },
            ];
          }
        }
        return next;
      });
      setBookingSuccessData(result);
    } catch (err) {
      console.error('[BookingCalendar] Booking error:', err);
      setSubmitError(err.message || 'Failed to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    setIsConfirmModalOpen(false);
    setSelectedBookings({});
    setSelectedTimeSlot('');
    setBookingSuccessData(null);
    // Students go to booking history; tutors/parents go to their dashboards
    if (user?.role === 'parent')      window.location.hash = '/parent';
    else if (user?.role === 'tutor')  window.location.hash = '/tutor';
    else                              window.location.hash = '/dashboard';
  };

  /* Loading / Error */
  if (loading) return (
    <div style={S.page}>
      <CalHeader tutor={null} onBack={onGoHome} />
      <div style={S.center}>
        <div style={S.spinner} />
        <p style={{ color: 'var(--on-surface-variant)', marginTop: 16 }}>Loading availability...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={S.page}>
      <CalHeader tutor={null} onBack={onGoHome} />
      <div style={S.center}>
        <div style={S.errorCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#dc2626' }}>error_outline</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', margin: 0 }}>Tutor calendar unavailable</h2>
          <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{error}</p>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={onGoHome} style={{ ...S.backBtn, flex: 1, justifyContent: 'center', height: 44 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Back
            </button>
            <button onClick={() => window.location.reload()} style={{ ...S.btnPrimary, flex: 1 }}>Retry</button>
          </div>
        </div>
      </div>
    </div>
  );

  /* Build calendar cells */
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDay(currentYear, currentMonth);
  const selectedBookingItems = getSelectedBookingItems();
  const selectedBookingCount = selectedBookingItems.length;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const status  = getDayStatus(d);
    const dateKey = toDateKey(new Date(currentYear, currentMonth, d));
    const pickedCount = (selectedBookings[dateKey] || []).length;
    const isSel   = selectedDate &&
      selectedDate.getDate() === d &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear;
    const todayDay = isToday(d);

    let cellStyle = { ...S.calCell };
    if (isSel)          cellStyle = { ...S.calCell, ...S.calCellSelected };
    else if (pickedCount > 0) cellStyle = { ...S.calCell, ...S.calCellPicked };
    else if (status.ok && status.fullyBooked) cellStyle = { ...S.calCell, ...S.calCellBooked };
    else if (status.ok) cellStyle = { ...S.calCell, ...S.calCellAvail,
      ...(todayDay ? S.calCellToday : {}) };
    else                cellStyle = { ...S.calCell, ...S.calCellDisabled };

    cells.push(
      <button key={`d-${d}`} type="button"
        disabled={!status.ok || status.fullyBooked}
        onClick={() => handleSelectDay(d)}
        style={cellStyle}
        aria-label={`${d} ${MONTH_NAMES[currentMonth]}`}
        aria-pressed={!!isSel}
      >
        {todayDay && !isSel && <span style={S.todayRing} />}
        {d}
        {pickedCount > 0 && !isSel && <span style={S.pickedBadge}>{pickedCount}</span>}
        {status.ok && !isSel && <span style={status.fullyBooked ? S.bookedDot : S.dot} />}
      </button>
    );
  }

  const selectedSlots = getSelectedSlots();
  const canSubmit = selectedBookingCount > 0;

  return (
    <div style={S.page}>
      <CalHeader
        tutor={tutor}
        onBack={() => tutor ? (window.location.hash = `/tutor-profile/${tutor.id}`) : onGoHome()}
      />

      <main style={S.main}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 6 }}>
            Book a Session
          </h1>
          <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>
            Select a date and available time slot to schedule with{' '}
            <strong>{tutor?.name}</strong>.
          </p>
        </div>

        <form onSubmit={handleOpenConfirm} style={S.formGrid} className="cal-form-grid">

          {/* LEFT: Calendar + Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Calendar card */}
            <div style={S.card}>
              {/* Month nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={S.cardTitle}>
                  <span className="material-symbols-outlined" style={S.cardIcon}>calendar_today</span>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => changeMonth('left')} style={S.navBtn} aria-label="Previous month">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button type="button" onClick={() => changeMonth('right')} style={S.navBtn} aria-label="Next month">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Day labels */}
              <div style={S.calHeader}>
                {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                  <div key={d} style={S.calHeaderCell}>{d}</div>
                ))}
              </div>

              {/* Grid with slide animation */}
              <div
                key={animKey}
                style={{
                  ...S.calGrid,
                  animation: `calSlide${slideDir === 'left' ? 'Left' : 'Right'} 0.22s ease`,
                }}
              >
                {cells}
              </div>

              {/* Legend */}
              <div style={S.legend}>
                <span style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: '#fff', border: '2px solid var(--primary)', boxSizing: 'border-box' }} />
                  Today
                </span>
                <span style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: '#fff', border: '1px solid rgba(196,197,213,0.4)' }} />
                  Available
                </span>
                <span style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: 'var(--primary)' }} />
                  Selected
                </span>
                <span style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: '#e5e7eb' }} />
                  Unavailable
                </span>
                <span style={S.legendItem}>
                  <span style={{ ...S.legendDot, background: '#fee2e2', border: '1px solid #fecaca' }} />
                  Booked
                </span>
              </div>
            </div>

            {/* Time Slot Picker */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <span className="material-symbols-outlined" style={S.cardIcon}>schedule</span>
                {selectedDate
                  ? `Slots - ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
                  : 'Select a Date First'}
              </h3>
              {selectedSlots.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedSlots.map(slot => {
                    const booked = getSlotBooking(slot);
                    const picked = isSlotPicked(slot);
                    return (
                      <button key={slot} type="button"
                        disabled={!!booked}
                        onClick={() => toggleSelectedSlot(slot)}
                        style={booked ? S.slotBtnBooked : picked ? S.slotBtnSelected : S.slotBtn}
                        title={booked ? `Already booked (${booked.status})` : 'Available'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {booked ? 'event_busy' : 'schedule'}
                        </span>
                        {slot}
                        {booked && <span style={S.slotStatus}>{booked.status}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--outline)', fontStyle: 'italic' }}>
                  {selectedDate ? 'No slots available on this day.' : 'Pick an available day above.'}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Booking Form */}
          <div>
            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <span className="material-symbols-outlined" style={S.cardIcon}>edit_note</span>
                Booking Information
              </h3>

              {/* Summary box */}
              <div style={S.summaryBox}>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>calendar_today</span>
                    Date
                  </span>
                  <span style={S.summaryValue}>
                    {selectedBookingCount
                      ? `${selectedBookingCount} session${selectedBookingCount > 1 ? 's' : ''} selected`
                      : '-'}
                  </span>
                </div>
                <div style={S.summaryRow}>
                  <span style={S.summaryLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>schedule</span>
                    Time
                  </span>
                  <span style={S.summaryValue}>
                    {selectedBookingItems.slice(0, 2).map(item => `${item.date} ${item.timeSlot}`).join(', ') || '-'}
                    {selectedBookingCount > 2 ? ` +${selectedBookingCount - 2} more` : ''}
                  </span>
                </div>
              </div>

              {/* Child selector - parent only */}
              {user?.role === 'parent' && (
                <div style={S.formGroup}>
                  <label htmlFor="child-select" style={S.label}>Select Student (Child)</label>
                  <div style={{ position: 'relative' }}>
                    <select id="child-select" value={selectedChild}
                      onChange={e => setSelectedChild(e.target.value)} style={S.select}>
                      {CHILDREN.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <span className="material-symbols-outlined" style={S.selectArrow}>expand_more</span>
                  </div>
                </div>
              )}

              {/* Subject */}
              {tutor?.subjects?.length > 0 && (
                <div style={S.formGroup}>
                  <label htmlFor="subject-select" style={S.label}>Subject</label>
                  <div style={{ position: 'relative' }}>
                    <select id="subject-select" value={subject}
                      onChange={e => setSubject(e.target.value)} style={S.select}>
                      {tutor.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="material-symbols-outlined" style={S.selectArrow}>expand_more</span>
                  </div>
                </div>
              )}

              {/* Hình thức học (online / offline) */}
              {(() => {
                const ms = methodSupport(tutor?.teaching_methods);
                const both = ms.online && ms.offline;
                const single = !both ? (ms.online ? 'online' : 'offline') : null;
                const hint = METHOD_OPTIONS.find(o => o.value === (teachingMethod || single))?.hint;
                return (
                  <div style={S.formGroup}>
                    <label style={S.label}>Hình thức học</label>
                    {both ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {METHOD_OPTIONS.map(opt => {
                          const active = teachingMethod === opt.value;
                          return (
                            <button key={opt.value} type="button"
                              onClick={() => setTeachingMethod(opt.value)}
                              style={{
                                height: 42, borderRadius: 12, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                fontSize: 13, fontWeight: 600,
                                border: active ? '2px solid var(--primary, #00288e)' : '1px solid #d6d9e0',
                                background: active ? 'rgba(0,40,142,0.06)' : '#fff',
                                color: active ? 'var(--primary, #00288e)' : '#5d5f6f',
                                transition: 'all .15s',
                              }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{opt.icon}</span>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0 12px', border: '1px solid #d6d9e0', background: '#f6f7fb',
                        fontSize: 13, fontWeight: 600, color: '#3a3d4d',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--primary, #00288e)' }}>
                          {single === 'online' ? 'videocam' : 'location_on'}
                        </span>
                        {methodLabel(single)} — gia sư chỉ dạy hình thức này
                      </div>
                    )}
                    {hint && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8a8ca0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                        {hint}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Notes */}
              <div style={S.formGroup}>
                <label htmlFor="booking-notes" style={S.label}>Topics / Notes</label>
                <textarea id="booking-notes" rows={4} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Tell the tutor what you'd like to focus on..."
                  style={S.textarea}
                />
              </div>

              {/* Progress indicator */}
              <div style={S.progressWrap}>
                <div style={{ ...S.progressStep, ...(selectedDate ? S.progressStepDone : {}) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {selectedDate ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  Date
                </div>
                <div style={S.progressLine} />
                <div style={{ ...S.progressStep, ...(selectedTimeSlot ? S.progressStepDone : {}) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {selectedTimeSlot ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  Time
                </div>
                <div style={S.progressLine} />
                <div style={{ ...S.progressStep, ...(canSubmit ? S.progressStepDone : {}) }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {canSubmit ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  Ready
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={!canSubmit}
                style={canSubmit ? S.btnPrimary : S.btnDisabled}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>assignment_turned_in</span>
                {user
                  ? selectedBookingCount
                    ? `Confirm ${selectedBookingCount} Booking Request${selectedBookingCount > 1 ? 's' : ''}`
                    : 'Confirm Booking Request'
                  : 'Sign in to Book'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {tutor && (
        <BookingConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={handleCloseModal}
          tutor={tutor}
          date={selectedBookingItems[0]?.date || null}
          timeSlot={selectedBookingItems.length === 1 ? selectedBookingItems[0].timeSlot : `${selectedBookingCount} sessions selected`}
          sessions={selectedBookingItems}
          subject={subject}
          notes={notes}
          teachingMethod={teachingMethod}
          childName={user?.role === 'parent' ? selectedChild : null}
          isSubmitting={isSubmitting}
          submitError={submitError}
          bookingSuccessData={bookingSuccessData}
          onConfirm={handleConfirmBooking}
          onGoToDashboard={handleGoToDashboard}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes calSlideLeft {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes calSlideRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .cal-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* Header sub-component */
function CalHeader({ tutor, onBack }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#/" className="brand">
          <span className="material-symbols-outlined icon-fill">school</span>
          <span className="brand-name">EduX</span>
        </a>
        {tutor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={tutor.avatar} alt={tutor.name}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{tutor.name}</span>
          </div>
        )}
        <button type="button" onClick={onBack} style={S.backBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>
      </div>
    </header>
  );
}

/* Styles */
const S = {
  page:    { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' },
  main:    { flex: 1, padding: '32px 16px 60px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  center:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 },
  spinner: { width: 48, height: 48, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' },
  errorCard: { background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)', gap: 20, alignItems: 'start' },
  card:    { background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '22px 24px', border: '1px solid rgba(196,197,213,0.25)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: 'fadeIn 0.3s ease' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 14 },
  cardIcon:  { color: 'var(--primary)', fontSize: 20 },
  /* Calendar */
  calHeader:     { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 },
  calHeaderCell: { textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.06em', padding: '3px 0' },
  calGrid:       { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 },
  calCell:       { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', border: 'none', cursor: 'default', position: 'relative', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s' },
  calCellAvail:  { background: '#fff', color: 'var(--on-surface)', border: '1px solid rgba(196,197,213,0.3)', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', fontWeight: 500 },
  calCellToday:  { border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 700, background: 'rgba(0,40,142,0.04)' },
  calCellSelected: { background: 'var(--primary)', color: '#fff', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,40,142,0.3)', transform: 'scale(1.06)', cursor: 'pointer', border: 'none' },
  calCellPicked: { background: 'rgba(0,40,142,0.08)', color: 'var(--primary)', border: '1px solid rgba(0,40,142,0.25)', cursor: 'pointer', fontWeight: 700 },
  calCellBooked: { background: '#f9fafb', color: '#9ca3af', border: '1px dashed #d1d5db', cursor: 'pointer', opacity: 0.75 },
  calCellDisabled: { background: 'rgba(229,231,235,0.35)', color: '#c4c4c4', opacity: 0.6 },
  todayRing: { position: 'absolute', inset: -2, borderRadius: 11, border: '2px solid var(--primary)', pointerEvents: 'none' },
  pickedBadge: { position: 'absolute', top: 3, right: 4, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: '15px' },
  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,40,142,0.4)' },
  bookedDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: '#ef4444' },
  legend:     { display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid rgba(196,197,213,0.2)', fontSize: 11, color: 'var(--on-surface-variant)' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5 },
  legendDot:  { width: 11, height: 11, borderRadius: 3, display: 'inline-block', flexShrink: 0 },
  /* Slots */
  slotBtn:         { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#fff', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,197,213,0.4)', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  slotBtnSelected: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(0,40,142,0.25)' },
  slotBtnBooked:   { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#f3f4f6', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.75 },
  slotStatus:      { marginLeft: 4, fontSize: 10, fontWeight: 700, color: '#ef4444' },
  navBtn: { width: 36, height: 36, borderRadius: 9, border: '1px solid rgba(196,197,213,0.5)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontFamily: 'inherit', transition: 'background 0.15s' },
  /* Form */
  summaryBox:   { background: 'rgba(0,40,142,0.04)', border: '1px solid rgba(0,40,142,0.1)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 },
  summaryRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  summaryLabel: { fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center' },
  summaryValue: { fontSize: 13, fontWeight: 600, color: 'var(--primary)', textAlign: 'right' },
  formGroup:    { marginBottom: 16 },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 5 },
  select:       { width: '100%', height: 42, padding: '0 38px 0 12px', background: '#fff', border: '1px solid rgba(196,197,213,0.5)', borderRadius: 11, fontSize: 13, color: 'var(--on-surface)', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer', outline: 'none' },
  selectArrow:  { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', pointerEvents: 'none', fontSize: 19 },
  textarea:     { width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid rgba(196,197,213,0.5)', borderRadius: 11, fontSize: 13, color: 'var(--on-surface)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 },
  /* Progress steps */
  progressWrap:    { display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18 },
  progressStep:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: '#c4c4c4', flex: '0 0 auto' },
  progressStepDone:{ color: 'var(--primary)' },
  progressLine:    { flex: 1, height: 2, background: 'rgba(196,197,213,0.4)', margin: '0 4px', marginBottom: 12 },
  /* Buttons */
  btnPrimary:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 46, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  btnDisabled: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 46, background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit' },
  backBtn:     { display: 'flex', alignItems: 'center', gap: 5, height: 38, padding: '0 14px', background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,197,213,0.5)', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
};
