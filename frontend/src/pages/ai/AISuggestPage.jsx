import { useState, useRef, useEffect } from 'react'
import { askGemini } from '../../services/geminiClient'
import { api } from '../../services/eduxApi'
import '../../pages.css'

const QUICK_PROMPTS = [
  'Gia sư Toán lớp 10, giá dưới 200k',
  'Gia sư Tiếng Anh IELTS online',
  'Gia sư Hóa học Cấp 3 tại Hà Nội',
  'Gia sư Python cho người mới',
  'Gia sư Ngữ văn luyện thi THPT',
]

function fmt(p) { return new Intl.NumberFormat('vi-VN').format(p) }

function parsePrompt(text) {
  const t = text.toLowerCase()
  const parsed = {}

  if (t.includes('toán'))         parsed.subject = 'Toán'
  else if (t.includes('anh') || t.includes('ielts') || t.includes('toeic')) parsed.subject = 'Tiếng Anh'
  else if (t.includes('hóa'))     parsed.subject = 'Hóa học'
  else if (t.includes('vật lý'))  parsed.subject = 'Vật lý'
  else if (t.includes('tin học') || t.includes('python') || t.includes('lập trình')) parsed.subject = 'Tin học'
  else if (t.includes('ngữ văn') || t.includes('văn')) parsed.subject = 'Ngữ văn'

  const priceMatch = t.match(/(\d+)k/)
  if (priceMatch) parsed.maxPrice = parseInt(priceMatch[1]) * 1000

  if (t.includes('online'))       parsed.method = 'online'
  else if (t.includes('offline')) parsed.method = 'offline'

  // LƯU Ý: phải check 'lớp 10/11/12' TRƯỚC 'lớp 1' vì "lớp 10" có chứa "lớp 1"
  if (t.includes('lớp 10') || t.includes('lớp 11') || t.includes('lớp 12') || t.includes('thpt')) parsed.level = 'Cấp 3'
  else if (t.includes('lớp 6') || t.includes('lớp 7') || t.includes('lớp 8') || t.includes('lớp 9') || t.includes('thcs')) parsed.level = 'Cấp 2'
  else if (t.includes('lớp 1') || t.includes('lớp 2') || t.includes('lớp 3') || t.includes('lớp 4') || t.includes('lớp 5') || t.includes('tiểu học')) parsed.level = 'Cấp 1'
  else if (t.includes('đại học') || t.includes('đh'))   parsed.level = 'Đại học'

  return parsed
}

function matchScore(tutor, parsed) {
  let score = 60
  if (parsed.subject && tutor.subjects.includes(parsed.subject)) score += 20
  if (parsed.level   && tutor.levels.includes(parsed.level))     score += 10
  if (parsed.method  && tutor.methods.includes(parsed.method))   score += 10
  if (parsed.maxPrice && tutor.pricePerHour <= parsed.maxPrice)   score += 10
  else if (parsed.maxPrice && tutor.pricePerHour > parsed.maxPrice) score -= 20
  return Math.min(score, 99)
}

const INTRO_MSG = {
  id: 'intro',
  role: 'ai',
  type: 'text',
  text: 'Xin chào! 👋 Tôi là trợ lý AI của EduX. Hãy mô tả nhu cầu học của bạn — môn học, cấp lớp, ngân sách, hình thức học — tôi sẽ tìm gia sư phù hợp nhất.',
}

// Key lưu lịch sử chat trong localStorage — giữ lại khi rời trang rồi quay lại
const CHAT_STORAGE_KEY = 'edux_ai_chat_history'

// Đọc lịch sử chat đã lưu (nếu có), fallback về tin nhắn chào mừng
function loadSavedMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.warn('[chat] Không đọc được lịch sử:', err)
  }
  return [INTRO_MSG]
}

