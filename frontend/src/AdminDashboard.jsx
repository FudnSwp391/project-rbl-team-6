/**
 * AdminDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only page — Tutor Approval Workspace.
 * UI design ported from Stitch (AcademiaFlow Admin | Tutor Approval Workspace).
 *
 * APIs used:
 *   GET  /api/admin/tutors/stats
 *   GET  /api/admin/tutors/pending
 *   PATCH /api/admin/tutors/:id/approve
 *   PATCH /api/admin/tutors/:id/reject
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Authenticated fetch helper ───────────────────────────────────────────────
async function authFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

// ─── Format date ──────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, token, logout } = useAuth()

  // ── Data state ──
  const [stats,   setStats]   = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [tutors,  setTutors]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [toast,   setToast]   = useState(null)   // { msg, type: 'success'|'error' }

  // ── Modal state ──
  const [reviewTarget, setReviewTarget] = useState(null)   // tutor for detail modal
  const [rejectTarget, setRejectTarget] = useState(null)   // tutor for reject modal
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Image preview modal ──
  const [previewUrl, setPreviewUrl] = useState(null)

  const handleViewDoc = async (path) => {
    if (!path) return
    try {
      setToast({ msg: 'Loading secure document...', type: 'success' })
      const data = await authFetch(`${API}/api/admin/document-url?path=${encodeURIComponent(path)}`, token)
      setPreviewUrl(data.signedUrl)
    } catch (err) {
      setToast({ msg: `Failed to load document: ${err.message}`, type: 'error' })
    }
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (tutorId) => {
    setActionLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${tutorId}/approve`, token, { method: 'PATCH' })
      setTutors(prev => prev.filter(t => t.id !== tutorId))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }))
      setReviewTarget(null)
      setToast({ msg: 'Tutor approved successfully!', type: 'success' })
    } catch (err) {
      setToast({ msg: `Approve failed: ${err.message}`, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  const openRejectModal = (tutor) => {
    setRejectTarget(tutor)
    setRejectReason('')
    setReviewTarget(null)   // close review modal if open
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      setToast({ msg: 'Please enter a rejection reason.', type: 'error' })
      return
    }
    setActionLoading(true)
    try {
      await authFetch(`${API}/api/admin/tutors/${rejectTarget.id}/reject`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason }),
      })
      setTutors(prev => prev.filter(t => t.id !== rejectTarget.id))
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }))
      setRejectTarget(null)
      setToast({ msg: 'Tutor application rejected.', type: 'success' })
    } catch (err) {
      setToast({ msg: `Reject failed: ${err.message}`, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const displayName = user?.name || user?.email?.split('@')[0] || 'Admin'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen overflow-x-hidden">

      {/* ════════════════════════════════════════════
          TOAST
      ════════════════════════════════════════════ */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[999] flex items-center gap-sm px-md py-sm rounded-xl shadow-lg font-label-md text-label-md transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-error text-on-error'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════ */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface shadow-sm flex flex-col py-md px-sm z-50">
        {/* Logo */}
        <div className="mb-xl px-sm">
          <h1 className="text-headline-md font-headline-md text-primary">AcademiaFlow</h1>
          <p className="text-label-md font-label-md text-on-surface-variant">Admin Console</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-xs">
          <a href="#" className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-md font-label-md">Overview</span>
          </a>

          {/* Active */}
          <a href="#" className="flex items-center gap-sm px-sm py-md rounded-lg text-primary font-bold border-r-4 border-primary bg-surface-container-high transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <span className="text-label-md font-label-md">Tutor Approval</span>
          </a>

          <a href="#" className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">group</span>
            <span className="text-label-md font-label-md">User Management</span>
          </a>
          <a href="#" className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-label-md font-label-md">System Settings</span>
          </a>
          <a href="#" className="flex items-center gap-sm px-sm py-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">assessment</span>
            <span className="text-label-md font-label-md">Reports</span>
          </a>
        </nav>

        {/* Bottom section */}
        <div className="mt-auto px-sm">
          <button className="w-full bg-primary-container text-on-primary-container py-md rounded-xl font-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-xs mb-sm">
            <span className="material-symbols-outlined">add</span>
            New Report
          </button>

          {/* Admin profile */}
          <div className="flex items-center gap-sm pt-md border-t border-outline-variant">
            {user?.picture ? (
              <img src={user.picture} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-label-md truncate">{displayName}</p>
              <p className="text-label-sm font-label-sm text-on-surface-variant">Head Moderator</p>
            </div>
            <button
              title="Logout"
              onClick={logout}
              className="p-1 text-on-surface-variant hover:text-error transition-colors rounded-full"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════════ */}
      <header className="fixed top-0 right-0 h-16 w-[calc(100%-16rem)] ml-64 px-md bg-surface/70 backdrop-blur-md flex justify-between items-center z-40 shadow-sm">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full pl-10 pr-md py-2 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 text-body-md outline-none"
              placeholder="Search tutors, applications, or IDs..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button
            className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full relative"
            onClick={fetchData}
            title="Refresh data"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
          <div className="h-8 w-px bg-outline-variant mx-sm" />
          {user?.picture ? (
            <img src={user.picture} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs">
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════ */}
      <main className="ml-64 pt-24 px-xl pb-xl max-w-container-max mx-auto">

        {/* ── Admin Overview Header ── */}
        <section className="mb-xl">
          <div className="flex justify-between items-end mb-lg flex-wrap gap-md">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface">Admin Overview</h2>
              <p className="text-body-md text-on-surface-variant">Review and manage the educator pipeline</p>
            </div>
            <div className="flex gap-sm">
              <button className="px-md py-2 border border-outline-variant rounded-xl text-label-md hover:bg-surface-container transition-colors">
                Export CSV
              </button>
              <button className="px-md py-2 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 transition-opacity">
                Batch Action
              </button>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Total Users (static) */}
            <StatCard
              icon="person"
              iconBg="bg-primary-fixed"
              iconColor="text-primary"
              label="Total Users"
              value="14,285"
              badge="+12%"
              badgeUp
            />

            {/* Pending Tutors (live from API) */}
            <StatCard
              icon="pending_actions"
              iconBg="bg-primary-container"
              iconColor="text-white"
              label="Pending Tutors"
              value={loading ? '…' : stats.pending}
              badge="Action Needed"
              highlight
            />

            {/* Monthly Revenue (static) */}
            <StatCard
              icon="payments"
              iconBg="bg-tertiary-fixed"
              iconColor="text-tertiary"
              label="Monthly Revenue"
              value="$42,850"
              badge="+8.4%"
              badgeUp
            />
          </div>
        </section>

        {/* ── Pending Applications Table ── */}
        <section
          className="rounded-xl shadow-sm border border-white/20 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}
        >
          {/* Table Header */}
          <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <h3 className="text-headline-md font-headline-md">Pending Tutor Applications</h3>
              <div className="flex items-center gap-xs mt-1 text-error">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <p className="text-label-sm">
                  Only administrators can view sensitive tutor documents such as certificates and ID cards.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <div className="bg-surface-container-high px-3 py-1.5 rounded-lg flex items-center gap-xs">
                <span className="text-label-md">Filter: All Subjects</span>
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-md py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] animate-spin">progress_activity</span>
              <p className="text-body-md">Loading tutor applications…</p>
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-md py-16 text-error">
              <span className="material-symbols-outlined text-[48px]">error_outline</span>
              <p className="text-body-md">{error}</p>
              <button
                onClick={fetchData}
                className="px-md py-2 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && tutors.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-md py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px] text-green-500">task_alt</span>
              <p className="text-body-md">No pending tutor applications. All clear! 🎉</p>
            </div>
          )}

          {/* ── Table ── */}
          {!loading && !error && tutors.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-md py-4 text-label-md font-bold">Tutor &amp; Subject</th>
                      <th className="px-md py-4 text-label-md font-bold">Applied Date</th>
                      <th className="px-md py-4 text-label-md font-bold">Documents</th>
                      <th className="px-md py-4 text-label-md font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {tutors.map(tutor => (
                      <TutorRow
                        key={tutor.id}
                        tutor={tutor}
                        actionLoading={actionLoading}
                        onReview={() => setReviewTarget(tutor)}
                        onApprove={() => handleApprove(tutor.id)}
                        onReject={() => openRejectModal(tutor)}
                        onViewCert={() => handleViewDoc(tutor.certificate_url)}
                        onViewId={() => handleViewDoc(tutor.cccd_url)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="p-md flex justify-between items-center bg-surface-container-low/30">
                <p className="text-label-sm text-on-surface-variant">
                  Showing {tutors.length} pending application{tutors.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      {/* ════════════════════════════════════════════
          REVIEW DETAIL MODAL
      ════════════════════════════════════════════ */}
      {reviewTarget && (
        <ModalOverlay onClose={() => setReviewTarget(null)}>
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl flex flex-col"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-outline-variant p-md flex justify-between items-center z-10 rounded-t-2xl">
              <h3 className="text-headline-md font-headline-md">Tutor Application Detail</h3>
              <button className="p-2 hover:bg-surface-container rounded-full transition-colors" onClick={() => setReviewTarget(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-xl">
              <div className="flex flex-col md:flex-row gap-xl">
                {/* Left: Info */}
                <div className="flex-1 space-y-lg">
                  <div className="flex items-center gap-md">
                    <div className="w-20 h-20 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary text-3xl font-bold shadow-sm flex-shrink-0">
                      {(reviewTarget.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-headline-md font-headline-md">{reviewTarget.full_name}</h4>
                      <p className="text-body-md text-on-surface-variant">{reviewTarget.email}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium bg-amber-100 text-amber-800 mt-2">
                        Pending Review
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-md pt-md border-t border-outline-variant">
                    <div>
                      <p className="text-label-sm uppercase text-on-surface-variant tracking-wider">Subject Expertise</p>
                      <p className="text-body-md font-bold">{reviewTarget.subjects || '—'}</p>
                    </div>
                    <div>
                      <p className="text-label-sm uppercase text-on-surface-variant tracking-wider">Experience</p>
                      <p className="text-body-md font-bold">
                        {reviewTarget.experience_years != null ? `${reviewTarget.experience_years} Years` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-label-sm uppercase text-on-surface-variant tracking-wider">Applied Date</p>
                      <p className="text-body-md font-bold">{fmtDate(reviewTarget.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-label-sm uppercase text-on-surface-variant tracking-wider mb-2">Professional Bio</p>
                    <p className="text-body-md text-on-surface leading-relaxed bg-surface-container-low p-md rounded-xl">
                      {reviewTarget.bio || 'No bio provided.'}
                    </p>
                  </div>
                </div>

                {/* Right: Document previews */}
                <div className="flex-1 space-y-lg">
                  <DocPreview
                    label="Professional Certificate"
                    path={reviewTarget.certificate_url}
                    onExpand={() => handleViewDoc(reviewTarget.certificate_url)}
                  />
                  <DocPreview
                    label="CCCD / ID Card"
                    path={reviewTarget.cccd_url}
                    onExpand={() => handleViewDoc(reviewTarget.cccd_url)}
                  />
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-md bg-surface border-t border-outline-variant flex justify-between items-center rounded-b-2xl">
              <button
                className="px-xl py-3 text-label-md font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                onClick={() => setReviewTarget(null)}
              >
                Cancel
              </button>
              <div className="flex gap-md">
                <button
                  className="px-xl py-3 bg-error text-on-error rounded-xl text-label-md font-bold hover:opacity-90 shadow-md disabled:opacity-50"
                  onClick={() => openRejectModal(reviewTarget)}
                  disabled={actionLoading}
                >
                  Reject Application
                </button>
                <button
                  className="px-xl py-3 bg-green-600 text-white rounded-xl text-label-md font-bold hover:bg-green-700 shadow-md disabled:opacity-50"
                  onClick={() => handleApprove(reviewTarget.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing…' : 'Approve Tutor'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ════════════════════════════════════════════
          REJECT MODAL
      ════════════════════════════════════════════ */}
      {rejectTarget && (
        <ModalOverlay onClose={() => !actionLoading && setRejectTarget(null)}>
          <div
            className="w-full max-w-md p-xl rounded-2xl shadow-2xl flex flex-col"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-md text-error mb-md">
              <div className="p-3 bg-red-100 rounded-full">
                <span className="material-symbols-outlined text-[32px]">warning</span>
              </div>
              <h3 className="text-headline-md font-headline-md">Reject Tutor Application</h3>
            </div>

            <p className="text-body-md text-on-surface-variant mb-xl">
              Please provide a clear reason for rejecting <strong>{rejectTarget.full_name}</strong>.
              This message will be sent to the applicant.
            </p>

            <div className="mb-xl">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase mb-2 block">
                Reason for Rejection
              </label>
              <textarea
                className="w-full h-32 p-md rounded-xl border border-outline-variant focus:ring-2 focus:ring-error/20 focus:border-error transition-all resize-none text-body-md outline-none"
                placeholder="e.g. Missing specialized certification, ID image too blurry..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                disabled={actionLoading}
              />
            </div>

            <div className="flex flex-col gap-sm">
              <button
                className="w-full py-4 bg-error text-on-error rounded-xl text-label-md font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleRejectConfirm}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                className="w-full py-4 text-label-md font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50"
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ════════════════════════════════════════════
          IMAGE FULL-SIZE PREVIEW MODAL
      ════════════════════════════════════════════ */}
      {previewUrl && (
        <ModalOverlay onClose={() => setPreviewUrl(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              onClick={() => setPreviewUrl(null)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img
              src={previewUrl}
              alt="Document preview"
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </ModalOverlay>
      )}

      {/* spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, iconColor, label, value, badge, badgeUp, highlight }) {
  return (
    <div
      className={`p-md rounded-xl shadow-sm transition-transform duration-300 hover:-translate-y-1 relative overflow-hidden ${
        highlight
          ? 'border-2 border-primary/20'
          : 'border border-white/20'
      }`}
      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)' }}
    >
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
      )}
      <div className="flex justify-between items-start mb-sm">
        <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && (
          highlight ? (
            <span className="bg-primary text-white px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          ) : (
            <span className="text-label-sm text-on-surface-variant flex items-center gap-xs">
              {badgeUp && <span className="material-symbols-outlined text-[16px]">trending_up</span>}
              {badge}
            </span>
          )
        )}
      </div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <h3 className={`text-headline-md font-headline-md ${highlight ? 'text-primary' : ''}`}>{value}</h3>
    </div>
  )
}

// ─── Tutor Table Row ──────────────────────────────────────────────────────────
function TutorRow({ tutor, actionLoading, onReview, onApprove, onReject, onViewCert, onViewId }) {
  return (
    <tr className="hover:bg-surface-container-low/50 transition-colors">
      {/* Name & Subject */}
      <td className="px-md py-4">
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {(tutor.full_name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-label-md font-bold">{tutor.full_name}</p>
            <p className="text-label-sm text-on-surface-variant">{tutor.subjects || 'No subject listed'}</p>
          </div>
        </div>
      </td>

      {/* Applied date */}
      <td className="px-md py-4 text-body-md text-on-surface-variant">
        {fmtDate(tutor.created_at)}
      </td>

      {/* Documents */}
      <td className="px-md py-4">
        <div className="flex gap-xs flex-wrap">
          <button
            className="px-sm py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-label-sm flex items-center gap-xs hover:bg-secondary-fixed transition-colors disabled:opacity-40"
            onClick={onViewCert}
            disabled={!tutor.certificate_url}
            title={tutor.certificate_url ? 'View certificate' : 'No certificate uploaded'}
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            View Certificate
          </button>
          <button
            className="px-sm py-1.5 bg-secondary-container text-on-secondary-container rounded-lg text-label-sm flex items-center gap-xs hover:bg-secondary-fixed transition-colors disabled:opacity-40"
            onClick={onViewId}
            disabled={!tutor.cccd_url}
            title={tutor.cccd_url ? 'View ID card' : 'No ID card uploaded'}
          >
            <span className="material-symbols-outlined text-[16px]">badge</span>
            View ID Card
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="px-md py-4 text-right">
        <div className="flex justify-end gap-xs items-center">
          <button
            className="px-md py-2 bg-primary text-on-primary rounded-xl text-label-sm font-bold hover:opacity-90 disabled:opacity-50"
            onClick={onReview}
            disabled={actionLoading}
          >
            Review
          </button>
          <button
            className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title="Approve"
            onClick={onApprove}
            disabled={actionLoading}
          >
            <span className="material-symbols-outlined text-green-600">check_circle</span>
          </button>
          <button
            className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Reject"
            onClick={onReject}
            disabled={actionLoading}
          >
            <span className="material-symbols-outlined text-error">cancel</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Document Preview Card ────────────────────────────────────────────────────
function DocPreview({ label, path, onExpand }) {
  return (
    <div>
      <p className="text-label-md font-bold mb-sm">{label}</p>
      <div className="relative group rounded-xl overflow-hidden shadow-sm border border-outline-variant aspect-[4/3] bg-surface-container-high flex items-center justify-center">
        {path ? (
          <button
            className="bg-primary text-white px-md py-3 rounded-xl font-label-md flex items-center gap-sm hover:bg-primary/90 transition-colors shadow-md"
            onClick={onExpand}
          >
            <span className="material-symbols-outlined">lock_open</span>
            View Secure Document
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px]">hide_image</span>
            <p className="text-label-sm">Not uploaded</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Overlay ─────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-md"
      onClick={onClose}
    >
      {children}
    </div>
  )
}
