import React from 'react';

/**
 * TimeSlotPicker component
 * Renders available time slots as interactive chips.
 * 
 * @param {Array} props.slots - List of time slot strings, e.g. ['09:00 AM', '10:30 AM']
 * @param {string} props.selectedSlot - The currently selected time slot
 * @param {Function} props.onSelectSlot - Callback when a slot is clicked
 * @param {Array} props.unavailableSlots - List of slot strings that should be disabled/grayed out
 */
export default function TimeSlotPicker({ slots = [], selectedSlot, onSelectSlot, unavailableSlots = [] }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] text-outline mb-2">event_busy</span>
        <p className="font-label-md text-label-md">Không có khung giờ trống trong ngày này.</p>
        <p className="font-label-sm text-label-sm text-outline mt-1">Vui lòng chọn ngày khác trên lịch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
        <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
        Chọn Khung Giờ Còn Trống
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot;
          const isUnavailable = unavailableSlots.includes(slot);

          return (
            <button
              key={slot}
              type="button"
              disabled={isUnavailable}
              onClick={() => onSelectSlot(slot)}
              className={`
                min-h-[46px] rounded-xl font-label-md text-label-md border flex items-center justify-center gap-1.5 transition-all duration-200 select-none
                ${
                  isSelected
                    ? 'bg-primary border-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(0,40,142,0.25)] scale-[1.02]'
                    : isUnavailable
                    ? 'bg-surface-container-high/40 border-outline-variant/20 text-outline-variant cursor-not-allowed opacity-50'
                    : 'bg-white hover:bg-surface-container-low border-outline-variant/40 text-on-surface hover:border-primary/30 cursor-pointer shadow-sm'
                }
              `}
            >
              {isSelected && (
                <span className="material-symbols-outlined text-[16px] animate-pulse">check_circle</span>
              )}
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
