import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { API, authFetch } from './api'
import { deaccent } from './subjectMeta'
import SubjectCard from './components/SubjectCard'
import SubjectCardSkeleton from './components/SubjectCardSkeleton'
import SubjectsToolbar from './components/SubjectsToolbar'
import ExceptionStrip from './components/ExceptionStrip'
import EmptyState from './components/EmptyState'
import SubjectFormModal from './components/SubjectFormModal'
import DeleteSubjectModal from './components/DeleteSubjectModal'

const SORTERS = {
  order:    (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'vi'),
  name:     (a, b) => a.name.localeCompare(b.name, 'vi'),
  tutors:   (a, b) => (b.tutor_count   || 0) - (a.tutor_count   || 0),
  courses:  (a, b) => (b.course_count  || 0) - (a.course_count  || 0),
  students: (a, b) => (b.student_count || 0) - (a.student_count || 0),
  pending:  (a, b) => (b.pending_count || 0) - (a.pending_count || 0),
}

const MATCHES_FILTER = {
  all:       () => true,
  active:    s => s.status === 'active',
  archived:  s => s.status === 'archived',
  attention: s => (s.pending_count || 0) > 0,
}

export default function SubjectsView({ token }) {
  const [subjects, setSubjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [tick,     setTick]     = useState(0)

  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [sort,   setSort]     = useState('order')
  const [selected, setSelected] = useState(() => new Set())
  const [formModal,   setFormModal]   = useState(null)   // { subject } | { } for create
  const [deleteModal, setDeleteModal] = useState(null)

  // `loading` starts true and the retry handler re-arms it, so the effect body
  // never has to setState synchronously on the way in.
  useEffect(() => {
    let cancelled = false
    authFetch(`${API}/api/admin/subjects`, token)
      .then(data => { if (!cancelled) { setSubjects(data.subjects || []); setError(null); setLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [token, tick])

  const retry = () => { setLoading(true); setError(null); setTick(t => t + 1) }

  const counts = useMemo(() => ({
    all:       subjects.length,
    active:    subjects.filter(MATCHES_FILTER.active).length,
    archived:  subjects.filter(MATCHES_FILTER.archived).length,
    attention: subjects.filter(MATCHES_FILTER.attention).length,
  }), [subjects])

  const visible = useMemo(() => {
    const q = deaccent(search)
    return subjects
      .filter(MATCHES_FILTER[filter] || MATCHES_FILTER.all)
      .filter(s => !q || deaccent(s.name).includes(q) || deaccent(s.description).includes(q))
      .sort(SORTERS[sort] || SORTERS.order)
  }, [subjects, search, filter, sort])

  const toggleSelect = key => setSelected(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const patchLocal = (id, patch) =>
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))

  // Reversible status changes apply immediately and offer Undo instead of
  // interrupting with a confirm dialog. On failure the local row is rolled back
  // to whatever it was before the click.
  const changeStatus = async (subject, status, verb) => {
    const previous = subject.status
    patchLocal(subject.id, { status })
    try {
      await authFetch(`${API}/api/admin/subjects/${subject.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast.success(
        t => (
          <span className="flex items-center gap-3">
            Đã {verb} “{subject.name}”
            <button
              onClick={() => { toast.dismiss(t.id); changeStatus({ ...subject, status }, previous, 'hoàn tác') }}
              className="font-semibold underline shrink-0"
            >
              Hoàn tác
            </button>
          </span>
        ),
        { duration: 8000 }
      )
    } catch (err) {
      patchLocal(subject.id, { status: previous })
      toast.error(`Không thể ${verb} “${subject.name}” — ${err.message}`)
    }
  }

  const saveSubject = async form => {
    const editing = Boolean(formModal?.subject?.id)
    const url = editing
      ? `${API}/api/admin/subjects/${formModal.subject.id}`
      : `${API}/api/admin/subjects`
    const data = await authFetch(url, token, {
      method: editing ? 'PATCH' : 'POST',
      body: JSON.stringify(form),
    })
    if (editing) {
      patchLocal(formModal.subject.id, data.subject)
      toast.success(`Đã cập nhật “${data.subject.name}”`)
    } else {
      // Counts come from the aggregation endpoint, so refetch rather than
      // guessing them; a new subject legitimately starts at zero.
      setSubjects(prev => [...prev, { ...data.subject, tutor_count: 0, course_count: 0, student_count: 0, quiz_count: 0, pending_count: 0 }])
      toast.success(`Đã tạo môn học “${data.subject.name}”`)
    }
  }

  const deleteSubject = async subject => {
    await authFetch(`${API}/api/admin/subjects/${subject.id}`, token, { method: 'DELETE' })
    setSubjects(prev => prev.filter(s => s.id !== subject.id))
    setSelected(prev => { const n = new Set(prev); n.delete(subject.id); return n })
    toast.success(`Đã xóa “${subject.name}”`)
  }

  const handleAction = (action, subject) => {
    switch (action) {
      case 'create':     return setFormModal({ subject: null })
      case 'edit':
      case 'appearance': return setFormModal({ subject })
      case 'archive':    return changeStatus(subject, 'archived', 'lưu trữ')
      case 'restore':    return changeStatus(subject, 'active',   'khôi phục')
      case 'disable':    return changeStatus(subject, 'disabled', 'vô hiệu hóa')
      case 'delete':     return setDeleteModal(subject)
      case 'manage':
      case 'analytics':  return toast('Trang chi tiết môn học đang được xây dựng.', { icon: 'ℹ️' })
      default:           return
    }
  }

  const exportCsv = () => {
    const head = ['Môn học', 'Trạng thái', 'Cấp học', 'Gia sư', 'Khóa học', 'Học viên', 'Đề kiểm tra', 'Chờ duyệt']
    const rows = visible.map(s => [
      s.name, s.status, (s.levels || []).join(' / '),
      s.tutor_count, s.course_count, s.student_count, s.quiz_count, s.pending_count,
    ])
    const csv = [head, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // BOM so Excel opens Vietnamese diacritics correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `mon-hoc-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Đã xuất ${visible.length} môn học`)
  }

  const emptyVariant = search ? 'no-search' : filter !== 'all' ? 'no-filter' : 'no-data'
  const resetEmpty   = () => { if (search) setSearch(''); else if (filter !== 'all') setFilter('all') }

  return (
    <div className="p-10 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Môn học</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {loading
              ? 'Đang tải danh sách…'
              : `${counts.all} môn · ${counts.active} hoạt động${counts.archived ? ` · ${counts.archived} lưu trữ` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={loading || !visible.length}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5
                       text-on-surface-variant border border-outline-variant bg-white
                       hover:bg-surface-container-low transition disabled:opacity-40
                       disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            Xuất CSV
          </button>
          <button
            onClick={() => handleAction('create', { name: 'Môn học mới' })}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5
                       bg-primary text-on-primary hover:brightness-125 active:scale-[0.98] transition"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo môn học
          </button>
        </div>
      </div>

      {!loading && !error && (
        <ExceptionStrip
          subjects={subjects}
          onReview={() => { setFilter('attention'); setSort('pending') }}
        />
      )}

      <SubjectsToolbar
        search={search} onSearch={setSearch}
        filter={filter} onFilter={setFilter}
        sort={sort}     onSort={setSort}
        counts={counts}
      />

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => <SubjectCardSkeleton key={i} />)}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200
                        rounded-xl text-red-700 text-sm">
          <span className="material-symbols-outlined">error</span>
          <span className="min-w-0">Không tải được danh sách môn học — {error}</span>
          <button
            onClick={retry}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
                       text-red-700 hover:bg-red-100 transition"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && !visible.length && (
        <EmptyState
          variant={emptyVariant}
          query={search}
          onAction={emptyVariant === 'no-data'
            ? () => handleAction('create', { name: 'Môn học mới' })
            : resetEmpty}
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((s, i) => (
            <div
              key={s.id || s.name}
              className="subj-card-in"
              // Stagger caps at 8 so a long list never makes the last card wait.
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <SubjectCard
                subject={s}
                selected={selected.has(s.id || s.name)}
                onSelect={toggleSelect}
                onOpen={() => handleAction('manage', s)}
                onAction={handleAction}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 subj-bulk-in
                        flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-xl
                        bg-inverse-surface text-inverse-on-surface shadow-2xl">
          <span className="text-sm font-medium tabular-nums">{selected.size} đã chọn</span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => toast('Thao tác hàng loạt sẽ khả dụng ở bản cập nhật tới.', { icon: '🛠️' })}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/10 transition"
          >
            Lưu trữ
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/10 transition"
          >
            Xuất
          </button>
          <button
            onClick={() => setSelected(new Set())}
            aria-label="Bỏ chọn tất cả"
            className="w-7 h-7 grid place-items-center rounded-lg hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {formModal && (
        <SubjectFormModal
          subject={formModal.subject}
          onClose={() => setFormModal(null)}
          onSubmit={saveSubject}
        />
      )}

      {deleteModal && (
        <DeleteSubjectModal
          subject={deleteModal}
          token={token}
          onClose={() => setDeleteModal(null)}
          onConfirm={() => deleteSubject(deleteModal)}
          onArchive={() => changeStatus(deleteModal, 'archived', 'lưu trữ')}
        />
      )}
    </div>
  )
}
