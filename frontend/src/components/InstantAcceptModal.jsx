import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const InstantAcceptModal = ({ request, onAccept, onDecline, onAcknowledge }) => {
  const [step, setStep] = useState(1); // 1: Review & Decide, 2: Input Meeting Link
  // Bắt đầu đếm từ thời gian THỰC TẾ còn lại (server tính từ created_at của booking),
  // không phải luôn 60s — nếu không, modal sẽ hiện thời gian còn nhiều hơn thực tế
  // (do độ trễ polling) và tutor bấm "Chấp Nhận" khi booking đã bị cron timeout/hoàn tiền.
  const [timeLeft, setTimeLeft] = useState(() => (typeof request.seconds_left === 'number' ? request.seconds_left : 60));
  const [meetLink, setMeetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  // Một khi đã bấm "Chấp Nhận" và server xác nhận, không còn áp lực đếm ngược tự-hủy nữa —
  // booking đã chuyển sang Accepted (không còn bị cron 60s hủy), nên dừng hẳn bộ đếm dù
  // gia sư có bấm "Quay lại" xem lại thông tin.
  const [acknowledged, setAcknowledged] = useState(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (acknowledged) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [acknowledged]);

  const fetchProfile = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/tutor/profile`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // GET /api/tutor/profile trả thẳng object hồ sơ (không bọc trong { profile: ... })
      if (data && data.default_meet_link) {
        setMeetLink(data.default_meet_link);
      }
    } catch (err) {
      console.error('Failed to fetch tutor profile:', err);
    }
  };

  // BƯỚC 1 → 2: báo cho server là đã nhận lớp NGAY (không đợi nhập xong link), để booking
  // chuyển Pending → Accepted. Nếu không, học sinh vẫn thấy "đang chờ gia sư quyết định"
  // và đếm ngược dù gia sư đã bấm Chấp Nhận, còn cron 60s vẫn có thể tự hủy trong lúc
  // gia sư đang gõ link.
  const handleAccept = async () => {
    setAcknowledging(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/tutor/bookings/${request.booking_id}/instant-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể nhận lớp này (có thể đã hết hạn).');

      setAcknowledged(true);
      if (onAcknowledge) onAcknowledge();
      setStep(2);
    } catch (err) {
      alert(err.message);
      onDecline();
    } finally {
      setAcknowledging(false);
    }
  };

  const handleConfirmStart = async () => {
    if (!meetLink.trim()) {
      alert('Vui lòng nhập đường link Google Meet hoặc Zoom để bắt đầu.');
      return;
    }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/instant-booking/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: request.booking_id,
          meeting_link: meetLink
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi nhận lớp');

      onAccept(meetLink);
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative overflow-hidden">
        {/* Progress bar timer — chỉ còn ý nghĩa trước khi acknowledge */}
        {!acknowledged && (
          <div
            className="absolute top-0 left-0 h-2 bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          ></div>
        )}

        {step === 1 ? (
          /* ── BƯỚC 1: XEM CHI TIẾT YÊU CẦU & QUYẾT ĐỊNH ── */
          <div className="animate-fade-in">
            <div className="flex justify-between items-start mb-5 mt-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-3xl animate-pulse">🔔</span>
                  Yêu Cầu Học Ngay!
                </h2>
                <p className="text-sm text-gray-500 mt-1">Học sinh đang chờ bạn xem xét</p>
              </div>
              {!acknowledged && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-sm">
                  {timeLeft}s
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-blue-200">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {request.student_name ? request.student_name.charAt(0) : 'H'}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{request.student_name}</p>
                  <p className="text-xs text-gray-500">Học sinh</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Môn học:</span>
                  <span className="font-semibold text-gray-800">{request.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thù lao nhận được:</span>
                  <span className="font-bold text-green-600">{Number(request.price).toLocaleString()}đ</span>
                </div>
                {request.note && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <span className="text-gray-600 block mb-1">Ghi chú từ học sinh:</span>
                    <p className="italic text-gray-700 bg-white p-2.5 rounded-lg border border-blue-100 text-xs leading-relaxed">{request.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onDecline}
                disabled={acknowledging}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                Từ Chối
              </button>
              <button
                onClick={handleAccept}
                disabled={acknowledging}
                className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <span>{acknowledging ? 'Đang xác nhận...' : 'Chấp Nhận'}</span>
                {!acknowledging && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── BƯỚC 2: NHẬP LINK MEET / ZOOM & BẮT ĐẦU BUỔI HỌC ── */
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Cấu Hình Phòng Học</h2>
                <p className="text-xs text-gray-500">Đã xác nhận với học sinh — cung cấp link để vào phòng</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 border">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link Google Meet hoặc Zoom</label>
              <input
                type="url"
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/abc-xyz-def"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                💡 Học sinh sẽ được tự động chuyển hướng sang phòng học này ngay khi bạn bấm bắt đầu.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={loading || !meetLink.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-md disabled:opacity-50 text-sm flex justify-center items-center gap-2"
              >
                {loading ? 'Đang kết nối...' : 'Bắt Đầu Buổi Học Ngay 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantAcceptModal;
