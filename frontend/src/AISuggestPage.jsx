import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const QUICK_PROMPTS = [
  'Tìm gia sư Toán lớp 10, dạy online',
  'Gia sư Tiếng Anh luyện IELTS',
  'Gia sư Vật Lý ôn thi THPT, giá hợp lý',
  'Gia sư Lập Trình cho người mới bắt đầu',
];

function fmtPrice(val) {
  if (!val) return 'Thỏa thuận';
  const n = Number(val);
  if (n >= 1000) return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  return `$${n}`;
}

function ResultCard({ tutor }) {
  const avatar = tutor.profile_photo_url || tutor.picture;
  const rating = Number(tutor.avg_r || 0).toFixed(1);
  const subjects = tutor.subjects
    ? tutor.subjects.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-transparent hover:border-[#00288e]/10 overflow-hidden">
      <div className="relative h-40 bg-[#edeef0]">
        {avatar ? (
          <img alt={tutor.full_name} src={avatar} className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className={`w-full h-full ${avatar ? 'hidden' : 'flex'} items-center justify-center bg-[#dde1ff]`}>
          <span className="material-symbols-outlined text-[56px] text-[#00288e]/40">person</span>
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-base font-semibold text-[#191c1e] leading-tight">{tutor.full_name}</h3>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="material-symbols-outlined text-[16px] text-[#FFB800]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-sm font-semibold text-[#191c1e]">{rating}</span>
          </div>
        </div>
        {tutor.bio && <p className="text-sm text-[#5d5f5f] mb-3 line-clamp-2">{tutor.bio}</p>}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {subjects.map(s => (
            <span key={s} className="bg-[#00288e]/10 text-[#00288e] px-2.5 py-1 rounded-full text-xs font-medium">{s}</span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-[#00288e]">
            {fmtPrice(tutor.hourly_rate)}<span className="text-xs font-normal text-[#5d5f5f]">/giờ</span>
          </span>
          <button
            onClick={() => {
              sessionStorage.setItem('viewingTutor', JSON.stringify(tutor));
              window.location.hash = `/tutor-detail/${tutor.id}`;
            }}
            className="px-4 py-2 border border-[#00288e] text-[#00288e] hover:bg-[#00288e] hover:text-white rounded-lg text-sm font-semibold transition-all"
          >
            Xem Hồ Sơ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AISuggestPage({ onGoSignIn, onGoSignUp, user }) {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply]     = useState('');
  const [tutors, setTutors]   = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSend = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setInput(prompt);
    setLoading(true);
    setSearched(true);
    setReply('');
    setTutors([]);
    try {
      const res = await fetch(`${API_BASE}/api/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Server error');
      setReply(data.reply || '');
      setTutors(Array.isArray(data.tutors) ? data.tutors : []);
    } catch (err) {
      setReply('Xin lỗi, hiện không kết nối được trợ lý AI. Vui lòng thử lại sau hoặc dùng trang Tìm Gia Sư.');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f9fb] min-h-screen text-[#191c1e] font-sans">
      {/* Header (đồng bộ style các trang Tailwind của Assigement) */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16 relative">
          <a className="flex items-center gap-2 text-2xl font-bold text-[#00288e] hover:opacity-80 transition-opacity z-10" href="#/">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            EduX
          </a>
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/find-tutors">Tìm Gia Sư</a>
            <a className="text-sm font-semibold text-[#00288e] border-b-2 border-[#00288e] pb-1" href="#/ai-suggest">AI Gợi Ý</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/become-tutor">Trở Thành Gia Sư</a>
            <a className="text-sm font-semibold text-[#444653] hover:text-[#00288e] pb-1 transition-colors" href="#/subjects">Môn Học</a>
          </nav>
          <div className="flex items-center gap-4 z-10">
            {user ? (
              <button
                onClick={() => {
                  if (user.role === 'admin') window.location.hash = '/admin';
                  else if (user.role === 'tutor') window.location.hash = '/tutor';
                  else window.location.hash = '/dashboard';
                }}
                className="hidden sm:block text-sm font-semibold text-[#00288e] hover:opacity-80"
              >
                Bảng Điều Khiển
              </button>
            ) : (
              <>
                <button onClick={onGoSignIn} className="hidden lg:flex items-center px-4 py-2 text-[#444653] hover:text-[#00288e] font-semibold text-sm">Đăng Nhập</button>
                <button onClick={onGoSignUp} className="bg-[#00288e] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all active:scale-95 shadow-sm">
                  Tham Gia Miễn Phí
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-16 max-w-[900px] mx-auto px-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#00288e]/10 text-[#00288e] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Trợ lý AI EduX
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#191c1e] mb-3">AI Gợi Ý Gia Sư</h1>
          <p className="text-[#444653] max-w-[560px] mx-auto">
            Mô tả nhu cầu học của bạn — môn học, cấp lớp, ngân sách, hình thức — AI sẽ tìm gia sư phù hợp nhất.
          </p>
        </div>

        {/* Prompt box */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5">
          <textarea
            className="w-full resize-none rounded-lg border border-[#c4c5d5] p-4 text-base focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e] transition-all"
            rows={3}
            placeholder="Ví dụ: Tìm gia sư Toán lớp 10, giá dưới 200k, dạy online..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="inline-flex items-center gap-2 bg-[#00288e] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#1e40af] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">{loading ? 'hourglass_top' : 'auto_awesome'}</span>
              {loading ? 'Đang tìm...' : 'Gợi ý cho tôi'}
            </button>
          </div>

          {/* Quick prompts */}
          {!searched && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[#757684] mb-2">Bạn có thể thử:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => handleSend(p)}
                    className="text-sm text-[#444653] bg-[#edeef0] hover:bg-[#dde1ff] hover:text-[#00288e] px-3 py-1.5 rounded-full transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-[#757684] mt-10">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Đang phân tích yêu cầu và tìm gia sư phù hợp...
          </div>
        )}

        {/* AI reply */}
        {!loading && reply && (
          <div className="mt-8 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00288e] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm px-4 py-3 text-[#191c1e] text-[15px] leading-relaxed">
              {reply}
            </div>
          </div>
        )}

        {/* Tutor results */}
        {!loading && tutors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {tutors.map(t => <ResultCard key={t.id} tutor={t} />)}
          </div>
        )}

        {/* Empty after search */}
        {!loading && searched && reply && tutors.length === 0 && (
          <div className="text-center mt-8">
            <a href="#/find-tutors" className="text-[#00288e] font-semibold text-sm hover:underline">
              Hoặc duyệt toàn bộ gia sư tại trang Tìm Gia Sư →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
