import React, { useState, useEffect } from 'react';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') return 'Thỏa thuận';
  const p = parseFloat(price);
  if (isNaN(p)) return 'Thỏa thuận';
  return p.toLocaleString('vi-VN') + 'đ/buổi';
};

const formatRating = (r) => (r > 0 ? parseFloat(r).toFixed(1) : null);

const formatExp = (y) => {
  const years = parseInt(y);
  if (isNaN(years) || years === 0) return 'Chưa có kinh nghiệm';
  return years + ' năm';
};

function Avatar({ url, name, className }) {
  if (url) return <img src={url} alt={name} className={`object-cover rounded-full ${className}`} />;
  return (
    <div className={`flex items-center justify-center bg-primary-container text-on-primary-container rounded-full font-bold ${className}`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function ProgressBar({ value, max = 100, colorClass = "bg-primary" }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(max > 0 ? Math.min((value / max) * 100, 100) : 0), 100);
    return () => clearTimeout(timer);
  }, [value, max]);
  
  return (
    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
        style={{ width: `${width}%` }} 
      />
    </div>
  );
}

function Stars({ rating }) {
  const r = parseFloat(rating) || 0;
  const full = Math.floor(r);
  const half = r - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="material-symbols-outlined text-amber-400 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      ))}
      {half && (
        <span className="material-symbols-outlined text-amber-400 text-[16px]">star_half</span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="material-symbols-outlined text-surface-variant text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>
      ))}
    </span>
  );
}

