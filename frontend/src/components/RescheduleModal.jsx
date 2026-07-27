import { useState, useEffect, useCallback } from 'react';
import { requestReschedule } from '../services/api';

// Preset time slots — dùng cùng format với BookingModal & BookingCalendar
const TIME_SLOTS = [
  '06:00-08:00', '08:00-10:00', '10:00-12:00',
  '13:00-15:00', '14:00-16:00', '16:00-18:00',
  '18:00-20:00', '20:00-22:00',
];

const SLOT_LABELS = {
  '06:00-08:00': '06:00 – 08:00',
  '08:00-10:00': '08:00 – 10:00',
  '10:00-12:00': '10:00 – 12:00',
  '13:00-15:00': '13:00 – 15:00',
  '14:00-16:00': '14:00 – 16:00',
  '16:00-18:00': '16:00 – 18:00',
  '18:00-20:00': '18:00 – 20:00',
  '20:00-22:00': '20:00 – 22:00',
};

function toLocalISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function RescheduleModal({ booking, onClose, onSuccess }) {
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [reason, setReason] = useState('');
  const [bookedSlots, setBookedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = toLocalISODate(new Date());

  // Lấy slots đã bị book của tutor khi đổi ngày
  useEffect(() => {
    if (!newDate || !booking?.tutor_id) return;
    const from = newDate;
    const to = newDate;
    fetch(`/api/tutors/${booking.tutor_id}/availability?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => setBookedSlots(data.bookedSlots || {}))
      .catch(() => setBookedSlots({}));
  }, [newDate, booking?.tutor_id]);

  const isSlotBooked = useCallback((slot) => {
    if (!newDate) return false;
    const daySlots = bookedSlots[newDate] || [];
    return daySlots.some(s => s.timeSlot === slot);
  }, [newDate, bookedSlots]);

  const handleSubmit = async () => {
    if (!newDate) return setError('Vui lòng chọn ngày mới.');
    if (!newSlot) return setError('Vui lòng chọn khung giờ mới.');
    // Không cho chọn y hệt lịch cũ
    const oldDateStr = booking.lesson_date
      ? toLocalISODate(booking.lesson_date)
      : booking.lesson_date_str;
    if (newDate === oldDateStr && newSlot === booking.time_slot) {
      return setError('Ngày và giờ mới phải khác lịch hiện tại.');
    }

    setLoading(true);
    setError('');
    try {
      await requestReschedule(booking.id, {
        new_lesson_date: newDate,
        new_time_slot: newSlot,
        reason: reason.trim() || undefined,
      });
      onSuccess?.('Đã gửi yêu cầu đổi lịch thành công! Gia sư sẽ phản hồi sớm.');
      onClose();
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Format lịch cũ để hiển thị
  const oldDateDisplay = booking?.lesson_date_str
    || (booking?.lesson_date ? toLocalISODate(booking.lesson_date) : '—');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #0e3a9c 100%)', padding: '20px 24px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-white text-2xl">event_repeat</span>
              <h2 className="text-white font-bold text-lg">Yêu cầu đổi lịch</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {/* Lịch cũ */}
          <div className="mt-3 bg-white/10 rounded-xl px-4 py-2 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span>
              <span>Lịch hiện tại:</span>
              <span className="font-semibold">{oldDateDisplay} · {booking?.time_slot}</span>
            </div>
            {booking?.subject && (
              <div className="flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-base">school</span>
                <span>Môn: <span className="font-semibold">{booking.subject}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Ngày mới */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="material-symbols-outlined text-base align-middle mr-1">calendar_today</span>
              Ngày mới <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={newDate}
              onChange={e => { setNewDate(e.target.value); setNewSlot(''); setError(''); }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          {/* Khung giờ mới */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="material-symbols-outlined text-base align-middle mr-1">schedule</span>
              Khung giờ mới <span className="text-red-500">*</span>
            </label>
            {newDate ? (
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map(slot => {
                  const booked = isSlotBooked(slot);
                  const selected = newSlot === slot;
                  return (
                    <button
                      key={slot}
                      disabled={booked}
                      onClick={() => { if (!booked) { setNewSlot(slot); setError(''); } }}
                      className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                        booked
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                          : selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {SLOT_LABELS[slot] || slot}
                      {booked && <span className="block text-xs text-gray-400">Đã đặt</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-xl py-6 text-center text-sm text-gray-400">
                <span className="material-symbols-outlined block text-2xl mb-1">calendar_today</span>
                Chọn ngày trước để xem các khung giờ trống
              </div>
            )}
          </div>

          {/* Lý do (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="material-symbols-outlined text-base align-middle mr-1">chat_bubble_outline</span>
              Lý do đổi lịch <span className="text-gray-400 font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              rows={3}
              placeholder="VD: Tôi bị ốm / có việc đột xuất..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition"
              maxLength={300}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{reason.length}/300</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0">error</span>
              {error}
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0">info</span>
            <span>
              Gia sư sẽ nhận được thông báo và quyết định chấp nhận / từ chối.
              Nếu được chấp nhận, lịch học sẽ tự động được cập nhật — không tính phí hủy.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !newDate || !newSlot}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: loading || !newDate || !newSlot
                ? '#9ca3af'
                : 'linear-gradient(135deg, #1a56db 0%, #0e3a9c 100%)',
              cursor: loading || !newDate || !newSlot ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                Đang gửi...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">send</span>
                Gửi yêu cầu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
