/**
 * AdminDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only page for reviewing pending tutor applications.
 * Fetches data from:
 *   GET  /api/admin/tutors/stats
 *   GET  /api/admin/tutors/pending
 *   PATCH /api/admin/tutors/:id/approve
 *   PATCH /api/admin/tutors/:id/reject
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Small helper: make authenticated fetch calls ──────────────────────────
async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,   // JWT required by backend
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

export default function AdminDashboard() {
  const { token, logout } = useAuth()

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats]           = useState({ pending: 0, approved: 0, rejected: 0 })
  const [tutors, setTutors]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState(null)   // tutor object
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  // ── Fetch stats + pending list ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, tutorsData] = await Promise.all([
        authFetch(`${API}/api/admin/tutors/stats`, token),
        authFetch(`${API}/api/admin/tutors/pending`, token),
      ])
      setStats(statsData)
      setTutors(tutorsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Approve handler ───────────────────────────────────────────────────────
  const handleApprove = async (tutorId) => {
    try {
      await authFetch(`${API}/api/admin/tutors/${tutorId}/approve`, token, {
        method: 'PATCH',
      })
      // Remove from pending list and update stats
      setTutors((prev) => prev.filter((t) => t.id !== tutorId))
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1,
      }))
    } catch (err) {
      alert(`Approve failed: ${err.message}`)
    }
  }

  // ── Reject handler (open modal first) ─────────────────────────────────────
  const openRejectModal = (tutor) => {
    setRejectTarget(tutor)
    setRejectReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      alert('Please enter a reject reason.')
      return
    }
    setRejectLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${rejectTarget.id}/reject`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason }),
      })
      setTutors((prev) => prev.filter((t) => t.id !== rejectTarget.id))
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1,
      }))
      setRejectTarget(null)
    } catch (err) {
      alert(`Reject failed: ${err.message}`)
    } finally {
      setRejectLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* ── Top Bar ── */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="#/" className="brand" style={{ color: 'var(--primary)' }}>
            <span className="material-symbols-outlined icon-fill">school</span>
            <span className="brand-name">EduX</span>
          </a>
          <span className="admin-badge">Admin Panel</span>
          <button type="button" className="btn btn-outline admin-logout" onClick={logout}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* ── Page title ── */}
        <div className="admin-title-row">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Review pending tutor applications</p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Refresh
          </button>
        </div>

        {/* ── Summary Cards ── */}
        <div className="admin-stats-grid">
          <StatCard
            icon="schedule"
            label="Pending"
            value={stats.pending}
            color="#f59e0b"
            bg="#fffbeb"
          />
          <StatCard
            icon="check_circle"
            label="Approved"
            value={stats.approved}
            color="#10b981"
            bg="#ecfdf5"
          />
          <StatCard
            icon="cancel"
            label="Rejected"
            value={stats.rejected}
            color="#ef4444"
            bg="#fef2f2"
          />
        </div>

        {/* ── Content Area ── */}
        {loading && (
          <div className="admin-center-msg">
            <span className="material-symbols-outlined spin-icon">progress_activity</span>
            <p>Loading tutor applications…</p>
          </div>
        )}

        {!loading && error && (
          <div className="admin-center-msg admin-error">
            <span className="material-symbols-outlined">error_outline</span>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchData}>Try Again</button>
          </div>
        )}

        {!loading && !error && tutors.length === 0 && (
          <div className="admin-center-msg">
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#10b981' }}>
              task_alt
            </span>
            <p style={{ color: 'var(--on-surface-variant)' }}>
              No pending tutor applications. All clear! 🎉
            </p>
          </div>
        )}

        {!loading && !error && tutors.length > 0 && (
          <div className="admin-cards-list">
            {tutors.map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                onApprove={() => handleApprove(tutor.id)}
                onReject={() => openRejectModal(tutor)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Reject Reason Modal ── */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Reject Application</h2>
            <p className="modal-desc">
              Enter the reason for rejecting{' '}
              <strong>{rejectTarget.full_name}</strong>'s application.
              This will be emailed to them.
            </p>
            <textarea
              className="modal-textarea"
              rows={4}
              placeholder="e.g. Incomplete certificate, insufficient experience..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectTarget(null)}
                disabled={rejectLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRejectConfirm}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{adminStyles}</style>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="admin-stat-card" style={{ background: bg, borderColor: color + '33' }}>
      <span
        className="material-symbols-outlined admin-stat-icon"
        style={{ color }}
      >
        {icon}
      </span>
      <div>
        <p className="admin-stat-value" style={{ color }}>{value}</p>
        <p className="admin-stat-label">{label} Tutors</p>
      </div>
    </div>
  )
}

// ─── Tutor Application Card ───────────────────────────────────────────────────
function TutorCard({ tutor, onApprove, onReject }) {
  return (
    <div className="tutor-app-card">
      {/* Header row */}
      <div className="tutor-app-header">
        <div className="tutor-app-avatar">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div className="tutor-app-info">
          <h3 className="tutor-app-name">{tutor.full_name}</h3>
          <p className="tutor-app-email">{tutor.email}</p>
        </div>
        {/* Status badge */}
        <span className="status-badge status-pending">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
          Pending
        </span>
      </div>

      {/* Details grid */}
      <div className="tutor-app-details">
        <DetailRow icon="menu_book" label="Subjects" value={tutor.subjects || '—'} />
        <DetailRow icon="work_history" label="Experience" value={tutor.experience_years != null ? `${tutor.experience_years} year(s)` : '—'} />
        <DetailRow icon="format_quote" label="Bio" value={tutor.bio || '—'} multiline />
      </div>

      {/* File links */}
      <div className="tutor-app-files">
        <FileLink
          label="Certificate"
          url={tutor.certificate_url}
          icon="workspace_premium"
        />
        <FileLink
          label="CCCD / ID Card"
          url={tutor.cccd_url}
          icon="badge"
        />
      </div>

      {/* Applied at */}
      <p className="tutor-app-date">
        Applied: {tutor.created_at ? new Date(tutor.created_at).toLocaleDateString() : '—'}
      </p>

      {/* Action buttons */}
      <div className="tutor-app-actions">
        <button
          type="button"
          className="btn btn-approve"
          onClick={onApprove}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
          Approve
        </button>
        <button
          type="button"
          className="btn btn-reject"
          onClick={onReject}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
          Reject
        </button>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value, multiline }) {
  return (
    <div className="detail-row">
      <span className="material-symbols-outlined detail-icon">{icon}</span>
      <div>
        <span className="detail-label">{label}: </span>
        {multiline ? <p className="detail-value-block">{value}</p> : <span className="detail-value">{value}</span>}
      </div>
    </div>
  )
}

function FileLink({ label, url, icon }) {
  return (
    <div className="file-link-wrap">
      <span className="material-symbols-outlined file-link-icon">{icon}</span>
      <span className="file-link-label">{label}:</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="file-link-anchor"
        >
          View File ↗
        </a>
      ) : (
        <span className="file-link-none">Not provided</span>
      )}
    </div>
  )
}

