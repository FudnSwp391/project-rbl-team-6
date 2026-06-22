import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

// ─── Best-match card (featured) ───────────────────────────────────────────────
function BestMatchCard({ tutor, formData }) {
  const reasons = tutor.reasons || ["Gia sư phù hợp trong hệ thống"];

  return (
    <div className="bg-surface-container-lowest rounded-[16px] p-lg flex flex-col xl:flex-row gap-lg border border-primary shadow-[0_4px_20px_-5px_rgba(0,40,142,0.15)] relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary text-on-primary px-4 py-1.5 rounded-bl-[12px] text-label-sm font-label-md shadow-sm">
        Đề xuất tốt nhất
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center gap-sm min-w-[200px]">
        <div className="relative">
          <Avatar url={tutor.avatarUrl} name={tutor.name} className="w-[120px] h-[120px] border-4 border-surface" />
          <div className="absolute bottom-1 right-1 bg-surface-container-lowest rounded-full p-1 shadow-sm">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-headline-md font-headline-md text-on-surface">{tutor.name}</h3>
          {formatRating(tutor.rating) ? (
            <div className="flex items-center justify-center gap-1 text-on-surface-variant text-label-md mt-1">
              <span className="material-symbols-outlined text-sm text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {formatRating(tutor.rating)} ({tutor.reviewCount} đánh giá)
            </div>
          ) : (
            <div className="text-on-surface-variant text-label-sm mt-1">Chưa có đánh giá</div>
          )}
          <div className="inline-flex items-center gap-xs text-primary font-bold mt-2 bg-primary/10 px-3 py-1 rounded-full text-label-sm">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            {tutor.matchScore}% ({tutor.matchTier || 'Phù hợp'})
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-md border-t xl:border-t-0 xl:border-l border-surface-container pt-md xl:pt-0 xl:pl-lg flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">school</span> Kinh nghiệm
            </span>
            <span className="text-body-md font-headline-md text-on-surface">{formatExp(tutor.experienceYears)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">payments</span> Học phí
            </span>
            <span className="text-body-md font-headline-md text-primary">{formatPrice(tutor.pricePerSession)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span> Khu vực
            </span>
            <span className="text-body-md font-headline-md text-on-surface">{tutor.location || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">cast_for_education</span> Hình thức
            </span>
            <span className="text-body-md font-headline-md text-on-surface">
              {tutor.teachingFormats?.length > 0 ? tutor.teachingFormats.join(', ') : 'Chưa cập nhật'}
            </span>
          </div>
        </div>
        {tutor.bio && (
          <p className="text-body-md text-on-surface-variant text-sm line-clamp-3 mt-sm">{tutor.bio}</p>
        )}
      </div>

      {/* Reasons & CTA */}
      <div className="flex flex-col gap-md border-t xl:border-t-0 xl:border-l border-surface-container pt-md xl:pt-0 xl:pl-lg min-w-[210px]">
        <div>
          <h4 className="text-label-md font-label-md text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">lightbulb</span>
            Vì sao gia sư này phù hợp?
          </h4>
          <ul className="flex flex-col gap-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex gap-sm">
          <button
            onClick={() => tutor.id && (window.location.hash = `/tutor-detail/${tutor.id}`)}
            disabled={!tutor.id}
            className="flex-1 bg-surface-container text-on-surface px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-surface-variant transition-colors border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Xem hồ sơ
          </button>
          <button onClick={() => onInterest(tutor.id)} className={`flex items-center justify-center p-2.5 rounded-lg border transition-colors ${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          </button>
          <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected} className="flex-[2] bg-primary text-on-primary px-4 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors shadow-sm focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed">
            {tutor.is_selected ? 'Đã gửi yêu cầu' : 'Chọn gia sư này'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Regular tutor card ───────────────────────────────────────────────────────
function TutorCard({ tutor, onSelect, onInterest }) {
  return (
    <div className="bg-surface-container-lowest rounded-[12px] p-md border border-surface-container hover:border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-md">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-sm">
          <div className="relative">
            <Avatar url={tutor.avatarUrl} name={tutor.name} className="w-14 h-14 border border-outline-variant" />
            <div className="absolute -bottom-1 -right-1 bg-surface-container-lowest rounded-full p-0.5">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
          <div>
            <h3 className="text-label-md font-headline-md text-on-surface">{tutor.name}</h3>
            {formatRating(tutor.rating) ? (
              <div className="flex items-center gap-xs text-on-surface-variant text-label-sm mt-0.5">
                <span className="material-symbols-outlined text-sm text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                {formatRating(tutor.rating)} ({tutor.reviewCount})
              </div>
            ) : (
              <div className="text-on-surface-variant text-label-sm mt-0.5">Chưa có đánh giá</div>
            )}
          </div>
        </div>
        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-label-sm font-label-md shrink-0">
          {tutor.matchScore}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-sm">
        <div className="flex flex-col">
          <span className="text-on-surface-variant text-[11px]">Kinh nghiệm</span>
          <span className="font-medium text-on-surface">{formatExp(tutor.experienceYears)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-on-surface-variant text-[11px]">Học phí</span>
          <span className="font-medium text-primary">{formatPrice(tutor.pricePerSession)}</span>
        </div>
        {tutor.location && (
          <div className="flex flex-col col-span-2">
            <span className="text-on-surface-variant text-[11px]">Khu vực</span>
            <span className="font-medium text-on-surface">{tutor.location}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-3 border-t border-surface-container">
        <button
          onClick={() => tutor.id && (window.location.hash = `/tutor-detail/${tutor.id}`)}
          disabled={!tutor.id}
          className="flex-1 bg-surface-container text-on-surface px-2 py-2 rounded-lg text-label-sm font-label-md hover:bg-surface-variant transition-colors border border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Xem hồ sơ
        </button>
        <button onClick={() => onInterest(tutor.id)} className={`px-2 py-2 rounded-lg border flex items-center justify-center ${tutor.is_interested ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface-container text-on-surface hover:bg-surface-variant border-outline-variant'}`}>
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: tutor.is_interested ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
        </button>
        <button onClick={() => onSelect(tutor.id)} disabled={tutor.is_selected} className="flex-[1.5] bg-primary text-on-primary px-2 py-2 rounded-lg text-label-sm font-label-md hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {tutor.is_selected ? 'Đã gửi' : 'Chọn gia sư'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TutorMatchesPage() {
  const [formData, setFormData]       = useState(null);
  const [tutors, setTutors]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // client-side filter state
  const [fmtOnline,  setFmtOnline]    = useState(true);
  const [fmtOffline, setFmtOffline]   = useState(true);
  const [minRating,  setMinRating]    = useState(0);


  const handleSelect = async (tutorId) => {
    const requestId = formData?.tutorRequestId;
    if (!requestId) return;
    try {
      const res = await fetch(`${API_BASE}/api/tutor-requests/${requestId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Có lỗi xảy ra');
        return;
      }
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_selected: true, status: 'pending' } : t));
      alert('Đã gửi yêu cầu thành công!');
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

  const handleInterest = async (tutorId) => {
    const requestId = formData?.tutorRequestId;
    if (!requestId) return;
    try {
      await fetch(`${API_BASE}/api/tutor-requests/${requestId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId })
      });
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_interested: !t.is_interested } : t));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch from real API
  const fetchMatches = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const requestId = data?.tutorRequestId;
      if (!requestId) {
        throw new Error("Không tìm thấy thông tin yêu cầu tìm gia sư.");
      }

      const res = await fetch(`${API_BASE}/api/tutor-matches/${requestId}`, {
        method:  'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
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

  // Client-side filtering
  const filtered = tutors.filter(t => {
    if (!fmtOnline || !fmtOffline) {
      const m = (t.teachingFormats || []).join(' ').toLowerCase();
      const hasOnline  = m.includes('online')  || m.includes('tuyến');
      const hasOffline = m.includes('offline') || m.includes('tiếp');
      if (fmtOnline && !fmtOffline && !hasOnline)  return false;
      if (!fmtOnline && fmtOffline && !hasOffline) return false;
    }
    if (minRating > 0 && t.rating < minRating) return false;
    return true;
  });

  const bestMatch   = filtered[0] || null;
  const otherTutors = filtered.slice(1);

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md flex flex-col pb-24">
      {/* Header */}
      <header className="bg-surface-container-lowest shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-lg max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-md">
            <span className="text-headline-md font-headline-md text-primary font-bold">EduX</span>
            <nav className="hidden md:flex items-center gap-md ml-lg">
              <a className="text-primary border-b-2 border-primary pb-1 text-label-md font-label-md" href="#/find-tutors">Tìm gia sư</a>
              <a className="text-on-surface-variant text-label-md font-label-md hover:text-primary transition-colors" href="#">Buổi học của tôi</a>
            </nav>
          </div>
          <div className="flex items-center gap-md">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input className="pl-10 pr-4 py-2 border border-outline rounded-lg focus:outline-none focus:border-primary focus:ring-2 w-64 text-body-md bg-surface" placeholder="Tìm kiếm gia sư..." type="text"/>
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-outline-variant flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-container-max mx-auto w-full px-lg py-md flex gap-lg relative">
        {/* Sidebar Filters */}
        <aside className="hidden lg:flex flex-col p-md gap-sm bg-surface-container-lowest h-[calc(100vh-80px)] w-[280px] sticky top-[80px] rounded-xl border border-surface-container overflow-y-auto">
          <div className="mb-sm flex justify-between items-center border-b border-surface-container pb-sm">
            <h2 className="text-headline-sm font-headline-md text-on-surface">Bộ lọc</h2>
            <button
              className="text-primary text-label-sm font-label-md hover:underline"
              onClick={() => { setFmtOnline(true); setFmtOffline(true); setMinRating(0); }}
            >
              Xóa tất cả
            </button>
          </div>

          <div className="flex flex-col gap-md">
            {/* Mức giá */}
            <div className="flex flex-col gap-xs">
              <h3 className="text-label-md font-headline-md text-on-surface">Mức giá (/buổi)</h3>
              <div className="flex items-center gap-2 mt-2">
                <input className="w-full p-2 border border-outline rounded-lg text-body-md text-center bg-surface" readOnly type="text" value={formData?.budgetMin || '0'}/>
                <span className="text-on-surface-variant">-</span>
                <input className="w-full p-2 border border-outline rounded-lg text-body-md text-center bg-surface" readOnly type="text" value={formData?.budgetMax || '∞'}/>
              </div>
            </div>

            {/* Hình thức */}
            <div className="flex flex-col gap-xs border-t border-surface-container pt-md">
              <h3 className="text-label-md font-headline-md text-on-surface mb-2">Hình thức học</h3>
              <label className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
                <input checked={fmtOffline} onChange={e => setFmtOffline(e.target.checked)} className="rounded border-outline text-primary focus:ring-primary w-4 h-4" type="checkbox"/> Trực tiếp
              </label>
              <label className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
                <input checked={fmtOnline} onChange={e => setFmtOnline(e.target.checked)} className="rounded border-outline text-primary focus:ring-primary w-4 h-4" type="checkbox"/> Trực tuyến
              </label>
            </div>

            {/* Đánh giá */}
            <div className="flex flex-col gap-xs border-t border-surface-container pt-md">
              <h3 className="text-label-md font-headline-md text-on-surface mb-2">Đánh giá tối thiểu</h3>
              {[{ v: 0, label: 'Tất cả' }, { v: 3, label: '3 trở lên' }, { v: 4, label: '4 trở lên' }, { v: 4.5, label: '4.5 trở lên' }].map(({ v, label }) => (
                <label key={v} className="flex items-center gap-2 text-body-md text-on-surface cursor-pointer">
                  <input checked={minRating === v} onChange={() => setMinRating(v)} className="border-outline text-primary focus:ring-primary w-4 h-4" name="rating" type="radio"/>
                  {v === 0 ? label : (
                    <span className="flex items-center">
                      <span className="material-symbols-outlined text-sm text-[#F59E0B] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {label}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-md sticky bottom-0 bg-surface-container-lowest pb-2">
            <button
              onClick={() => fetchMatches(formData)}
              className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors focus:ring-2 focus:ring-primary/50"
            >
              Tải lại kết quả
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col gap-lg pb-xl max-w-[1000px]">
          {/* Breadcrumb + title */}
          <div className="flex flex-col gap-base">
            <nav className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-xs">
              <a className="hover:text-primary transition-colors" href="#">Trang chủ</a>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <a className="hover:text-primary transition-colors" href="#/tutor-request">Tìm gia sư</a>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-on-surface">Kết quả</span>
            </nav>
            <div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Gia sư phù hợp với bạn</h1>
              {!loading && !error && (
                <p className="text-body-md font-body-md text-on-surface-variant">
                  {filtered.length > 0
                    ? `Tìm thấy ${filtered.length} gia sư phù hợp với nhu cầu của bạn.`
                    : 'Chưa tìm thấy gia sư phù hợp với bộ lọc hiện tại.'}
                </p>
              )}
            </div>

            {/* Request summary */}
            {formData && (
              <div className="flex flex-wrap items-center justify-between gap-md bg-surface-container-lowest p-md rounded-xl border border-surface-container mt-base">
                <div className="flex flex-wrap gap-sm">
                  {formData.subject && (
                    <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-label-md border border-outline-variant">
                      {formData.subject}{formData.grade ? ` – Lớp ${formData.grade}` : ''}
                    </span>
                  )}
                  {formData.learningFormat && (
                    <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-label-md border border-outline-variant">
                      {formData.learningFormat === 'online' ? 'Học trực tuyến' : formData.learningFormat === 'offline' ? 'Học trực tiếp' : 'Cả hai'}
                    </span>
                  )}
                  {formData.learningFormat !== 'online' && formData.city && (
                    <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-label-md border border-outline-variant">
                      {formData.district ? `${formData.district}, ` : ''}{formData.city}
                    </span>
                  )}
                  {(formData.budgetMin || formData.budgetMax) && (
                    <span className="px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-label-md border border-outline-variant">
                      {formData.budgetMin || 0} – {formData.budgetMax || '∞'}đ/buổi
                    </span>
                  )}
                </div>
                <button onClick={() => window.location.hash = '/tutor-request'} className="text-primary hover:underline text-label-md font-label-md flex items-center gap-xs shrink-0">
                  <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa yêu cầu
                </button>
              </div>
            )}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-2xl gap-md">
              <div className="w-12 h-12 border-4 border-surface-variant border-t-primary rounded-full animate-spin" />
              <p className="text-on-surface-variant text-body-md">Đang tìm gia sư phù hợp...</p>
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-2xl gap-md text-center">
              <span className="material-symbols-outlined text-6xl text-error">wifi_off</span>
              <h2 className="text-headline-md font-headline-md text-on-surface">Không thể tải dữ liệu</h2>
              <p className="text-body-md text-on-surface-variant max-w-md">{error}</p>
              <button onClick={() => fetchMatches(formData)} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors">
                Thử lại
              </button>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-2xl gap-md text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant">search_off</span>
              <h2 className="text-headline-md font-headline-md text-on-surface">Chưa tìm thấy gia sư phù hợp</h2>
              <p className="text-body-md text-on-surface-variant max-w-md">
                Hệ thống chưa có gia sư khớp với yêu cầu của bạn. Hãy thử chỉnh sửa yêu cầu hoặc mở rộng bộ lọc.
              </p>
              <button onClick={() => window.location.hash = '/tutor-request'} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors">
                Chỉnh sửa yêu cầu
              </button>
            </div>
          )}

          {/* ── Best match ── */}
          {!loading && !error && bestMatch && (
            <section className="flex flex-col gap-md mt-md">
              <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Gợi ý hàng đầu
              </h2>
              <BestMatchCard tutor={bestMatch} formData={formData} />
            </section>
          )}

          {/* ── Other tutors ── */}
          {!loading && !error && otherTutors.length > 0 && (
            <section className="flex flex-col gap-md mt-lg">
              <h2 className="text-headline-md font-headline-md text-on-surface">Các gia sư phù hợp khác</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-md">
                {otherTutors.map(t => <TutorCard key={t.id} tutor={t} onSelect={handleSelect} onInterest={handleInterest} />)}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
