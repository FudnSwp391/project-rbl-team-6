import { useState, useEffect } from 'react';

export default function OfflineCheckinModal({ isOpen, onClose, booking, token, API_BASE }) {
  const [loading, setLoading] = useState(true);
  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'qr'

  const fetchPin = async () => {
    if (!booking || !booking.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/offline-pin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể lấy mã PIN.');
      setPinData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking.id}/regenerate-offline-pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể đổi mã PIN.');
      setPinData(prev => ({ ...prev, pin: data.pin, qrData: data.qrData, qrImageUrl: data.qrImageUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      fetchPin();
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              Mã Điểm Danh Offline 2 Chiều
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {booking.subject || 'Buổi học Offline'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Gia sư: {booking.tutor_name || 'Gia sư'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#00288e]/30 border-t-[#00288e] rounded-full animate-spin" />
              <p className="text-xs font-semibold text-gray-500">Đang khởi tạo mã điểm danh an toàn...</p>
            </div>
          ) : pinData?.verified ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <h4 className="text-lg font-bold text-gray-900">Gia Sư Đã Xác Nhận Có Mặt!</h4>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                Buổi học đã được điểm danh thành công qua <strong>{pinData.verificationMethod === 'QR' ? 'Mã QR' : 'Mã PIN 4 Số'}</strong> vào lúc{' '}
                {pinData.verifiedAt ? new Date(pinData.verifiedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'gần đây'}.
              </p>
            </div>
          ) : (
            <>
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
                  Mã PIN 4 Số
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
                  Mã QR Code
                </button>
              </div>

              {/* View: PIN 4 SỐ */}
              {activeTab === 'pin' && (
                <div className="text-center space-y-3">
                  <p className="text-xs font-medium text-gray-600">
                    Đọc <strong>Mã PIN 4 số</strong> này cho Gia sư nhập khi tới nhà dạy:
                  </p>
                  
                  {/* PIN Display */}
                  <div className="flex justify-center items-center gap-3 py-3">
                    {(pinData?.pin || '----').split('').map((num, i) => (
                      <div 
                        key={i} 
                        className="w-14 h-16 bg-[#eef4ff] border-2 border-[#00288e] rounded-2xl flex items-center justify-center text-3xl font-black text-[#00288e] shadow-md shadow-blue-900/10"
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Chỉ đưa mã PIN khi Gia sư đã thực sự có mặt tại địa điểm học. Nhập đúng mã PIN sẽ ghi nhận có mặt thành công.
                    </p>
                  </div>
                </div>
              )}

              {/* View: QR CODE */}
              {activeTab === 'qr' && (
                <div className="text-center space-y-3">
                  <p className="text-xs font-medium text-gray-600">
                    Đưa hình ảnh <strong>Mã QR</strong> này cho Gia sư quét trên máy của họ:
                  </p>

                  <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl inline-block shadow-sm">
                    {pinData?.qrImageUrl ? (
                      <img 
                        src={pinData.qrImageUrl} 
                        alt="Offline Checkin QR" 
                        className="w-48 h-48 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-[48px]">qr_code_2</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono">
                    ID: {booking.id.slice(0, 8)}... | PIN: {pinData?.pin}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Regenerate PIN button */}
              <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs font-bold text-gray-600 hover:text-[#00288e] flex items-center gap-1 transition-colors"
                >
                  <span className={`material-symbols-outlined text-[16px] ${regenerating ? 'animate-spin' : ''}`}>refresh</span>
                  Tạo mã PIN mới
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#001d6e] transition-colors shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
