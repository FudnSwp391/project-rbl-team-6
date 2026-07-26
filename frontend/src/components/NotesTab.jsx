import React, { useState } from 'react';
import ViolationTimeline from './ViolationTimeline';
import { API_BASE_URL } from '../config';

/**
 * Task 4.2 — Notes & Actions UI
 * Wraps the ViolationTimeline and provides a form to add new admin notes.
 */
export default function NotesTab({ violation }) {
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Local state to optimistically append notes without requiring a full refetch.
  const [liveEvents, setLiveEvents] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/violations/${violation.id}/note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: noteContent })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Lỗi khi thêm ghi chú');
      }
      
      const newNote = await res.json();
      
      // Map API response to TimelineEvent format
      const timelineEvent = {
        id: newNote.id,
        variant: 'note',
        title: 'Ghi chú điều tra',
        description: newNote.note,
        timestamp: newNote.created_at,
        // Since we don't fetch the admin's name on POST note currently, use a fallback
        author: 'Admin (Bạn)' 
      };

      setLiveEvents(prev => [...prev, timelineEvent]);
      setNoteContent('');
    } catch (err) {
      console.error('Add note error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Input Form Area */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1e293b' }}>Thêm ghi chú nội bộ</h3>
        
        {error && (
          <div style={{ marginBottom: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú điều tra... (Chỉ Admin mới có thể xem)"
            rows={3}
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #cbd5e1',
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: '80px',
              outline: 'none', transition: 'border-color 0.2s',
              background: isSubmitting ? '#f1f5f9' : '#fff'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitting || !noteContent.trim()}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', background: '#3b82f6',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: isSubmitting || !noteContent.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !noteContent.trim() ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? 'Đang lưu...' : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Gửi ghi chú
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Timeline view */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ViolationTimeline violation={violation} extraEvents={liveEvents} />
      </div>
    </div>
  );
}
