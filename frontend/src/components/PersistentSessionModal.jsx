import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const PersistentSessionModal = ({ booking, role, onEndSession }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const hasEndedRef = useRef(false);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
  const bookingId = booking?.id || booking?.booking_id;

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time status sync: Polling status endpoint to detect when counterpart ends the session
  useEffect(() => {
    if (!bookingId) return;

    const checkSessionStatus = async () => {
      if (hasEndedRef.current) return;
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (['Completed', 'Disputed', 'Cancelled'].includes(data.status)) {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true;
            onEndSession(booking, data.status, { success: true });
          }
        }
      } catch (err) {
        /* Ignore network errors during background polling */
      }
    };

    // Fast polling every 1.5 seconds for instant side-by-side synchronization
    const pollTimer = setInterval(checkSessionStatus, 1500);
    return () => clearInterval(pollTimer);
  }, [bookingId, booking, onEndSession]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/instant-booking/${bookingId}/join`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể vào phòng học.');
      window.open(data.meeting_link, '_blank');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEnd = () => {
    setIsEnding(true);
  };

  const confirmEnd = async (status) => {
    try {
      hasEndedRef.current = true;
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/instant-booking/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi kết thúc buổi học');
      
      onEndSession(booking, status, data);
    } catch (err) {
      hasEndedRef.current = false;
      alert(err.message);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 p-5 w-80 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🎓</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 line-clamp-1">
            {role === 'tutor' ? `Dạy: ${booking.student_name}` : `Học với: ${booking.tutor_name || 'Gia sư'}`}
          </h3>
          <p className="text-xs text-gray-500">{booking.subject}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center mb-4 border border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thời gian thực tế</span>
        <span className="text-3xl font-mono font-bold text-indigo-600">
          {formatTime(secondsElapsed)}
        </span>
      </div>

      {!isEnding ? (
        <div className="space-y-2">
          <button 
            onClick={handleJoin}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Vào Phòng Học Lại
          </button>
          
          <button 
            onClick={handleEnd}
            className="w-full py-2.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition"
          >
            Kết Thúc Buổi Học
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm text-center text-gray-700 font-medium">Bạn có chắc chắn muốn kết thúc?</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEnding(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Hủy
            </button>
            <button 
              onClick={() => confirmEnd('Completed')}
              className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition text-sm"
            >
              Chắc chắn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersistentSessionModal;
