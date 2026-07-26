import React, { useState, useEffect } from 'react';
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
  const [meetingAddress, setMeetingAddress] = useState('');
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [missingAmount, setMissingAmount]   = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalNeeded, setTotalNeeded]       = useState(0);

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  // Lấy danh sách con nếu là phụ huynh
  useEffect(() => {
    if (user && user.role === 'parent' && token) {
      fetch(`${API_BASE}/api/parent/children`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { children: [] })
        .then(data => {
          const list = data?.children || [];
          setChildren(list);
          if (list.length > 0) setSelectedChildId(list[0].student_id);
        })
        .catch(() => setChildren([]));
    }
  }, [user, token]);

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
          meeting_address: (method || singleMethod) === 'offline' ? meetingAddress : null,
          targetStudentId: user?.role === 'parent' ? selectedChildId : undefined
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.code === 'INSUFFICIENT_FUNDS') {
          setTotalNeeded(body.needed || 0);
          setCurrentBalance(body.balance || 0);
          setMissingAmount((body.needed || 0) - (body.balance || 0));
          setShowTopupModal(true);
          return;
        }
        throw new Error(body.message || 'Đặt lịch thất bại.');
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const topUpQR = async () => {
    try {
      // Lưu lại pending booking và thông tin bé đã chọn
      sessionStorage.setItem('edux_pending_booking', JSON.stringify({
        tutorId: tutor?.id || tutor?.user_id,
        selectedChildId,
        date,
        slot,
        subject,
        method,
        meeting_address: (method || singleMethod) === 'offline' ? meetingAddress : null,
        note
      }));
      const returnUrl = `${window.location.origin}/#/payment/result`;
      sessionStorage.setItem('edux_payment_source', JSON.stringify({
        returnHash: window.location.hash || '#/dashboard',
        source: 'booking'
      }));
      const res = await fetch(`${API_BASE}/api/payment/create-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: missingAmount, bankCode: '', returnUrl })
      });
      const data = await res.json();
      const payUrl = data.redirectUrl || data.url;
      if (payUrl) window.location.href = payUrl;
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#e1e2e4] flex justify-between items-center shrink-0">
          <h3 className="font-bold text-[#191c1e] text-lg">Đặt lịch học</h3>
          <button onClick={onClose} className="text-[#444653] hover:bg-[#f2f4f8] p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* MODAL NẠP TIỀN */}
        {showTopupModal && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col h-full rounded-t-2xl sm:rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#fff8f6] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px] text-[#ea580c]">account_balance_wallet</span>
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-2">Số dư ví không đủ</h3>
              <p className="text-sm text-[#444653]">Bạn cần thanh toán phí đặt lịch nhưng số dư hiện tại không đủ.</p>
            </div>
            <div className="bg-[#f8f9fb] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#444653]">Tổng phí đặt lịch:</span>
                <span className="font-semibold text-[#191c1e]">{totalNeeded.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#444653]">Số dư hiện tại:</span>
                <span className="font-semibold text-[#191c1e]">{currentBalance.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="pt-3 border-t border-[#e1e2e4] flex justify-between items-center text-sm font-bold text-[#ea580c]">
                <span>Cần nạp thêm:</span>
                <span>{missingAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
            <div className="mt-auto space-y-3">
              <button onClick={topUpQR} className="w-full h-12 bg-[#00288e] text-white font-semibold rounded-xl hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">qr_code_2</span> Nạp {missingAmount.toLocaleString('vi-VN')}đ qua VNPAY
              </button>
              <button onClick={() => setShowTopupModal(false)} className="w-full h-12 border border-[#d6d9e0] text-[#191c1e] font-semibold rounded-xl hover:bg-[#f2f4f8] transition-colors">
                Trở lại
              </button>
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto">
          {!user ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[#00288e] text-5xl">lock</span>
              <p className="text-[#444653] mt-3 mb-4">Bạn cần đăng nhập để đặt lịch học.</p>
              <button 
                onClick={() => {
                  try { sessionStorage.setItem('redirectAfterLogin', window.location.hash); } catch(e) {}
                  window.location.hash = '/signin';
                }} 
                className="inline-block bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-colors"
              >
                Đăng nhập
              </button>
            </div>
          ) : user.role === 'tutor' ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[#e11d48] text-5xl">block</span>
              <p className="text-[#444653] mt-3 mb-4">Gia sư không được phép thuê gia sư khác. Vui lòng sử dụng tài khoản học viên.</p>
              <button onClick={onClose} className="mt-2 bg-[#e11d48] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#be123c] transition-colors">Đóng</button>
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
              {user && user.role === 'parent' && (
                <div>
                  <label className="block text-sm font-semibold text-[#444653] mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00288e] text-[18px]">family_restroom</span>
                    Đặt lịch cho con
                  </label>
                  {children.length === 0 ? (
                    <div className="text-xs text-[#ba1a1a] bg-[#ffdad6] px-3 py-2 rounded-lg">
                      Bạn chưa liên kết tài khoản con.
                    </div>
                  ) : (
                    <select 
                      value={selectedChildId} 
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]"
                    >
                      {children.map(child => (
                        <option key={child.student_id} value={child.student_id}>
                          {child.nickname || child.student_name || 'Học viên'} ({child.student_email || ''})
                        </option>
                      ))}
                    </select>
                  )}
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
                {(method || singleMethod) === 'offline' && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-[#444653] mb-1">Địa điểm học (Bắt buộc) *</label>
                    <input type="text" value={meetingAddress} onChange={e => setMeetingAddress(e.target.value)}
                      placeholder="VD: Quán Cafe XYZ, đường ABC..." required
                      className="w-full px-3 py-2 rounded-lg border border-[#d6d9e0] text-sm focus:outline-none focus:border-[#00288e]" />
                    <p className="mt-1 text-[11px] text-[#8a8ca0]">Hệ thống sẽ tự động kiểm tra khoảng cách đến gia sư.</p>
                  </div>
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
