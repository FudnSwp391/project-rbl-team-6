import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

export default function TutorInteractionPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Extract tutorId from hash router (assuming /tutor-interaction/:tutorId)
  const hashObj = window.location.hash.match(/^#\/tutor-interaction\/([^/]+)$/);
  const tutorId = hashObj ? hashObj[1] : null;

  // Derive initial loading & error from whether tutorId is present
  const [loading, setLoading] = useState(!!tutorId);
  const [error, setError] = useState(tutorId ? null : 'Không tìm thấy mã gia sư trong URL.');

  useEffect(() => {
    if (!token || !tutorId) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/tutor-interaction/${tutorId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
          setNoteContent(json.data.interaction.notes || '');
        } else {
          setError(json.message);
        }
      })
      .catch(() => { if (!cancelled) setError('Lỗi kết nối đến máy chủ.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, tutorId]);



  const toggleFavorite = async () => {
    if (!token || !tutorId) return;
    // Optimistic update
    setData(prev => ({
      ...prev,
      interaction: {
        ...prev.interaction,
        is_favorite: !prev.interaction.is_favorite
      }
    }));

    try {
      const res = await fetch(`${API_BASE}/api/tutor-interaction/${tutorId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) {
        // Revert on failure
        setData(prev => ({
          ...prev,
          interaction: { ...prev.interaction, is_favorite: !prev.interaction.is_favorite }
        }));
      }
    } catch {
      // Revert on failure
      setData(prev => ({
        ...prev,
        interaction: { ...prev.interaction, is_favorite: !prev.interaction.is_favorite }
      }));
    }
  };

  const saveNote = async () => {
    if (!token || !tutorId) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/tutor-interaction/${tutorId}/note`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: noteContent })
      });
      const json = await res.json();
      if (json.success) {
        setData(prev => ({
          ...prev,
          interaction: { ...prev.interaction, notes: json.notes }
        }));
        alert(json.message || 'Lưu ghi chú thành công');
      } else {
        alert(json.message || 'Lỗi khi lưu ghi chú');
      }
    } catch {
      alert('Lỗi kết nối khi lưu ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-300 mb-3 block" style={{ fontSize: 48 }}>lock</span>
          <p className="text-gray-500">Vui lòng đăng nhập.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-red-300 mb-3 block" style={{ fontSize: 48 }}>error</span>
        <p className="text-red-500">{error || 'Không tìm thấy dữ liệu'}</p>
        <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-[#00288e] text-white rounded-lg text-sm">Quay lại</button>
      </div>
    );
  }

  const { tutor, interaction } = data;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00288e] to-[#1e40af] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => window.location.hash = '/my-tutors'}
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Quay lại Gia sư của tôi
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>manage_accounts</span>
            Tương tác Gia sư
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Tutor Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between">
          <div className="flex items-center gap-5">
            {tutor.tutor_avatar ? (
              <img src={tutor.tutor_avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center font-bold text-3xl">
                {(tutor.tutor_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#191c1e]">{tutor.tutor_name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {parseFloat(tutor.tutor_rating) > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-semibold text-yellow-700">{parseFloat(tutor.tutor_rating).toFixed(1)}</span>
                  </span>
                )}
                {tutor.experience_years > 0 && (
                  <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-medium">
                    {tutor.experience_years} năm KN
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button 
              onClick={toggleFavorite}
              className={`p-2.5 rounded-full border transition-all ${interaction.is_favorite ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              title={interaction.is_favorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
            >
              <span className={`material-symbols-outlined ${interaction.is_favorite ? 'text-red-500' : 'text-gray-400'}`} style={{ fontSize: 24, fontVariationSettings: interaction.is_favorite ? "'FILL' 1" : "'FILL' 0" }}>
                favorite
              </span>
            </button>
            
            <button
              onClick={() => window.location.hash = `/tutor-detail/${tutor.tutor_id}`}
              className="px-4 py-2 bg-[#00288e] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] transition-colors"
            >
              Xem Hồ Sơ Chi Tiết
            </button>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 24 }}>edit_note</span>
            <h3 className="text-lg font-bold text-[#191c1e]">Ghi chú cá nhân</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Ghi lại những lưu ý cá nhân của bạn về gia sư này (gia sư sẽ không nhìn thấy thông tin này).</p>
          
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Ví dụ: Dạy toán rất dễ hiểu, cần tập trung thêm vào bài tập nâng cao..."
            className="w-full h-40 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00288e] focus:border-transparent resize-y text-sm mb-4"
          />
          
          <div className="flex justify-end">
            <button
              onClick={saveNote}
              disabled={savingNote || noteContent === interaction.notes}
              className="px-6 py-2.5 bg-[#10b981] text-white rounded-xl text-sm font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
              {savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
