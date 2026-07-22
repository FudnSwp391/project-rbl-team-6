import React from 'react';

/**
 * BookingConfirmationModal component
 * Handles the booking workflow: confirmation review -> loading state -> success/error states.
 */
export default function BookingConfirmationModal({
  isOpen,
  onClose,
  tutor,
  date,
  timeSlot,
  sessions = [],
  subject,
  notes,
  childName,
  teachingMethod,
  isSubmitting,
  submitError,
  bookingSuccessData,
  onConfirm,
  onGoToDashboard,
  topupInfo,
  isTopupLoading,
  onTopUp
}) {
  if (!isOpen) return null;
  const sessionItems = sessions.length ? sessions : (date && timeSlot ? [{ date, timeSlot }] : []);
  const hasMultipleSessions = sessionItems.length > 1;

  // Giống fmtPrice ở FindTutors/AIChatWidget: >=1000 hiểu là VND, ngược lại là USD
  const formatRate = (v) => {
    const n = Number(v);
    if (!v || Number.isNaN(n) || n <= 0) return 'Thỏa thuận';
    return n >= 1000
      ? `${new Intl.NumberFormat('vi-VN').format(n)}đ/giờ`
      : `$${n}/hour`;
  };

  // Formatting date string nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('vi-VN', options);
    } catch {
      return dateStr;
    }
  };

  const translateDay = (day) => {
    const map = {
      'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
      'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7', 'Sunday': 'Chủ nhật'
    };
    return map[day] || day;
  };

  const summarizeSessions = (sessions) => {
    if (sessions.length <= 4) return null;
    const grouped = {};
    sessions.forEach(s => {
      let day = '';
      try {
        const d = new Date(s.date);
        day = d.toLocaleDateString('en-US', { weekday: 'long' });
      } catch {
        day = 'Unknown';
      }
      const key = `${day}-${s.timeSlot}`;
      if (!grouped[key]) grouped[key] = { day, time: s.timeSlot, count: 0 };
      grouped[key].count++;
    });
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return Object.values(grouped).sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));
  };
  
  const sessionSummary = summarizeSessions(sessionItems);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={bookingSuccessData ? onClose : undefined} // Only allow closing click outside when success/finished
      />
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-[#2e3132] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-10 transform transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button (only when not submitting) */}
        {!isSubmitting && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}

        {/* ── SUCCESS STATE ── */}
        {bookingSuccessData ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-[#dcfce7] text-[#16a34a] rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="material-symbols-outlined text-[48px] animate-bounce">check_circle</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Đặt Lịch Thành Công!</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                {hasMultipleSessions
                  ? `${sessionItems.length} yêu cầu đặt lịch đã được gửi thành công. Gia sư sẽ sớm xem xét và xác nhận.`
                  : 'Yêu cầu đặt lịch của bạn đã được gửi thành công. Gia sư sẽ sớm xem xét và xác nhận.'}
              </p>
            </div>

            {/* Ticket Summary */}
            <div className="border border-outline-variant/30 rounded-2xl bg-surface-container-lowest/80 p-5 text-left space-y-3 relative shadow-inner overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#16a34a]" />
              <div className="flex items-center gap-3">
                <img 
                  src={tutor.avatar} 
                  alt={tutor.name} 
                  className="w-12 h-12 rounded-full object-cover border border-outline-variant/30"
                />
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface">{tutor.name}</h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{subject}</p>
                </div>
              </div>
              
              <div className="h-px bg-outline-variant/20 my-2" />
              
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
                <div>
                  <span className="text-on-surface-variant block font-medium">Ngày</span>
                  <span className="text-on-surface font-semibold">
                    {hasMultipleSessions ? `${sessionItems.length} buổi học` : formatDate(date)}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-medium">Khung giờ</span>
                  <span className="text-on-surface font-semibold">
                    {hasMultipleSessions ? 'Nhiều khung giờ' : timeSlot}
                  </span>
                </div>
                {hasMultipleSessions && (
                  <div className="col-span-2 space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    {sessionSummary ? (
                      sessionSummary.map((grp, i) => (
                        <div key={i} className="flex justify-between rounded-lg bg-surface-container-low px-3 py-2 border border-outline-variant/10">
                          <span className="text-on-surface-variant font-medium">Mỗi {translateDay(grp.day)} hàng tuần</span>
                          <span className="text-on-surface font-bold text-primary">{grp.time}</span>
                        </div>
                      ))
                    ) : (
                      sessionItems.map((session) => (
                        <div key={`${session.date}-${session.timeSlot}`} className="flex justify-between rounded-lg bg-surface-container-low px-3 py-2">
                          <span className="text-on-surface-variant">{formatDate(session.date)}</span>
                          <span className="text-on-surface font-semibold">{session.timeSlot}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {childName && (
                  <div className="col-span-2">
                    <span className="text-on-surface-variant block font-medium">Học viên</span>
                    <span className="text-on-surface font-semibold">{childName}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-on-surface-variant block font-medium">Học phí</span>
                  <span className="text-primary font-bold">{formatRate(tutor.rate)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={onGoToDashboard}
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Xem Lịch Học Của Tôi
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 bg-transparent text-on-surface-variant hover:text-primary font-label-md text-label-md rounded-xl hover:bg-surface-container transition-colors"
              >
                Đặt Buổi Học Khác
              </button>
            </div>
          </div>
        ) : (
          /* ── PRE-SUBMISSION / SUBMITTING / ERROR STATES ── */
          <div className="p-8">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">lock_reset</span>
              Xác Nhận Thông Tin Đặt Lịch
            </h3>

            {isSubmitting ? (
              /* Submitting Loader */
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <p className="font-label-md text-label-md text-on-surface">Đang gửi yêu cầu đặt lịch...</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant/70">Đang kết nối tới máy chủ, vui lòng đợi trong giây lát</p>
              </div>
            ) : (
              /* Review Content */
              <div className="space-y-5">
                
                {submitError && !topupInfo && (
                  <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-error font-label-sm text-label-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                    <div>
                      <p className="font-bold">Đặt Lịch Thất Bại</p>
                      <p className="mt-0.5 opacity-90">{submitError}</p>
                    </div>
                  </div>
                )}

                {topupInfo && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-xl space-y-3">
                    <div className="flex items-start gap-2 text-error font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[20px] shrink-0">account_balance_wallet</span>
                      <div>
                        <p className="font-bold">Số dư ví không đủ</p>
                        <p className="mt-0.5 opacity-90">Vui lòng nạp thêm tiền để tiếp tục đặt lịch.</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-[13px] text-on-surface-variant">
                      <span>Cần nạp thêm:</span>
                      <span className="font-bold text-error">{topupInfo.missing.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <button
                      type="button"
                      onClick={onTopUp}
                      disabled={isTopupLoading}
                      className="w-full h-11 bg-[#00288e] text-white font-label-md text-label-md rounded-xl hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                      {isTopupLoading ? 'Đang chuyển đến VNPAY...' : `Nạp ${topupInfo.missing.toLocaleString('vi-VN')}đ qua VNPAY`}
                    </button>
                    <p className="text-[11px] text-on-surface-variant/80 text-center">Lựa chọn buổi học của bạn sẽ được giữ lại sau khi nạp tiền.</p>
                  </div>
                )}

                {/* Booking summary cards */}
                <div className="bg-surface-container-low/60 border border-outline-variant/20 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img 
                      src={tutor.avatar} 
                      alt={tutor.name} 
                      className="w-12 h-12 rounded-full object-cover border border-outline-variant/30"
                    />
                    <div>
                      <h4 className="font-label-md text-label-md text-on-surface">{tutor.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[11px] font-bold border border-primary/10">
                        {subject}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-outline-variant/20" />

                  <div className="space-y-2.5 font-label-md text-label-md">
                    <div className="flex justify-between items-start">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        Ngày:
                      </span>
                      <span className="text-on-surface font-semibold text-right max-w-[240px]">
                        {hasMultipleSessions ? `Đã chọn ${sessionItems.length} buổi` : formatDate(date)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        Giờ:
                      </span>
                      <span className="text-on-surface font-semibold">
                        {hasMultipleSessions ? 'Xem danh sách bên dưới' : timeSlot}
                      </span>
                    </div>

                    {hasMultipleSessions && (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {sessionSummary ? (
                          sessionSummary.map((grp, i) => (
                            <div key={i} className="flex justify-between rounded-lg bg-white/70 px-3 py-2 border border-outline-variant/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                                Mỗi {translateDay(grp.day)} hàng tuần
                              </span>
                              <span className="text-on-surface font-bold text-primary">{grp.time}</span>
                            </div>
                          ))
                        ) : (
                          sessionItems.map((session) => (
                            <div key={`${session.date}-${session.timeSlot}`} className="flex justify-between rounded-lg bg-white/70 px-3 py-2 border border-outline-variant/10">
                              <span className="text-on-surface-variant">{formatDate(session.date)}</span>
                              <span className="text-on-surface font-semibold">{session.timeSlot}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {childName && (
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">person</span>
                          Học viên (Con):
                        </span>
                        <span className="text-on-surface font-semibold">
                          {childName}
                        </span>
                      </div>
                    )}

                    {teachingMethod && (
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">
                            {teachingMethod === 'online' ? 'videocam' : 'location_on'}
                          </span>
                          Hình thức:
                        </span>
                        <span className="text-on-surface font-semibold">
                          {teachingMethod === 'online' ? 'Online' : 'Offline (trực tiếp)'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">Học phí mỗi buổi:</span>
                      <span className="text-primary text-lg font-bold">{formatRate(tutor.rate)}</span>
                    </div>
                  </div>
                </div>

                {teachingMethod && (
                  <p className="text-[12px] text-on-surface-variant/80 flex items-start gap-1.5 px-1">
                    <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
                    {teachingMethod === 'online'
                      ? 'Buổi học Online: gia sư sẽ gửi link phòng học (Meet/Zoom) trước giờ học — bạn sẽ thấy trong Lịch học.'
                      : 'Buổi học Offline: địa điểm học sẽ được trao đổi qua ghi chú bên dưới hoặc tin nhắn với gia sư.'}
                  </p>
                )}

                {/* Optional description notes summary */}
                {notes && (
                  <div className="space-y-1.5">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Ghi chú / Nội dung muốn học:</span>
                    <p className="p-3 bg-surface-container-low/40 rounded-xl text-on-surface-variant font-body-md text-[14px] leading-relaxed italic border border-outline-variant/10">
                      "{notes}"
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-12 border border-outline-variant/50 text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container transition-colors"
                  >
                    Hủy
                  </button>
                  {!topupInfo && (
                    <button
                      type="button"
                      onClick={onConfirm}
                      className="flex-1 h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      Xác Nhận Đặt Lịch
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
