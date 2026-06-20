import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function notifStyle(type) {
  switch (type) {
    case 'BOOKING': return { icon: 'calendar_month', bg: 'bg-blue-100', color: 'text-blue-600' };
    case 'SYSTEM': return { icon: 'info', bg: 'bg-gray-100', color: 'text-gray-600' };
    case 'PAYMENT': return { icon: 'payments', bg: 'bg-green-100', color: 'text-green-600' };
    case 'WARNING': return { icon: 'warning', bg: 'bg-amber-100', color: 'text-amber-600' };
    case 'tutor_review': return { icon: 'rate_review', bg: 'bg-purple-100', color: 'text-purple-600' };
    case 'student_absent': return { icon: 'event_busy', bg: 'bg-amber-100', color: 'text-amber-600' };
    case 'quiz_result': return { icon: 'grading', bg: 'bg-blue-100', color: 'text-blue-600' };
    case 'practice_report': return { icon: 'psychology', bg: 'bg-purple-100', color: 'text-purple-600' };
    default: return { icon: 'notifications', bg: 'bg-primary/10', color: 'text-primary' };
  }
}

export default function NotificationDropdown({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const dropdownRef = useRef(null);
  const lastNotifRef = useRef(null);

  const fetchNotifs = async (showToast = true) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const newNotifs = data.notifications || [];
      
      // Detect new notifications to show toast
      if (showToast && newNotifs.length > 0) {
        const currentLatestId = lastNotifRef.current;
        const newLatestId = newNotifs[0].id;
        
        if (currentLatestId && currentLatestId !== newLatestId) {
          // Find all new notifications since last fetch
          const newItems = [];
          for (const n of newNotifs) {
            if (n.id === currentLatestId) break;
            newItems.push(n);
          }
          
          // Show toasts for up to 3 new notifications
          newItems.slice(0, 3).forEach(n => {
            const toastId = Date.now() + Math.random();
            setToasts(prev => [...prev, { ...n, toastId }]);
            // Auto remove after 5 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.toastId !== toastId));
            }, 5000);
          });
        }
        lastNotifRef.current = newLatestId;
      } else if (!lastNotifRef.current && newNotifs.length > 0) {
        lastNotifRef.current = newNotifs[0].id;
      }

      setNotifications(newNotifs);
      setUnreadCount(data.unread_count || 0);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (token) {
      fetchNotifs(false); // Initial fetch without toast
      
      const payload = parseJwt(token);
      const userId = payload?.userId;
      
      if (userId) {
        const channel = supabase
          .channel(`notifications:${userId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, (payload) => {
            fetchNotifs(true);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` }
    });
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200"
        aria-label="Thông báo"
      >
        <span className="material-symbols-outlined" style={unreadCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-surface shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
            <h4 className="font-bold text-on-surface">Thông báo</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-outline-variant/10">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-outline/50 mb-2">notifications_off</span>
                <p className="text-sm">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map(n => {
                const style = notifStyle(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left flex items-start gap-3 p-4 hover:bg-surface-container-low transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-[20px] ${style.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {n.icon || style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm text-on-surface leading-tight ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-0.5" />}
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${!n.is_read ? 'text-on-surface-variant font-medium' : 'text-on-surface-variant/80'}`}>{n.body}</p>
                      <p className="text-[11px] text-primary/70 font-medium mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-lowest text-center">
              <button className="text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold">Xem tất cả</button>
            </div>
          )}
        </div>
      )}

      {/* Toasts (Portaled to body) */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => {
            const style = notifStyle(t.type);
            return (
              <div key={t.toastId} className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-80 flex items-start gap-3 animate-[slideInRight_0.3s_ease-out] relative">
                <button onClick={() => removeToast(t.toastId)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[20px] ${style.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {t.icon || style.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold text-gray-800 leading-tight mb-1">{t.title}</p>
                  <p className="text-xs text-gray-500 leading-snug line-clamp-2">{t.body}</p>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
      
      {/* Ensure slideInRight animation exists in global css if not already */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
