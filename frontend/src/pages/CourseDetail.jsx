import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CAT_STYLE = {
  'Kỹ Thuật Phần Mềm': { gradient: 'linear-gradient(135deg,#0ea5e9,#1e3a8a)', icon: 'code' },
  'Toán Học':          { gradient: 'linear-gradient(135deg,#6366f1,#312e81)', icon: 'calculate' },
  'Ngoại Ngữ':         { gradient: 'linear-gradient(135deg,#f59e0b,#b45309)', icon: 'translate' },
  'Vi Mạch':           { gradient: 'linear-gradient(135deg,#10b981,#065f46)', icon: 'memory' },
  _default:            { gradient: 'linear-gradient(135deg,#3b82f6,#1e3a8a)', icon: 'school' },
};

function fmtVnd(v) {
  if (!v || Number(v) === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(Number(v)) + ' đ';
}

function Stars({ value, size = 18 }) {
  const r = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: size, color: i <= r ? '#f5a623' : '#d1d5db', fontVariationSettings: i <= r ? "'FILL' 1" : "'FILL' 0" }}>star</span>
      ))}
    </span>
  );
}

export default function CourseDetail({ courseId }) {
  const { user, token } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [enrolled, setEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const id = courseId || window.location.hash.match(/#\/course\/([^/]+)/)?.[1];
    if (!id) { setError('Không tìm thấy ID khóa học.'); setLoading(false); return; }

    fetch(`${API_BASE}/api/courses/${id}`)
      .then(r => { if (!r.ok) throw new Error('Không tìm thấy khóa học.'); return r.json(); })
      .then(d => { setCourse(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });

    if (user && token) {
      fetch(`${API_BASE}/api/courses/${id}/enrollment-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => { if (d.enrolled) setEnrolled(true); })
      .catch(console.error);
    }
  }, [courseId, user, token]);

  const handleEnroll = async () => {
    if (!user) {
      window.location.hash = '#/signin';
      return;
    }
    
    if (course && course.tutor_id === user.userId) {
      setToast('Bạn không thể đăng ký khóa học của chính mình.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setEnrollLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${course.id}/enroll`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi đăng ký khóa học.');
      
      setEnrolled(true);
      setToast('Đăng ký khóa học thành công!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast(err.message);
      setTimeout(() => setToast(''), 3000);
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#5d5f5f] font-medium">Đang tải khóa học...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[64px] text-[#9aa3b8]">error_outline</span>
        <p className="text-[#5d5f5f] text-lg">{error}</p>
        <button onClick={() => window.location.hash = '#/courses'} className="px-6 py-3 bg-[#00288e] text-white rounded-xl font-semibold hover:bg-[#001d6e] transition-colors">
          ← Quay lại danh sách
        </button>
      </div>
    </div>
  );

  const c = course;
  const catStyle = CAT_STYLE[c.subject] || CAT_STYLE._default;
  const discount = c.original_price && c.original_price > c.price
    ? Math.round((1 - c.price / c.original_price) * 100) : 0;
  const lessons = c.lessons || [];
  const outcomes = Array.isArray(c.learning_outcomes) ? c.learning_outcomes : [];
  const requirements = Array.isArray(c.requirements) ? c.requirements : [];

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center gap-6">
          <a href="#/" className="flex items-center gap-2 text-2xl font-extrabold text-[#00288e] shrink-0">
            <span className="material-symbols-outlined text-[#00288e]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>EduX
          </a>
          <nav className="hidden md:flex items-center gap-7 ml-auto text-sm font-semibold">
            <a href="#/" className="text-[#5d5f5f] hover:text-[#00288e] transition-colors">Trang chủ</a>
            <a href="#/courses" className="text-[#00288e]">Khóa học</a>
            <a href="#/find-tutors" className="text-[#5d5f5f] hover:text-[#00288e] transition-colors">Tìm gia sư</a>
          </nav>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#757684] mb-6">
          <a href="#/courses" className="hover:text-[#00288e] transition-colors">Khóa học</a>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          <span className="text-[#191c1e] font-semibold">{c.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Main content */}
          <div className="flex-grow min-w-0 space-y-6">
            {/* Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ background: catStyle.gradient }}>
              <span className="material-symbols-outlined absolute select-none" style={{ right: -20, bottom: -30, fontSize: 200, color: 'rgba(255,255,255,0.08)' }}>{catStyle.icon}</span>
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt={c.title} className="w-full h-[280px] object-cover" />
              ) : (
                <div className="w-full h-[280px] flex items-center justify-center">
                  <div className="relative z-10 text-center px-8">
                    <span className="material-symbols-outlined text-white/30" style={{ fontSize: 80 }}>{catStyle.icon}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <span className="inline-block text-[10px] font-bold tracking-wider uppercase bg-white/20 text-white px-3 py-1 rounded-full mb-3">{c.subject || 'Khóa học'}</span>
                <h1 className="text-white font-extrabold text-2xl md:text-3xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>{c.title}</h1>
              </div>
            </div>

            {/* Tutor info bar */}
            <div className="flex items-center gap-4 bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-sm">
              {c.tutor_picture ? (
                <img src={c.tutor_picture} alt={c.tutor_name} className="w-12 h-12 rounded-full object-cover border-2 border-[#00288e]/20" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#00288e]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 28 }}>person</span>
                </div>
              )}
              <div>
                <p className="text-sm text-[#757684]">Giảng viên</p>
                <p className="font-bold text-[#191c1e]">{c.tutor_name || 'Chưa cập nhật'}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Stars value={Number(c.avg_rating) || 0} />
                  <span className="font-bold text-sm text-[#191c1e]">{Number(c.avg_rating || 0).toFixed(1)}</span>
                  {c.review_count > 0 && <span className="text-[#757684] text-xs">({c.review_count} đánh giá)</span>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-[#e5e7eb] flex">
                {[['overview', 'Tổng quan'], ['lessons', `Bài học (${lessons.length})`], ['info', 'Thông tin thêm']].map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`px-6 py-4 text-sm font-semibold transition-colors ${activeTab === key ? 'text-[#00288e] border-b-2 border-[#00288e]' : 'text-[#757684] hover:text-[#00288e]'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#191c1e] mb-3">Mô tả khóa học</h2>
                      <p className="text-[#444653] leading-relaxed whitespace-pre-line">{c.description || 'Chưa có mô tả cho khóa học này.'}</p>
                    </div>
                    {outcomes.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#191c1e] mb-3">Bạn sẽ học được gì?</h2>
                        <div className="grid md:grid-cols-2 gap-3">
                          {outcomes.map((o, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[#16a34a] mt-0.5" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="text-[#444653] text-sm">{o}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {requirements.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#191c1e] mb-3">Yêu cầu</h2>
                        <ul className="space-y-2">
                          {requirements.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[#f59e0b] mt-0.5" style={{ fontSize: 20 }}>arrow_right</span>
                              <span className="text-[#444653] text-sm">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'lessons' && (
                  <div className="space-y-3">
                    {lessons.length === 0 ? (
                      <div className="text-center py-12 text-[#757684]">
                        <span className="material-symbols-outlined text-[48px] text-[#d1d5db] block mb-3">library_books</span>
                        <p>Chưa có bài học nào được thêm vào khóa học này.</p>
                      </div>
                    ) : lessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-4 p-4 bg-[#f8f9fb] rounded-xl border border-[#e5e7eb] hover:border-[#00288e]/30 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#00288e]/10 flex items-center justify-center shrink-0">
                          <span className="text-[#00288e] font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold text-[#191c1e] text-sm">{lesson.title}</p>
                          {lesson.description && <p className="text-[#757684] text-xs mt-0.5 line-clamp-1">{lesson.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {lesson.duration_label && <span className="text-xs text-[#757684]">{lesson.duration_label}</span>}
                          {lesson.is_preview ? (
                            <span className="text-[10px] font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded-full">Xem trước</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#9aa3b8]" style={{ fontSize: 18 }}>lock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'info' && (
                  <div className="space-y-4">
                    {[
                      ['Cấp độ', c.level],
                      ['Đối tượng', c.target_students],
                      ['Ngôn ngữ', c.language],
                      ['Hình thức', c.learning_mode],
                      ['Nền tảng', c.platform],
                      ['Phương pháp giảng dạy', c.teaching_method],
                      ['Mục tiêu học tập', c.learning_goal],
                      ['Kết quả mong đợi', c.expected_outcome],
                      ['Khu vực', [c.city, c.district].filter(Boolean).join(', ')],
                    ].filter(([, v]) => v && v.toString().trim()).map(([label, value]) => (
                      <div key={label} className="flex items-start border-b border-[#f0f1f3] pb-3 last:border-0">
                        <span className="w-48 text-sm text-[#757684] shrink-0">{label}</span>
                        <span className="text-sm text-[#191c1e] font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar: Price & actions */}
          <div className="w-full lg:w-[340px] shrink-0 space-y-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm sticky top-[88px]">
              {/* Price */}
              <div className="mb-5">
                {c.original_price > c.price && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#9aa3b8] text-base line-through">{fmtVnd(c.original_price)}</span>
                    {discount > 0 && <span className="text-[#16a34a] text-sm font-bold bg-[#16a34a]/10 px-2 py-0.5 rounded-full">-{discount}%</span>}
                  </div>
                )}
                <div className="text-[#00288e] font-extrabold text-3xl">{fmtVnd(c.price)}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ['play_lesson', `${c.total_lessons || lessons.length || 0} bài học`],
                  ['schedule', c.session_duration ? `${c.session_duration} phút/buổi` : (c.duration || 'Linh hoạt')],
                  ['group', c.class_type || '1-on-1'],
                  ['bar_chart', c.level || 'Tất cả'],
                ].map(([icon, text], i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-[#f8f9fb] rounded-xl">
                    <span className="material-symbols-outlined text-[#00288e]" style={{ fontSize: 20 }}>{icon}</span>
                    <span className="text-xs text-[#444653] font-medium">{text}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {enrolled ? (
                <button onClick={() => window.location.hash = '#/my-courses'} className="w-full py-3.5 rounded-xl bg-[#16a34a] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#15803d] transition-colors mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                  Đã đăng ký (Đến lớp học)
                </button>
              ) : (
                <button onClick={handleEnroll} disabled={enrollLoading} className={`w-full py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all mb-3 ${enrollLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#1e40af] to-[#3b6fe0] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(59,111,224,0.6)]'}`}>
                  {enrollLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_cart</span>
                      Đăng ký khóa học
                    </>
                  )}
                </button>
              )}
              <button onClick={() => window.location.hash = '#/courses'} className="w-full py-3 rounded-xl border-2 border-[#00288e] text-[#00288e] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00288e]/5 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#1e40af] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>{toast}
        </div>
      )}
    </div>
  );
}
