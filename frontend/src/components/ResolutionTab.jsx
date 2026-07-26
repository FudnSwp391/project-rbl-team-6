import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Task 3.3 — Resolution Tab UI
 * Allows admin to transition the investigation_status based on ADR-005 rules.
 */

// Mapping of available transitions from any given status
const VALID_TRANSITIONS = {
  OPEN:            ['INVESTIGATING', 'RESOLVED', 'CLOSED'],
  INVESTIGATING:   ['WAITING_TUTOR', 'WAITING_STUDENT', 'RESOLVED', 'CLOSED'],
  WAITING_TUTOR:   ['INVESTIGATING', 'WAITING_STUDENT', 'RESOLVED', 'CLOSED'],
  WAITING_STUDENT: ['INVESTIGATING', 'WAITING_TUTOR', 'RESOLVED', 'CLOSED'],
  RESOLVED:        ['CLOSED'],
  CLOSED:          []
};

// UI configuration for each state
const STATUS_CONFIG = {
  INVESTIGATING:   { label: 'Bắt đầu điều tra', icon: 'search',          color: '#3b82f6', bg: '#eff6ff', hover: '#dbeafe' },
  WAITING_TUTOR:   { label: 'Chờ Gia sư',        icon: 'hourglass_empty', color: '#f59e0b', bg: '#fef3c7', hover: '#fde68a' },
  WAITING_STUDENT: { label: 'Chờ Học viên',      icon: 'hourglass_empty', color: '#f59e0b', bg: '#fef3c7', hover: '#fde68a' },
  RESOLVED:        { label: 'Đã giải quyết',     icon: 'check_circle',    color: '#10b981', bg: '#d1fae5', hover: '#a7f3d0' },
  CLOSED:          { label: 'Đóng vụ việc',      icon: 'cancel',          color: '#64748b', bg: '#f1f5f9', hover: '#e2e8f0' },
};

export default function ResolutionTab({ violation, onStatusUpdate }) {
  const [loadingStatus, setLoadingStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const currentStatus = violation.investigation_status || 'OPEN';
  const availableTransitions = VALID_TRANSITIONS[currentStatus] || [];

  const handleTransition = async (targetStatus) => {
    setLoadingStatus(targetStatus);
    setError(null);
    
    // Optimistic update
    const previousStatus = currentStatus;
    onStatusUpdate(targetStatus);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/violations/${violation.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Lỗi khi cập nhật trạng thái');
      }
      
      // Request succeeded, the optimistic UI remains.
      // (Optional: fetch timeline here if needed, but handled at drawer level)
    } catch (err) {
      console.error('Transition error:', err);
      setError(err.message);
      // Revert optimistic update
      onStatusUpdate(previousStatus);
    } finally {
      setLoadingStatus(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#475569' }}>Trạng thái hiện tại</h3>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#64748b' }}>timeline</span>
          {currentStatus}
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#64748b' }}>
          Chỉ có thể chuyển sang các trạng thái hợp lệ theo quy trình (ADR-005).
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 20, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
          {error}
        </div>
      )}

      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#1e293b' }}>Chuyển đổi trạng thái</h3>
        
        {availableTransitions.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
            Không có trạng thái tiếp theo khả dụng (Vụ việc đã đóng).
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {availableTransitions.map(status => {
              const config = STATUS_CONFIG[status];
              const isLoading = loadingStatus === status;
              const isDisabled = loadingStatus !== null; // disable all buttons during any transition
              
              return (
                <button
                  key={status}
                  disabled={isDisabled}
                  onClick={() => handleTransition(status)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '16px', borderRadius: 8, border: `1px solid ${config.color}40`,
                    background: config.bg, cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled && !isLoading ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if (!isDisabled) e.currentTarget.style.background = config.hover; }}
                  onMouseOut={(e) => { if (!isDisabled) e.currentTarget.style.background = config.bg; }}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: config.color, animation: 'spin 1s linear infinite' }}>
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: config.color }}>
                      {config.icon}
                    </span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: config.color }}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Required CSS for spin animation */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