function FormatChip({ format }) {
  let icon = 'cast_for_education';
  let color = 'bg-surface-variant text-on-surface-variant';
  
  if (format.toLowerCase().includes('trực tuyến') || format.toLowerCase().includes('online')) {
    icon = 'videocam';
    color = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (format.toLowerCase().includes('trực tiếp') || format.toLowerCase().includes('offline')) {
    icon = 'location_on';
    color = 'bg-orange-50 text-orange-700 border-orange-200';
  } else {
    color = 'bg-purple-50 text-purple-700 border-purple-200';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      {format}
    </span>
  );
}

export default function CompareModal({ tutors, onClose, onSelect }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!tutors || tutors.length === 0) return null;
  const count = tutors.length;

  // Calculate bests
  const maxScore = Math.max(...tutors.map(t => t.matchScore || 0));
  const maxRating = Math.max(...tutors.map(t => parseFloat(t.rating) || 0));
  const maxExp = Math.max(...tutors.map(t => parseInt(t.experienceYears) || 0));
  const prices = tutors.map(t => { const p = parseFloat(t.pricePerSession); return isNaN(p) ? Infinity : p; });
  const minPrice = Math.min(...prices);
  
  const bestTutor = tutors.reduce((a, b) => ((b.matchScore || 0) > (a.matchScore || 0) ? b : a), tutors[0]);

  const getHighlightClass = (tutor, type) => {
    switch (type) {
      case 'score': return tutor.matchScore === maxScore ? 'bg-blue-50/70 border-l-2 border-blue-500' : 'bg-transparent';
      case 'rating': return parseFloat(tutor.rating) === maxRating && maxRating > 0 ? 'bg-yellow-50/70 border-l-2 border-yellow-400' : 'bg-transparent';
      case 'price': return parseFloat(tutor.pricePerSession) === minPrice ? 'bg-emerald-50/70 border-l-2 border-emerald-500' : 'bg-transparent';
      case 'exp': return parseInt(tutor.experienceYears) === maxExp && maxExp > 0 ? 'bg-sky-50/70 border-l-2 border-sky-400' : 'bg-transparent';
      default: return 'bg-transparent';
    }
  };

  const getAIChatGptAnalysis = () => {
    const strengths = [];
    if (bestTutor.matchScore === maxScore) strengths.push('Có mức độ phù hợp cao nhất dựa trên yêu cầu của bạn.');
    if (parseFloat(bestTutor.rating) === maxRating && maxRating > 0) strengths.push('Được đánh giá (Rating) cao nhất trong nhóm.');
    if (parseFloat(bestTutor.pricePerSession) === minPrice) strengths.push('Mức học phí tiết kiệm nhất.');
    if (parseInt(bestTutor.experienceYears) === maxExp && maxExp > 0) strengths.push('Nhiều kinh nghiệm giảng dạy nhất.');
    
    // Fallbacks from reasons
    if (strengths.length < 2 && bestTutor.reasons) {
        bestTutor.reasons.slice(0, 2).forEach(r => strengths.push(r));
    }

    let comparisons = [];
    const others = tutors.filter(t => t.id !== bestTutor.id);
    if (others.length > 0) {
        others.forEach(other => {
            const reasons = [];
            if (bestTutor.matchScore > other.matchScore) reasons.push(`mức độ phù hợp cao hơn (${bestTutor.matchScore}% so với ${other.matchScore}%)`);
            
            const pA = parseFloat(bestTutor.pricePerSession);
            const pB = parseFloat(other.pricePerSession);
            if (!isNaN(pA) && !isNaN(pB) && pA < pB) reasons.push(`học phí tiết kiệm hơn`);
            
            const rA = parseFloat(bestTutor.rating) || 0;
            const rB = parseFloat(other.rating) || 0;
            if (rA > rB) reasons.push(`đánh giá tốt hơn (${rA}★ so với ${rB}★)`);
            
            const eA = parseInt(bestTutor.experienceYears) || 0;
            const eB = parseInt(other.experienceYears) || 0;
            if (eA > eB) reasons.push(`nhiều kinh nghiệm hơn (${eA} năm so với ${eB} năm)`);
            
            if (reasons.length > 0) {
               comparisons.push(`**Vì sao chọn ${bestTutor.name} thay vì ${other.name}?** Vì ${bestTutor.name} có ${reasons.join(', ')}.`);
            } else {
               const pACheck = isNaN(pA) ? Infinity : pA;
               const pBCheck = isNaN(pB) ? Infinity : pB;
               if (pACheck > pBCheck) {
                  comparisons.push(`**So sánh với ${other.name}:** Tuy ${bestTutor.name} có mức phí cao hơn, nhưng thuật toán đánh giá đây là hồ sơ mang lại giá trị tương xứng nhất với yêu cầu học tập của bạn.`);
               } else {
                  comparisons.push(`**So sánh với ${other.name}:** Cả hai đều xuất sắc, nhưng ${bestTutor.name} nhỉnh hơn một chút về độ phù hợp tổng thể.`);
               }
            }
        });
    }

    return { bestTutor, strengths, comparisons };
  };

  const aiAnalysis = getAIChatGptAnalysis();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Modal Window */}
      <div 
        className={`relative z-10 w-full max-w-[80vw] max-h-[90vh] bg-surface-container-lowest rounded-[20px] shadow-2xl flex flex-col overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}`}
      >
        {/* Header (Fixed) */}
        <div className="shrink-0 px-6 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-lowest z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">compare_arrows</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface leading-tight">So sánh gia sư</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-surface relative">
          
          {/* Compact Sticky Header for Table */}
          <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md pt-3 pb-3 px-8 border-b border-surface-variant shadow-sm">
            <div className={`grid gap-6`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
              <div className="flex items-end pb-1"><span className="text-sm font-bold text-on-surface-variant">Thông số so sánh</span></div>
              {tutors.map(t => {
                const isBest = t.matchScore === maxScore;
                return (
                  <div key={t.id} className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar url={t.avatarUrl} name={t.name} className={`w-12 h-12 border-2 ${isBest ? 'border-primary' : 'border-surface'} shadow-sm mb-1.5`} />
                      {isBest && (
                        <div className="absolute -top-1 -right-2 bg-primary text-on-primary rounded-full w-5 h-5 flex items-center justify-center shadow-sm" title="Đề xuất tốt nhất">
                          <span className="material-symbols-outlined text-[12px]">stars</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{t.name}</h3>
                    <div className="w-full flex gap-2 mt-2">
                      <button onClick={() => window.location.hash = `/tutor-detail/${t.id}`} className="flex-1 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors" title="Xem hồ sơ">
                        Hồ sơ
                      </button>
                      <button onClick={() => { onSelect(t.id); onClose(); }} className={`flex-[1.5] py-1.5 rounded-lg text-xs font-bold transition-colors ${isBest ? 'bg-primary text-on-primary hover:bg-[#0042a3] shadow-sm' : 'bg-surface-container-highest text-on-surface hover:bg-surface-variant'}`}>
                        Chọn gia sư
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-8 py-6 flex flex-col gap-8">
            
            {/* Comparison Table */}
            <div className="flex flex-col gap-6">
              
              {/* Group E: Tổng quan (New) */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                 <div className="bg-surface-container px-6 py-2 border-b border-surface-variant">
                   <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                     A. Giới thiệu tổng quan
                   </h4>
                 </div>
                 <div className="flex flex-col">
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Tiêu đề</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm font-bold text-primary`} >
                           {t.headline || 'Chưa cập nhật'}
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex border-r border-surface-variant bg-surface/30">Giới thiệu ngắn</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm italic text-on-surface-variant`} title={t.bio}>
                           "{t.bio || 'Chưa có thông tin giới thiệu'}"
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Group A */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                 <div className="bg-surface-container px-6 py-2 border-b border-surface-variant">
                   <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
                     B. Mức độ phù hợp
                   </h4>
                 </div>
                 <div className="flex flex-col">
                    {/* Row: Match Score */}
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Match Score</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 flex flex-col justify-center gap-1 ${getHighlightClass(t, 'score')}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{t.matchScore}%</span>
                            {t.matchScore === maxScore && <span className="material-symbols-outlined text-blue-600 text-[18px]">verified</span>}
                          </div>
                          <ProgressBar value={t.matchScore} max={100} colorClass={t.matchScore === maxScore ? 'bg-blue-500' : 'bg-surface-variant-dark'} />
                        </div>
                      ))}
                    </div>
                    {/* Row: Phân loại */}
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Phân loại</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 flex items-center`} >
                          <span className="px-2.5 py-0.5 bg-surface-container rounded-md text-xs font-bold text-on-surface">{t.matchTier || 'Phù hợp'}</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Group B */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                 <div className="bg-surface-container px-6 py-2 border-b border-surface-variant">
                   <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[18px]">school</span>
                     C. Chuyên môn
                   </h4>
                 </div>
                 <div className="flex flex-col">
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Kinh nghiệm</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 flex items-center gap-2 ${getHighlightClass(t, 'exp')}`}>
                          <span className="material-symbols-outlined text-sky-600 text-[16px]">workspace_premium</span>
                          <span className="font-bold text-sm text-on-surface">{formatExp(t.experienceYears)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Môn học</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm`} >
                           {t.subjects?.length > 0 ? t.subjects.join(', ') : 'Chưa cập nhật'}
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Đối tượng dạy</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm`} >
                           {t.suitableStudents?.length > 0 ? t.suitableStudents.join(', ') : 'Chưa cập nhật'}
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Group C */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                 <div className="bg-surface-container px-6 py-2 border-b border-surface-variant">
                   <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[18px]">star</span>
                     D. Chất lượng
                   </h4>
                 </div>
                 <div className="flex flex-col">
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Rating</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 flex flex-col justify-center gap-1 ${getHighlightClass(t, 'rating')}`}>
                           {formatRating(t.rating) ? (
                             <>
                               <div className="flex items-end gap-1.5">
                                 <span className="font-bold text-base text-amber-600">{formatRating(t.rating)}</span>
                                 <span className="text-xs text-on-surface-variant mb-0.5">/ 5.0</span>
                               </div>
                               <Stars rating={t.rating} />
                             </>
                           ) : <span className="text-sm text-on-surface-variant">Chưa có đánh giá</span>}
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Lượt đánh giá</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm`} >
                           {t.reviewCount || 0} nhận xét
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Group D */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
                 <div className="bg-surface-container px-6 py-2 border-b border-surface-variant">
                   <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                     E. Điều kiện học
                   </h4>
                 </div>
                 <div className="flex flex-col">
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Học phí</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 ${getHighlightClass(t, 'price')}`}>
                          <span className="font-bold text-sm text-emerald-700">{formatPrice(t.pricePerSession)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Hình thức học</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 flex flex-wrap gap-1.5`} >
                           {t.teachingFormats?.length > 0 ? (
                             t.teachingFormats.map((fmt, idx) => <FormatChip key={idx} format={fmt} />)
                           ) : <span className="text-sm">Chưa cập nhật</span>}
                        </div>
                      ))}
                    </div>
                    <div className={`grid border-b border-surface-variant last:border-0`} style={{ gridTemplateColumns: `200px repeat(${count}, minmax(0, 1fr))`}}>
                      <div className="px-6 py-3 font-semibold text-sm text-on-surface-variant flex items-center border-r border-surface-variant bg-surface/30">Khu vực</div>
                      {tutors.map((t, i) => (
                        <div key={i} className={`px-6 py-3 border-r border-surface-variant last:border-0 text-sm`} >
                           {t.location || 'Chưa cập nhật'}
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

            </div>

            {/* AI Recommendation (Expandable at the bottom) */}
            <div className="bg-surface-container-lowest rounded-xl border border-blue-200 overflow-hidden shadow-sm mt-2">
              <details className="group">
                <summary className="bg-blue-50/80 hover:bg-blue-50 px-6 py-3.5 flex items-center justify-between cursor-pointer list-none transition-colors select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
                    </div>
                    <h3 className="font-bold text-blue-900 text-sm">AI Trợ lý tư vấn: Đề xuất & Phân tích chuyên sâu</h3>
                  </div>
                  <span className="material-symbols-outlined text-blue-700 transition-transform duration-300 group-open:-rotate-180">expand_more</span>
                </summary>
                <div className="p-6 text-on-surface flex flex-col gap-4 text-sm leading-relaxed bg-surface-container-lowest border-t border-blue-100">
                   <p>
                     Gia sư <strong className="text-blue-700">{aiAnalysis.bestTutor.name}</strong> đạt mức độ phù hợp cao nhất (<strong className="text-blue-700">{aiAnalysis.bestTutor.matchScore}%</strong>).
                   </p>
                   <div>
                     <p className="font-bold mb-2">Điểm mạnh:</p>
                     <ul className="flex flex-col gap-2 pl-2">
                       {aiAnalysis.strengths.map((s, i) => (
                         <li key={i} className="flex items-start gap-2">
                           <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check</span>
                           <span>{s}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                   <p className="mt-2 text-on-surface-variant italic border-l-4 border-blue-300 pl-3 py-1">
                     Dựa trên thuật toán AI, đây là ứng viên sáng giá nhất để bạn ưu tiên. Dưới đây là phân tích chi tiết so với các gia sư khác:
                   </p>
                   {aiAnalysis.comparisons && aiAnalysis.comparisons.length > 0 && (
                     <ul className="mt-1 flex flex-col gap-2">
                       {aiAnalysis.comparisons.map((comp, idx) => (
                         <li key={idx} className="text-on-surface-variant italic border-l-4 border-amber-300 pl-3 py-1 bg-amber-50/30" dangerouslySetInnerHTML={{ __html: comp.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-800">$1</strong>') }} />
                       ))}
                     </ul>
                   )}
                </div>
              </details>
            </div>

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
