import { useState, useEffect, useRef } from 'react';

export default function TutorVerifyCheckinModal({ isOpen, onClose, booking, onSuccess, token, API_BASE }) {
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'qr'
  const [digits, setDigits] = useState(['', '', '', '']);
  const [qrInput, setQrInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setQrInput('');
      setError('');
      setSubmitting(false);
      setRemainingAttempts(null);
      setTimeout(() => inputRefs[0]?.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto focus next input
    if (value && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const pinStr = digits.join('');
    if (activeTab === 'pin' && pinStr.length !== 4) {
      setError('Vui lòng nhập đủ 4 chữ số PIN.');
      return;
    }
    if (activeTab === 'qr' && !qrInput.trim()) {
      setError('Vui lòng nhập hoặc dán mã QR chuỗi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = activeTab === 'pin' 
        ? { pin: pinStr } 
        : { qrData: qrInput.trim() };

      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/verify-offline-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        throw new Error(data.message || 'Mã xác nhận không đúng.');
      }

      if (onSuccess) onSuccess(booking.id, data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
          <div>
            <div className="flex items-center gap-2 text-[#00288e] text-xs font-bold uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Xác Nhận Có Mặt Offline (Check-in 2 Chiều)
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {booking.subject || 'Buổi học'} với Học sinh {booking.student_name || 'Học sinh'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Thời gian: {booking.time_slot || 'Đã hẹn'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerify} className="p-6 space-y-5">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('pin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pin' 
                  ? 'bg-white text-[#00288e] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">pin</span>
              Nhập Mã PIN 4 Số
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'qr' 
                  ? 'bg-white text-[#00288e] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              Nhập Mã QR Code
            </button>
          </div>

          {/* Input PIN 4 chữ số */}
          {activeTab === 'pin' && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-medium text-gray-600">
                Xin <strong>Mã PIN 4 số</strong> hiển thị trên app của Học sinh / Phụ huynh để nhập bên dưới:
              </p>

              <div className="flex justify-center items-center gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className="w-14 h-16 text-center text-3xl font-black text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-[#00288e] focus:bg-white focus:outline-none transition-all"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Input QR Code String */}
          {activeTab === 'qr' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                Nhập hoặc dán chuỗi Mã QR trên app Học sinh:
              </label>
              <input
                type="text"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                placeholder="Ví dụ: EDUX_OFFLINE:uuid-xxx:8492"
                className="w-full p-3 rounded-2xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#00288e] outline-none font-mono"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-bold bg-[#00288e] text-white hover:bg-[#001d6e] disabled:opacity-50 transition-colors text-sm shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xác nhận...
                </>
              ) : (
                'Xác Nhận Có Mặt'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
