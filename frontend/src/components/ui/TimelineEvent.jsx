import React from 'react';

/**
 * Task 3.2 — Layer 2 Timeline Component
 * Renders an individual event in the ViolationTimeline.
 */

const VARIANT_CONFIG = {
  status_change: { icon: 'published_with_changes', color: '#3b82f6', bg: '#eff6ff' },
  note:          { icon: 'speaker_notes',          color: '#64748b', bg: '#f8fafc' },
  action:        { icon: 'gavel',                  color: '#ef4444', bg: '#fef2f2' },
};

export default function TimelineEvent({ event, isLast }) {
  const { variant = 'note', title, description, timestamp, author } = event;
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.note;

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: isLast ? 0 : 24 }}>
      {/* Connecting line */}
      {!isLast && (
        <div style={{
          position: 'absolute', top: 32, bottom: 0, left: 19,
          width: 2, background: '#e2e8f0', zIndex: 0
        }} />
      )}
      
      {/* Icon Circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: config.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, zIndex: 1, border: `1px solid ${config.color}30`
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: config.color }}>
          {config.icon}
        </span>
      </div>

      {/* Card Content */}
      <div style={{
        flex: 1, background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{title}</h4>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).format(new Date(timestamp))}
          </span>
        </div>
        
        <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {description}
        </p>
        
        {author && (
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
            Bởi: <strong style={{ fontWeight: 500, color: '#475569' }}>{author}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
