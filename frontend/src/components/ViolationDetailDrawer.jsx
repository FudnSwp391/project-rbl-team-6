/**
 * ViolationDetailDrawer.jsx — Task 2A.2
 * Slide-in drawer showing detail for a single violation (dispute).
 * Wired from Violations.jsx row-click → fetches GET /api/admin/violations/:id.
 *
 * Tabs implemented in this task:
 *   • Overview  — base dispute data, masked description, evidence URLs
 *   • Resolution — placeholder shell (Task 2B+)
 *   • Notes      — placeholder shell (Task 2C+)
 *
 * Security: AI risk score is never fetched or displayed.
 * Masking:  Toxic/offensive keywords in the reason field are replaced with █████.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { SeverityBadge, InvestigationStatusBadge } from './ui/Badges';
import EvidenceGallery from './EvidenceGallery';
import RelatedDataTab from './RelatedDataTab';
import NotesTab from './NotesTab';
import ResolutionTab from './ResolutionTab';
import AITab from './AITab';

// ── Toxic content masking ─────────────────────────────────────────────────────
// Minimal client-side word-list. Replacements are display-only; raw text is
// never modified in the database.
const TOXIC_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|idiot|stupid|dumb|hate|kill|die|trash|scam)\b/gi,
  /\b(đồ ngu|thằng điên|con lợn|chết đi|lừa đảo|đồ rác|mày chết)\b/gi,
];

function maskToxicContent(text) {
  if (!text) return text;
  let masked = text;
  TOXIC_PATTERNS.forEach(pattern => {
    masked = masked.replace(pattern, match => '█'.repeat(match.length));
  });
  return masked;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function getAge(dateStr) {
  if (!dateStr) return '—';
  const hours = Math.floor((new Date() - new Date(dateStr)) / 3600000);
  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ fontSize: 14, color: '#1e293b' }}>{children}</div>
    </div>
  );
}

function SkeletonDrawer() {
  return (
    <div style={{ padding: 24 }}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ height: 11, width: '30%', background: '#e2e8f0', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 18, width: '80%', background: '#f1f5f9', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        fontSize: 13,
        fontWeight: 600,
        border: 'none',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#3b82f6' : '#64748b',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}

function PlaceholderTab({ icon, title, description }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>{icon}</span>
      <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: 16 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14 }}>{description}</p>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ violation }) {
  const maskedReason = maskToxicContent(violation.reason);
  const isMasked = maskedReason !== violation.reason;

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Parties */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Người tố cáo</div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{violation.reporter_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{violation.reporter_email || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Người bị tố cáo</div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{violation.accused_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{violation.accused_email || '—'}</div>
        </div>
      </div>

      {/* Reason with masking */}
      <DetailRow label="Lý do khiếu nại">
        <div style={{
          background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
          fontFamily: isMasked ? 'monospace' : 'inherit',
          lineHeight: 1.6,
          border: isMasked ? '1px dashed #fca5a5' : '1px solid #e2e8f0',
        }}>
          {maskedReason}
          {isMasked && (
            <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#ef4444', fontFamily: 'sans-serif' }}>
              ⚠ Nội dung đã được che khuất tự động
            </span>
          )}
        </div>
      </DetailRow>

      {/* Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Mức độ</div>
          <SeverityBadge severity={violation.severity} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Trạng thái điều tra</div>
          <InvestigationStatusBadge status={violation.investigation_status} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Loại mục tiêu</div>
          <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{violation.target_type || '—'}</span>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <DetailRow label="Thời gian tạo">
          {fmtDate(violation.created_at)}
          <span style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>{getAge(violation.created_at)}</span>
        </DetailRow>
        <DetailRow label="Giải quyết lúc">
          {fmtDate(violation.resolved_at)}
        </DetailRow>
      </div>

      {/* Withdrawal notice */}
      {violation.withdrawn_at && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
        }}>
          ⚠ Khiếu nại đã bị rút lại vào {fmtDate(violation.withdrawn_at)}.
        </div>
      )}

      {/* Admin note */}
      {violation.admin_note && (
        <DetailRow label="Ghi chú quản trị viên">
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bae6fd', fontSize: 14 }}>
            {violation.admin_note}
          </div>
        </DetailRow>
      )}

      {/* Evidence URLs */}
      {Array.isArray(violation.evidence_urls) && violation.evidence_urls.length > 0 && (
        <DetailRow label={`Bằng chứng (${violation.evidence_urls.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {violation.evidence_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: '#3b82f6', textDecoration: 'none',
                  padding: '6px 10px', borderRadius: 6, background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  wordBreak: 'break-all',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attachment</span>
                {`Bằng chứng ${i + 1}`}
              </a>
            ))}
          </div>
        </DetailRow>
      )}

      {/* IDs for reference */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
        <DetailRow label="ID vụ việc">
          <code style={{ fontSize: 12, color: '#475569', background: '#f8fafc', padding: '2px 6px', borderRadius: 4 }}>
            {violation.id}
          </code>
        </DetailRow>
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function ViolationDetailDrawer({ violationId, onClose }) {
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiScore, setAiScore] = useState(null);

  const fetchDetail = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setViolation(null);
    setAiScore(null); // Reset score on new dispute
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/violations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 404) throw new Error('Không tìm thấy vụ việc.');
      if (!res.ok) throw new Error('Không thể tải chi tiết vụ việc.');
      const json = await res.json();
      setViolation(json.violation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (violationId) {
      setActiveTab('overview');
      fetchDetail(violationId);
    }
  }, [violationId, fetchDetail]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '100%', maxWidth: 560,
          background: '#fff',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Chi Tiết Vụ Việc</h2>
            {violation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                  {violation.id.substring(0, 18)}…
                </p>
                {aiScore != null && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: '#e0e7ff', color: '#4f46e5', border: '1px solid #c7d2fe'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                    Risk Score: {aiScore}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            id="violation-drawer-close"
            aria-label="Đóng"
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: '#475569', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #e2e8f0',
          background: '#fff', flexShrink: 0,
        }}>
          <TabButton label="Tổng quan"   active={activeTab === 'overview'}    onClick={() => setActiveTab('overview')} />
          <TabButton label="Bằng chứng"  active={activeTab === 'evidence'}    onClick={() => setActiveTab('evidence')} />
          <TabButton label="Dữ liệu liên quan" active={activeTab === 'related_data'} onClick={() => setActiveTab('related_data')} />
          <TabButton label="Giải quyết"  active={activeTab === 'resolution'}  onClick={() => setActiveTab('resolution')} />
          <TabButton label="Ghi chú"     active={activeTab === 'notes'}       onClick={() => setActiveTab('notes')} />
          <TabButton label="AI Copilot"  active={activeTab === 'ai'}          onClick={() => setActiveTab('ai')} />
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <SkeletonDrawer />
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48 }}>error</span>
              <h3 style={{ marginTop: 8 }}>Lỗi tải dữ liệu</h3>
              <p style={{ fontSize: 14 }}>{error}</p>
              <button
                onClick={() => fetchDetail(violationId)}
                style={{
                  marginTop: 8, padding: '8px 18px', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: 14, color: '#475569',
                }}
              >
                Thử lại
              </button>
            </div>
          ) : !violation ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48 }}>search</span>
              <p style={{ marginTop: 12 }}>Không có dữ liệu</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab violation={violation} />}
              {activeTab === 'evidence' && <EvidenceGallery urls={violation.evidence_urls} />}
              {activeTab === 'related_data' && <RelatedDataTab violation={violation} />}
              {activeTab === 'resolution' && (
                <ResolutionTab
                  violation={violation}
                  onStatusUpdate={(newStatus) => setViolation({ ...violation, investigation_status: newStatus })}
                />
              )}
              {activeTab === 'notes' && <NotesTab violation={violation} />}
              {activeTab === 'ai' && (
                <AITab 
                  violation={violation} 
                  onAnalysisComplete={(data) => setAiScore(data.risk_score)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
