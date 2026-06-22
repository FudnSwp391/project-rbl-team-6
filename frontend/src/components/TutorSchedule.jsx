import React from 'react';

/**
 * TutorSchedule component
 * Renders the weekly availability schedule of a tutor in a detailed overview.
 * 
 * @param {Object} props.availability - An object mapping days to time slot strings, e.g. { Monday: ['09:00 AM', ...] }
 */
export default function TutorSchedule({ availability }) {
  if (!availability) return null;

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-outline-variant/30 p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-primary">calendar_month</span>
        Weekly Business Hours
      </h3>
      
      <div className="space-y-3">
        {daysOfWeek.map((day) => {
          const slots = availability[day] || [];
          const hasSlots = slots.length > 0;

          return (
            <div 
              key={day} 
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                hasSlots 
                  ? 'bg-white/80 border-outline-variant/20 hover:border-primary/30 shadow-[0_2px_4px_rgba(0,0,0,0.02)]' 
                  : 'bg-surface-container-low/50 border-dashed border-outline-variant/30 opacity-70'
              }`}
            >
              <span className="font-label-md text-label-md text-on-surface font-semibold mb-2 sm:mb-0">
                {day}
              </span>
              
              <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                {hasSlots ? (
                  slots.map((slot, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 rounded-md text-[13px] font-medium bg-primary/5 text-primary border border-primary/10 shadow-sm"
                    >
                      {slot}
                    </span>
                  ))
                ) : (
                  <span className="text-[13px] text-on-surface-variant italic font-medium">
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
