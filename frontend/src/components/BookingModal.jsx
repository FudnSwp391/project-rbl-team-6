import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { methodSupport, methodLabel, METHOD_OPTIONS } from '../utils/teachingMethod';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;
const TIME_SLOTS = ['08:00–10:00', '10:00–12:00', '14:00–16:00', '16:00–18:00', '18:00–20:00', '20:00–22:00'];

export default function BookingModal({ tutor, onClose }) {
  const { user, token } = useAuth();
  const subjects = Array.isArray(tutor?.subjects) ? tutor.subjects : (tutor?.subjects || '').split(',').map(s => s.trim()).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const ms = methodSupport(tutor?.teaching_methods);
  const bothMethods = ms.online && ms.offline;
  const singleMethod = !bothMethods ? (ms.online ? 'online' : 'offline') : null;

  const [subject, setSubject] = useState(subjects[0] || '');
  const [date, setDate]       = useState('');
  const [slot, setSlot]       = useState(TIME_SLOTS[0]);
  const [method, setMethod]   = useState(singleMethod || '');
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!date) { setError('Vui lòng chọn ngày học.'); return; }
    if (bothMethods && !method) { setError('Vui lòng chọn hình thức học (Online/Offline).'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutor_id: tutor.id, tutor_name: tutor.full_name,
          subject, lesson_date: date, time_slot: slot, note,
          teaching_method: method || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Đặt lịch thất bại.');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-lg font-bold text-[#191c1e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00288e]">event_available</span>
            Đặt lịch học
          </h3>
          <button onClick={onClose} aria-label="Đóng" className="text-[#757684] hover:text-[#191c1e]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {!user ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[#00288e] text-5xl">lock</span>
              <p className="text-[#444653] mt-3 mb-4">Bạn cần đăng nhập để đặt lịch học.</p>
              <a href="#/signin" className="inline-block bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-colors">Đăng nhập</a>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[#16a34a] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="text-[#191c1e] font-semibold mt-2">Đã gửi yêu cầu đặt lịch!</p>
              <p className="text-[#5d5f5f] text-sm mt-1">Gia sư <b>{tutor.full_name}</b> sẽ xác nhận sớm.</p>
              <button onClick={onClose} className="mt-5 bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-colors">Đóng</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-[#5d5f5f]">Gia sư: <span className="font-semibold text-[#191c1e]">{tutor.full_name}</span></p>
              {subjects.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[#444653] mb-1">Môn học</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]">
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[#444653] mb-1">Ngày học</label>
                <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#444653] mb-1">Khung giờ</label>
                <select value={slot} onChange={e => setSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]">
                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#444653] mb-1">Hình thức học</label>
                {bothMethods ? (
                  <div className="grid grid-cols-2 gap-2">
                    {METHOD_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setMethod(opt.value)}
                        className={`h-10 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          method === opt.value
                            ? 'border-[#00288e] bg-[#00288e]/5 text-[#00288e]'
                            : 'border-[#d6d9e0] text-[#5d5f6f] hover:bg-[#f6f7fb]'
                        }`}>
                        <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-10 rounded-lg border border-[#d6d9e0] bg-[#f6f7fb] px-3 flex items-center gap-2 text-sm font-semibold text-[#3a3d4d]">
                    <span className="material-symbols-outlined text-[16px] text-[#00288e]">
                      {singleMethod === 'online' ? 'videocam' : 'location_on'}
                    </span>
                    {methodLabel(singleMethod)} — gia sư chỉ dạy hình thức này
                  </div>
                )}
                {(method || singleMethod) && (
                  <p className="mt-1 text-xs text-[#8a8ca0]">
                    {METHOD_OPTIONS.find(o => o.value === (method || singleMethod))?.hint}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#444653] mb-1">Ghi chú (tuỳ chọn)</label>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Mục tiêu, nội dung muốn học..."
                  className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]" />
              </div>
              {error && <p className="text-sm text-[#ba1a1a]">{error}</p>}
              <button type="submit" disabled={busy}
                className="btn-shine w-full bg-gradient-to-r from-[#00288e] to-[#3b6fe0] text-white py-3 rounded-lg font-semibold text-sm hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {busy ? 'Đang gửi...' : 'Gửi yêu cầu đặt lịch'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
