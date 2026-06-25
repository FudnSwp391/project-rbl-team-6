import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function MessagesSection({ token, user }) {
  const [conversations, setConversations] = useState([])
  const [contacts, setContacts] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingConv, setLoadingConv] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const msgEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeChatRef = useRef(null) // ref để polling dùng
  const myId = user?.id

  // Giữ ref luôn sync với state
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  const scrollToBottom = () => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Auto-open chat với gia sư cụ thể (khi điều hướng từ TutorProfile) ──
  useEffect(() => {
    const raw = sessionStorage.getItem('openChatWith')
    if (raw) {
      try {
        const person = JSON.parse(raw)
        if (person?.id) {
          setActiveChat(person)
        }
      } catch {}
      sessionStorage.removeItem('openChatWith')
    }
  }, [])

  // ── Fetch conversations ──
  const fetchConversations = useCallback(() => {
    fetch(`${API_BASE}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setConversations(d.conversations || []); setLoadingConv(false) })
      .catch(() => setLoadingConv(false))
  }, [token])

  // ── Fetch messages for active chat ──
  const fetchMessages = useCallback((chatId) => {
    if (!chatId) return
    fetch(`${API_BASE}/api/chat/${chatId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setMessages(prev => {
          const newMsgs = d.messages || []
          // Chỉ cập nhật nếu có tin mới (tránh re-render vô nghĩa)
          if (prev.length !== newMsgs.length || (newMsgs.length > 0 && prev[prev.length-1]?.id !== newMsgs[newMsgs.length-1]?.id)) {
            return newMsgs
          }
          return prev
        })
      })
      .catch(() => {})
  }, [token])

  // ── Initial load ──
  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    fetch(`${API_BASE}/api/chat/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setContacts(d.contacts || []))
      .catch(e => console.warn('Contacts fetch error:', e))
  }, [token])

  // ── Khi chuyển chat → load tin nhắn ──
  useEffect(() => {
    if (!activeChat) return
    setMessages([])
    fetchMessages(activeChat.id)
    fetchConversations()
  }, [activeChat?.id, fetchMessages, fetchConversations])

  // ── AUTO-POLLING: cập nhật tin nhắn mỗi 3 giây ──
  useEffect(() => {
    const interval = setInterval(() => {
      const currentChat = activeChatRef.current
      if (currentChat) {
        fetchMessages(currentChat.id)
      }
      fetchConversations()
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchMessages, fetchConversations])

  useEffect(() => { scrollToBottom() }, [messages])

  // ── Gửi text ──
  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeChat || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: activeChat.id, content: draft.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { ...data.message, sender_name: user?.name || user?.email }])
        setDraft('')
        fetchConversations()
      } else {
        const err = await res.json()
        alert('Lỗi: ' + (err.message || 'Không gửi được tin nhắn'))
      }
    } catch (e) { alert('Lỗi kết nối server') }
    setSending(false)
  }

  // ── Upload file/ảnh/video ──
  const handleFileUpload = async (file) => {
    if (!file || !activeChat) return
    setUploading(true)

    // ── Optimistic UI: Hiện preview ngay lập tức ──
    const tempId = 'temp_' + Date.now();
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const localUrl = URL.createObjectURL(file);
    const tempMsg = {
      id: tempId,
      sender_id: myId,
      sender_name: user?.name || user?.email,
      msg_type: isImage ? 'image' : (isVideo ? 'video' : 'file'),
      file_url: localUrl,
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
      isTemp: true
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('receiver_id', activeChat.id)
      const res = await fetch(`${API_BASE}/api/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        // Thay thế tempMsg bằng tin nhắn thật từ server
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message, sender_name: user?.name || user?.email } : m))
        fetchConversations()
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId)) // xoá preview nếu lỗi
        const err = await res.json()
        alert('Lỗi upload: ' + (err.message || 'Thử lại sau'))
      }
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId)) // xoá preview nếu lỗi
      alert('Lỗi kết nối khi upload')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFileUpload(file)
  }

  const openChat = (person) => { setActiveChat(person); setShowNewChat(false) }

  // ── Render một tin nhắn theo loại ──
  const renderMsgContent = (msg) => {
    if (msg.msg_type === 'image') {
      return (
        <img
          src={msg.file_url}
          alt={msg.file_name}
          className={`max-w-full max-h-64 rounded-xl cursor-pointer object-cover transition-opacity ${msg.isTemp ? 'opacity-60 grayscale-[30%] blur-[1px] cursor-wait' : 'hover:opacity-90'}`}
          onClick={() => !msg.isTemp && setPreviewFile({ url: msg.file_url, type: 'image', name: msg.file_name })}
        />
      )
    }
    if (msg.msg_type === 'video') {
      return (
        <video
          src={msg.file_url}
          controls={!msg.isTemp}
          className={`max-w-full max-h-48 rounded-xl ${msg.isTemp ? 'opacity-60 grayscale-[30%] blur-[1px]' : ''}`}
          style={{ maxWidth: '260px' }}
        />
      )
    }
    if (msg.msg_type === 'file') {
      const ext = (msg.file_name || '').split('.').pop().toLowerCase()
      const icon = ext === 'pdf' ? 'picture_as_pdf' : ext === 'doc' || ext === 'docx' ? 'description' : ext === 'xls' || ext === 'xlsx' ? 'table_chart' : ext === 'zip' ? 'folder_zip' : 'attach_file'
      return (
        <a href={msg.isTemp ? '#' : msg.file_url} target={msg.isTemp ? '_self' : '_blank'} rel="noreferrer" 
           className={`flex items-center gap-sm p-sm bg-white/10 rounded-xl transition-colors text-inherit ${msg.isTemp ? 'opacity-60 cursor-wait' : 'hover:bg-white/20'}`}>
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
          <div className="min-w-0">
            <p className="font-label-sm font-medium truncate max-w-[180px]">{msg.file_name}</p>
            <p className="text-[10px] opacity-70">{msg.file_size ? `${(msg.file_size/1024).toFixed(1)} KB` : 'Tải xuống'}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] opacity-70 shrink-0">download</span>
        </a>
      )
    }
    return <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
  }

  return (
    <div className="flex w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* ── Left: Conversations ── */}
      <div className={`flex flex-col border-r border-outline-variant/20 bg-surface-container-low w-full md:w-80 shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'} overflow-hidden`}>
        <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant/20 bg-surface sticky top-0 z-10">
          <h3 className="font-headline-sm text-on-surface font-semibold">Tin nhắn</h3>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors"
            title="Nhắn tin mới"
          >
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="flex flex-col gap-sm p-md">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-md text-center px-md py-xl">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">chat_bubble_outline</span>
              <p className="font-body-sm text-on-surface-variant">Chưa có cuộc trò chuyện.<br/>Bấm ✏️ để bắt đầu nhắn tin.</p>
            </div>
          ) : conversations.map(conv => (
            <button
              key={conv.other_id}
              onClick={() => openChat({ id: conv.other_id, full_name: conv.other_name, picture: conv.other_picture, role: conv.other_role })}
              className={`w-full flex items-center gap-sm px-md py-[10px] border-b border-outline-variant/10 hover:bg-surface-container transition-colors text-left ${activeChat?.id === conv.other_id ? 'bg-primary/5 border-l-[3px] border-l-primary' : ''}`}
            >
              {conv.other_picture
                ? <img src={conv.other_picture} alt={conv.other_name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-outline-variant/20" />
                : <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">{(conv.other_name || '?').charAt(0).toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`font-label-md truncate ${parseInt(conv.unread_count) > 0 ? 'font-bold text-on-surface' : 'text-on-surface'}`}>{conv.other_name}</p>
                  <span className="text-[10px] text-on-surface-variant shrink-0 ml-1">
                    {new Date(conv.last_message_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="font-body-sm text-on-surface-variant truncate text-xs flex items-center gap-1">
                    {conv.last_msg_type === 'image' && <span className="material-symbols-outlined text-[12px]">image</span>}
                    {conv.last_msg_type === 'video' && <span className="material-symbols-outlined text-[12px]">videocam</span>}
                    {conv.last_msg_type === 'file' && <span className="material-symbols-outlined text-[12px]">attach_file</span>}
                    {conv.last_message}
                  </p>
                  {parseInt(conv.unread_count) > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center px-1 font-bold">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Chat window ── */}
      <div className={`flex-1 flex flex-col bg-background overflow-hidden ${!activeChat && !showNewChat ? 'hidden md:flex' : 'flex'}`}>
        {showNewChat ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-sm px-md py-sm border-b border-outline-variant/20 bg-surface">
              <button onClick={() => setShowNewChat(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <h3 className="font-label-lg text-on-surface font-semibold">Chọn người để nhắn tin</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-md flex flex-col gap-sm">
              {contacts.length === 0
                ? <div className="text-center py-xl text-on-surface-variant"><span className="material-symbols-outlined text-[48px] block mb-sm opacity-30">person_off</span>Chưa có liên hệ nào</div>
                : contacts.map(c => (
                  <button key={c.id} onClick={() => openChat({ id: c.id, full_name: c.full_name, picture: c.picture, role: c.role })}
                    className="flex items-center gap-md p-md bg-surface rounded-2xl border border-outline-variant/20 hover:border-primary/30 hover:shadow-sm transition-all text-left">
                    {c.picture
                      ? <img src={c.picture} alt={c.full_name} className="w-12 h-12 rounded-full object-cover" />
                      : <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">{c.full_name.charAt(0)}</div>
                    }
                    <div className="flex-1">
                      <p className="font-label-md text-on-surface font-semibold">{c.full_name}</p>
                      <p className="font-body-sm text-on-surface-variant text-xs capitalize">{c.role === 'tutor' ? 'Gia sư' : c.role === 'parent' ? 'Phụ huynh' : 'Học sinh'}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary">chevron_right</span>
                  </button>
                ))
              }
            </div>
          </div>
        ) : activeChat ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-sm px-md py-sm border-b border-outline-variant/20 bg-surface">
              <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container" onClick={() => setActiveChat(null)}>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              {activeChat.picture
                ? <img src={activeChat.picture} alt={activeChat.full_name} className="w-10 h-10 rounded-full object-cover border border-outline-variant/20" />
                : <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{activeChat.full_name.charAt(0)}</div>
              }
              <div className="flex-1">
                <p className="font-label-md text-on-surface font-semibold">{activeChat.full_name}</p>
                <p className="font-label-sm text-on-surface-variant text-xs capitalize">{activeChat.role === 'tutor' ? 'Gia sư' : activeChat.role === 'parent' ? 'Phụ huynh' : 'Học sinh'}</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-md py-sm flex flex-col gap-xs bg-surface-container-low/30">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-md">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">waving_hand</span>
                  <p className="font-body-sm text-on-surface-variant">Gửi tin nhắn đầu tiên đến {activeChat.full_name}!</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === myId
                const prevMsg = messages[idx - 1]
                const showDate = idx === 0 || new Date(prevMsg?.created_at).toDateString() !== new Date(msg.created_at).toDateString()
                const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id)
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-sm">
                        <span className="text-xs bg-surface-container text-on-surface-variant px-3 py-1 rounded-full">
                          {new Date(msg.created_at).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-xs ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className={`w-7 h-7 rounded-full shrink-0 ${showAvatar ? 'bg-primary/10 text-primary flex items-center justify-center font-bold text-xs' : 'invisible'}`}>
                          {showAvatar && (msg.sender_name || '?').charAt(0)}
                        </div>
                      )}
                      <div className={`max-w-[72%] rounded-2xl text-sm overflow-hidden ${isMe ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface shadow-sm rounded-bl-sm border border-outline-variant/20'}`}
                        style={{ padding: msg.msg_type === 'image' || msg.msg_type === 'video' ? 0 : undefined }}>
                        <div className={msg.msg_type === 'text' || !msg.msg_type ? 'px-md py-sm' : msg.msg_type === 'file' ? 'px-sm py-xs' : ''}>
                          {renderMsgContent(msg)}
                        </div>
                        <p className={`text-[10px] px-2 pb-1 ${isMe ? 'text-on-primary/60 text-right' : 'text-on-surface-variant'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {uploading && (
                <div className="flex justify-end">
                  <div className="bg-primary/20 rounded-2xl px-md py-sm flex items-center gap-sm text-primary text-sm animate-pulse">
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    Đang gửi file...
                  </div>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input box */}
            <form onSubmit={handleSend} className="px-md py-sm border-t border-outline-variant/20 bg-surface flex items-end gap-sm">
              <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 shrink-0 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all"
                title="Gửi ảnh/video/file"
              >
                <span className="material-symbols-outlined text-[22px]">attach_file</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const inp = document.createElement('input')
                  inp.type = 'file'; inp.accept = 'image/*'
                  inp.onchange = e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]) }
                  inp.click()
                }}
                className="w-10 h-10 shrink-0 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all"
                title="Gửi ảnh nhanh"
              >
                <span className="material-symbols-outlined text-[22px]">image</span>
              </button>

              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={`Nhắn tin cho ${activeChat.full_name}...`}
                className="flex-1 h-11 px-md rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface text-sm placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="w-11 h-11 shrink-0 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-lg text-center p-xl">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[52px] text-primary/30">forum</span>
            </div>
            <div>
              <p className="font-headline-sm text-on-surface font-semibold mb-1">Chọn cuộc trò chuyện</p>
              <p className="font-body-sm text-on-surface-variant">hoặc bắt đầu nhắn tin mới bằng nút ✏️</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox preview ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">
            <span className="material-symbols-outlined">close</span>
          </button>
          {previewFile.type === 'image' && (
            <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  )
}
