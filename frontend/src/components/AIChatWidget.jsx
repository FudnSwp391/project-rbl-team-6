import { useState, useRef, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const GREETING = {
  role: 'ai',
  text: 'Xin chào 👋 Mình là trợ lý EduX. Bạn cần tìm gia sư môn gì? (vd: "Gia sư Toán lớp 10 dạy online")',
};

const QUICK = ['Gia sư Toán online', 'Gia sư Tiếng Anh IELTS', 'Gia sư Vật Lý ôn thi'];

function fmtPrice(v) {
  if (!v) return 'Thỏa thuận';
  const n = Number(v);
  return n >= 1000 ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : `$${n}`;
}

// Các trang KHÔNG hiện bong bóng (đăng nhập + khu dashboard/đã đăng nhập)
const HIDDEN_SEGMENTS = new Set([
  'signin', 'signup', 'admin', 'tutor', 'tutor-profile', 'parent',
  'dashboard', 'my-courses', 'course', 'quiz', 'quiz-result',
  'practice-quiz', 'practice-result', 'exam-quiz', 'exam-result',
]);
function currentSegment() {
  const h = (window.location.hash || '').replace(/^#/, '') || '/';
  return h.split('?')[0].split('/')[1] || '';
}

export default function AIChatWidget() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState([GREETING]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [seg, setSeg]         = useState(currentSegment());
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading, open]);

  // Theo dõi route để ẩn bong bóng ở trang đăng nhập / dashboard
  useEffect(() => {
    const onHash = () => setSeg(currentSegment());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const send = async (text) => {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setMsgs(m => [...m, { role: 'user', text: prompt }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setMsgs(m => [...m, {
        role: 'ai',
        text: data.reply || 'Mình chưa tìm được gợi ý phù hợp.',
        tutors: Array.isArray(data.tutors) ? data.tutors : [],
      }]);
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Xin lỗi, hiện không kết nối được. Vui lòng thử lại sau.' }]);
    } finally {
      setLoading(false);
    }
  };

  const openTutor = (t) => {
    sessionStorage.setItem('viewingTutor', JSON.stringify(t));
    window.location.hash = `/tutor-detail/${t.id}`;
  };

  // Ẩn ở trang đăng nhập / dashboard
  if (HIDDEN_SEGMENTS.has(seg)) return null;

  return (
    <>
      {/* Bong bóng mở chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý AI"
          className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-[#00288e] text-white shadow-lg hover:bg-[#1e40af] hover:scale-105 transition-all flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </button>
      )}

      {/* Khung chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[60] w-[92vw] max-w-[360px] h-[480px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-[#e1e2e4] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#00288e] text-white px-4 py-3 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <div className="flex-grow">
              <div className="text-sm font-semibold leading-tight">Trợ lý AI EduX</div>
              <div className="text-[11px] text-white/70">Gợi ý gia sư phù hợp</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng" className="hover:bg-white/15 rounded-lg p-1">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto p-3 space-y-3 bg-[#f8f9fb]">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#00288e] text-white rounded-br-sm'
                      : 'bg-white text-[#191c1e] border border-[#e1e2e4] rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                  {/* Thẻ gia sư gợi ý */}
                  {m.role === 'ai' && m.tutors && m.tutors.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.tutors.map(t => (
                        <button
                          key={t.id}
                          onClick={() => openTutor(t)}
                          className="w-full text-left bg-white border border-[#e1e2e4] rounded-xl p-2.5 flex items-center gap-2.5 hover:border-[#00288e]/40 hover:shadow-sm transition-all"
                        >
                          {(t.profile_photo_url || t.picture) ? (
                            <img src={t.profile_photo_url || t.picture} alt={t.full_name}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#dde1ff] text-[#00288e] flex items-center justify-center text-sm font-semibold shrink-0">
                              {(t.full_name || '?').charAt(0)}
                            </div>
                          )}
                          <div className="flex-grow min-w-0">
                            <div className="text-sm font-semibold text-[#191c1e] truncate">{t.full_name}</div>
                            <div className="text-xs text-[#757684] truncate">
                              {t.matched_subject || (t.subjects || '').split(',')[0] || 'Gia sư'} · {fmtPrice(t.hourly_rate)}/giờ
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[18px] text-[#00288e] shrink-0">chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e1e2e4] rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#00288e]/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#00288e]/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#00288e]/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Gợi ý nhanh khi mới mở */}
            {msgs.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-xs text-[#00288e] bg-[#dde1ff] hover:bg-[#b8c4ff] px-2.5 py-1 rounded-full transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            className="border-t border-[#e1e2e4] p-2.5 flex items-center gap-2 shrink-0 bg-white"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              disabled={loading}
              className="flex-grow px-3 py-2 rounded-full border border-[#c4c5d5] text-sm focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 focus:border-[#00288e]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Gửi"
              className="w-9 h-9 rounded-full bg-[#00288e] text-white flex items-center justify-center hover:bg-[#1e40af] transition-all disabled:opacity-40 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
