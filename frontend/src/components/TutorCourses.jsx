import { useEffect, useMemo, useState } from 'react'
import { deleteTutorCourse, getTutorCourses, saveTutorCourse } from '../services/api'
import { getSignedStorageUrl, uploadCourseThumbnail, uploadCourseVideo } from '../services/upload'

const SUBJECTS = ['Toán học', 'Tiếng Anh', 'Lập trình', 'Ngữ văn', 'Khoa học', 'Nghệ thuật']
const LEVELS = ['Mất gốc', 'Cơ bản', 'Nâng cao', 'Luyện thi']
const LANGUAGES = ['Tiếng Việt', 'Tiếng Anh', 'Song ngữ']

const steps = [
  { key: 'basic', label: 'Thông tin chung', icon: 'check' },
  { key: 'content', label: 'Đối tượng & Nội dung', icon: 'school' },
  { key: 'pricing', label: 'Lịch học & Học phí', icon: 'event' },
  { key: 'media', label: 'Truyền thông', icon: 'campaign' },
  { key: 'publish', label: 'Xuất bản', icon: 'rocket_launch' },
]

const emptyLesson = {
  title: '',
  description: '',
  videoUrl: '',
  materialUrl: '',
  durationLabel: '',
  isPreview: false,
}

const emptyCourseForm = {
  id: '',
  title: '',
  shortDescription: '',
  description: '',
  subject: SUBJECTS[0],
  level: LEVELS[1],
  language: LANGUAGES[0],
  estimatedHours: 10,
  targetStudents: '',
  entryLevel: LEVELS[1],
  courseGoal: '',
  teachingMethod: '',
  communicationPlan: '',
  price: '',
  originalPrice: '',
  thumbnailUrl: '',
  thumbnailPreviewUrl: '',
  status: 'draft',
  learningOutcomes: [''],
  requirements: [''],
  lessons: [
    { ...emptyLesson, title: 'Giới thiệu tổng quan và các khái niệm cơ bản', isPreview: true, durationLabel: '30 phút' },
    { ...emptyLesson, title: 'Kỹ thuật giải nhanh và tư duy logic', durationLabel: '45 phút' },
    { ...emptyLesson, title: 'Thực hành và ôn tập tổng hợp', durationLabel: '45 phút' },
  ],
}

