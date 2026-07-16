import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function MessageIcon({ token }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const dropdownRef = useRef(null);
  const lastMsgRef = useRef(null);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        
        // Cập nhật số lượng chưa đọc tổng cộng
        const totalUnread = (data.conversations || []).reduce((acc, cur) => acc + (parseInt(cur.unread_count) || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
      
      const interval = setInterval(() => {
        fetchConversations();
      }, 3000);

      const payload = parseJwt(token);
      const userId = payload?.userId;
      let channel = null;
      
      if (userId && supabase) {
        channel = supabase
          .channel(`messages_dropdown:${userId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${userId}`
          }, async (payload) => {
            const newMsg = payload.new;
            fetchConversations();
            
            // Prevent duplicate toasts
            if (lastMsgRef.current === newMsg.id) return;
            lastMsgRef.current = newMsg.id;

            const toastId = Date.now() + Math.random();
            const toast = {
              toastId,
              title: `Tin nhắn mới`,
              body: newMsg.content || 'Bạn có tin nhắn mới',
              icon: 'chat',
              type: 'new_message'
            };

            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.toastId !== toastId));
            }, 5000);
          })
          .subscribe();
      }
      
      return () => {
        clearInterval(interval);
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.toastId !== id));

  const handleConversationClick = async (c) => {
    setOpen(false);

    // Optimistically mark as read in local state
    if (parseInt(c.unread_count) > 0) {
      const count = parseInt(c.unread_count) || 0;
      setConversations(prev => prev.map(conv => conv.other_id === c.other_id ? { ...conv, unread_count: 0 } : conv));
      setUnreadCount(prev => Math.max(0, prev - count));

      // Fire API to mark read in backend immediately
      try {
        fetch(`${API_BASE}/api/chat/${c.other_id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // silent
      }
    }

    // Tell MessagesSection which chat to open
    sessionStorage.setItem('openChatWith', JSON.stringify({ id: c.other_id, name: c.other_name, picture: c.other_picture }));

    window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'messages' }));
    if (!window.location.hash.includes('messages')) {
      if (window.location.hash.startsWith('#/tutor-dashboard')) {
        window.location.hash = '#/tutor-dashboard/messages';
      } else if (window.location.hash.startsWith('#/parent-dashboard')) {
        window.location.hash = '#/parent-dashboard/messages';
      } else if (window.location.hash.startsWith('#/admin-dashboard')) {
        window.location.hash = '#/admin-dashboard/messages';
      } else {
        window.location.hash = '#/dashboard/messages';
      }
    }
  };

  const navigateToMessages = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'messages' }));
    if (!window.location.hash.includes('messages')) {
      if (window.location.hash.startsWith('#/tutor-dashboard')) {
        window.location.hash = '#/tutor-dashboard/messages';
      } else if (window.location.hash.startsWith('#/parent-dashboard')) {
        window.location.hash = '#/parent-dashboard/messages';
      } else if (window.location.hash.startsWith('#/admin-dashboard')) {
        window.location.hash = '#/admin-dashboard/messages';
      } else {
        window.location.hash = '#/dashboard/messages';
      }
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
        aria-label="Tin nhắn"
      >
        <span className="material-symbols-outlined" style={unreadCount > 0 || open ? { fontVariationSettings: "'FILL' 1" } : {}}>
          forum
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-surface shadow-sm animate-[zoomIn_0.2s_ease-out]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
            <h4 className="font-bold text-on-surface">Tin nhắn</h4>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-outline-variant/10">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/50 mb-2">forum</span>
                <p className="text-sm">Không có tin nhắn nào</p>
              </div>
            ) : (
              conversations.map(c => {
                const unread = parseInt(c.unread_count) > 0;
                return (
                  <button
                    key={c.other_id}
                    onClick={() => handleConversationClick(c)}
                    className={`w-full text-left flex items-start gap-3 p-4 hover:bg-surface-container-low transition-colors ${unread ? 'bg-primary/5' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container shrink-0 overflow-hidden border border-outline-variant/30 flex items-center justify-center">
                      {c.other_picture ? (
                        <img src={c.other_picture} alt={c.other_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold text-sm">
                          {c.other_name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm text-on-surface leading-tight ${unread ? 'font-bold' : 'font-medium'} truncate`}>{c.other_name}</p>
                        {unread && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-0.5" />}
                      </div>
                      <p className={`text-xs leading-relaxed truncate ${unread ? 'text-on-surface-variant font-medium' : 'text-on-surface-variant/80'}`}>{c.last_message}</p>
                      <p className="text-[11px] text-primary/70 font-medium mt-1.5">{timeAgo(c.last_message_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-lowest text-center">
            <button onClick={navigateToMessages} className="text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold">Xem tất cả trong Tin nhắn</button>
          </div>
        </div>
      )}

      {/* Toasts (Portaled to body) */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => (
            <div key={t.toastId} className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-80 flex items-start gap-3 animate-[slideInRight_0.3s_ease-out] relative">
              <button onClick={() => removeToast(t.toastId)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {t.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-800 leading-tight mb-1">{t.title}</p>
                <p className="text-xs text-gray-500 leading-snug line-clamp-2">{t.body}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
