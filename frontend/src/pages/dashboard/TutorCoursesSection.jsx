/**
 * TutorCoursesSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Khu vực "Khóa học của tôi" trong TutorDashboard.
 * Gia sư (đã được duyệt) có thể: tạo, sửa, publish/ẩn, xóa khóa học.
 * Dữ liệu lấy từ /api/tutor/courses (gồm cả draft).
 */
import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { toastSuccess, toastError } from '../../services/toast'

const SUBJECTS = ['Toán', 'Tiếng Anh', 'Hóa học', 'Vật lý', 'Sinh học', 'Tin học', 'Ngữ văn', 'Lịch sử', 'Địa lý']
const LEVELS   = ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Đại học']

const EMPTY_FORM = {
  title: '', description: '', subject: 'Toán', level: 'Cấp 3',
  thumbnail_url: '', price: '', original_price: '',
  total_lessons: '', duration_hours: '',
}

const STATUS_META = {
  draft:     { label: 'Bản nháp',     cls: 'bg-surface-variant text-on-surface-variant', icon: 'edit_note' },
  published: { label: 'Đang hiển thị', cls: 'bg-[#dcfce7] text-[#16a34a]',                 icon: 'visibility' },
  archived:  { label: 'Đã ẩn',         cls: 'bg-[#fef3c7] text-[#b45309]',                 icon: 'visibility_off' },
}

function fmt(n) { return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) }

