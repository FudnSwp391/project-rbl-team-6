/**
 * Violations.jsx — Task 1.2 / 2A.2
 * Main queue UI for the Admin Violation Reports.
 * Task 2A.2 addition: row-click wires to ViolationDetailDrawer.
 * No AI score is displayed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { SeverityBadge, InvestigationStatusBadge } from '../components/ui/Badges';
import ViolationDetailDrawer from '../components/ViolationDetailDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAge(dateStr) {
  if (!dateStr) return 'N/A';
  const hours = Math.floor((new Date() - new Date(dateStr)) / 3600000);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

// ── Components ────────────────────────────────────────────────────────────────
function KPICard({ title, value, icon, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20, 
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: `${color}15`,
        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 24, color: '#0f172a', fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          {Array(6).fill(0).map((_, i) => <th key={i}><div style={{height: 20, background: '#e2e8f0', borderRadius: 4, width: '80%'}}></div></th>)}
        </tr>
      </thead>
      <tbody>
        {Array(5).fill(0).map((_, i) => (
          <tr key={i}>
            {Array(6).fill(0).map((_, j) => (
              <td key={j}><div style={{height: 20, background: '#f1f5f9', borderRadius: 4, width: '100%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}}></div></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Violations({ user, onGoSignIn }) {
  const [data, setData] = useState({ violations: [], total: 0, by_status: {}, by_severity: {}, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Task 2A.2: drawer state — null = closed, string = open with that violation ID
  const [selectedId, setSelectedId] = useState(null);

  // Filter state
  const [page, setPage] = useState(1);
  const [invStatus, setInvStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const limit = 10;

  const fetchViolations = useCallback(async (currentPage, currentInvStatus, currentSeverity) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: currentPage, limit });
      if (currentInvStatus) params.append('investigation_status', currentInvStatus);
      if (currentSeverity) params.append('severity', currentSeverity);

      const res = await fetch(`${API_BASE_URL}/api/admin/violations?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không thể tải danh sách vi phạm');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use debounce for filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchViolations(page, invStatus, severity);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, invStatus, severity, fetchViolations]);

  // Handle pagination reset on filter change
  const handleFilterChange = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  const openCases = (data.by_status['OPEN'] || 0);
  const criticalCases = (data.by_severity['critical'] || 0) + (data.by_severity['high'] || 0);

  return (
    <>
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Hàng Đợi Vi Phạm (v2)</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Quản lý và điều tra khiếu nại, vi phạm của người dùng.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KPICard title="Tổng Vụ Việc" value={data.total || 0} icon="list_alt" color="#3b82f6" />
        <KPICard title="Đang Mở" value={openCases} icon="inbox" color="#eab308" />
        <KPICard title="Nghiêm Trọng/Cao" value={criticalCases} icon="warning" color="#ef4444" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Trạng thái điều tra</label>
          <select value={invStatus} onChange={handleFilterChange(setInvStatus)} className="admin-select" style={{ minWidth: 200 }}>
            <option value="">Tất cả</option>
            <option value="OPEN">Mở</option>
            <option value="INVESTIGATING">Đang điều tra</option>
            <option value="WAITING_TUTOR">Chờ gia sư</option>
            <option value="WAITING_STUDENT">Chờ học sinh</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Mức độ</label>
          <select value={severity} onChange={handleFilterChange(setSeverity)} className="admin-select" style={{ minWidth: 200 }}>
            <option value="">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="critical">Nghiêm trọng</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16 }}>error</span>
              <h3>Lỗi khi tải dữ liệu</h3>
              <p>{error}</p>
              <button className="btn btn-outline" onClick={() => fetchViolations(page, invStatus, severity)}>Thử lại</button>
            </div>
          ) : loading ? (
            <SkeletonTable />
          ) : data.violations.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.5, marginBottom: 16 }}>check_circle</span>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Không có vụ việc nào</h3>
              <p style={{ margin: 0 }}>Hàng đợi hiện đang trống hoặc không có kết quả phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>MÃ VỤ VIỆC</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13 }}>NGƯỜI BỊ TỐ CÁO</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13 }}>LÝ DO</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13 }}>MỨC ĐỘ</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13 }}>TRẠNG THÁI</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13, whiteSpace: 'nowrap' }}>TUỔI (AGE)</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 13, textAlign: 'center' }}>VI PHẠM CŨ</th>
                </tr>
              </thead>
              <tbody>
                {data.violations.map(v => (
                  <tr
                    key={v.id}
                    id={`violation-row-${v.id}`}
                    onClick={() => setSelectedId(v.id)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px', fontSize: 14, fontFamily: 'monospace', color: '#64748b' }}>
                      {v.id.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{v.accused_name || 'N/A'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{v.accused_email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, color: '#334155', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.reason}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <InvestigationStatusBadge status={v.investigation_status} />
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {getAge(v.created_at)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {/* Prior Cases - Placeholder logic for Task 1.2 visually rendering */}
                      <span style={{ 
                        display: 'inline-block', background: '#f1f5f9', color: '#475569', 
                        padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 
                      }}>0</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {!loading && !error && data.total_pages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>
              Trang {page} / {data.total_pages} (Tổng {data.total} vụ việc)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '6px 12px' }}
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Trước
              </button>
              <button 
                className="btn btn-outline" 
                style={{ padding: '6px 12px' }}
                disabled={page >= data.total_pages} 
                onClick={() => setPage(p => p + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Task 2A.2: Detail drawer — mounts only when a row is selected */}
    {selectedId && (
      <ViolationDetailDrawer
        violationId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    )}
  </>
  );
}