export default function AISuggestPage({ onViewTutor }) {
  // Lazy init: đọc lịch sử từ localStorage ngay khi component mount
  const [messages, setMessages] = useState(loadSavedMessages)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const scrollRef = useRef(null)

  // Lưu lịch sử mỗi khi messages thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch (err) {
      console.warn('[chat] Không lưu được lịch sử:', err)
    }
  }, [messages])

  // Auto scroll khi có message mới
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, loading])

  const handleSend = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    // Push user message
    const userMsg = { id: Date.now(), role: 'user', type: 'text', text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // ── Gọi Google Gemini API qua backend (backend tự query DB) ──
    const geminiResult = await askGemini(trimmed)

    const aiMsgs = []

    // "AI hiểu yêu cầu": phân tích nhanh môn/cấp/giá/hình thức từ câu hỏi
    const parsed = parsePrompt(trimmed)
    if (parsed.subject || parsed.level || parsed.maxPrice || parsed.method) {
      aiMsgs.push({ id: Date.now() + 0.5, role: 'ai', type: 'parsed', parsed })
    }

    if (geminiResult) {
      // ✓ Gemini phản hồi thành công — fetch chi tiết từng tutor từ API
      const matchedTutors = (
        await Promise.all(
          geminiResult.tutorIds.map(async (id) => {
            try {
              const t = await api.getTutor(id)
              return {
                id: t.id,
                name: t.full_name,
                avatar: t.picture,
                rating: Number(t.avg_rating) || 0,
                reviews: t.review_count || 0,
                subjects: (t.subjects || []).map(s => s.subject),
                pricePerHour: Number(t.hourly_rate) || 0,
                color: '#00288e',
                score: 95,
              }
            } catch { return null }
          })
        )
      ).filter(Boolean)

      aiMsgs.push({
        id: Date.now() + 1,
        role: 'ai',
        type: 'text',
        text: geminiResult.reply,
        poweredBy: 'gemini',
      })

      if (matchedTutors.length > 0) {
        aiMsgs.push({
          id: Date.now() + 2,
          role: 'ai',
          type: 'tutors',
          tutors: matchedTutors,
        })
      }
    } else {
      // ✗ Gemini không phản hồi được (hết quota / mạng lỗi / API key sai)
      // → Hiển thị thông báo rõ ràng, KHÔNG giả vờ là câu trả lời AI
      aiMsgs.push({
        id: Date.now() + 1,
        role: 'ai',
        type: 'error',
        text: 'Trợ lý AI tạm thời không khả dụng (Gemini API lỗi hoặc hết quota). Vui lòng thử lại sau, hoặc liên hệ quản trị viên để kiểm tra API key.',
      })
    }

    setMessages(prev => [...prev, ...aiMsgs])
    setLoading(false)
  }

  const handleClear = () => {
    setMessages([INTRO_MSG])
    setInput('')
    try { localStorage.removeItem(CHAT_STORAGE_KEY) } catch (e) { /* ignore */ }
  }

  return (
    <div className="page-wrapper chat-page">
      <header className="page-header">
        <div className="page-header-inner">
          <button className="back-btn btn-ripple" onClick={() => { window.location.hash = '/dashboard' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Dashboard
          </button>
          <span style={{ color: 'var(--outline)', fontSize: 16 }}>›</span>
          <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            AI Gợi ý Gia sư
          </span>
          <button
            className="chat-clear-btn"
            onClick={handleClear}
            title="Bắt đầu cuộc trò chuyện mới"
            style={{ marginLeft: 'auto' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Cuộc trò chuyện mới
          </button>
        </div>
      </header>

      <div className="chat-container">
        {/* Banner */}
        <div className="chat-banner">
          <div className="chat-banner-avatar">
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h2 className="chat-banner-title">Trợ lý AI EduX</h2>
            <p className="chat-banner-status">
              <span className="chat-status-dot" />
              Đang hoạt động · Powered by Google Gemini
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} onViewTutor={onViewTutor} />
          ))}
          {loading && <TypingBubble />}
        </div>

        {/* Quick prompts — chỉ hiện khi chưa có user message */}
        {messages.length === 1 && !loading && (
          <div className="chat-suggest-strip">
            <p className="chat-suggest-label">Bạn có thể thử hỏi:</p>
            <div className="chat-suggest-chips">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  className="chat-suggest-chip btn-ripple"
                  onClick={() => handleSend(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          className="chat-input-bar"
          onSubmit={e => { e.preventDefault(); handleSend() }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder="Nhập tin nhắn... (Ví dụ: Tìm gia sư Toán lớp 10 dưới 200k)"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="chat-send-btn btn-ripple"
            disabled={!input.trim() || loading}
            aria-label="Gửi"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Chat bubble ── */
function ChatBubble({ msg, onViewTutor }) {
  if (msg.role === 'user') {
    return (
      <div className="chat-row chat-row-user">
        <div className="chat-bubble chat-bubble-user">{msg.text}</div>
      </div>
    )
  }

  return (
    <div className="chat-row chat-row-ai">
      <div className="chat-ai-avatar">
        <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div className="chat-bubble-group">
        {msg.type === 'text' && (
          <div className="chat-bubble chat-bubble-ai">
            {msg.text}
            {msg.poweredBy === 'gemini' && (
              <span className="chat-powered-badge" title="Câu trả lời từ Google Gemini AI">
                <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Gemini
              </span>
            )}
          </div>
        )}

        {msg.type === 'error' && (
          <div className="chat-bubble chat-bubble-error">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626', fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>error</span>
            <span>{msg.text}</span>
          </div>
        )}

        {msg.type === 'parsed' && (
          <div className="chat-bubble chat-bubble-ai chat-bubble-parsed">
            <div className="chat-parsed-label">
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>psychology</span>
              Tôi hiểu yêu cầu của bạn như sau:
            </div>
            <div className="chat-parsed-chips">
              {msg.parsed.subject  && <span className="ai-parsed-chip">📚 {msg.parsed.subject}</span>}
              {msg.parsed.level    && <span className="ai-parsed-chip">🎓 {msg.parsed.level}</span>}
              {msg.parsed.maxPrice && <span className="ai-parsed-chip">💰 Tối đa {fmt(msg.parsed.maxPrice)}đ/giờ</span>}
              {msg.parsed.method   && <span className="ai-parsed-chip">{msg.parsed.method === 'online' ? '💻 Online' : '🏠 Offline'}</span>}
            </div>
          </div>
        )}

        {msg.type === 'tutors' && (
          <div className="chat-tutor-list">
            {msg.tutors.map((t, i) => (
              <ChatTutorCard
                key={t.id}
                tutor={t}
                delay={i * 0.08}
                onView={() => onViewTutor?.(t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Typing indicator ── */
function TypingBubble() {
  return (
    <div className="chat-row chat-row-ai">
      <div className="chat-ai-avatar">
        <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div className="chat-bubble chat-bubble-ai chat-typing-bubble">
        <span className="chat-typing-dot" />
        <span className="chat-typing-dot" />
        <span className="chat-typing-dot" />
      </div>
    </div>
  )
}

/* ── Compact tutor card inside chat ── */
function ChatTutorCard({ tutor, delay, onView }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div
      className="chat-tutor-card clickable-card"
      style={{ animationDelay: `${delay}s` }}
      onClick={onView}
    >
      <div className="chat-tutor-match">{tutor.score}%</div>

      {!imgErr && tutor.avatar ? (
        <img
          src={tutor.avatar}
          alt={tutor.name}
          className="chat-tutor-avatar"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div
          className="chat-tutor-avatar-fallback"
          style={{ background: `linear-gradient(135deg, ${tutor.color}, #4c6ef5)` }}
        >
          {tutor.name.charAt(0)}
        </div>
      )}

      <div className="chat-tutor-info">
        <div className="chat-tutor-name">{tutor.name}</div>
        <div className="chat-tutor-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
            <strong>{tutor.rating}</strong>
            <span style={{ color: 'var(--outline)', fontWeight: 400 }}>({tutor.reviews})</span>
          </span>
          <span>·</span>
          <span>{tutor.subjects.join(', ')}</span>
        </div>
        <div className="chat-tutor-price">
          {fmt(tutor.pricePerHour)}<span>đ/giờ</span>
        </div>
      </div>

      <button
        className="chat-tutor-btn"
        onClick={e => { e.stopPropagation(); onView() }}
      >
        Xem
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
      </button>
    </div>
  )
}
