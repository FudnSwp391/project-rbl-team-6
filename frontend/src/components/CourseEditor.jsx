import { useEffect, useRef, useState } from 'react'
import { saveTutorCourse } from '../services/api'
import { getSignedStorageUrl, uploadCourseThumbnail, uploadCourseVideo } from '../services/upload'

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBJECTS = ['Toán học', 'Tiếng Anh', 'Lập trình', 'Ngữ văn', 'Khoa học', 'Nghệ thuật']
const LEVELS = ['Mất gốc', 'Cơ bản', 'Nâng cao', 'Luyện thi']
const LANGUAGES = ['Tiếng Việt', 'Tiếng Anh', 'Song ngữ']
const LESSON_TYPES = ['video', 'exercise', 'document']
const LESSON_TYPE_LABELS = { video: 'Video bài giảng', exercise: 'Bài tập', document: 'Tài liệu' }
const LESSON_TYPE_ICONS = { video: 'play_circle', exercise: 'assignment', document: 'description' }
const TARGET_STUDENTS = [
  'Học sinh Tiểu học (lớp 1–5)',
  'Học sinh THCS (lớp 6–9)',
  'Học sinh THPT (lớp 10–12)',
  'Sinh viên Đại học / Cao đẳng',
  'Người đi làm / Học viên tự do',
  'Trẻ mầm non (dưới 6 tuổi)',
  'Học sinh luyện thi chuyên đề',
  'Học sinh mất gốc / cần bổ trợ',
]

