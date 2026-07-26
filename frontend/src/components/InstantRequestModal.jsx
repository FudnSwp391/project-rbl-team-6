import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const InstantRequestModal = ({ tutor, selectedChildId, onClose, onSuccess, onInsufficientFunds }) => {
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wallet, setWallet] = useState(null);

  // Học Ngay là gói có giá & thời lượng CỐ ĐỊNH do gia sư tự cấu hình (instant_price /
  // instant_duration_mins) — không phải giá theo phút. Backend (POST /api/bookings/instant)
  // luôn tính phí bằng đúng tutor.instant_price bất kể client gửi duration_mins gì, nên
  // KHÔNG được cho học sinh chọn thời lượng rồi tự nhân giá lên ở đây (số hiển thị sẽ
  // sai lệch với số tiền thực sự bị trừ).
  const duration = tutor.instant_duration_mins || 30;
  const totalPrice = Number(tutor.instant_price) || 0;

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.wallet) {
        setWallet(data.wallet);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet || wallet.balance < totalPrice) {
      setError('Số dư ví không đủ. Vui lòng nạp thêm tiền.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/bookings/instant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tutor_id: tutor.user_id || tutor.id,
          tutor_name: tutor.full_name,
          subject: subject || 'Môn học chung',
          duration_mins: duration,
          note,
          targetStudentId: selectedChildId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_FUNDS' && onInsufficientFunds) {
          onInsufficientFunds(data);
          return;
        }
        throw new Error(data.message || 'Lỗi tạo yêu cầu Học Ngay');
      }

      onSuccess(data.booking_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-full mr-3">⚡</span>
          Yêu Cầu Học Ngay
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">Bạn đang yêu cầu học ngay với gia sư <span className="font-semibold text-gray-800">{tutor.full_name}</span>.</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học / Chủ đề</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              placeholder="VD: Toán lớp 10, Luyện thi IELTS..."
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>
          
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-600">Thời lượng buổi Học Ngay</span>
            <span className="font-semibold text-gray-800">{duration} phút (gia sư cấu hình sẵn)</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú cho Gia sư</label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)}
              placeholder="Nhập yêu cầu cụ thể để gia sư chuẩn bị..."
              className="w-full border border-gray-300 rounded-lg p-2 h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Học phí dự kiến:</span>
              <span className="font-bold text-lg text-blue-600">{totalPrice.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2 mt-2">
              <span className="text-sm text-gray-600">Số dư ví của bạn:</span>
              <span className={`font-medium ${wallet && wallet.balance < totalPrice ? 'text-red-600' : 'text-green-600'}`}>
                {wallet ? wallet.balance.toLocaleString() + 'đ' : 'Đang tải...'}
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || (wallet && wallet.balance < totalPrice)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu & Tạm Giữ Tiền'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InstantRequestModal;
