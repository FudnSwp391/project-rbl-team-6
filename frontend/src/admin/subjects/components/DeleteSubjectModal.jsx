import { useEffect, useState } from 'react'
import Modal from './Modal'
import { API, authFetch } from '../api'

// Delete is preflighted before the admin is allowed to type anything: if the
// subject still has courses/quizzes/tutors attached, the dialog refuses and
// offers Archive instead. The same check runs server-side on DELETE, so this is
// a courtesy, not the enforcement.
export default function DeleteSubjectModal({ subject, token, onClose, onConfirm, onArchive }) {
  const [deps,    setDeps]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [typed,   setTyped]   = useState('')
  const [busy,    setBusy]    = useState(false)

  useEffect(() => {
    let cancelled = false
    authFetch(`${API}/api/admin/subjects/${subject.id}/dependencies`, token)
      .then(d => { if (!cancelled) { setDeps(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [subject.id, token])

  const blocked = deps && !deps.deletable
  const canDelete = deps?.deletable && typed.trim() === subject.name && !busy

  const confirm = async () => {
    setBusy(true)
    try { await onConfirm(); onClose() }
    catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <Modal
      title={`Xóa “${subject.name}”?`}
      subtitle="Hành động này không thể hoàn tác."
      icon="delete"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant
                       hover:bg-surface-variant transition">
            Hủy
          </button>
          {blocked ? (
            <button onClick={() => { onArchive(); onClose() }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white
                         hover:brightness-110 active:scale-[0.98] transition flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              Lưu trữ thay thế
            </button>
          ) : (
            <button onClick={confirm} disabled={!canDelete}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white
                         hover:brightness-110 active:scale-[0.98] transition
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              {busy && <span className="material-symbols-outlined text-[16px] subj-spin">progress_activity</span>}
              Xóa vĩnh viễn
            </button>
          )}
        </>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] subj-spin">progress_activity</span>
          Đang kiểm tra dữ liệu liên kết…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
          {error}
        </div>
      )}

      {deps && !loading && (
        blocked ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200
                            text-amber-900 text-xs">
              <span className="material-symbols-outlined text-[16px] shrink-0">block</span>
              <span>
                Không thể xóa vì môn học vẫn đang được sử dụng. Lưu trữ sẽ ẩn môn khỏi
                marketplace mà không ảnh hưởng dữ liệu hiện có.
              </span>
            </div>
            <ul className="space-y-1.5">
              {deps.courses > 0 && <Dep icon="menu_book"  n={deps.courses} label="khóa học" />}
              {deps.quizzes > 0 && <Dep icon="quiz"       n={deps.quizzes} label="đề kiểm tra" />}
              {deps.tutors  > 0 && <Dep icon="school"     n={deps.tutors}  label="hồ sơ gia sư" />}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Không có dữ liệu nào liên kết với môn học này. Nhập{' '}
              <b className="text-on-surface font-semibold">{subject.name}</b> để xác nhận.
            </p>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={subject.name}
              aria-label={`Nhập ${subject.name} để xác nhận xóa`}
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm
                         focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
            />
          </div>
        )
      )}
    </Modal>
  )
}

const Dep = ({ icon, n, label }) => (
  <li className="flex items-center gap-2 text-sm text-on-surface">
    <span className="material-symbols-outlined text-[17px] text-on-surface-variant">{icon}</span>
    <b className="font-semibold tabular-nums">{n}</b> {label}
  </li>
)