function formatMoney(value) {
  if (!Number(value || 0)) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function cleanList(items) {
  return Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function toForm(course) {
  return {
    ...emptyCourseForm,
    id: course.id || '',
    title: course.title || '',
    shortDescription: course.shortDescription || course.short_description || '',
    description: course.description || '',
    subject: course.subject || SUBJECTS[0],
    level: course.level || LEVELS[1],
    language: course.language || LANGUAGES[0],
    estimatedHours: course.estimatedHours || course.estimated_hours || 10,
    targetStudents: course.targetStudents || course.target_students || '',
    entryLevel: course.entryLevel || course.entry_level || course.level || LEVELS[1],
    courseGoal: course.courseGoal || course.course_goal || '',
    teachingMethod: course.teachingMethod || course.teaching_method || '',
    communicationPlan: course.communicationPlan || course.communication_plan || '',
    price: course.price || '',
    originalPrice: course.originalPrice || course.original_price || '',
    thumbnailUrl: course.thumbnailUrl || course.thumbnail_url || '',
    thumbnailPreviewUrl: course.thumbnailPreviewUrl || course.thumbnail_preview_url || course.thumbnailUrl || course.thumbnail_url || '',
    status: course.status || 'draft',
    learningOutcomes: course.learningOutcomes?.length ? course.learningOutcomes : [''],
    requirements: course.requirements?.length ? course.requirements : [''],
    lessons: course.lessons?.length ? course.lessons.map((lesson) => ({
      title: lesson.title || '',
      description: lesson.description || '',
      videoUrl: lesson.videoUrl || '',
      materialUrl: lesson.materialUrl || '',
      durationLabel: lesson.durationLabel || '',
      isPreview: Boolean(lesson.isPreview),
    })) : emptyCourseForm.lessons,
  }
}

export default function TutorCoursesTab({ user }) {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState(emptyCourseForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')
  const [viewMode, setViewMode] = useState('list')

  const loadCourses = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTutorCourses()
      setCourses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Không thể tải danh sách khóa học.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCourses() }, [])

  useEffect(() => {
    let cancelled = false
    async function resolveThumbnailPreview() {
      if (!form.thumbnailUrl?.startsWith('storage://')) return
      if (form.thumbnailPreviewUrl && form.thumbnailPreviewUrl !== form.thumbnailUrl && !form.thumbnailPreviewUrl.startsWith('storage://')) return
      const signedUrl = await getSignedStorageUrl(form.thumbnailUrl)
      if (!cancelled && signedUrl && signedUrl !== form.thumbnailUrl) {
        setForm((current) => ({
          ...current,
          thumbnailPreviewUrl: signedUrl,
        }))
      }
    }
    resolveThumbnailPreview()
    return () => { cancelled = true }
  }, [form.thumbnailUrl, form.thumbnailPreviewUrl])

  const stats = useMemo(() => ({
    courseCount: courses.filter((course) => course.status !== 'archived').length,
    students: courses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0),
    revenue: courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0),
  }), [courses])

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const validateStep = (targetStep = stepIndex, nextStatus = form.status) => {
    const nextErrors = {}
    if (targetStep >= 0) {
      if (!form.title.trim()) nextErrors.title = 'Vui lòng nhập tiêu đề khóa học.'
      if (!form.subject.trim()) nextErrors.subject = 'Vui lòng chọn lĩnh vực.'
      if (!form.level.trim()) nextErrors.level = 'Vui lòng chọn cấp độ.'
    }
    if (targetStep >= 1) {
      if (!form.targetStudents.trim()) nextErrors.targetStudents = 'Vui lòng mô tả đối tượng học sinh.'
      if (cleanList(form.learningOutcomes).length === 0) nextErrors.learningOutcomes = 'Cần ít nhất một kết quả học tập.'
    }
    if (targetStep >= 2 && nextStatus === 'published') {
      if (!Number(form.price || 0)) nextErrors.price = 'Vui lòng nhập học phí trước khi xuất bản.'
    }
    if (nextStatus === 'published' && form.lessons.filter((lesson) => lesson.title.trim()).length === 0) {
      nextErrors.lessons = 'Cần ít nhất một chương/bài học trước khi xuất bản.'
    }
    setValidation(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildPayload = (nextStatus) => ({
    ...form,
    status: nextStatus,
    price: Number(form.price || 0),
    originalPrice: Number(form.originalPrice || 0),
    estimatedHours: Number(form.estimatedHours || 0),
    learningOutcomes: cleanList(form.learningOutcomes),
    requirements: cleanList(form.requirements),
    lessons: form.lessons
      .filter((lesson) => lesson.title.trim())
      .map((lesson, index) => ({ ...lesson, position: index + 1 })),
  })

  const submitCourse = async (nextStatus = form.status, stayOnForm = false) => {
    if (!validateStep(nextStatus === 'published' ? 4 : stepIndex, nextStatus)) return
    setSaving(true)
    setError('')
    try {
      const result = await saveTutorCourse(buildPayload(nextStatus))
      if (stayOnForm && result?.id && !form.id) {
        setForm((current) => ({ ...current, id: result.id, status: nextStatus }))
        setEditing(true)
      } else if (stayOnForm) {
        setForm((current) => ({ ...current, status: nextStatus }))
      } else {
        closeForm()
      }
      await loadCourses()
    } catch (e) {
      setError(e.message || 'Không thể lưu khóa học.')
    } finally {
      setSaving(false)
    }
  }

  const startCreateCourse = () => {
    setForm(emptyCourseForm)
    setStepIndex(0)
    setEditing(false)
    setValidation({})
    setError('')
    setViewMode('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setForm(emptyCourseForm)
    setStepIndex(0)
    setEditing(false)
    setValidation({})
    setViewMode('list')
  }

  const editCourse = (course) => {
    setForm(toForm(course))
    setStepIndex(0)
    setEditing(true)
    setValidation({})
    setError('')
    setViewMode('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const archiveCourse = async (courseId) => {
    if (!window.confirm('Lưu trữ khóa học này? Học viên đã mua vẫn giữ quyền truy cập.')) return
    try {
      await deleteTutorCourse(courseId)
      await loadCourses()
    } catch (e) {
      setError(e.message || 'Không thể lưu trữ khóa học.')
    }
  }

  const updateLesson = (index, patch) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, ...patch } : lesson),
    }))
  }

  const addLesson = () => setForm((current) => ({ ...current, lessons: [...current.lessons, { ...emptyLesson }] }))

  const removeLesson = (index) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.length === 1 ? current.lessons : current.lessons.filter((_, lessonIndex) => lessonIndex !== index),
    }))
  }

  const handleThumbnailFile = async (file) => {
    if (!file) return
    setUploadingKey('thumbnail')
    const localPreviewUrl = URL.createObjectURL(file)
    setForm((current) => ({
      ...current,
      thumbnailPreviewUrl: localPreviewUrl,
    }))
    try {
      const uploaded = await uploadCourseThumbnail(file, user?.id)
      const storageUrl = uploaded?.storageUrl || uploaded?.url || ''
      const previewUrl = storageUrl.startsWith('storage://')
        ? await getSignedStorageUrl(storageUrl)
        : (uploaded?.previewUrl || uploaded?.url || storageUrl)
      setForm((current) => ({
        ...current,
        thumbnailUrl: storageUrl,
        thumbnailPreviewUrl: previewUrl,
      }))
      URL.revokeObjectURL(localPreviewUrl)
    } catch (e) {
      setError(e.message || 'Tải ảnh bìa thất bại.')
    } finally {
      setUploadingKey('')
    }
  }

  const handleLessonVideo = async (index, file) => {
    if (!file) return
    setUploadingKey(`lesson-${index}`)
    try {
      const url = await uploadCourseVideo(file, user?.id)
      updateLesson(index, { videoUrl: url })
    } catch (e) {
      setError(e.message || 'Tải video thất bại.')
    } finally {
      setUploadingKey('')
    }
  }

  const goNext = () => {
    if (!validateStep(stepIndex)) return
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  if (viewMode === 'list') {
    return (
      <div className="-m-4 md:-m-6 bg-[#f6f7fb] px-5 md:px-8 py-6 text-[#141824] min-h-[calc(100vh-80px)]">
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <CourseStore
          courses={courses}
          loading={loading}
          onEdit={editCourse}
          onArchive={archiveCourse}
          onCreate={startCreateCourse}
          compact
        />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] -m-4 md:-m-6 bg-[#f6f7fb] text-[#141824]">
      <header className="sticky top-0 z-20 border-b border-[#dde1ec] bg-white/95 backdrop-blur px-5 md:px-10 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[12px] text-[#5f6678]">
              Khóa học của tôi <span className="mx-1">›</span>
              <span className="font-bold text-[#00288e]">{editing ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}</span>
            </p>
            <h2 className="text-[28px] leading-tight font-black text-[#001b7a]">
              {stepIndex === 0 ? 'Thông tin cơ bản' : 'Tạo khóa học mới'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => submitCourse('draft', true)} disabled={saving} className="h-11 px-5 rounded-lg border border-[#001b7a] text-[#001b7a] font-bold bg-white hover:bg-[#eef3ff] disabled:opacity-60 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">save</span>
              {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>
            <button type="button" className="w-11 h-11 rounded-lg hover:bg-[#eef1f7] flex items-center justify-center">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 md:px-10 py-8 pb-32">
        <p className="mb-8 text-[#2f3443]">Cung cấp đầy đủ thông tin để học sinh dễ dàng tìm thấy khóa học phù hợp.</p>
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        <WizardSteps stepIndex={stepIndex} setStepIndex={(index) => validateStep(Math.max(stepIndex, index - 1)) && setStepIndex(index)} />

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="space-y-6">
            {stepIndex === 0 && (
              <BasicStep
                form={form}
                validation={validation}
                uploadingKey={uploadingKey}
                onField={setField}
                onThumbnailFile={handleThumbnailFile}
              />
            )}
            {stepIndex === 1 && (
              <ContentStep
                form={form}
                validation={validation}
                onField={setField}
                onUpdateLesson={updateLesson}
                onAddLesson={addLesson}
                onRemoveLesson={removeLesson}
              />
            )}
            {stepIndex === 2 && <PricingStep form={form} validation={validation} onField={setField} />}
            {stepIndex === 3 && (
              <MediaStep
                form={form}
                uploadingKey={uploadingKey}
                onField={setField}
                onThumbnailFile={handleThumbnailFile}
                onLessonVideo={handleLessonVideo}
                onUpdateLesson={updateLesson}
              />
            )}
            {stepIndex === 4 && <PublishStep form={form} stats={stats} />}
          </div>

          <CourseSidePanel form={form} stepIndex={stepIndex} uploadingKey={uploadingKey} onField={setField} onThumbnailFile={handleThumbnailFile} />
        </div>

      </main>

      <BottomBar
        stepIndex={stepIndex}
        saving={saving}
        onBack={() => stepIndex === 0 ? closeForm() : setStepIndex((current) => Math.max(current - 1, 0))}
        onDraft={() => submitCourse('draft', true)}
        onNext={stepIndex === steps.length - 1 ? () => submitCourse('published') : goNext}
      />
    </div>
  )
}

function WizardSteps({ stepIndex, setStepIndex }) {
  return (
    <div className="rounded-xl border border-[#c8cedd] bg-white px-6 py-6 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {steps.map((step, index) => {
          const done = index < stepIndex
          const active = index === stepIndex
          return (
            <button key={step.key} type="button" onClick={() => setStepIndex(index)} className="relative flex flex-col items-center gap-3 text-center">
              {index > 0 && <span className={`hidden md:block absolute right-[calc(50%+36px)] top-6 h-px w-[calc(100%-72px)] ${done || active ? 'bg-[#00288e]' : 'bg-[#d9dde7]'}`} />}
              <span className={`w-12 h-12 rounded-full flex items-center justify-center font-black border-4 ${done || active ? 'bg-[#00288e] text-white border-[#dce5ff]' : 'bg-[#e2e5ec] text-[#676f80] border-transparent'}`}>
                {done ? <span className="material-symbols-outlined text-[22px]">check</span> : index + 1}
              </span>
              <span className={`text-sm font-bold leading-tight ${active || done ? 'text-[#001b7a]' : 'text-[#3d4351]'}`}>{step.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BasicStep({ form, validation, uploadingKey, onField, onThumbnailFile }) {
  return (
    <>
      <Panel title="Thông tin chính">
        <Field label="Tiêu đề khóa học" required value={form.title} onChange={(value) => onField('title', value)} placeholder="Nhập tên khóa học chuyên nghiệp..." error={validation.title} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Lĩnh vực" required value={form.subject} onChange={(value) => onField('subject', value)} options={SUBJECTS} error={validation.subject} />
          <SelectField label="Cấp độ" required value={form.level} onChange={(value) => onField('level', value)} options={LEVELS} error={validation.level} />
        </div>
        <TextareaField label="Mô tả ngắn gọn" value={form.shortDescription} onChange={(value) => onField('shortDescription', value)} placeholder="Tóm tắt nội dung khóa học trong 2-3 câu..." rows={4} />
      </Panel>
      <Panel title="Mô tả chi tiết">
        <RichToolbar />
        <TextareaField value={form.description} onChange={(value) => onField('description', value)} placeholder="Nhập chi tiết nội dung khóa học, lộ trình, điểm nổi bật..." rows={7} />
      </Panel>
      <div className="xl:hidden">
        <CoverUpload form={form} uploadingKey={uploadingKey} onField={onField} onThumbnailFile={onThumbnailFile} />
      </div>
    </>
  )
}

function ContentStep({ form, validation, onField, onUpdateLesson, onAddLesson, onRemoveLesson }) {
  return (
    <>
      <Panel title="Đối tượng và nội dung" icon="school">
        <Field label="Đối tượng học sinh" value={form.targetStudents} onChange={(value) => onField('targetStudents', value)} placeholder="Ví dụ: Học sinh lớp 12 chuẩn bị thi THPTQG" error={validation.targetStudents} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Trình độ đầu vào" value={form.entryLevel} onChange={(value) => onField('entryLevel', value)} options={LEVELS} />
          <Field label="Mục tiêu khóa học" value={form.courseGoal} onChange={(value) => onField('courseGoal', value)} placeholder="Mục tiêu chính của khóa học" />
        </div>
        <EditableList title="Kết quả học tập mong đợi" items={form.learningOutcomes} onChange={(items) => onField('learningOutcomes', items)} placeholder="Liệt kê những gì học sinh sẽ đạt được sau khóa học..." error={validation.learningOutcomes} />
        <TextareaField label="Phương pháp giảng dạy" value={form.teachingMethod} onChange={(value) => onField('teachingMethod', value)} placeholder="Ví dụ: Thuyết giảng kết hợp bài tập thực hành, thảo luận nhóm..." rows={3} />
      </Panel>
      <Panel title="Cấu trúc chương trình">
        {validation.lessons && <p className="mb-3 text-sm font-bold text-red-600">{validation.lessons}</p>}
        <div className="space-y-4">
          {form.lessons.map((lesson, index) => (
            <ChapterCard key={index} index={index} lesson={lesson} onChange={(patch) => onUpdateLesson(index, patch)} onRemove={() => onRemoveLesson(index)} />
          ))}
        </div>
        <button type="button" onClick={onAddLesson} className="mt-4 h-11 px-4 rounded-lg border border-dashed border-[#00288e] text-[#00288e] font-bold inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm chương
        </button>
      </Panel>
    </>
  )
}

function PricingStep({ form, validation, onField }) {
  return (
    <Panel title="Lịch học và học phí" icon="payments">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField label="Học phí" value={form.price} onChange={(value) => onField('price', value)} placeholder="499000" error={validation.price} suffix="VND" />
        <NumberField label="Giá gốc" value={form.originalPrice} onChange={(value) => onField('originalPrice', value)} placeholder="699000" suffix="VND" />
      </div>
      <div className="rounded-xl bg-[#eef3ff] border border-[#c8d8ff] p-4 text-[#001b7a]">
        <p className="font-black">Hiển thị học phí</p>
        <p className="mt-1 text-sm">Học viên sẽ thấy giá khóa học là <strong>{formatMoney(form.price)}</strong>{Number(form.originalPrice || 0) > 0 ? `, giá gốc ${formatMoney(form.originalPrice)}.` : '.'}</p>
      </div>
      <EditableList title="Yêu cầu trước khi học" items={form.requirements} onChange={(items) => onField('requirements', items)} placeholder="Ví dụ: Hoàn thành kiến thức nền tảng lớp 11..." />
    </Panel>
  )
}

function MediaStep({ form, uploadingKey, onField, onThumbnailFile, onLessonVideo, onUpdateLesson }) {
  return (
    <>
      <Panel title="Truyền thông khóa học" icon="campaign">
        <CoverUpload form={form} uploadingKey={uploadingKey} onField={onField} onThumbnailFile={onThumbnailFile} />
        <TextareaField label="Thông điệp quảng bá" value={form.communicationPlan} onChange={(value) => onField('communicationPlan', value)} placeholder="Viết lời giới thiệu ngắn để thu hút học viên..." rows={4} />
      </Panel>
      <Panel title="Video bài học">
        <div className="space-y-4">
          {form.lessons.map((lesson, index) => (
            <LessonMediaRow key={index} index={index} lesson={lesson} uploading={uploadingKey === `lesson-${index}`} onChange={(patch) => onUpdateLesson(index, patch)} onUpload={(file) => onLessonVideo(index, file)} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function PublishStep({ form, stats }) {
  const lessons = form.lessons.filter((lesson) => lesson.title.trim())
  return (
    <Panel title="Kiểm tra và xuất bản" icon="rocket_launch">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <div className="aspect-video rounded-xl border border-[#c8cedd] bg-[#eef1f7] overflow-hidden flex items-center justify-center">
          {(form.thumbnailPreviewUrl || form.thumbnailUrl) ? <img src={form.thumbnailPreviewUrl || form.thumbnailUrl} alt={form.title} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[52px] text-[#00288e]">image</span>}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{form.subject || 'Chưa chọn lĩnh vực'}</Badge>
            <Badge>{form.level || 'Chưa chọn cấp độ'}</Badge>
            <Badge>{form.language || 'Tiếng Việt'}</Badge>
          </div>
          <h3 className="mt-3 text-2xl font-black text-[#001b7a]">{form.title || 'Khóa học chưa có tiêu đề'}</h3>
          <p className="mt-2 text-[#51586a]">{form.shortDescription || form.description || 'Chưa có mô tả khóa học.'}</p>
          <p className="mt-3 text-2xl font-black text-[#00288e]">{formatMoney(form.price)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryBox label="Số chương" value={lessons.length} />
        <SummaryBox label="Thời lượng" value={`${form.estimatedHours || 0} giờ`} />
        <SummaryBox label="Khóa đang có" value={stats.courseCount} />
      </div>

      <div className="mt-8 border-t border-[#c8cedd] pt-6">
        <h4 className="mb-4 text-lg font-black text-[#001b7a]">Kiểm tra video bài giảng</h4>
        {lessons.length === 0 ? (
          <p className="text-[#51586a]">Chưa có bài giảng nào được thêm.</p>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div key={index} className="rounded-xl border border-[#c8cedd] bg-[#f9fafb] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-[#001b7a]">Chương {index + 1}: {lesson.title}</p>
                    {lesson.isPreview && <span className="mt-1 inline-block rounded-full bg-[#e8f8ef] px-2 py-0.5 text-xs font-bold text-[#147a3d]">Cho xem thử miễn phí</span>}
                  </div>
                </div>
                {lesson.videoUrl ? (
                  (() => {
                    const ytMatch = lesson.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                    const ytId = ytMatch && ytMatch[2].length === 11 ? ytMatch[2] : null;
                    if (ytId) {
                      return (
                        <iframe 
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="mt-3 w-full max-w-[480px] aspect-video bg-black rounded-lg shadow-sm border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    }
                    
                    const isValidUrl = lesson.videoUrl.startsWith('http') || lesson.videoUrl.startsWith('/');
                    if (!isValidUrl) {
                      return (
                        <p className="mt-3 text-sm font-bold text-red-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">link_off</span>
                          Đường dẫn video "{lesson.videoUrl}" không hợp lệ. Vui lòng kiểm tra lại!
                        </p>
                      );
                    }

                    return <video src={lesson.videoUrl} controls preload="metadata" className="mt-3 w-full max-w-[480px] aspect-video bg-black rounded-lg shadow-sm" />;
                  })()
                ) : (
                  <p className="mt-3 text-sm font-bold text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    Chưa có video cho chương này. Hãy quay lại bước Nội dung để tải lên.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

function CourseSidePanel({ form, stepIndex, uploadingKey, onField, onThumbnailFile }) {
  return (
    <aside className="hidden xl:block sticky top-28 space-y-6">
      {stepIndex === 0 ? (
        <CoverUpload form={form} uploadingKey={uploadingKey} onField={onField} onThumbnailFile={onThumbnailFile} />
      ) : (
        <TipsPanel />
      )}
      <Panel title="Ngôn ngữ & thời gian">
        <SelectField label="Ngôn ngữ giảng dạy" value={form.language} onChange={(value) => onField('language', value)} options={LANGUAGES} />
        <NumberField label="Thời lượng dự kiến" value={form.estimatedHours} onChange={(value) => onField('estimatedHours', value)} suffix="giờ" />
      </Panel>
    </aside>
  )
}

function CoverUpload({ form, uploadingKey, onField, onThumbnailFile }) {
  return (
    <Panel title="Hình ảnh bìa">
      <div className="aspect-video rounded-xl border-2 border-dashed border-[#b9c0d1] bg-[#f3f4f7] overflow-hidden flex items-center justify-center">
        {(form.thumbnailPreviewUrl || form.thumbnailUrl) ? (
          <img src={form.thumbnailPreviewUrl || form.thumbnailUrl} alt="Ảnh bìa khóa học" className="w-full h-full object-cover" />
        ) : (
          <label className="cursor-pointer text-center p-6 text-[#343949]">
            <span className="material-symbols-outlined text-[42px] block mb-2">image</span>
            <span className="font-bold">Tải lên hình ảnh (16:9)</span>
            <input type="file" accept="image/*" hidden onChange={(e) => onThumbnailFile(e.target.files?.[0])} />
          </label>
        )}
      </div>
      <Field
        label="URL ảnh bìa"
        value={form.thumbnailUrl}
        onChange={(value) => {
          onField('thumbnailUrl', value)
          onField('thumbnailPreviewUrl', value)
        }}
        placeholder="https://..."
      />
      <label className="h-11 px-4 rounded-lg border border-[#c8cedd] text-[#001b7a] font-bold bg-white hover:bg-[#eef3ff] flex items-center justify-center gap-2 cursor-pointer">
        <span className="material-symbols-outlined text-[20px]">upload</span>
        {uploadingKey === 'thumbnail' ? 'Đang tải...' : 'Tải ảnh bìa'}
        <input type="file" accept="image/*" hidden onChange={(e) => onThumbnailFile(e.target.files?.[0])} />
      </label>
    </Panel>
  )
}

function TipsPanel() {
  return (
    <div className="rounded-xl border border-[#00288e] bg-[#d9e7ff] p-6 text-[#00245f]">
      <div className="flex items-center gap-2 font-black">
        <span className="material-symbols-outlined">emoji_objects</span>
        Gợi ý để khóa học hấp dẫn hơn
      </div>
      <ul className="mt-5 space-y-4 text-sm leading-6">
        <li><strong>Mô tả rõ học sinh phù hợp:</strong> Giúp học sinh tự đánh giá xem mình có đủ trình độ theo học không.</li>
        <li><strong>Nêu kết quả cụ thể:</strong> Ví dụ: Sau khóa học, bạn có thể giải đề thi đạt 8+ điểm.</li>
        <li><strong>Cấu trúc rõ ràng:</strong> Chia nhỏ nội dung thành các chương giúp học sinh không bị ngợp.</li>
        <li><strong>Phương pháp học:</strong> Nhấn mạnh tương tác, thực hành và bài tập sau mỗi chương.</li>
      </ul>
    </div>
  )
}

function BottomBar({ stepIndex, saving, onBack, onDraft, onNext }) {
  return (
    <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-30 border-t border-[#c8cedd] bg-white/95 backdrop-blur px-5 md:px-10 py-4">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} disabled={stepIndex === 0} className="h-12 px-6 rounded-lg border border-[#00288e] text-[#00288e] font-bold disabled:opacity-40 inline-flex items-center gap-2">
          <span className="material-symbols-outlined">chevron_left</span>
          Quay lại
        </button>
        <div className="hidden md:flex items-center gap-3 text-sm text-[#343949]">
          <button type="button" onClick={onDraft} disabled={saving} className="inline-flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-[20px]">save</span>
            Lưu bản nháp
          </button>
          <span className="text-[#7b8190]">Tự động lưu lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button type="button" onClick={onNext} disabled={saving} className="h-12 px-8 rounded-lg bg-[#00288e] text-white font-black shadow-lg hover:bg-[#001f70] disabled:opacity-60 inline-flex items-center gap-2">
          {saving ? 'Đang lưu...' : stepIndex === steps.length - 1 ? 'Xuất bản' : 'Tiếp tục'}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-[#c8cedd] bg-white p-5 md:p-8 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-black uppercase tracking-wide text-[#001b7a]">
        {icon && <span className="material-symbols-outlined text-[22px]">{icon}</span>}
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({ label, value, onChange, placeholder, error = '', required = false }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block font-bold text-[#141824]">{label} {required && <span className="text-red-600">*</span>}</span>}
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-14 w-full rounded-lg border px-4 text-base outline-none focus:border-[#00288e] ${error ? 'border-red-300 bg-red-50' : 'border-[#bfc5d5]'}`} />
      {error && <span className="mt-1 block text-sm font-bold text-red-600">{error}</span>}
    </label>
  )
}

function NumberField({ label, value, onChange, placeholder, error = '', suffix = '' }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block font-bold text-[#141824]">{label}</span>}
      <div className="flex items-center gap-3">
        <input type="number" min="0" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-14 min-w-0 flex-1 rounded-lg border px-4 text-base outline-none focus:border-[#00288e] ${error ? 'border-red-300 bg-red-50' : 'border-[#bfc5d5]'}`} />
        {suffix && <span className="text-[#343949]">{suffix}</span>}
      </div>
      {error && <span className="mt-1 block text-sm font-bold text-red-600">{error}</span>}
    </label>
  )
}

function SelectField({ label, value, onChange, options, error = '', required = false }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block font-bold text-[#141824]">{label} {required && <span className="text-red-600">*</span>}</span>}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={`h-14 w-full rounded-lg border bg-white px-4 text-base outline-none focus:border-[#00288e] ${error ? 'border-red-300 bg-red-50' : 'border-[#bfc5d5]'}`}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <span className="mt-1 block text-sm font-bold text-red-600">{error}</span>}
    </label>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block font-bold text-[#141824]">{label}</span>}
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg border border-[#bfc5d5] px-4 py-3 text-base outline-none focus:border-[#00288e]" />
    </label>
  )
}

function RichToolbar() {
  return (
    <div className="flex h-12 items-center gap-2 rounded-t-lg border border-[#bfc5d5] border-b-0 bg-[#f3f4f7] px-4">
      {[
        ['format_bold', 'In đậm'],
        ['format_italic', 'In nghiêng'],
        ['format_list_bulleted', 'Danh sách'],
        ['link', 'Liên kết'],
      ].map(([icon, title]) => (
        <button key={icon} type="button" title={title} className="w-9 h-9 rounded-md hover:bg-white flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </button>
      ))}
    </div>
  )
}

function EditableList({ title, items, onChange, placeholder, error = '' }) {
  const safeItems = items?.length ? items : ['']
  const setItem = (index, value) => onChange(safeItems.map((item, itemIndex) => itemIndex === index ? value : item))
  const addItem = () => onChange([...safeItems, ''])
  const removeItem = (index) => onChange(safeItems.length === 1 ? safeItems : safeItems.filter((_, itemIndex) => itemIndex !== index))
  return (
    <div>
      <span className="mb-2 block font-bold text-[#141824]">{title}</span>
      <div className="space-y-2">
        {safeItems.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input value={item} onChange={(e) => setItem(index, e.target.value)} placeholder={placeholder} className="h-12 min-w-0 flex-1 rounded-lg border border-[#bfc5d5] px-4 outline-none focus:border-[#00288e]" />
            <button type="button" onClick={() => removeItem(index)} className="w-12 h-12 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        ))}
      </div>
      {error && <span className="mt-1 block text-sm font-bold text-red-600">{error}</span>}
      <button type="button" onClick={addItem} className="mt-3 h-10 px-4 rounded-lg bg-[#eef3ff] text-[#00288e] font-bold inline-flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]">add</span>
        Thêm dòng
      </button>
    </div>
  )
}

function ChapterCard({ index, lesson, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-[#c8cedd] bg-white p-4">
      <div className="grid grid-cols-[28px_1fr_auto] gap-3 items-center">
        <span className="material-symbols-outlined text-[#697083] cursor-grab">drag_indicator</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#00288e]">Chương {index + 1}</p>
          <input value={lesson.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Tên chương" className="mt-1 w-full border-0 p-0 text-base font-bold outline-none focus:ring-0" />
        </div>
        <button type="button" onClick={onRemove} className="w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
      <TextareaField value={lesson.description} onChange={(value) => onChange({ description: value })} placeholder="Mô tả nội dung chương..." rows={2} />
    </div>
  )
}

function LessonMediaRow({ index, lesson, uploading, onChange, onUpload }) {
  return (
    <div className="rounded-xl border border-[#c8cedd] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black text-[#001b7a]">Chương {index + 1}</p>
          <p className="text-sm text-[#51586a]">{lesson.title || 'Chưa có tiêu đề'}</p>
        </div>
        <label className="h-10 px-4 rounded-lg border border-[#00288e] text-[#00288e] font-bold cursor-pointer inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">movie</span>
          {uploading ? 'Đang tải...' : 'Tải video'}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Video URL" value={lesson.videoUrl} onChange={(value) => onChange({ videoUrl: value })} placeholder="Upload hoặc dán URL video" />
        <Field label="Thời lượng video" value={lesson.durationLabel} onChange={(value) => onChange({ durationLabel: value })} placeholder="Ví dụ: 30 phút" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#343949]">
        <input type="checkbox" checked={lesson.isPreview} onChange={(e) => onChange({ isPreview: e.target.checked })} />
        Cho xem thử miễn phí
      </label>
    </div>
  )
}

function CourseStore({ courses, loading, onEdit, onArchive, onCreate, compact = false }) {
  return (
    <section className={`${compact ? '' : 'mt-10'} rounded-xl border border-[#c8cedd] bg-white p-5 md:p-8 shadow-sm`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-[#001b7a]">Khóa học của tôi</h3>
          <p className="text-sm text-[#51586a]">Các khóa đã xuất bản sẽ hiển thị cho học viên.</p>
        </div>
        <button type="button" onClick={onCreate} className="h-10 px-4 rounded-lg bg-[#00288e] text-white font-bold inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tạo mới
        </button>
      </div>
      {loading ? (
        <div className="py-10 text-center text-[#51586a]">Đang tải khóa học...</div>
      ) : courses.length === 0 ? (
        <div className="py-10 text-center text-[#51586a]">Chưa có khóa học nào.</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {courses.map((course) => <CourseCard key={course.id} course={course} onEdit={() => onEdit(course)} onArchive={() => onArchive(course.id)} />)}
        </div>
      )}
    </section>
  )
}

function CourseCard({ course, onEdit, onArchive }) {
  const lessonCount = course.lessonCount || course.lessons?.length || 0
  return (
    <article className="overflow-hidden rounded-xl border border-[#d7dce8] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
        <div className="aspect-video md:aspect-auto bg-[#eef3ff] flex items-center justify-center overflow-hidden">
          {(course.thumbnailPreviewUrl || course.thumbnailUrl) ? <img src={course.thumbnailPreviewUrl || course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[48px] text-[#00288e]">play_lesson</span>}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge>{course.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</Badge>
            {course.subject && <Badge>{course.subject}</Badge>}
          </div>
          <h4 className="font-black text-[#141824] line-clamp-2">{course.title}</h4>
          <p className="mt-1 text-sm text-[#51586a] line-clamp-2">{course.shortDescription || course.description || 'Chưa có mô tả.'}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <SummaryBox label="Học phí" value={formatMoney(course.price)} />
            <SummaryBox label="Chương" value={lessonCount} />
            <SummaryBox label="Học viên" value={course.enrollmentCount || 0} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="h-9 px-3 rounded-lg border border-[#c8cedd] font-bold text-[#343949]">Chỉnh sửa</button>
            {course.status === 'published' && <button type="button" onClick={() => { window.location.hash = `/course/${course.id}` }} className="h-9 px-3 rounded-lg bg-[#00288e] text-white font-bold">Xem chi tiết</button>}
            <button type="button" onClick={onArchive} className="h-9 px-3 rounded-lg text-red-600 font-bold hover:bg-red-50">Lưu trữ</button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Badge({ children }) {
  return <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-[12px] font-black text-[#00288e]">{children}</span>
}

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f3f5f9] px-3 py-2">
      <p className="truncate font-black text-[#141824]">{value}</p>
      <p className="text-[12px] text-[#697083]">{label}</p>
    </div>
  )
}
