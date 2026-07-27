import React, { useState, useEffect, useCallback } from 'react';
import CompareModal from '../components/CompareModal';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPrice = (price) => {
  if (!price) return 'Thỏa thuận';
  return `${Math.round(price).toLocaleString('vi-VN')}đ/buổi`;
};

const formatRating = (r) => (r > 0 ? parseFloat(r).toFixed(1) : null);

const formatExp = (y) => {
  if (!y) return 'Chưa cập nhật';
  return `${y} năm`;
};

// ─── AI Reasons Generator ─────────────────────────────────────────────────────
function generateAIReasons(tutor, formData) {
  const rawReasons = tutor?.reasons || [];
  const reasonsSet = new Set(Array.isArray(rawReasons) && rawReasons.length > 0 ? rawReasons : ["Gia sư phù hợp trong hệ thống"]);
  
  // Rule-based inference based on concrete evidence
  if (tutor.matchScore >= 90) reasonsSet.add(`Tỷ lệ phù hợp (Match Score) xuất sắc: ${tutor.matchScore}%.`);
  else if (tutor.matchScore >= 80) reasonsSet.add(`Mức độ phù hợp với yêu cầu cao: ${tutor.matchScore}%.`);
  
  if (parseFloat(tutor.rating) >= 4.8 && tutor.reviewCount > 0) reasonsSet.add("Chất lượng giảng dạy được học viên đánh giá xuất sắc.");
  else if (parseFloat(tutor.rating) >= 4.5 && tutor.reviewCount > 0) reasonsSet.add("Nhận được nhiều phản hồi tích cực từ học viên.");
  
  if (parseInt(tutor.experienceYears) >= 5) reasonsSet.add("Giảng viên kỳ cựu với nhiều năm kinh nghiệm thực chiến.");
  
  if (formData?.budgetMax && parseFloat(tutor.pricePerSession) <= parseFloat(formData.budgetMax)) {
    reasonsSet.add("Mức học phí đề xuất nằm an toàn trong ngân sách của bạn.");
  }

  if (formData?.learningFormat && tutor.teachingFormats) {
    const isOnline = tutor.teachingFormats.some(f => f.toLowerCase().includes('online') || f.toLowerCase().includes('tuyến'));
    const isOffline = tutor.teachingFormats.some(f => f.toLowerCase().includes('offline') || f.toLowerCase().includes('tiếp'));
    
    if (formData.learningFormat === 'online' && isOnline) reasonsSet.add("Đáp ứng chuẩn xác hình thức học Trực tuyến (Online).");
    if (formData.learningFormat === 'offline' && isOffline) reasonsSet.add("Sẵn sàng giảng dạy Trực tiếp (Offline) theo nguyện vọng.");
  }

  return Array.from(reasonsSet);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, className }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={name}
        className={`${className} rounded-full object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className={`${className} rounded-full bg-surface-variant flex items-center justify-center`}>
      <span className="material-symbols-outlined text-outline" style={{ fontSize: 'calc(100% * 2)' }}>person</span>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
function ProgressRing({ radius, stroke, progress }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle 
          stroke="currentColor" 
          fill="transparent" 
          strokeWidth={stroke} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} 
          r={normalizedRadius} 
          cx={radius} 
          cy={radius} 
          className="text-primary"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-on-surface">{progress}%</span>
      </div>
    </div>
  );
}

// ─── Best-match card (featured) ───────────────────────────────────────────────
function BestMatchCard({ tutor, formData, onSelect, onInterest, onToggleCompare, selectedForCompare, selectingTutorId }) {
  const reasons = generateAIReasons(tutor, formData);
  const isSelected = selectedForCompare?.some(t => t.id === tutor.id);
  const isSelecting = selectingTutorId === tutor.id;

  return (
    <div className="bg-surface-container-lowest rounded-[16px] p-6 flex flex-col md:flex-row gap-6 border-2 border-primary shadow-[0_4px_20px_-5px_rgba(0,40,142,0.15)] relative overflow-hidden group hover:shadow-[0_8px_30px_-5px_rgba(0,40,142,0.2)] transition-shadow">
      <div className="absolute top-0 right-0 bg-primary text-on-primary px-4 py-1.5 rounded-bl-[12px] text-xs font-bold shadow-sm">
        Đề xuất tốt nhất
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative">
          <Avatar url={tutor.avatarUrl} name={tutor.name} className="w-[100px] h-[100px] border-4 border-surface shadow-sm group-hover:scale-105 transition-transform" />
          <div className="absolute bottom-0 right-0 bg-surface-container-lowest rounded-full p-0.5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
        </div>
        <ProgressRing radius={36} stroke={4} progress={tutor.matchScore || 0} />
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-on-surface line-clamp-1">{tutor.name}</h3>
              {formatRating(tutor.rating) ? (
                <div className="flex items-center gap-1 text-on-surface-variant text-sm mt-1">
                  <span className="material-symbols-outlined text-[16px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-semibold text-on-surface">{formatRating(tutor.rating)}</span>
                  <span>({tutor.reviewCount} đánh giá)</span>
                </div>
              ) : (
                <div className="text-on-surface-variant text-sm mt-1">Chưa có đánh giá</div>
              )}
            </div>
            
            {/* Compare Checkbox for Best Match */}
            <button 
              onClick={() => onToggleCompare(tutor)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${isSelected ? 'bg-primary text-on-primary border-primary hover:bg-[#0042a3]' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-variant hover:text-on-surface'}`}
            >
              {isSelected ? (
                <><span className="material-symbols-outlined text-[14px]">check</span>Đã thêm</>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">add</span>So sánh</>
              )}
            </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">school</span> Kinh nghiệm</span>
            <span className="text-sm font-semibold text-on-surface truncate">{formatExp(tutor.experienceYears)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span> Học phí</span>
            <span className="text-sm font-bold text-emerald-700 truncate">{formatPrice(tutor.pricePerSession)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> Khu vực</span>
            <span className="text-sm font-semibold text-on-surface truncate">{tutor.location || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cast_for_education</span> Hình thức</span>
            <span className="text-sm font-semibold text-on-surface truncate">
              {tutor.teachingFormats?.length > 0 ? tutor.teachingFormats.join(', ') : 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Reasons & CTA Section */}
      <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-surface-variant pt-4 md:pt-0 md:pl-6 md:w-[280px] shrink-0">
        <div>
          <h4 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[16px]">lightbulb</span>
            Vì sao AI đề xuất?
          </h4>
          <ul className="flex flex-col gap-1.5">
            {reasons.slice(0, 6).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[14px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="line-clamp-2">{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
              <button
                onClick={() => tutor.id && (window.location.hash = `/tutor-detail/${tutor.id}`)}
                disabled={!tutor.id}
                className="flex-1 bg-surface-container text-on-surface py-2 rounded-lg text-sm font-bold hover:bg-surface-variant transition-colors border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Hồ sơ
              </button>
              <button onClick={() => onInterest(tutor.id)} className={`flex items-center justify-center p-2 rounded-lg border transition-colors ${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}`}>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
              </button>
          </div>
          <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected || isSelecting} className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-sm font-bold hover:bg-[#0042a3] transition-colors shadow-sm focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isSelecting ? (
              <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Đang xử lý...</>
            ) : tutor.is_selected ? 'Đã gửi yêu cầu' : 'Chọn gia sư này'}
            {!tutor.is_selected && !isSelecting && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tutor Match Card (Horizontal layout) ────────────────────────────────────
function TutorMatchCard({ tutor, formData, onSelect, onInterest, selectedForCompare, onToggleCompare, selectingTutorId }) {
  const reasons = generateAIReasons(tutor, formData);
  const isSelected = selectedForCompare?.some(t => t.id === tutor.id);
  const isSelecting = selectingTutorId === tutor.id;

  return (
    <div className="bg-surface-container-lowest rounded-[16px] p-5 flex flex-col md:flex-row gap-5 border border-surface-variant hover:border-primary/50 hover:shadow-md transition-all relative group">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative">
          <Avatar url={tutor.avatarUrl} name={tutor.name} className="w-[80px] h-[80px] border-2 border-surface shadow-sm group-hover:scale-105 transition-transform" />
          <div className="absolute bottom-0 right-0 bg-surface-container-lowest rounded-full p-0.5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
        </div>
        <ProgressRing radius={28} stroke={4} progress={tutor.matchScore || 0} />
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-on-surface line-clamp-1">{tutor.name}</h3>
              {formatRating(tutor.rating) ? (
                <div className="flex items-center gap-1 text-on-surface-variant text-xs mt-1">
                  <span className="material-symbols-outlined text-[14px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-semibold text-on-surface">{formatRating(tutor.rating)}</span>
                  <span>({tutor.reviewCount})</span>
                </div>
              ) : (
                <div className="text-on-surface-variant text-xs mt-1">Chưa có đánh giá</div>
              )}
            </div>
            
            {/* Compare Checkbox */}
            <button 
              onClick={() => onToggleCompare(tutor)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${isSelected ? 'bg-primary text-on-primary border-primary hover:bg-[#0042a3]' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-variant hover:text-on-surface'}`}
            >
              {isSelected ? (
                <><span className="material-symbols-outlined text-[14px]">check</span>Đã thêm</>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">add</span>So sánh</>
              )}
            </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">school</span> Kinh nghiệm</span>
            <span className="text-sm font-semibold text-on-surface truncate">{formatExp(tutor.experienceYears)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">payments</span> Học phí</span>
            <span className="text-sm font-bold text-emerald-700 truncate">{formatPrice(tutor.pricePerSession)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">location_on</span> Khu vực</span>
            <span className="text-sm font-semibold text-on-surface truncate">{tutor.location || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">cast_for_education</span> Hình thức</span>
            <span className="text-sm font-semibold text-on-surface truncate">
              {tutor.teachingFormats?.length > 0 ? tutor.teachingFormats.join(', ') : 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Reasons & CTA Section */}
      <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-surface-variant pt-4 md:pt-0 md:pl-5 md:w-[240px] shrink-0">
        <div>
          <h4 className="text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-[14px]">psychology</span>
            AI phân tích:
          </h4>
          <ul className="flex flex-col gap-1">
            {reasons.slice(0, 4).map((r, i) => (
              <li key={i} className="flex items-start gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[12px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="line-clamp-2">{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
              <button
                onClick={() => tutor.id && (window.location.hash = `/tutor-detail/${tutor.id}`)}
                disabled={!tutor.id}
                className="flex-1 bg-surface-container text-on-surface py-1.5 rounded-lg text-sm font-bold hover:bg-surface-variant transition-colors border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Hồ sơ
              </button>
              <button onClick={() => onInterest(tutor.id)} className={`flex items-center justify-center px-3 py-1.5 rounded-lg border transition-colors ${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}`}>
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
              </button>
          </div>
          <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected || isSelecting} className="w-full bg-surface-container-highest text-on-surface py-1.5 rounded-lg text-sm font-bold hover:bg-surface-variant transition-colors border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
            {isSelecting ? (
              <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Đang xử lý...</>
            ) : tutor.is_selected ? 'Đã gửi' : 'Chọn gia sư'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TutorMatchesPage() {
  const [formData, setFormData]       = useState(null);
  const [tutors, setTutors]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectingTutorId, setSelectingTutorId] = useState(null);
  
  // Compare state
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const handleToggleCompare = (tutor) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.some(t => t.id === tutor.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tutor.id);
      } else {
        if (prev.length >= 3) {
          alert('Chỉ có thể so sánh tối đa 3 gia sư');
          return prev;
        }
        return [...prev, tutor];
      }
    });
  };

  const handleClearCompare = () => {
    setSelectedForCompare([]);
  };

  // Filter state
  const [minPrice,   setMinPrice]     = useState('');
  const [maxPrice,   setMaxPrice]     = useState('');
  const [fmtOnline,  setFmtOnline]    = useState(true);
  const [fmtOffline, setFmtOffline]   = useState(true);
  const [minRating,  setMinRating]    = useState(0);

  // Fetch logic
  const fetchMatches = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const requestId = data?.tutorRequestId;
      if (!requestId) {
        // Không có requestId → không có session → redirect về form
        setError('NO_SESSION');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/tutor-matches/${requestId}`, {
        method:  'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'API trả về lỗi.');
      setTutors(json.data.tutors || []);
    } catch (err) {
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và thử lại.');
      console.error('[TutorMatchesPage] fetchMatches error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw  = sessionStorage.getItem('tutorRequestData');
    const data = raw ? JSON.parse(raw) : null;
    setFormData(data);
    fetchMatches(data);
  }, [fetchMatches]);

  const handleSelect = async (tutorId) => {
    if (selectingTutorId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Vui lòng đăng nhập để thực hiện chức năng này.");
        return;
      }
      
      const requestId = formData?.tutorRequestId;
      if (!requestId) {
        alert("Không tìm thấy thông tin yêu cầu.");
        return;
      }

      if (!window.confirm("Bạn có chắc chắn muốn chọn gia sư này?")) return;

      setSelectingTutorId(tutorId);
      const res = await fetch(`${API_BASE}/api/tutor-requests/${requestId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tutorId })
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        alert(json.message || "Có lỗi xảy ra khi chọn gia sư.");
        return;
      }
      
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_selected: true, status: 'pending' } : t));
      
      if (window.confirm("Đã gửi yêu cầu thành công! Bạn có muốn chuyển sang trang Quản lý yêu cầu để theo dõi không?")) {
        window.location.hash = "#/my-tutor-requests";
      }
    } catch (err) {
      console.error("[SelectTutor] Error:", err);
      alert("Lỗi kết nối đến máy chủ.");
    } finally {
      setSelectingTutorId(null);
    }
  };

  const handleInterest = async (tutorId) => {
    alert("Tính năng yêu thích đang cập nhật.");
  };

  // Client-side filtering
  const filtered = tutors.filter(t => {
    const price = parseFloat(t.pricePerSession) || 0;
    if (minPrice && price < parseFloat(minPrice)) return false;
    if (maxPrice && price > parseFloat(maxPrice)) return false;

    const rating = parseFloat(t.rating) || 0;
    if (rating < minRating) return false;

    const formats = t.teachingFormats || [];
    const isOnline = formats.some(f => f.toLowerCase().includes('trực tuyến') || f.toLowerCase().includes('online'));
    const isOffline = formats.some(f => f.toLowerCase().includes('trực tiếp') || f.toLowerCase().includes('offline'));

    if (!fmtOnline && !fmtOffline) return false;
    if (fmtOnline && !fmtOffline && !isOnline) return false;
    if (!fmtOnline && fmtOffline && !isOffline) return false;

    return true;
  });

  const bestMatch = filtered.length > 0 ? filtered[0] : null;
  const otherTutors = filtered.length > 1 ? filtered.slice(1) : [];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface py-8 relative">
      <style>{`
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .skeleton-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Filter */}
        <aside className="w-full md:w-[280px] lg:w-[300px] shrink-0 bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant shadow-sm sticky top-24 z-10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-variant">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">filter_list</span>
              Bộ lọc
            </h2>
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); setFmtOnline(true); setFmtOffline(true); setMinRating(0); }} className="text-sm font-semibold text-primary hover:text-[#0042a3] transition-colors">
              Xóa tất cả
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-on-surface">Mức giá (/buổi)</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={minPrice} 
                  onChange={e => setMinPrice(e.target.value)} 
                  placeholder="Từ" 
                  className="w-full bg-surface px-3 py-2 rounded-lg text-sm border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <span className="text-on-surface-variant">-</span>
                <input 
                  type="number" 
                  value={maxPrice} 
                  onChange={e => setMaxPrice(e.target.value)} 
                  placeholder="Đến" 
                  className="w-full bg-surface px-3 py-2 rounded-lg text-sm border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="w-full h-px bg-surface-variant" />

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-on-surface">Hình thức học</h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={fmtOffline} onChange={e => setFmtOffline(e.target.checked)} className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer" />
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors">Trực tiếp</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={fmtOnline} onChange={e => setFmtOnline(e.target.checked)} className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer" />
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors">Trực tuyến</span>
              </label>
            </div>

            <div className="w-full h-px bg-surface-variant" />

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-on-surface">Đánh giá tối thiểu</h3>
              {[0, 3, 4, 4.5].map((v) => (
                <label key={v} className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="rating" checked={minRating === v} onChange={() => setMinRating(v)} className="w-4 h-4 text-primary border-outline-variant focus:ring-primary cursor-pointer" />
                  {v === 0 ? <span className="text-sm text-on-surface group-hover:text-primary transition-colors">Tất cả</span> : (
                    <span className="flex items-center text-sm text-on-surface group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-[#F59E0B] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {v} trở lên
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 pb-20">
          
          {/* Header & Breadcrumb */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">Gia sư phù hợp với bạn</h1>
            {formData && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                <span>{filtered.length} gia sư phù hợp</span>
                <span>•</span>
                <span className="font-semibold text-primary">{formData.subject}{formData.grade ? ` - Lớp ${formData.grade}` : ''}</span>
                <span>•</span>
                <span>{formData.learningFormat === 'online' ? 'Trực tuyến' : formData.learningFormat === 'offline' ? 'Trực tiếp' : 'Tất cả hình thức'}</span>
                {(formData.budgetMin || formData.budgetMax) && (
                  <>
                    <span>•</span>
                    <span>{formData.budgetMin || 0} - {formData.budgetMax || 'Vô hạn'}đ/buổi</span>
                  </>
                )}
                <a href="#/tutor-request" className="ml-2 text-primary hover:underline font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">edit</span> Chỉnh sửa yêu cầu
                </a>
              </div>
            )}

            {/* AI Summary Short */}
            {!loading && !error && filtered.length > 0 && bestMatch && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 mt-0.5">psychology</span>
                <div>
                  <h4 className="text-sm font-bold text-blue-900 mb-1">AI nhận thấy:</h4>
                  <ul className="text-sm text-blue-800 flex flex-col md:flex-row gap-x-6 gap-y-1">
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">check</span> Gia sư cao điểm nhất đạt {bestMatch.matchScore}%</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">check</span> {filtered.filter(t => parseFloat(t.pricePerSession) <= parseFloat(formData?.budgetMax || Infinity)).length} gia sư nằm trong ngân sách</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">check</span> {filtered.filter(t => parseFloat(t.rating) >= 4.5).length} gia sư có trên 4.5★</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="flex flex-col gap-6">
              <div className="h-[260px] bg-surface-variant rounded-[16px] skeleton-pulse" />
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-[180px] bg-surface-variant rounded-[16px] skeleton-pulse" />)}
              </div>
            </div>
          )}

          {/* Error State - No Session */}
          {!loading && error === 'NO_SESSION' && (
            <div className="bg-surface-container-lowest rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 border border-surface-variant shadow-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-4xl text-primary">assignment</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface">Bạn chưa tạo yêu cầu tìm gia sư</h2>
              <p className="text-on-surface-variant max-w-md">
                Để xem danh sách gia sư phù hợp, bạn cần hoàn thành form yêu cầu trước. Hệ thống AI sẽ phân tích và gợi ý gia sư tốt nhất cho bạn!
              </p>
              <button
                onClick={() => { window.location.hash = '/tutor-request'; }}
                className="mt-2 bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-[#0042a3] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                Tạo yêu cầu tìm gia sư
              </button>
            </div>
          )}

          {/* Error State - Server Error */}
          {!loading && error && error !== 'NO_SESSION' && (
            <div className="bg-error-container text-on-error-container rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 border border-error/20">
              <span className="material-symbols-outlined text-5xl text-error">wifi_off</span>
              <h2 className="text-xl font-bold">Không thể tải danh sách gia sư</h2>
              <p className="max-w-md">{error}</p>
              <button onClick={() => fetchMatches(formData)} className="bg-error text-on-error px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2">
                Tải lại trang
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filtered.length === 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 border border-surface-variant shadow-sm">
              <div className="w-20 h-20 bg-surface-variant rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface">Không tìm thấy gia sư phù hợp</h2>
              <p className="text-on-surface-variant max-w-md">
                Hiện tại hệ thống chưa tìm thấy gia sư nào khớp với các tiêu chí lọc của bạn. Bạn hãy thử nới lỏng mức học phí hoặc thay đổi bộ lọc nhé.
              </p>
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); setFmtOnline(true); setFmtOffline(true); setMinRating(0); }} className="mt-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold hover:bg-[#0042a3] transition-colors">
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Best Match */}
          {!loading && !error && bestMatch && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Gợi ý hàng đầu
              </h2>
              <BestMatchCard 
                tutor={bestMatch} 
                formData={formData} 
                onSelect={handleSelect} 
                onInterest={handleInterest} 
                selectedForCompare={selectedForCompare} 
                onToggleCompare={handleToggleCompare} 
                selectingTutorId={selectingTutorId}
              />
            </div>
          )}

          {/* Other Tutors Grid (Horizontal list) */}
          {!loading && !error && otherTutors.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-on-surface mb-1">Các gia sư phù hợp khác</h2>
              <div className="flex flex-col gap-4">
                {otherTutors.map(t => (
                  <TutorMatchCard 
                    key={t.id} 
                    tutor={t} 
                    formData={formData}
                    onSelect={handleSelect} 
                    onInterest={handleInterest} 
                    selectedForCompare={selectedForCompare} 
                    onToggleCompare={handleToggleCompare} 
                    selectingTutorId={selectingTutorId}
                  />
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Floating Compare Bar */}
      {selectedForCompare.length >= 2 && !showCompareModal && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up w-[95%] max-w-[600px]">
          <div className="bg-surface-container-highest/95 backdrop-blur-md text-on-surface shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] rounded-2xl px-6 py-4 border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3 hidden sm:flex">
                {selectedForCompare.map(t => (
                  <Avatar key={t.id} url={t.avatarUrl} name={t.name} className="w-10 h-10 border-2 border-surface-container-highest shadow-sm relative z-10" />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">Compare ({selectedForCompare.length}/3)</span>
                <button onClick={handleClearCompare} className="text-xs text-error hover:underline text-left mt-0.5">Bỏ chọn tất cả</button>
              </div>
            </div>
            <button 
              onClick={() => setShowCompareModal(true)}
              className="bg-primary text-on-primary px-5 sm:px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#0042a3] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
              So sánh ngay
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal Component */}
      {showCompareModal && (
        <CompareModal 
          tutors={selectedForCompare} 
          onClose={() => setShowCompareModal(false)} 
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