const TABS = [
  { key: 'info', label: 'Thông tin', icon: 'info' },
  { key: 'content', label: 'Nội dung', icon: 'menu_book' },
  { key: 'audience', label: 'Đối tượng', icon: 'group' },
  { key: 'publish', label: 'Xuất bản', icon: 'rocket_launch' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMoney(value) {
  if (!Number(value || 0)) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function cleanList(items) {
  return Array.isArray(items) ? items.map((i) => String(i || '').trim()).filter(Boolean) : []
}

function emptyLesson() {
  return { title: '', description: '', videoUrl: '', materialUrl: '', durationLabel: '', isPreview: false, type: 'video' }
}

function emptyChapter(index = 0) {
  return { title: `Chương ${index + 1}`, description: '', lessons: [emptyLesson()] }
}

/** Convert flat lessons array → chapters with nested lessons */
function lessonsToChapters(lessons) {
  if (!Array.isArray(lessons) || lessons.length === 0) return [emptyChapter(0)]
  // If lessons already have chapter grouping use it, else treat each as its own chapter
  return lessons.map((l, i) => ({
    title: l.chapterTitle || l.title || `Chương ${i + 1}`,
    description: l.chapterDescription || l.description || '',
    lessons: l.lessons?.length
      ? l.lessons
      : [{ title: l.title || '', description: l.description || '', videoUrl: l.videoUrl || '', materialUrl: l.materialUrl || '', durationLabel: l.durationLabel || '', isPreview: Boolean(l.isPreview), type: l.type || 'video' }],
  }))
}

/** Flatten chapters → lessons array for API payload */
function chaptersToLessons(chapters) {
  const flat = []
  chapters.forEach((ch, ci) => {
    ;(ch.lessons || []).forEach((lesson, li) => {
      if (lesson.title?.trim()) {
        flat.push({ ...lesson, position: flat.length + 1, chapterTitle: ch.title, chapterDescription: ch.description, chapterIndex: ci, lessonIndex: li })
      }
    })
  })
  return flat
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CourseEditor({ course, user, onBack, onSaved }) {
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState(buildInitialForm(course))
  const [chapters, setChapters] = useState(() => lessonsToChapters(course?.lessons || []))
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingKey, setUploadingKey] = useState('')
  const successTimer = useRef(null)

  // resolve thumbnail signed url
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!form.thumbnailUrl?.startsWith('storage://')) return
      if (form.thumbnailPreviewUrl && !form.thumbnailPreviewUrl.startsWith('storage://')) return
      const signed = await getSignedStorageUrl(form.thumbnailUrl)
      if (!cancelled && signed) setForm((f) => ({ ...f, thumbnailPreviewUrl: signed }))
    }
    resolve()
    return () => { cancelled = true }
  }, [form.thumbnailUrl])

  function buildInitialForm(c) {
    return {
      id: c?.id || '',
      title: c?.title || '',
      shortDescription: c?.shortDescription || c?.short_description || '',
      description: c?.description || '',
      subject: c?.subject || SUBJECTS[0],
      level: c?.level || LEVELS[1],
      language: c?.language || LANGUAGES[0],
      estimatedHours: c?.estimatedHours || c?.estimated_hours || 10,
      price: c?.price || '',
      originalPrice: c?.originalPrice || c?.original_price || '',
      thumbnailUrl: c?.thumbnailUrl || c?.thumbnail_url || '',
      thumbnailPreviewUrl: c?.thumbnailPreviewUrl || c?.thumbnail_preview_url || c?.thumbnailUrl || c?.thumbnail_url || '',
      status: c?.status || 'draft',
      targetStudents: c?.targetStudents || c?.target_students || '',
      entryLevel: c?.entryLevel || c?.entry_level || c?.level || LEVELS[1],
      courseGoal: c?.courseGoal || c?.course_goal || '',
      teachingMethod: c?.teachingMethod || c?.teaching_method || '',
      communicationPlan: c?.communicationPlan || c?.communication_plan || '',
      learningOutcomes: c?.learningOutcomes?.length ? c.learningOutcomes : [''],
      requirements: c?.requirements?.length ? c.requirements : [''],
    }
  }

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function showSuccess(msg) {
    setSuccess(msg)
    clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSave(nextStatus = form.status) {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        status: nextStatus,
        price: Number(form.price || 0),
        originalPrice: Number(form.originalPrice || 0),
        estimatedHours: Number(form.estimatedHours || 0),
        learningOutcomes: cleanList(form.learningOutcomes),
        requirements: cleanList(form.requirements),
        lessons: chaptersToLessons(chapters),
      }
      await saveTutorCourse(payload)
      setForm((f) => ({ ...f, status: nextStatus }))
      showSuccess('Đã lưu thành công! Đang quay lại...')
      onSaved?.()
      setTimeout(() => onBack?.(), 800)
    } catch (e) {
      setError(e.message || 'Không thể lưu khóa học.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusToggle() {
    const next = form.status === 'published' ? 'draft' : 'published'
    setSavingStatus(true)
    setError('')
    try {
      const payload = {
        ...form,
        status: next,
        price: Number(form.price || 0),
        originalPrice: Number(form.originalPrice || 0),
        estimatedHours: Number(form.estimatedHours || 0),
        learningOutcomes: cleanList(form.learningOutcomes),
        requirements: cleanList(form.requirements),
        lessons: chaptersToLessons(chapters),
      }
      await saveTutorCourse(payload)
      setForm((f) => ({ ...f, status: next }))
      showSuccess(next === 'published' ? 'Đã xuất bản khóa học!' : 'Đã rút về bản nháp!')
      onSaved?.()
    } catch (e) {
      setError(e.message || 'Không thể thay đổi trạng thái.')
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleThumbnailFile(file) {
    if (!file) return
    setUploadingKey('thumbnail')
    const localUrl = URL.createObjectURL(file)
    setForm((f) => ({ ...f, thumbnailPreviewUrl: localUrl }))
    try {
      const uploaded = await uploadCourseThumbnail(file, user?.id)
      const storageUrl = uploaded?.storageUrl || uploaded?.url || ''
      const previewUrl = storageUrl.startsWith('storage://')
        ? await getSignedStorageUrl(storageUrl)
        : (uploaded?.previewUrl || uploaded?.url || storageUrl)
      setForm((f) => ({ ...f, thumbnailUrl: storageUrl, thumbnailPreviewUrl: previewUrl }))
      URL.revokeObjectURL(localUrl)
    } catch (e) {
      setError(e.message || 'Tải ảnh bìa thất bại.')
    } finally {
      setUploadingKey('')
    }
  }

  const totalLessons = chapters.reduce((s, ch) => s + (ch.lessons?.filter((l) => l.title?.trim()).length || 0), 0)
  const isPublished = form.status === 'published'

  return (
    <div className="min-h-[calc(100vh-80px)] -m-4 md:-m-6 bg-[#f6f7fb] text-[#141824]" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-[#dde1ec] bg-white/96 backdrop-blur-sm px-5 md:px-8 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="shrink-0 w-9 h-9 rounded-lg hover:bg-[#eef1f7] flex items-center justify-center transition-colors" title="Quay lại">
              <span className="material-symbols-outlined text-[22px] text-[#3d4351]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-[#697083] uppercase tracking-wider font-bold">Chỉnh sửa khóa học</p>
              <h2 className="text-[17px] font-black text-[#001b7a] leading-tight truncate max-w-[360px]">{form.title || 'Chưa có tiêu đề'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${isPublished ? 'bg-[#e6f9ee] text-[#1a7a3d] border-[#a3e0b8]' : 'bg-[#fef3e2] text-[#b45309] border-[#fcd88a]'}`}>
              <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
              {isPublished ? 'Đã xuất bản' : 'Bản nháp'}
            </span>
            <button onClick={() => handleSave()} disabled={saving} className="h-9 px-4 rounded-lg border border-[#001b7a] text-[#001b7a] font-bold bg-white hover:bg-[#eef3ff] disabled:opacity-60 inline-flex items-center gap-1.5 text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">{saving ? 'hourglass_empty' : 'save'}</span>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={handleStatusToggle} disabled={savingStatus} className={`h-9 px-4 rounded-lg font-bold text-sm inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 ${isPublished ? 'bg-[#fef3e2] text-[#b45309] border border-[#fcd88a] hover:bg-[#fde9c0]' : 'bg-[#001b7a] text-white hover:bg-[#00145a]'}`}>
              <span className="material-symbols-outlined text-[18px]">{isPublished ? 'cloud_off' : 'rocket_launch'}</span>
              {savingStatus ? '...' : isPublished ? 'Rút về nháp' : 'Xuất bản'}
            </button>
          </div>
        </div>

        {/* Toast messages */}
        {success && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#e6f9ee] border border-[#a3e0b8] px-4 py-2 text-sm font-bold text-[#1a7a3d]">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {success}
          </div>
        )}
        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-700">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
            <button onClick={() => setError('')} className="ml-auto"><span className="material-symbols-outlined text-[16px]">close</span></button>
          </div>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-120px)]">
        {/* ── Sidebar Tabs ── */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[#dde1ec] bg-white pt-4 pb-8">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-left transition-all ${tab === t.key ? 'bg-[#eef3ff] text-[#001b7a] border-r-4 border-[#001b7a]' : 'text-[#3d4351] hover:bg-[#f3f5fb] hover:text-[#001b7a]'}`}>
              <span className={`material-symbols-outlined text-[20px] ${tab === t.key ? 'text-[#001b7a]' : 'text-[#697083]'}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div className="mt-auto px-4 pt-4 border-t border-[#eef1f7] mx-3">
            <p className="text-[11px] text-[#697083] font-bold uppercase tracking-wide mb-2">Tổng quan</p>
            <p className="text-sm font-black text-[#141824]">{chapters.length} chương</p>
            <p className="text-xs text-[#697083]">{totalLessons} bài học</p>
            <p className="mt-1 text-sm font-black text-[#00288e]">{formatMoney(form.price)}</p>
          </div>
        </aside>

        {/* ── Mobile Tab Bar ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#dde1ec] flex">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${tab === t.key ? 'text-[#001b7a]' : 'text-[#697083]'}`}>
              <span className={`material-symbols-outlined text-[22px] ${tab === t.key ? 'text-[#001b7a]' : 'text-[#b0b7c5]'}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-20 md:pb-8 overflow-auto">
          {tab === 'info' && (
            <TabInfo form={form} setField={setField} uploadingKey={uploadingKey} onThumbnailFile={handleThumbnailFile} />
          )}
          {tab === 'content' && (
            <TabContent chapters={chapters} setChapters={setChapters} user={user} uploadingKey={uploadingKey} setUploadingKey={setUploadingKey} setError={setError} />
          )}
          {tab === 'audience' && (
            <TabAudience form={form} setField={setField} />
          )}
          {tab === 'publish' && (
            <TabPublish form={form} chapters={chapters} totalLessons={totalLessons} onSave={handleSave} onToggleStatus={handleStatusToggle} saving={saving} savingStatus={savingStatus} />
          )}
        </main>
      </div>
    </div>
  )
}

// ─── Tab: Thông tin cơ bản ────────────────────────────────────────────────────
function TabInfo({ form, setField, uploadingKey, onThumbnailFile }) {
  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader icon="info" title="Thông tin cơ bản" desc="Thông tin hiển thị cho học viên khi tìm kiếm khóa học." />

      <Card title="Thông tin chính">
        <Field label="Tiêu đề khóa học" required value={form.title} onChange={(v) => setField('title', v)} placeholder="Nhập tên khóa học..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Lĩnh vực" required value={form.subject} onChange={(v) => setField('subject', v)} options={SUBJECTS} />
          <SelectField label="Cấp độ" required value={form.level} onChange={(v) => setField('level', v)} options={LEVELS} />
        </div>
        <TextareaField label="Mô tả ngắn" value={form.shortDescription} onChange={(v) => setField('shortDescription', v)} placeholder="Tóm tắt khóa học trong 2-3 câu..." rows={3} />
        <TextareaField label="Mô tả chi tiết" value={form.description} onChange={(v) => setField('description', v)} placeholder="Nội dung, lộ trình, điểm nổi bật..." rows={6} />
      </Card>

      <Card title="Hình ảnh bìa">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="shrink-0 w-full sm:w-56 aspect-video rounded-xl border-2 border-dashed border-[#b9c0d1] bg-[#f3f4f7] overflow-hidden flex items-center justify-center">
            {(form.thumbnailPreviewUrl || form.thumbnailUrl) ? (
              <img src={form.thumbnailPreviewUrl || form.thumbnailUrl} alt="Ảnh bìa" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4 text-[#697083]">
                <span className="material-symbols-outlined text-[40px] block mb-1">image</span>
                <span className="text-xs font-bold">Chưa có ảnh</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <Field label="URL ảnh bìa" value={form.thumbnailUrl} onChange={(v) => { setField('thumbnailUrl', v); setField('thumbnailPreviewUrl', v) }} placeholder="https://..." />
            <label className="h-11 w-full rounded-lg border border-[#c8cedd] text-[#001b7a] font-bold bg-white hover:bg-[#eef3ff] flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[20px]">upload</span>
              {uploadingKey === 'thumbnail' ? 'Đang tải...' : 'Tải ảnh bìa lên'}
              <input type="file" accept="image/*" hidden onChange={(e) => onThumbnailFile(e.target.files?.[0])} />
            </label>
            <p className="text-xs text-[#697083]">Khuyến nghị: 1280×720px, tỉ lệ 16:9, JPG/PNG, tối đa 5MB</p>
          </div>
        </div>
      </Card>

      <Card title="Học phí & Cài đặt">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField label="Học phí" value={form.price} onChange={(v) => setField('price', v)} placeholder="499000" suffix="VND" />
          <NumberField label="Giá gốc (nếu có giảm)" value={form.originalPrice} onChange={(v) => setField('originalPrice', v)} placeholder="699000" suffix="VND" />
        </div>
        {Number(form.price || 0) > 0 && (
          <div className="rounded-xl bg-[#eef3ff] border border-[#c8d8ff] p-4 text-[#001b7a] text-sm">
            Học viên sẽ thấy giá: <strong>{formatMoney(form.price)}</strong>
            {Number(form.originalPrice || 0) > 0 && <span className="ml-2 line-through text-[#697083]">{formatMoney(form.originalPrice)}</span>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Ngôn ngữ giảng dạy" value={form.language} onChange={(v) => setField('language', v)} options={LANGUAGES} />
          <NumberField label="Thời lượng dự kiến" value={form.estimatedHours} onChange={(v) => setField('estimatedHours', v)} suffix="giờ" />
        </div>
      </Card>
    </div>
  )
}

// ─── Tab: Nội dung (Chapters & Lessons) ─────────────────────────────────────
function TabContent({ chapters, setChapters, user, uploadingKey, setUploadingKey, setError }) {
  const [expandedChapters, setExpandedChapters] = useState(() => chapters.map((_, i) => i))

  const toggleChapter = (i) => setExpandedChapters((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])
  const expandAll = () => setExpandedChapters(chapters.map((_, i) => i))
  const collapseAll = () => setExpandedChapters([])

  const updateChapter = (i, patch) => setChapters((prev) => prev.map((ch, ci) => ci === i ? { ...ch, ...patch } : ch))
  const removeChapter = (i) => {
    if (chapters.length === 1) return
    if (!window.confirm('Xóa chương này? Tất cả bài học trong chương cũng sẽ bị xóa.')) return
    setChapters((prev) => prev.filter((_, ci) => ci !== i))
    setExpandedChapters((prev) => prev.filter((x) => x !== i).map((x) => x > i ? x - 1 : x))
  }
  const addChapter = () => {
    const newIndex = chapters.length
    setChapters((prev) => [...prev, emptyChapter(newIndex)])
    setExpandedChapters((prev) => [...prev, newIndex])
  }

  const addLesson = (ci) => setChapters((prev) => prev.map((ch, i) => i === ci ? { ...ch, lessons: [...(ch.lessons || []), emptyLesson()] } : ch))
  const updateLesson = (ci, li, patch) => setChapters((prev) => prev.map((ch, i) => i === ci ? { ...ch, lessons: ch.lessons.map((l, j) => j === li ? { ...l, ...patch } : l) } : ch))
  const removeLesson = (ci, li) => {
    if ((chapters[ci]?.lessons?.length || 0) <= 1) return
    setChapters((prev) => prev.map((ch, i) => i === ci ? { ...ch, lessons: ch.lessons.filter((_, j) => j !== li) } : ch))
  }

  async function handleVideoUpload(ci, li, file) {
    if (!file) return
    const key = `chapter-${ci}-lesson-${li}`
    setUploadingKey(key)
    try {
      const url = await uploadCourseVideo(file, user?.id)
      updateLesson(ci, li, { videoUrl: url })
    } catch (e) {
      setError(e.message || 'Tải video thất bại.')
    } finally {
      setUploadingKey('')
    }
  }

  const totalLessons = chapters.reduce((s, ch) => s + (ch.lessons?.filter((l) => l.title?.trim()).length || 0), 0)

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader icon="menu_book" title="Nội dung khóa học" desc={`${chapters.length} chương · ${totalLessons} bài học`} />
        <div className="flex gap-2 shrink-0">
          <button onClick={expandAll} className="text-xs font-bold text-[#00288e] hover:underline">Mở tất cả</button>
          <span className="text-[#c8cedd]">|</span>
          <button onClick={collapseAll} className="text-xs font-bold text-[#697083] hover:underline">Thu gọn</button>
        </div>
      </div>

      {/* Chapter list */}
      <div className="space-y-3">
        {chapters.map((chapter, ci) => {
          const expanded = expandedChapters.includes(ci)
          const lessonCount = chapter.lessons?.filter((l) => l.title?.trim()).length || 0
          return (
            <div key={ci} className="rounded-xl border border-[#dde1ec] bg-white shadow-sm overflow-hidden">
              {/* Chapter header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#f8f9fc] border-b border-[#eef1f7]">
                <span className="material-symbols-outlined text-[18px] text-[#697083] cursor-grab select-none">drag_indicator</span>
                <div className="flex-1 min-w-0">
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(ci, { title: e.target.value })}
                    placeholder={`Chương ${ci + 1}: Tiêu đề...`}
                    className="w-full bg-transparent font-black text-[#001b7a] text-sm outline-none placeholder:text-[#b0b7c5]"
                  />
                  <p className="text-[11px] text-[#697083] mt-0.5">{lessonCount} bài học</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => removeChapter(ci)} disabled={chapters.length === 1} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center disabled:opacity-30 transition-colors" title="Xóa chương">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <button onClick={() => toggleChapter(ci)} className="w-8 h-8 rounded-lg hover:bg-[#eef1f7] flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-[#697083]">{expanded ? 'expand_less' : 'expand_more'}</span>
                  </button>
                </div>
              </div>

              {/* Chapter description */}
              {expanded && (
                <div className="px-4 pt-3 pb-1">
                  <input
                    value={chapter.description}
                    onChange={(e) => updateChapter(ci, { description: e.target.value })}
                    placeholder="Mô tả ngắn về nội dung chương này... (tùy chọn)"
                    className="w-full text-xs text-[#51586a] outline-none bg-transparent border-b border-[#eef1f7] pb-2 focus:border-[#00288e] transition-colors"
                  />
                </div>
              )}

              {/* Lessons */}
              {expanded && (
                <div className="px-4 pb-4 space-y-2 mt-2">
                  {(chapter.lessons || []).map((lesson, li) => (
                    <LessonCard
                      key={li}
                      ci={ci} li={li}
                      lesson={lesson}
                      uploading={uploadingKey === `chapter-${ci}-lesson-${li}`}
                      onChange={(patch) => updateLesson(ci, li, patch)}
                      onRemove={() => removeLesson(ci, li)}
                      onVideoUpload={(file) => handleVideoUpload(ci, li, file)}
                      canRemove={(chapter.lessons?.length || 0) > 1}
                    />
                  ))}
                  <button onClick={() => addLesson(ci)} className="w-full mt-1 h-9 rounded-lg border border-dashed border-[#00288e] text-[#00288e] font-bold text-sm inline-flex items-center justify-center gap-1.5 hover:bg-[#eef3ff] transition-colors">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Thêm bài học
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add chapter */}
      <button onClick={addChapter} className="w-full h-12 rounded-xl border-2 border-dashed border-[#b0b7c5] text-[#3d4351] font-bold inline-flex items-center justify-center gap-2 hover:border-[#00288e] hover:text-[#00288e] hover:bg-[#eef3ff] transition-all">
        <span className="material-symbols-outlined text-[22px]">add_circle</span>
        Thêm chương mới
      </button>
    </div>
  )
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────
function LessonCard({ ci, li, lesson, uploading, onChange, onRemove, onVideoUpload, canRemove }) {
  const [open, setOpen] = useState(false)
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState('')

  // Resolve storage:// → signed URL for preview
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!lesson.videoUrl) { setResolvedVideoUrl(''); return }
      if (lesson.videoUrl.startsWith('storage://')) {
        try {
          const signed = await getSignedStorageUrl(lesson.videoUrl)
          if (!cancelled) setResolvedVideoUrl(signed || '')
        } catch { if (!cancelled) setResolvedVideoUrl('') }
      } else {
        if (!cancelled) setResolvedVideoUrl(lesson.videoUrl)
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [lesson.videoUrl])

  // Derive YouTube embed id
  const ytMatch = resolvedVideoUrl?.match(/^.*(youtu\.be\/|v\/|embed\/|watch\?v=|&v=)([^#&?]*)/)
  const ytId = ytMatch?.[2]?.length === 11 ? ytMatch[2] : null
  const hasVideo = Boolean(lesson.videoUrl)
  const isStorageUrl = lesson.videoUrl?.startsWith('storage://')
  const isHttpUrl = resolvedVideoUrl?.startsWith('http')

  return (
    <div className="rounded-lg border border-[#e4e7f0] bg-[#fafbfd] overflow-hidden">
      {/* Lesson header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="material-symbols-outlined text-[16px] text-[#b0b7c5] cursor-grab select-none shrink-0">drag_indicator</span>
        {/* Type icon */}
        <span className="material-symbols-outlined text-[18px] text-[#697083] shrink-0">{LESSON_TYPE_ICONS[lesson.type] || 'play_circle'}</span>
        <input
          value={lesson.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`Bài ${li + 1}: Tiêu đề bài học...`}
          className="flex-1 min-w-0 bg-transparent text-sm font-bold text-[#141824] outline-none placeholder:text-[#b0b7c5]"
        />
        <div className="flex items-center gap-1 shrink-0">
          {lesson.isPreview && <span className="hidden sm:inline text-[10px] font-black text-[#147a3d] bg-[#e8f8ef] rounded-full px-2 py-0.5">Xem thử</span>}
          {hasVideo && <span className="hidden sm:inline text-[10px] font-black text-[#00288e] bg-[#eef3ff] rounded-full px-2 py-0.5 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">videocam</span></span>}
          <button onClick={() => setOpen((v) => !v)} className="w-7 h-7 rounded-md hover:bg-[#eef1f7] flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[16px] text-[#697083]">{open ? 'expand_less' : 'settings'}</span>
          </button>
          <button onClick={onRemove} disabled={!canRemove} className="w-7 h-7 rounded-md text-red-400 hover:bg-red-50 flex items-center justify-center disabled:opacity-30 transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Expanded lesson details */}
      {open && (
        <div className="border-t border-[#e4e7f0] px-3 pb-4 pt-3 space-y-4 bg-white">
          {/* Lesson type selector */}
          <div className="flex flex-wrap gap-2">
            {LESSON_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onChange({ type: t })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${lesson.type === t ? 'bg-[#001b7a] text-white border-[#001b7a]' : 'bg-white text-[#3d4351] border-[#c8cedd] hover:border-[#00288e] hover:text-[#00288e]'}`}
              >
                <span className="material-symbols-outlined text-[14px]">{LESSON_TYPE_ICONS[t]}</span>
                {LESSON_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <TextareaField label="Mô tả bài học" value={lesson.description} onChange={(v) => onChange({ description: v })} placeholder="Nội dung học, mục tiêu bài..." rows={2} />

          {/* ── Video section ── */}
          {lesson.type === 'video' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#141824] block">Video bài giảng</label>

              {/* URL input + upload + xóa */}
              <div className="flex gap-2">
                <input
                  value={lesson.videoUrl || ''}
                  onChange={(e) => onChange({ videoUrl: e.target.value })}
                  placeholder="Dán URL YouTube hoặc video trực tiếp..."
                  className="flex-1 h-10 rounded-lg border border-[#bfc5d5] px-3 text-sm outline-none focus:border-[#00288e] bg-white"
                />
                <label className="h-10 px-3 shrink-0 rounded-lg border border-[#00288e] text-[#00288e] font-bold text-xs cursor-pointer inline-flex items-center gap-1 hover:bg-[#eef3ff] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  {uploading ? 'Đang tải...' : 'Tải lên'}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => onVideoUpload(e.target.files?.[0])} />
                </label>
                {hasVideo && (
                  <button
                    onClick={() => { onChange({ videoUrl: '' }); setResolvedVideoUrl('') }}
                    className="h-10 w-10 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Xóa video"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>

              {/* Storage URL indicator */}
              {isStorageUrl && (
                <div className="flex items-center gap-2 text-xs text-[#697083] bg-[#f3f5fb] rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-[16px] text-[#00288e]">cloud_done</span>
                  <span>Video đã lưu trên cloud. {resolvedVideoUrl ? 'Đang hiển thị preview...' : 'Đang tải link xem...'}</span>
                </div>
              )}

              {/* ── Video Preview ── */}
              {hasVideo && (
                <div className="rounded-xl overflow-hidden border border-[#e4e7f0] bg-[#0f0f0f]">
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a2e]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#7c8db5]">smart_display</span>
                      <span className="text-xs font-bold text-[#7c8db5]">
                        {ytId ? 'YouTube' : isStorageUrl ? 'Video đã tải lên' : 'Video URL'}
                      </span>
                    </div>
                    <a
                      href={resolvedVideoUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-[#5b8eff] hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Mở tab mới
                    </a>
                  </div>

                  {/* Player */}
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full aspect-video border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : resolvedVideoUrl && isHttpUrl ? (
                    <video
                      src={resolvedVideoUrl}
                      controls
                      preload="metadata"
                      className="w-full aspect-video bg-black"
                      key={resolvedVideoUrl}
                    >
                      Trình duyệt không hỗ trợ phát video này.
                    </video>
                  ) : !resolvedVideoUrl && isStorageUrl ? (
                    /* Loading state while resolving signed URL */
                    <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 text-[#7c8db5]">
                      <span className="material-symbols-outlined text-[40px] animate-pulse">hourglass_top</span>
                      <span className="text-xs font-bold">Đang tải video...</span>
                    </div>
                  ) : (
                    /* Fallback for unknown URL */
                    <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 text-[#7c8db5]">
                      <span className="material-symbols-outlined text-[40px]">link_off</span>
                      <span className="text-xs font-bold">URL không hợp lệ hoặc không thể phát</span>
                      <span className="text-[10px] text-[#4a5568] max-w-[240px] text-center break-all">{lesson.videoUrl}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!hasVideo && (
                <div className="rounded-xl border-2 border-dashed border-[#dde1ec] bg-[#f8f9fc] aspect-video flex flex-col items-center justify-center gap-2 text-[#b0b7c5]">
                  <span className="material-symbols-outlined text-[40px]">videocam_off</span>
                  <span className="text-xs font-bold">Chưa có video</span>
                  <span className="text-[10px]">Dán URL hoặc tải file lên bên trên</span>
                </div>
              )}
            </div>
          )}

          {/* Material URL */}
          <Field label="Tài liệu đính kèm (URL)" value={lesson.materialUrl || ''} onChange={(v) => onChange({ materialUrl: v })} placeholder="https://drive.google.com/..." />
          <Field label="Thời lượng" value={lesson.durationLabel || ''} onChange={(v) => onChange({ durationLabel: v })} placeholder="Ví dụ: 30 phút" />

          {/* Preview toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div onClick={() => onChange({ isPreview: !lesson.isPreview })} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${lesson.isPreview ? 'bg-[#22c55e]' : 'bg-[#c8cedd]'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${lesson.isPreview ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-bold text-[#141824]">Cho xem thử miễn phí</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Đối tượng & Yêu cầu ────────────────────────────────────────────────
function TabAudience({ form, setField }) {
  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader icon="group" title="Đối tượng học viên" desc="Giúp học viên biết khóa học có phù hợp với họ không." />

      <Card title="Đối tượng học">
        <SelectField label="Đối tượng học sinh" value={form.targetStudents} onChange={(v) => setField('targetStudents', v)} options={TARGET_STUDENTS} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Trình độ đầu vào" value={form.entryLevel} onChange={(v) => setField('entryLevel', v)} options={LEVELS} />
          <Field label="Mục tiêu khóa học" value={form.courseGoal} onChange={(v) => setField('courseGoal', v)} placeholder="Mục tiêu chính cần đạt..." />
        </div>
        <TextareaField label="Phương pháp giảng dạy" value={form.teachingMethod} onChange={(v) => setField('teachingMethod', v)} placeholder="Ví dụ: Thuyết giảng + bài tập thực hành, thảo luận nhóm..." rows={3} />
      </Card>

      <Card title="Kết quả học tập">
        <EditableList title="Học viên sẽ học được gì?" items={form.learningOutcomes} onChange={(v) => setField('learningOutcomes', v)} placeholder="Ví dụ: Giải thành thạo dạng bài toán hàm số..." icon="check_circle" iconColor="text-[#22c55e]" />
      </Card>

      <Card title="Yêu cầu trước khi học">
        <EditableList title="Học viên cần biết gì trước?" items={form.requirements} onChange={(v) => setField('requirements', v)} placeholder="Ví dụ: Đã hoàn thành kiến thức lớp 11..." icon="info" iconColor="text-[#f59e0b]" />
      </Card>
    </div>
  )
}

// ─── Tab: Xuất bản ────────────────────────────────────────────────────────────
function TabPublish({ form, chapters, totalLessons, onSave, onToggleStatus, saving, savingStatus }) {
  const isPublished = form.status === 'published'

  const checks = [
    { label: 'Tiêu đề khóa học', ok: Boolean(form.title?.trim()), hint: 'Chưa có tiêu đề' },
    { label: 'Mô tả ngắn', ok: Boolean(form.shortDescription?.trim()), hint: 'Chưa có mô tả ngắn' },
    { label: 'Hình ảnh bìa', ok: Boolean(form.thumbnailUrl?.trim()), hint: 'Chưa có ảnh bìa' },
    { label: 'Học phí', ok: Number(form.price || 0) > 0, hint: 'Chưa đặt học phí' },
    { label: 'Có ít nhất 1 chương', ok: chapters.length > 0 && totalLessons > 0, hint: 'Chưa có bài học nào' },
    { label: 'Đối tượng học sinh', ok: Boolean(form.targetStudents?.trim()), hint: 'Chưa chọn đối tượng' },
  ]
  const passCount = checks.filter((c) => c.ok).length

  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader icon="rocket_launch" title="Xuất bản khóa học" desc="Kiểm tra và xuất bản để học viên có thể đăng ký." />

      {/* Preview card */}
      <Card title="Xem trước">
        <div className="rounded-xl overflow-hidden border border-[#e4e7f0]">
          <div className="aspect-video bg-[#eef3ff] overflow-hidden">
            {(form.thumbnailPreviewUrl || form.thumbnailUrl) ? (
              <img src={form.thumbnailPreviewUrl || form.thumbnailUrl} alt={form.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[56px] text-[#00288e]">play_lesson</span>
              </div>
            )}
          </div>
          <div className="p-4 bg-white">
            <div className="flex flex-wrap gap-2 mb-2">
              {form.subject && <span className="rounded-full bg-[#eef3ff] px-3 py-0.5 text-[11px] font-black text-[#00288e]">{form.subject}</span>}
              {form.level && <span className="rounded-full bg-[#eef3ff] px-3 py-0.5 text-[11px] font-black text-[#00288e]">{form.level}</span>}
            </div>
            <h3 className="font-black text-[#001b7a] text-lg">{form.title || 'Chưa có tiêu đề'}</h3>
            <p className="text-sm text-[#51586a] mt-1">{form.shortDescription || 'Chưa có mô tả.'}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="font-black text-[#00288e] text-xl">{formatMoney(form.price)}</span>
              {Number(form.originalPrice || 0) > 0 && <span className="line-through text-[#697083]">{formatMoney(form.originalPrice)}</span>}
            </div>
            <div className="mt-2 flex gap-3 text-xs text-[#697083]">
              <span>{chapters.length} chương</span>
              <span>·</span>
              <span>{totalLessons} bài học</span>
              <span>·</span>
              <span>{form.estimatedHours} giờ</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card title={`Kiểm tra trước khi xuất bản (${passCount}/${checks.length})`}>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${c.ok ? 'bg-[#e6f9ee]' : 'bg-[#fef3e2]'}`}>
              <span className={`material-symbols-outlined text-[20px] ${c.ok ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>{c.ok ? 'check_circle' : 'warning'}</span>
              <span className={`text-sm font-bold ${c.ok ? 'text-[#1a7a3d]' : 'text-[#b45309]'}`}>{c.label}</span>
              {!c.ok && <span className="ml-auto text-xs text-[#b45309]">{c.hint}</span>}
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-[#e4e7f0] rounded-full overflow-hidden">
            <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${(passCount / checks.length) * 100}%` }} />
          </div>
          <p className="text-xs text-[#697083] mt-1">{passCount === checks.length ? 'Sẵn sàng xuất bản!' : `Còn ${checks.length - passCount} mục cần hoàn thiện`}</p>
        </div>
      </Card>

      {/* Action buttons */}
      <Card title="Hành động">
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => onSave('draft')} disabled={saving} className="flex-1 h-11 rounded-xl border border-[#001b7a] text-[#001b7a] font-bold bg-white hover:bg-[#eef3ff] disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[20px]">save</span>
            {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
          </button>
          <button
            onClick={onToggleStatus}
            disabled={savingStatus || (!isPublished && passCount < 5)}
            className={`flex-1 h-11 rounded-xl font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${isPublished ? 'bg-[#fef3e2] text-[#b45309] border border-[#fcd88a] hover:bg-[#fde9c0]' : 'bg-[#001b7a] text-white hover:bg-[#00145a]'}`}
            title={!isPublished && passCount < 5 ? 'Hoàn thiện checklist trước khi xuất bản' : ''}
          >
            <span className="material-symbols-outlined text-[20px]">{isPublished ? 'cloud_off' : 'rocket_launch'}</span>
            {savingStatus ? 'Đang xử lý...' : isPublished ? 'Rút về bản nháp' : 'Xuất bản ngay'}
          </button>
        </div>
        {!isPublished && passCount < 5 && (
          <p className="text-xs text-[#b45309] text-center mt-1">Hoàn thiện ít nhất 5/6 mục trên để có thể xuất bản</p>
        )}
      </Card>
    </div>
  )
}

// ─── Shared UI Components ─────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px] text-[#001b7a]">{icon}</span>
        <h3 className="text-xl font-black text-[#001b7a]">{title}</h3>
      </div>
      {desc && <p className="text-sm text-[#51586a] mt-0.5 ml-8">{desc}</p>}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-[#dde1ec] bg-white p-5 md:p-6 shadow-sm space-y-4">
      {title && <h4 className="font-black text-[#141824] text-sm uppercase tracking-wide border-b border-[#eef1f7] pb-3">{title}</h4>}
      {children}
    </section>
  )
}

function Field({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[#141824]">{label} {required && <span className="text-red-500">*</span>}</span>}
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-lg border border-[#bfc5d5] px-4 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/10 transition-all bg-white" />
    </label>
  )
}

function NumberField({ label, value, onChange, placeholder, suffix }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[#141824]">{label}</span>}
      <div className="flex items-center gap-2">
        <input type="number" min="0" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 flex-1 min-w-0 rounded-lg border border-[#bfc5d5] px-4 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/10 transition-all bg-white" />
        {suffix && <span className="text-sm text-[#697083] font-bold shrink-0">{suffix}</span>}
      </div>
    </label>
  )
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[#141824]">{label} {required && <span className="text-red-500">*</span>}</span>}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-[#bfc5d5] bg-white px-4 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/10 transition-all">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-[#141824]">{label}</span>}
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg border border-[#bfc5d5] px-4 py-3 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/10 transition-all resize-none bg-white" />
    </label>
  )
}

function EditableList({ title, items, onChange, placeholder, icon = 'add', iconColor = 'text-[#697083]' }) {
  const safeItems = items?.length ? items : ['']
  const setItem = (i, v) => onChange(safeItems.map((item, idx) => idx === i ? v : item))
  const addItem = () => onChange([...safeItems, ''])
  const removeItem = (i) => onChange(safeItems.length === 1 ? safeItems : safeItems.filter((_, idx) => idx !== i))
  return (
    <div>
      {title && <span className="mb-2 block text-sm font-bold text-[#141824]">{title}</span>}
      <div className="space-y-2">
        {safeItems.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className={`material-symbols-outlined text-[18px] shrink-0 ${iconColor}`}>{icon}</span>
            <input value={item} onChange={(e) => setItem(i, e.target.value)} placeholder={placeholder} className="h-10 flex-1 min-w-0 rounded-lg border border-[#bfc5d5] px-3 text-sm outline-none focus:border-[#00288e] transition-all bg-white" />
            <button onClick={() => removeItem(i)} className="w-9 h-9 shrink-0 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="mt-2 h-9 px-4 rounded-lg bg-[#eef3ff] text-[#00288e] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-[#dce8ff] transition-colors">
        <span className="material-symbols-outlined text-[18px]">add</span>
        Thêm dòng
      </button>
    </div>
  )
}
