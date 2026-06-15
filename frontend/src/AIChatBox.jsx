/**
 * AIChatBox.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Chat interface component for conversing with AI about practice quiz
 * preferences. Renders inside PracticeMode's "Chat with AI" tab.
 */
import { useState, useRef, useEffect } from 'react'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const INITIAL_GREETING = {
  role: 'model',
  text: "Xin chào! 👋 Hãy cho tôi biết bạn muốn luyện tập gì. Ví dụ:\n\n• \"Cho tôi 10 câu hỏi về phương trình bậc hai\"\n• \"Tôi muốn ôn tập hóa hữu cơ, độ khó trung bình\"\n• \"Giúp tôi luyện tập ngữ pháp tiếng Anh, mức độ dễ\"\n\nChỉ cần mô tả những gì bạn cần và tôi sẽ thiết lập cho bạn!",
}

export default function AIChatBox({ token, onQuizReady }) {
  const [messages, setMessages] = useState([INITIAL_GREETING])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [confirmedParams, setConfirmedParams] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Local intent parser (works without Gemini) ──
  function parseLocalIntent(text) {
    const t = text.toLowerCase()

    // Extract number of questions
    const countMatch = t.match(/\b(\d+)\s*(câu|questions?|qs?|cau)\b/i)
    const count = countMatch ? Math.min(Math.max(parseInt(countMatch[1]), 1), 30) : 10

    // Extract difficulty
    let difficulty = 'medium'
    if (/\b(easy|dễ|de|beginner|cơ bản|co ban)\b/i.test(t)) difficulty = 'easy'
    else if (/\b(hard|khó|kho|advanced|difficult|nâng cao|nang cao)\b/i.test(t)) difficulty = 'hard'

    // Extract topic — remove numbers, difficulty words, filler words
    let topic = text
      .replace(/\b\d+\s*(câu|questions?|qs?|cau)\b/gi, '')
      .replace(/\b(give me|i want|help me|practice|review|questions? about|about|on|for|me|please|quiz|ôn tập|on tap|muốn|muon|về|ve|cho tôi|cho toi|tôi muốn|toi muon)\b/gi, '')
      .replace(/\b(easy|dễ|de|medium|trung bình|hard|khó|kho|advanced|beginner)\b/gi, '')
      .replace(/\s+/g, ' ').trim()
      // Remove leading punctuation
      .replace(/^[,.\-:;]+/, '').trim()

    if (!topic || topic.length < 2) return null
    return { topic, count, difficulty }
  }

  // ── Send message handler ──
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMessage = { role: 'user', text: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsTyping(true)
    setConfirmedParams(null)

    try {
      const res = await fetch(`${apiBaseUrl}/api/practice/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const data = await res.json()

      // If AI is unavailable (quota exceeded), use local parser on the user's message
      if (data.ai_unavailable) {
        const localParams = parseLocalIntent(trimmed)
        if (localParams) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: `Đã hiểu! 🎯 Tôi sẽ tạo một bài kiểm tra **${localParams.difficulty} gồm ${localParams.count} câu hỏi** về **"${localParams.topic}"**.\n\nKiểm tra chi tiết bên dưới và nhấn Tạo Bài Kiểm Tra khi bạn đã sẵn sàng!`,
            },
          ])
          setConfirmedParams(localParams)
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: "Tôi chưa hiểu rõ lắm. Hãy thử một câu như:\n\n• \"10 câu hỏi về quang hợp\"\n• \"Cho tôi 5 câu khó về Thế chiến 2\"\n• \"Bài kiểm tra cơ bản về Python, 15 câu\"",
            },
          ])
        }
        return
      }

      // Normal AI response
      const aiReply = data.reply || ''
      const aiMessage = { role: 'model', text: aiReply }
      setMessages((prev) => [...prev, aiMessage])

      if (data.params) {
        setConfirmedParams(data.params)
      }

    } catch (err) {
      // ── Local fallback: try to parse intent client-side ──
      const localParams = parseLocalIntent(trimmed)
      if (localParams) {
        const confirmMsg = {
          role: 'model',
          text: `Đã hiểu! 🎯 Tôi sẽ tạo một bài kiểm tra **${localParams.difficulty} gồm ${localParams.count} câu hỏi** về **"${localParams.topic}"**.\n\nKiểm tra chi tiết bên dưới và nhấn Tạo Bài Kiểm Tra khi bạn đã sẵn sàng!`,
        }
        setMessages((prev) => [...prev, confirmMsg])
        setConfirmedParams(localParams)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: "Tôi chưa hiểu rõ lắm. Hãy thử một câu như:\n\n• \"10 câu hỏi về quang hợp\"\n• \"Cho tôi 5 câu khó về Thế chiến 2\"\n• \"Bài kiểm tra cơ bản về Python, 15 câu\"",
          },
        ])
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const difficultyColors = {
    easy: { bg: 'bg-green-100', text: 'text-green-700', dot: '🟢' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: '🟡' },
    hard: { bg: 'bg-red-100', text: 'text-red-700', dot: '🔴' },
  }

  return (
    <div className="flex flex-col h-[520px] bg-surface-container-low/50 rounded-xl border border-outline-variant/20 overflow-hidden">
      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto p-md space-y-md scroll-smooth">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeSlideIn_0.3s_ease-out]`}
          >
            {/* AI avatar */}
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 mr-sm mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  smart_toy
                </span>
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-md py-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-surface-container-lowest border border-surface-container-lowest/30 text-on-surface rounded-bl-sm'
              }`}
            >
              <p className="font-body-md text-body-md whitespace-pre-line leading-relaxed">
                {msg.text}
              </p>
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 ml-sm mt-1">
                <span className="material-symbols-outlined text-[16px]">
                  person
                </span>
              </div>
            )}
          </div>
        ))}

        {/* ── Typing indicator ── */}
        {isTyping && (
          <div className="flex justify-start animate-[fadeSlideIn_0.3s_ease-out]">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 mr-sm mt-1">
              <span className="material-symbols-outlined text-[16px]">
                smart_toy
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-surface-container-lowest/30 rounded-2xl rounded-bl-sm px-md py-sm shadow-sm">
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* ── Confirmation card ── */}
        {confirmedParams && (
          <div className="flex justify-start animate-[fadeSlideIn_0.4s_ease-out]">
            <div className="w-8 h-8 shrink-0 mr-sm" /> {/* spacer for alignment */}
            <div className="bg-surface-container-lowest/70 backdrop-blur-md border border-primary/20 rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] max-w-[85%]">
              <div className="flex items-center gap-sm mb-sm">
                <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-[20px]">
                    quiz
                  </span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    Bài Kiểm Tra Đã Sẵn Sàng
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Kiểm tra chi tiết bên dưới
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-sm mb-md">
                <span className="inline-flex items-center gap-xs px-3 py-1.5 rounded-lg bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    topic
                  </span>
                  {confirmedParams.topic}
                </span>
                <span className="inline-flex items-center gap-xs px-3 py-1.5 rounded-lg bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    tag
                  </span>
                  {confirmedParams.count} câu hỏi
                </span>
                <span
                  className={`inline-flex items-center gap-xs px-3 py-1.5 rounded-lg font-label-sm text-label-sm ${
                    difficultyColors[confirmedParams.difficulty]?.bg || 'bg-surface-container-high'
                  } ${difficultyColors[confirmedParams.difficulty]?.text || 'text-on-surface'}`}
                >
                  {difficultyColors[confirmedParams.difficulty]?.dot || '⚪'}{' '}
                  {confirmedParams.difficulty?.charAt(0).toUpperCase() +
                    confirmedParams.difficulty?.slice(1)}
                </span>
              </div>

              <button
                onClick={() => onQuizReady(confirmedParams)}
                className="w-full h-11 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-surface-tint hover:shadow-md transition-all duration-200 flex items-center justify-center gap-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  rocket_launch
                </span>
                Tạo Bài Kiểm Tra
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-outline-variant/20 bg-surface-container-lowest/60 backdrop-blur-sm p-sm">
        <div className="flex items-end gap-sm">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mô tả những gì bạn muốn luyện tập..."
              rows={1}
              className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-md py-sm pr-12 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 max-h-24 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
              input.trim() && !isTyping
                ? 'bg-primary text-on-primary hover:bg-surface-tint hover:shadow-md active:scale-95'
                : 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </div>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
