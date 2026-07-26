import React, { useState } from 'react';
import TimelineEvent from './ui/TimelineEvent';

/**
 * Task 3.2 — Layer 2 Timeline Container
 * Displays a timeline of events (notes, status changes, actions).
 * Currently uses mock data. Actual API bindings will be implemented in Task 3.3.
 */

// Mock data to validate UI layout & filtering
const MOCK_EVENTS = [
  {
    id: '1',
    variant: 'status_change',
    title: 'Chuyển trạng thái',
    description: 'Trạng thái điều tra được cập nhật từ OPEN thành INVESTIGATING.',
    timestamp: '2026-07-23T10:00:00Z',
    author: 'Hệ thống'
  },
  {
    id: '2',
    variant: 'note',
    title: 'Ghi chú điều tra',
    description: 'Đã gọi điện cho học viên để xác minh. Học viên báo gia sư không online đúng giờ như đã hẹn.',
    timestamp: '2026-07-23T11:30:00Z',
    author: 'Admin Nguyệt'
  },
  {
    id: '3',
    variant: 'note',
    title: 'Ghi chú điều tra',
    description: 'Gia sư phản hồi do mất điện. Yêu cầu gia sư cung cấp bằng chứng.',
    timestamp: '2026-07-23T13:15:00Z',
    author: 'Admin Hùng'
  },
  {
    id: '4',
    variant: 'action',
    title: 'Quyết định xử lý',
    description: 'Hoàn tiền cho học viên (100%). Cảnh cáo gia sư. Đóng vụ việc.',
    timestamp: '2026-07-23T14:00:00Z',
    author: 'Admin Hùng'
  }
];

export default function ViolationTimeline({ violation, extraEvents = [] }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'DECISIONS'

  // Combine MOCK_EVENTS with live extraEvents, sorted chronologically
  const allEvents = [...MOCK_EVENTS, ...extraEvents].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Filter logic: 'DECISIONS' maps to the 'action' variant
  const filteredEvents = allEvents.filter(ev => {
    if (filter === 'DECISIONS') return ev.variant === 'action';
    return true;
  });

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          Tiến trình xử lý
        </h3>
        
        {/* Toggle Filter: All Events / Decisions Only */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 6, padding: 4 }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '6px 12px', fontSize: 13, border: 'none', borderRadius: 4, cursor: 'pointer',
              background: filter === 'ALL' ? '#fff' : 'transparent',
              color: filter === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: filter === 'ALL' ? 600 : 400,
              boxShadow: filter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Tất cả sự kiện
          </button>
          <button
            onClick={() => setFilter('DECISIONS')}
            style={{
              padding: '6px 12px', fontSize: 13, border: 'none', borderRadius: 4, cursor: 'pointer',
              background: filter === 'DECISIONS' ? '#fff' : 'transparent',
              color: filter === 'DECISIONS' ? '#0f172a' : '#64748b',
              fontWeight: filter === 'DECISIONS' ? 600 : 400,
              boxShadow: filter === 'DECISIONS' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Chỉ quyết định
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div style={{ paddingTop: 8 }}>
        {filteredEvents.length > 0 ? (
          filteredEvents.map((ev, idx) => (
            <TimelineEvent 
              key={ev.id} 
              event={ev} 
              isLast={idx === filteredEvents.length - 1} 
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>
              filter_list_off
            </span>
            <p style={{ margin: 0, fontSize: 13 }}>Không có sự kiện nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>
    </div>
  );
}