export default function TutorCoursesSection() {
  const [courses, setCourses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)   // course đang sửa (null = tạo mới)
  const [busyId,    setBusyId]    = useState(null)    // id đang publish/xóa

  const load = () => {
    setLoading(true); setError('')
    api.getMyCourses()
      .then(setCourses)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditing(null);  setModalOpen(true) }
  const openEdit   = (c) => { setEditing(c);    setModalOpen(true) }

  const handleSaved = (saved, isNew) => {
    setModalOpen(false)
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const copy = [...prev]; copy[idx] = saved; return copy
    })
    toastSuccess(isNew ? 'Đã tạo khóa học (bản nháp).' : 'Đã lưu thay đổi.')
  }

  const handleToggleStatus = async (course) => {
    const next = course.status === 'published' ? 'draft' : 'published'
    setBusyId(course.id)
    try {
      const res = await api.setMyCourseStatus(course.id, next)
      setCourses(prev => prev.map(c =>
        c.id === course.id ? { ...c, status: res.status, published_at: res.published_at } : c
      ))
      toastSuccess(next === 'published' ? 'Đã đăng khóa học công khai.' : 'Đã ẩn khóa học.')
    } catch (e) {
      toastError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (course) => {
    if (!window.confirm(`Xóa khóa học "${course.title}"? Hành động này không thể hoàn tác.`)) return
    setBusyId(course.id)
    try {
      await api.deleteMyCourse(course.id)
      setCourses(prev => prev.filter(c => c.id !== course.id))
      toastSuccess('Đã xóa khóa học.')
    } catch (e) {
      toastError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const publishedCount = courses.filter(c => c.status === 'published').length

  return (
    <div className="space-y-md">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_lesson</span>
          Khóa học của tôi
          {courses.length > 0 && (
            <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
              {publishedCount}/{courses.length} hiển thị
            </span>
          )}
        </h3>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tạo khóa học
        </button>
      </div>

      {/* Body */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
            <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="font-label-md text-label-md">Đang tải khóa học...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-error">
            <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            <p className="font-label-md text-label-md text-center px-4">{error}</p>
            <button onClick={load} className="mt-2 text-primary font-label-md hover:underline">Thử lại</button>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px]">menu_book</span>
            <p className="font-label-md text-label-md">Bạn chưa có khóa học nào.</p>
            <button
              onClick={openCreate}
              className="mt-1 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-primary text-primary font-label-md hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tạo khóa học đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-variant/50">
            {courses.map((c) => (
              <CourseRow
                key={c.id}
                course={c}
                busy={busyId === c.id}
                onEdit={() => openEdit(c)}
                onToggle={() => handleToggleStatus(c)}
                onDelete={() => handleDelete(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal tạo/sửa */}
      {modalOpen && (
        <CourseFormModal
          course={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ─── Một dòng khóa học ─────────────────────────────────────────────────────────
function CourseRow({ course, busy, onEdit, onToggle, onDelete }) {
  const meta = STATUS_META[course.status] || STATUS_META.draft
  const isPublished = course.status === 'published'

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-surface-container-lowest/50 transition-colors">
      {/* Thumbnail */}
      <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-container flex items-center justify-center">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover"
               onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <span className="material-symbols-outlined text-on-secondary-container">image</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-label-md text-[16px] text-on-surface truncate">{course.title}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${meta.cls}`}>
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
            {meta.label}
          </span>
        </div>
        <p className="font-body-md text-[14px] text-on-surface-variant flex items-center gap-2 flex-wrap mt-1">
          {course.subject && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm">
              {course.subject}{course.level ? ` · ${course.level}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">sell</span>
            {fmt(course.price)}đ
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">group</span>
            {course.enrollment_count || 0} học viên
          </span>
          {Number(course.review_count) > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>star</span>
              {(Number(course.avg_rating) || 0).toFixed(1)} ({course.review_count})
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          disabled={busy}
          title={isPublished ? 'Ẩn khỏi danh sách công khai' : 'Đăng công khai'}
          className={`inline-flex items-center gap-1 h-9 px-3 rounded-lg font-label-sm transition-colors disabled:opacity-50 ${
            isPublished
              ? 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
              : 'bg-[#16a34a] text-white hover:bg-[#15803d]'
          }`}
        >
          {busy ? (
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">{isPublished ? 'visibility_off' : 'publish'}</span>
          )}
          {isPublished ? 'Ẩn' : 'Đăng'}
        </button>
        <button
          onClick={onEdit}
          disabled={busy}
          title="Sửa khóa học"
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          title="Xóa khóa học"
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}

// ─── Modal form tạo/sửa khóa học ───────────────────────────────────────────────
function CourseFormModal({ course, onClose, onSaved }) {
  const isEdit = !!course
  const [form, setForm] = useState(() => course ? {
    title: course.title || '',
    description: course.description || '',
    subject: course.subject || 'Toán',
    level: course.level || 'Cấp 3',
    thumbnail_url: course.thumbnail_url || '',
    price: course.price ?? '',
    original_price: course.original_price ?? '',
    total_lessons: course.total_lessons ?? '',
    duration_hours: course.duration_hours ?? '',
  } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Tiêu đề khóa học là bắt buộc.'); return }
    setSaving(true); setError('')
    try {
      const saved = isEdit
        ? await api.updateMyCourse(course.id, form)
        : await api.createMyCourse(form)
      onSaved(saved, !isEdit)
    } catch (err) {
      setError(err.message || 'Không lưu được khóa học.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 bg-surface/95 backdrop-blur-sm px-6 py-4 border-b border-surface-variant/50 flex items-center justify-between z-10">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isEdit ? 'edit' : 'add_circle'}
            </span>
            {isEdit ? 'Sửa khóa học' : 'Tạo khóa học mới'}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Tiêu đề khóa học *">
            <input
              className="form-input" value={form.title} onChange={set('title')}
              placeholder="VD: Toán lớp 10 — Đại số và Hình học" maxLength={255} autoFocus
            />
          </Field>

          <Field label="Mô tả">
            <textarea
              className="form-input" rows={3} value={form.description} onChange={set('description')}
              placeholder="Giới thiệu ngắn gọn nội dung và lợi ích của khóa học..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Môn học">
              <select className="form-input" value={form.subject} onChange={set('subject')}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Cấp độ">
              <select className="form-input" value={form.level} onChange={set('level')}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Ảnh thumbnail (URL)">
            <input
              className="form-input" value={form.thumbnail_url} onChange={set('thumbnail_url')}
              placeholder="https://..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Giá (đ)">
              <input type="number" min={0} className="form-input" value={form.price} onChange={set('price')} placeholder="299000" />
            </Field>
            <Field label="Giá gốc (đ, tùy chọn)">
              <input type="number" min={0} className="form-input" value={form.original_price} onChange={set('original_price')} placeholder="499000" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Số bài học">
              <input type="number" min={0} className="form-input" value={form.total_lessons} onChange={set('total_lessons')} placeholder="24" />
            </Field>
            <Field label="Thời lượng (giờ)">
              <input type="number" min={0} step="0.5" className="form-input" value={form.duration_hours} onChange={set('duration_hours')} placeholder="18" />
            </Field>
          </div>

          {error && (
            <p className="text-error font-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {error}
            </p>
          )}

          {!isEdit && (
            <p className="text-on-surface-variant font-label-sm flex items-center gap-1.5 bg-surface-container-low rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-[18px] text-primary">info</span>
              Khóa học sẽ được lưu dưới dạng <strong>bản nháp</strong>. Bấm "Đăng" sau khi tạo để hiển thị công khai.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="h-11 px-5 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit" disabled={saving}
              className="h-11 px-6 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Đang lưu...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span>{isEdit ? 'Lưu thay đổi' : 'Tạo khóa học'}</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Style cho input trong modal (gắn local để khỏi đụng global) */}
      <style>{`
        .form-input {
          width: 100%;
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--outline-variant, #c4c7c5);
          background: var(--surface-container-lowest, #fff);
          color: var(--on-surface, #1a1c1e);
          font-size: 14px;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .form-input:focus {
          border-color: var(--primary, #00288e);
          box-shadow: 0 0 0 3px rgb(0 40 142 / 12%);
        }
        textarea.form-input { resize: vertical; }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5 font-semibold">{label}</span>
      {children}
    </label>
  )
}