// ─── Inline styles (scoped to admin page) ─────────────────────────────────────
const adminStyles = `
  .admin-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fb 50%, #f5f3ff 100%);
    font-family: 'Inter', 'Outfit', system-ui, sans-serif;
  }

  .admin-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(248, 249, 251, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(196, 197, 213, 0.4);
  }

  .admin-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: 72px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .admin-badge {
    margin-left: 8px;
    background: rgba(0, 40, 142, 0.1);
    color: #00288e;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .admin-logout {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .admin-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 36px 24px 80px;
  }

  .admin-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }

  .admin-title {
    margin: 0;
    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
    font-weight: 900;
    color: var(--on-surface, #1a1c1e);
    letter-spacing: -0.03em;
  }

  .admin-subtitle {
    margin: 6px 0 0;
    color: var(--on-surface-variant, #44474f);
    font-size: 16px;
  }

  /* ── Stats grid ── */
  .admin-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 36px;
  }

  .admin-stat-card {
    border-radius: 20px;
    border: 1px solid;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .admin-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .admin-stat-icon {
    font-size: 40px;
  }

  .admin-stat-value {
    margin: 0;
    font-size: 36px;
    font-weight: 900;
    line-height: 1;
  }

  .admin-stat-label {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--on-surface-variant, #44474f);
  }

  /* ── Loading / Error / Empty ── */
  .admin-center-msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 80px 24px;
    text-align: center;
    color: var(--on-surface-variant, #44474f);
    font-size: 16px;
  }

  .admin-error {
    color: #dc2626;
  }

  .spin-icon {
    font-size: 48px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Tutor cards list ── */
  .admin-cards-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .tutor-app-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(196, 197, 213, 0.4);
    border-radius: 24px;
    padding: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s ease;
  }

  .tutor-app-card:hover {
    box-shadow: 0 8px 32px rgba(0, 40, 142, 0.1);
  }

  .tutor-app-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .tutor-app-avatar {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: rgba(0, 40, 142, 0.08);
    display: grid;
    place-items: center;
    color: #00288e;
    font-size: 28px;
    flex-shrink: 0;
  }

  .tutor-app-name {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--on-surface, #1a1c1e);
  }

  .tutor-app-email {
    margin: 2px 0 0;
    font-size: 14px;
    color: var(--on-surface-variant, #44474f);
  }

  .status-badge {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
  }

  .status-pending {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  /* ── Details ── */
  .tutor-app-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
    padding: 16px;
    background: rgba(248, 249, 251, 0.8);
    border-radius: 14px;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
  }

  .detail-icon {
    font-size: 18px;
    color: #00288e;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .detail-label {
    font-weight: 600;
    color: var(--on-surface, #1a1c1e);
  }

  .detail-value {
    color: var(--on-surface-variant, #44474f);
  }

  .detail-value-block {
    margin: 4px 0 0;
    color: var(--on-surface-variant, #44474f);
    line-height: 1.6;
  }

  /* ── File links ── */
  .tutor-app-files {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .file-link-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .file-link-icon {
    font-size: 18px;
    color: #00288e;
  }

  .file-link-label {
    font-weight: 600;
    color: var(--on-surface, #1a1c1e);
  }

  .file-link-anchor {
    color: #00288e;
    text-decoration: none;
    font-weight: 600;
  }

  .file-link-anchor:hover {
    text-decoration: underline;
  }

  .file-link-none {
    color: var(--outline, #74777f);
    font-style: italic;
  }

  .tutor-app-date {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--outline, #74777f);
  }

  /* ── Action buttons ── */
  .tutor-app-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-approve {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #10b981;
    color: white;
    border: none;
    padding: 0 24px;
    min-height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease;
  }

  .btn-approve:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .btn-reject {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: white;
    color: #dc2626;
    border: 1.5px solid #fca5a5;
    padding: 0 24px;
    min-height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-reject:hover {
    background: #fef2f2;
    border-color: #ef4444;
    transform: translateY(-1px);
  }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 24px;
  }

  .modal-box {
    background: white;
    border-radius: 24px;
    padding: 32px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 25px 60px rgba(0,0,0,0.2);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .modal-title {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 800;
    color: var(--on-surface, #1a1c1e);
  }

  .modal-desc {
    margin: 0 0 20px;
    font-size: 15px;
    color: var(--on-surface-variant, #44474f);
    line-height: 1.6;
  }

  .modal-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1.5px solid #d1d5db;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .modal-textarea:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0 24px;
    min-height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Access Denied (reused in App.jsx) ── */
  .access-denied-wrap {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    text-align: center;
    background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fb 60%, #f5f3ff 100%);
  }

  .access-denied-icon {
    font-size: 72px;
    color: #ef4444;
  }

  .access-denied-title {
    margin: 0;
    font-size: 2rem;
    font-weight: 900;
    color: var(--on-surface, #1a1c1e);
  }

  .access-denied-msg {
    margin: 0;
    font-size: 16px;
    color: var(--on-surface-variant, #44474f);
    max-width: 400px;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .admin-stats-grid {
      grid-template-columns: 1fr;
    }

    .admin-title-row {
      flex-direction: column;
    }

    .tutor-app-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .status-badge {
      margin-left: 0;
    }

    .tutor-app-files {
      flex-direction: column;
      gap: 10px;
    }
  }

  @media (max-width: 480px) {
    .admin-main {
      padding: 24px 16px 60px;
    }

    .tutor-app-card {
      padding: 20px 16px;
    }

    .modal-box {
      padding: 24px 20px;
    }
  }
`
