import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { getConversations, getMessages, sendMessage, markConversationRead } from '../services/api'
import { supabase } from '../services/supabase'

/**
 * Messages page — hộp thư chat giữa học sinh và gia sư.
 * Dùng Supabase Realtime để nhận tin nhắn tức thì.
 */
export default function Messages({ initialConvId = null }) {
  const { user } = useAuth()
  const [conversations, setConversations]   = useState([])
  const [activeConvId, setActiveConvId]     = useState(initialConvId)
  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState('')
  const [sending, setSending]               = useState(false)
  const [loadingConvs, setLoadingConvs]     = useState(true)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const realtimeRef  = useRef(null)

  const displayName = user?.name || user?.email?.split('@')[0] || 'You'

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data)
    } catch (e) {
      console.error('loadConversations error:', e)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (!user?.id || !supabase) return

    const refreshIfMine = (payload) => {
      const row = payload.new || payload.old || {}
      if (
        row.student_id === user.id ||
        row.tutor_id === user.id ||
        row.sender_id === user.id ||
        row.receiver_id === user.id
      ) {
        loadConversations()
      }
    }

    const listChannel = supabase
      .channel(`messages:list:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, refreshIfMine)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, refreshIfMine)
      .subscribe()

    return () => {
      supabase.removeChannel(listChannel)
    }
  }, [user?.id, loadConversations])

  // ── Auto-select first conv ──
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id)
    }
  }, [conversations, activeConvId])

  // ── Load messages khi đổi conv ──
  useEffect(() => {
    if (!activeConvId) return
    let active = true
    setLoadingMsgs(true)
    getMessages(activeConvId)
      .then(data => { if (active) setMessages(data) })
      .catch(() => { if (active) setMessages([]) })
      .finally(() => { if (active) setLoadingMsgs(false) })
    markConversationRead(activeConvId).catch(() => {})
    return () => { active = false }
  }, [activeConvId])

  // ── Supabase Realtime ──
  useEffect(() => {
    if (!activeConvId || !supabase) return

    // Huỷ subscription cũ
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current)
    }

    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        const newMsg = payload.new
        setMessages(prev => {
          // Tránh duplicate nếu chính mình gửi (đã có từ sendMessage)
          if (prev.find(m => m.id === newMsg.id)) return prev
          return [...prev, {
            ...newMsg,
            sender_name:    newMsg.sender_id === user?.id ? displayName : null,
            sender_picture: newMsg.sender_id === user?.id ? user?.picture : null,
          }]
        })
        // Cập nhật preview tin nhắn cuối trong list
        setConversations(prev => prev.map(c =>
          c.id === activeConvId
            ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
            : c
        ))
        // Đánh dấu đã đọc nếu mình là receiver
        if (newMsg.receiver_id === user?.id) {
          markConversationRead(activeConvId).catch(() => {})
        }
      })
      .subscribe()

    realtimeRef.current = channel

    // Lắng nghe conversations để cập nhật unread realtime
    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConvId, user?.id, displayName, user?.picture, loadConversations])

  // ── Auto scroll xuống ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Gửi tin nhắn ──
  const handleSend = async () => {
    const text = input.trim()
    if (!text || !activeConvId || sending) return
    setSending(true)
    setInput('')
    try {
      const msg = await sendMessage(activeConvId, text)
      // Thêm ngay vào UI (Realtime sẽ deduplicate)
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, {
        ...msg,
        sender_name:    displayName,
        sender_picture: user?.picture,
      }])
    } catch {
      setInput(text) // restore nếu lỗi
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const selectConv = (conv) => {
    setActiveConvId(conv.id)
    setMobileShowChat(true)
  }

  // ── Helpers ──
  const activeConv = conversations.find(c => c.id === activeConvId)
  const getPartnerName = (conv) => {
    if (!conv) return ''
    return user?.id === conv.student_id ? conv.tutor_name : conv.student_name
  }
  const getPartnerPic = (conv) => {
    if (!conv) return null
    return user?.id === conv.student_id ? conv.tutor_picture : conv.student_picture
  }
  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!user) return (
    <div style={S.page}>
      <div style={S.center}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#9ca3af' }}>lock</span>
        <p style={{ color: 'var(--on-surface-variant)' }}>Please sign in to view messages.</p>
        <a href="#/signin" style={S.btnPrimary}>Sign In</a>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      {/* ── Top bar ── */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>
          {mobileShowChat && (
            <button onClick={() => setMobileShowChat(false)} style={S.backBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Conversations
            </button>
          )}
          {/* Back to dashboard */}
          <button
            onClick={() => {
              if (user.role === 'tutor') window.location.hash = '/tutor'
              else window.location.hash = '/dashboard'
            }}
            style={S.backBtn}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Dashboard
          </button>
        </div>
      </header>

      <div style={S.layout}>

        {/* ══ LEFT: Conversation list ══ */}
        <aside style={{
          ...S.sidebar,
          display: mobileShowChat ? 'none' : 'flex',
        }} className="msg-sidebar">
          <div style={S.sidebarHeader}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>Messages</h2>
          </div>

          {loadingConvs ? (
            <div style={S.center}>
              <svg className="animate-spin" style={{ width: 28, height: 28, color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ ...S.center, flexDirection: 'column', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#9ca3af' }}>chat_bubble_outline</span>
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                No conversations yet.{user.role === 'student' ? ' Message a tutor from their profile.' : ''}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
              {conversations.map(conv => {
                const name    = getPartnerName(conv)
                const pic     = getPartnerPic(conv)
                const initial = name?.charAt(0)?.toUpperCase() || '?'
                const isActive = conv.id === activeConvId
                const unread   = Number(conv.unread_count) || 0
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => selectConv(conv)}
                      style={{
                        ...S.convItem,
                        background: isActive ? 'rgba(0,40,142,0.07)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      }}
                    >
                      {/* Avatar */}
                      <div style={S.avatarWrap}>
                        {pic
                          ? <img src={pic} alt={name} style={S.avatarImg} />
                          : <div style={S.avatarFallback}>{initial}</div>
                        }
                        {unread > 0 && (
                          <span style={S.unreadDot}>{unread > 9 ? '9+' : unread}</span>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 500, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                            {name}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--outline)', flexShrink: 0, marginLeft: 4 }}>
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: unread > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread > 0 ? 600 : 400 }}>
                          {conv.last_sender_id === user.id ? 'You: ' : ''}{conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* ══ RIGHT: Chat window ══ */}
        <section style={{
          ...S.chatArea,
          display: (!mobileShowChat && window.innerWidth < 640) ? 'none' : 'flex',
        }} className="msg-chat">
          {!activeConvId ? (
            <div style={{ ...S.center, flexDirection: 'column', gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#e5e7eb' }}>forum</span>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 15 }}>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={S.chatHeader}>
                {getPartnerPic(activeConv)
                  ? <img src={getPartnerPic(activeConv)} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--outline-variant)' }} />
                  : <div style={{ ...S.avatarFallback, width: 38, height: 38, fontSize: 15 }}>{getPartnerName(activeConv)?.charAt(0)?.toUpperCase()}</div>
                }
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--on-surface)', margin: 0 }}>{getPartnerName(activeConv)}</p>
                  <p style={{ fontSize: 12, color: '#16a34a', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    Online
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div style={S.msgList}>
                {loadingMsgs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <svg className="animate-spin" style={{ width: 24, height: 24, color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ ...S.center, flexDirection: 'column', gap: 8, marginTop: 40 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#e5e7eb' }}>waving_hand</span>
                    <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>Say hello! Start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine  = msg.sender_id === user.id
                    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString()
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                            <span style={{ fontSize: 11, color: 'var(--outline)', background: 'var(--surface-container-low)', padding: '2px 12px', borderRadius: 999 }}>
                              {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6, gap: 8, alignItems: 'flex-end' }}>
                          {/* Avatar người kia */}
                          {!isMine && (
                            msg.sender_picture
                              ? <img src={msg.sender_picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ ...S.avatarFallback, width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>{(msg.sender_name || getPartnerName(activeConv))?.charAt(0)?.toUpperCase()}</div>
                          )}
                          {/* Bubble */}
                          <div style={{ maxWidth: '70%' }}>
                            <div style={{
                              background: isMine ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                              color: isMine ? '#fff' : 'var(--on-surface)',
                              padding: '10px 14px',
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              fontSize: 14,
                              lineHeight: 1.5,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                              wordBreak: 'break-word',
                              border: isMine ? 'none' : '1px solid rgba(196,197,213,0.2)',
                            }}>
                              {msg.content}
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--outline)', margin: '2px 4px 0', textAlign: isMine ? 'right' : 'left' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMine && msg.is_read && (
                                <span style={{ marginLeft: 4, color: '#1d9bf0' }}>✓✓</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input box */}
              <div style={S.inputArea}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  style={S.textarea}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  style={{
                    ...S.sendBtn,
                    opacity: (!input.trim() || sending) ? 0.5 : 1,
                    cursor: (!input.trim() || sending) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .msg-sidebar { display: flex !important; }
          .msg-chat    { display: flex !important; }
        }
        .msg-sidebar { flex-direction: column; }
        .msg-chat    { flex-direction: column; }
      `}</style>
    </div>
  )
}

