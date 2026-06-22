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
  isSubmitting,
  submitError,
  bookingSuccessData,
  onConfirm,
  onGoToDashboard
}) {
  if (!isOpen) return null;
  const sessionItems = sessions.length ? sessions : (date && timeSlot ? [{ date, timeSlot }] : []);
  const hasMultipleSessions = sessionItems.length > 1;

  // Formatting date string nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={bookingSuccessData ? onClose : undefined} // Only allow closing click outside when success/finished
      />
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-[#2e3132] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] max-w-lg w-full overflow-hidden relative z-10 transform transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
        
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
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Booking Confirmed!</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                {hasMultipleSessions
                  ? `${sessionItems.length} booking requests have been sent successfully. The tutor will review them shortly.`
                  : 'Your booking request has been sent successfully. The tutor will review your request shortly.'}
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
                  <span className="text-on-surface-variant block font-medium">Date</span>
                  <span className="text-on-surface font-semibold">
                    {hasMultipleSessions ? `${sessionItems.length} sessions` : formatDate(date)}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-medium">Time Slot</span>
                  <span className="text-on-surface font-semibold">
                    {hasMultipleSessions ? 'Multiple times' : timeSlot}
                  </span>
                </div>
                {hasMultipleSessions && (
                  <div className="col-span-2 space-y-1">
                    {sessionItems.map((session) => (
                      <div key={`${session.date}-${session.timeSlot}`} className="flex justify-between rounded-lg bg-surface-container-low px-3 py-2">
                        <span className="text-on-surface-variant">{formatDate(session.date)}</span>
                        <span className="text-on-surface font-semibold">{session.timeSlot}</span>
                      </div>
                    ))}
                  </div>
                )}
                {childName && (
                  <div className="col-span-2">
                    <span className="text-on-surface-variant block font-medium">Student</span>
                    <span className="text-on-surface font-semibold">{childName}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-on-surface-variant block font-medium">Rate</span>
                  <span className="text-primary font-bold">${tutor.rate}/hour</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button 
                onClick={onGoToDashboard}
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Go to My Schedule
              </button>
              <button 
                onClick={onClose}
                className="w-full h-12 bg-transparent text-on-surface-variant hover:text-primary font-label-md text-label-md rounded-xl hover:bg-surface-container transition-colors"
              >
                Book Another Session
              </button>
            </div>
          </div>
        ) : (
          /* ── PRE-SUBMISSION / SUBMITTING / ERROR STATES ── */
          <div className="p-8">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">lock_reset</span>
              Confirm Booking Details
            </h3>

            {isSubmitting ? (
              /* Submitting Loader */
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <p className="font-label-md text-label-md text-on-surface">Sending booking request to backend...</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant/70">Connecting to API server at localhost:5000</p>
              </div>
            ) : (
              /* Review Content */
              <div className="space-y-5">
                
                {submitError && (
                  <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-error font-label-sm text-label-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                    <div>
                      <p className="font-bold">Booking Request Failed</p>
                      <p className="mt-0.5 opacity-90">{submitError}</p>
                    </div>
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
                        Date:
                      </span>
                      <span className="text-on-surface font-semibold text-right max-w-[240px]">
                        {hasMultipleSessions ? `${sessionItems.length} sessions selected` : formatDate(date)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        Time:
                      </span>
                      <span className="text-on-surface font-semibold">
                        {hasMultipleSessions ? 'See list below' : timeSlot}
                      </span>
                    </div>

                    {hasMultipleSessions && (
                      <div className="space-y-1.5">
                        {sessionItems.map((session) => (
                          <div key={`${session.date}-${session.timeSlot}`} className="flex justify-between rounded-lg bg-white/70 px-3 py-2 border border-outline-variant/10">
                            <span className="text-on-surface-variant">{formatDate(session.date)}</span>
                            <span className="text-on-surface font-semibold">{session.timeSlot}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {childName && (
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">person</span>
                          Student (Child):
                        </span>
                        <span className="text-on-surface font-semibold">
                          {childName}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10">
                      <span className="text-on-surface-variant font-medium">Session Rate:</span>
                      <span className="text-primary text-lg font-bold">${tutor.rate}/hour</span>
                    </div>
                  </div>
                </div>

                {/* Optional description notes summary */}
                {notes && (
                  <div className="space-y-1.5">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Notes / Topics to cover:</span>
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
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={onConfirm}
                    className="flex-1 h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary/95 transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Confirm Booking
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