const S = {
  page:   { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' },
  layout: { flex: 1, display: 'flex', overflow: 'hidden', maxWidth: 1200, margin: '0 auto', width: '100%', height: 'calc(100vh - 64px)' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24 },
  /* Sidebar */
  sidebar:       { width: 320, minWidth: 260, borderRight: '1px solid rgba(196,197,213,0.25)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', flexDirection: 'column' },
  sidebarHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(196,197,213,0.2)', flexShrink: 0 },
  convItem:      { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: 'none', cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left' },
  avatarWrap:    { position: 'relative', flexShrink: 0 },
  avatarImg:     { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(196,197,213,0.3)' },
  avatarFallback:{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,40,142,0.1)', color: 'var(--primary)', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  unreadDot:     { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #fff' },
  /* Chat */
  chatArea:   { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden' },
  chatHeader: { padding: '12px 20px', borderBottom: '1px solid rgba(196,197,213,0.2)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  msgList:    { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' },
  inputArea:  { padding: '12px 16px', borderTop: '1px solid rgba(196,197,213,0.2)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 },
  textarea:   { flex: 1, padding: '10px 14px', border: '1px solid rgba(196,197,213,0.4)', borderRadius: 20, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#fff', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' },
  sendBtn:    { width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' },
  /* Buttons */
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' },
  backBtn:    { display: 'flex', alignItems: 'center', gap: 5, height: 38, padding: '0 14px', background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid rgba(196,197,213,0.5)', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
}
