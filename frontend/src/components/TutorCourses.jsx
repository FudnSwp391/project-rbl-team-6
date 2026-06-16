import { useEffect, useMemo, useState } from 'react'
import { deleteTutorCourse, getTutorCourses, saveTutorCourse } from '../services/api'
import { uploadCourseThumbnail, uploadCourseVideo } from '../services/upload'

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
  description: '',
  subject: '',
  level: '',
  price: '',
  thumbnailUrl: '',
  status: 'draft',
  learningOutcomes: [''],
  requirements: [''],
  lessons: [{ ...emptyLesson, isPreview: true }],
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function cleanList(items) {
  return Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function getTotalDuration(lessons = []) {
  return lessons
    .map((lesson) => lesson.durationLabel)
    .filter(Boolean)
    .join(' + ') || '--'
}

export default function TutorCoursesTab({ user }) {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState(emptyCourseForm)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const loadCourses = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTutorCourses()
      setCourses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load courses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCourses() }, [])

  const stats = useMemo(() => ({
    courseCount: courses.filter((course) => course.status !== 'archived').length,
    students: courses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0),
    revenue: courses.reduce((sum, course) => sum + Number(course.revenue || 0), 0),
  }), [courses])

  const resetForm = () => {
    setForm(emptyCourseForm)
    setEditing(false)
    setValidation({})
  }

  const editCourse = (course) => {
    setForm({
      id: course.id,
      title: course.title || '',
      description: course.description || '',
      subject: course.subject || '',
      level: course.level || '',
      price: course.price || '',
      thumbnailUrl: course.thumbnailUrl || '',
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
      })) : [{ ...emptyLesson, isPreview: true }],
    })
    setEditing(true)
    setValidation({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const validateForm = (nextStatus) => {
    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Course title is required.'
    if (nextStatus === 'published' && form.lessons.filter((lesson) => lesson.title.trim()).length === 0) {
      nextErrors.lessons = 'Add at least one lesson before publishing.'
    }
    form.lessons.forEach((lesson, index) => {
      if (lesson.videoUrl.trim() && !lesson.durationLabel.trim()) {
        nextErrors[`lesson-${index}-duration`] = 'Video Duration is required when a video is attached.'
      }
    })
    setValidation(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submitCourse = async (nextStatus = form.status) => {
    if (!validateForm(nextStatus)) return
    setSaving(true)
    setError('')
    try {
      await saveTutorCourse({
        ...form,
        status: nextStatus,
        price: Number(form.price || 0),
        learningOutcomes: cleanList(form.learningOutcomes),
        requirements: cleanList(form.requirements),
        lessons: form.lessons
          .filter((lesson) => lesson.title.trim())
          .map((lesson, index) => ({ ...lesson, position: index + 1 })),
      })
      resetForm()
      await loadCourses()
    } catch (e) {
      setError(e.message || 'Could not save course.')
    } finally {
      setSaving(false)
    }
  }

  const archiveCourse = async (courseId) => {
    if (!window.confirm('Archive this course? Students who already bought it keep their access.')) return
    try {
      await deleteTutorCourse(courseId)
      await loadCourses()
    } catch (e) {
      setError(e.message || 'Could not archive course.')
    }
  }

  const handleThumbnailFile = async (file) => {
    if (!file) return
    setUploadingKey('thumbnail')
    try {
      const url = await uploadCourseThumbnail(file, user?.id)
      setField('thumbnailUrl', url)
    } catch (e) {
      setError(e.message || 'Thumbnail upload failed.')
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
      setError(e.message || 'Video upload failed.')
    } finally {
      setUploadingKey('')
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

  const previewCourse = {
    ...form,
    price: Number(form.price || 0),
    learningOutcomes: cleanList(form.learningOutcomes),
    requirements: cleanList(form.requirements),
    lessons: form.lessons.filter((lesson) => lesson.title.trim()),
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Courses</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Create polished recorded video courses that students can buy and learn anytime.
          </p>
        </div>
        <button onClick={resetForm} className="h-10 px-4 rounded-xl border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container transition-colors">
          New course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CourseStat icon="video_library" label="Courses" value={stats.courseCount} />
        <CourseStat icon="groups" label="Students Bought" value={stats.students} />
        <CourseStat icon="payments" label="Course Revenue" value={formatMoney(stats.revenue)} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold">{error}</div>}

      <CourseForm
        form={form}
        editing={editing}
        saving={saving}
        validation={validation}
        uploadingKey={uploadingKey}
        onField={setField}
        onSubmit={submitCourse}
        onPreview={() => setPreviewOpen(true)}
        onThumbnailFile={handleThumbnailFile}
        onLessonVideo={handleLessonVideo}
        onUpdateLesson={updateLesson}
        onAddLesson={addLesson}
        onRemoveLesson={removeLesson}
      />

      <section className="bg-white/85 border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20">
          <h3 className="font-headline-md text-headline-md text-on-surface">Your Course Store</h3>
          <p className="text-[13px] text-on-surface-variant">Published courses appear on your public tutor profile.</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-on-surface-variant">Loading courses...</div>
        ) : courses.length === 0 ? (
          <EmptyCourseStore onCreate={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onEdit={() => editCourse(course)} onArchive={() => archiveCourse(course.id)} />
            ))}
          </div>
        )}
      </section>

      {previewOpen && <CoursePreviewModal course={previewCourse} onClose={() => setPreviewOpen(false)} />}
    </div>
  )
}

function CourseForm(props) {
  const {
    form, editing, saving, validation, uploadingKey,
    onField, onSubmit, onPreview, onThumbnailFile, onLessonVideo,
    onUpdateLesson, onAddLesson, onRemoveLesson,
  } = props

  return (
    <section className="bg-white/85 border border-outline-variant/20 rounded-2xl shadow-sm p-5 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">{editing ? 'Edit Course' : 'Create Course'}</h3>
          <p className="text-[13px] text-on-surface-variant">Draft is private. Published courses are visible to students and parents.</p>
        </div>
        <CourseStatusBadge status={form.status} />
      </div>

      <FormSection title="Course Information" icon="info">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CourseField label="Course title" value={form.title} onChange={(value) => onField('title', value)} placeholder="ReactJS from zero to project" error={validation.title} />
          <CourseField label="Subject" value={form.subject} onChange={(value) => onField('subject', value)} placeholder="Math, English, ReactJS..." />
          <CourseField label="Level" value={form.level} onChange={(value) => onField('level', value)} placeholder="Beginner, Grade 10, IELTS 6.5..." />
          <PriceField value={form.price} onChange={(value) => onField('price', value)} />
        </div>
        <label className="block mt-4">
          <span className="text-[12px] font-bold text-on-surface">Course description</span>
          <textarea value={form.description} onChange={(e) => onField('description', e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2 text-[14px] outline-none focus:border-primary" placeholder="What students will learn, who this course is for, requirements..." />
        </label>
      </FormSection>

      <LearningOutcomesEditor items={form.learningOutcomes} onChange={(items) => onField('learningOutcomes', items)} />
      <RequirementsEditor items={form.requirements} onChange={(items) => onField('requirements', items)} />

      <FormSection title="Thumbnail & Media" icon="image">
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-4 items-end">
          <div className="h-28 rounded-2xl overflow-hidden border border-outline-variant/40 bg-primary/5 flex items-center justify-center text-primary">
            {form.thumbnailUrl ? <img src={form.thumbnailUrl} alt="Course thumbnail" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[38px]">image</span>}
          </div>
          <CourseField label="Thumbnail URL" value={form.thumbnailUrl} onChange={(value) => onField('thumbnailUrl', value)} placeholder="https://..." />
          <label className="h-11 px-4 rounded-xl border border-outline-variant flex items-center justify-center gap-2 cursor-pointer font-label-md text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {uploadingKey === 'thumbnail' ? 'Uploading...' : 'Upload thumbnail'}
            <input type="file" accept="image/*" hidden onChange={(e) => onThumbnailFile(e.target.files?.[0])} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Lessons" icon="format_list_numbered">
        {validation.lessons && <p className="mb-3 text-[13px] font-bold text-red-600">{validation.lessons}</p>}
        <div className="space-y-3">
          {form.lessons.map((lesson, index) => (
            <LessonEditor
              key={index}
              index={index}
              lesson={lesson}
              error={validation[`lesson-${index}-duration`]}
              uploading={uploadingKey === `lesson-${index}`}
              onChange={(patch) => onUpdateLesson(index, patch)}
              onUpload={(file) => onLessonVideo(index, file)}
              onRemove={() => onRemoveLesson(index)}
            />
          ))}
        </div>
        <button onClick={onAddLesson} className="mt-4 h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add lesson
        </button>
      </FormSection>

      <FormSection title="Preview / Publish Actions" icon="rocket_launch">
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={() => onSubmit('draft')} disabled={saving} className="h-11 px-5 rounded-xl border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container disabled:opacity-50">
            Save draft
          </button>
          <button onClick={onPreview} className="h-11 px-5 rounded-xl border border-primary/25 bg-primary/5 text-primary font-label-md hover:bg-primary/10 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Preview Course
          </button>
          <button onClick={() => onSubmit('published')} disabled={saving} className="h-11 px-5 rounded-xl bg-primary text-on-primary font-label-md shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            {saving ? 'Saving...' : 'Publish course'}
          </button>
        </div>
      </FormSection>
    </section>
  )
}

function FormSection({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-white/70 p-4">
      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[21px]">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  )
}

function CourseField({ label, value, onChange, placeholder, type = 'text', error = '' }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-on-surface">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`mt-1 w-full h-11 rounded-xl border px-3 text-[14px] outline-none focus:border-primary ${error ? 'border-red-300 bg-red-50' : 'border-outline-variant'}`} />
      {error && <span className="text-[12px] text-red-600 font-bold mt-1 block">{error}</span>}
    </label>
  )
}

function PriceField({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-on-surface">Price (VND)</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="499000" className="mt-1 w-full h-11 rounded-xl border border-outline-variant px-3 text-[14px] outline-none focus:border-primary" />
      <span className="mt-1 block text-[12px] font-bold text-primary">{value ? formatMoney(value) : 'Example: 499.000 ₫'}</span>
    </label>
  )
}

function EditableList({ title, icon, items, onChange, addLabel, placeholder }) {
  const setItem = (index, value) => onChange(items.map((item, itemIndex) => itemIndex === index ? value : item))
  const addItem = () => onChange([...items, ''])
  const removeItem = (index) => onChange(items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index))
  return (
    <FormSection title={title} icon={icon}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input value={item} onChange={(e) => setItem(index, e.target.value)} placeholder={placeholder} className="flex-1 h-10 rounded-xl border border-outline-variant px-3 text-[14px] outline-none focus:border-primary" />
            <button onClick={() => removeItem(index)} className="w-10 h-10 rounded-xl text-red-600 hover:bg-red-50">
              <span className="material-symbols-outlined text-[19px]">delete</span>
            </button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="mt-3 h-9 px-3 rounded-lg border border-primary/20 text-primary bg-primary/5 font-label-md flex items-center gap-1">
        <span className="material-symbols-outlined text-[18px]">add</span>
        {addLabel}
      </button>
    </FormSection>
  )
}

function LearningOutcomesEditor({ items, onChange }) {
  return <EditableList title="Learning Outcomes" icon="checklist" items={items} onChange={onChange} addLabel="Add outcome" placeholder="Understand React fundamentals" />
}

function RequirementsEditor({ items, onChange }) {
  return <EditableList title="Requirements" icon="rule" items={items} onChange={onChange} addLabel="Add requirement" placeholder="Basic HTML/CSS knowledge" />
}

function LessonEditor({ index, lesson, error, uploading, onChange, onUpload, onRemove }) {
  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline cursor-grab" title="Drag handle for future sorting">drag_indicator</span>
          <strong className="text-on-surface">Lesson {index + 1}</strong>
          {lesson.isPreview && <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[11px] font-bold">Free preview</span>}
        </div>
        <button onClick={onRemove} className="text-red-600 hover:bg-red-50 rounded-lg h-8 px-2">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CourseField label="Lesson title" value={lesson.title} onChange={(value) => onChange({ title: value })} placeholder="Introduction and setup" />
        <CourseField label="Video Duration" value={lesson.durationLabel} onChange={(value) => onChange({ durationLabel: value })} placeholder="Ex: 12m 30s" error={error} />
      </div>
      <label className="block mt-3">
        <span className="text-[12px] font-bold text-on-surface">Description</span>
        <textarea value={lesson.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2 text-[14px] outline-none focus:border-primary" />
      </label>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
        <CourseField label="Video URL" value={lesson.videoUrl} onChange={(value) => onChange({ videoUrl: value })} placeholder="Upload or paste video URL" />
        <label className="h-11 px-4 rounded-xl border border-outline-variant flex items-center justify-center gap-2 cursor-pointer font-label-md text-on-surface-variant hover:bg-surface-container">
          <span className="material-symbols-outlined text-[18px]">movie</span>
          {uploading ? 'Uploading...' : 'Upload video'}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
        <CourseField label="Material URL (optional)" value={lesson.materialUrl} onChange={(value) => onChange({ materialUrl: value })} placeholder="Slides, PDF, homework link..." />
        <label className="flex items-center gap-2 text-[13px] font-bold text-on-surface-variant">
          <input type="checkbox" checked={lesson.isPreview} onChange={(e) => onChange({ isPreview: e.target.checked })} />
          Free preview lesson
        </label>
      </div>
    </div>
  )
}

function CourseStatusBadge({ status }) {
  const map = {
    draft: ['Draft', 'bg-surface-container text-on-surface-variant border-outline-variant/40', 'edit_note'],
    pending_review: ['Pending Review', 'bg-amber-50 text-amber-700 border-amber-200', 'pending'],
    published: ['Published', 'bg-[#dcfce7] text-[#16a34a] border-[#86efac]', 'verified'],
    rejected: ['Rejected', 'bg-red-50 text-red-600 border-red-200', 'cancel'],
  }
  const [label, classes, icon] = map[status] || map.draft
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[12px] font-bold ${classes}`}>
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      {label}
    </span>
  )
}

function CoursePreviewModal({ course, onClose }) {
  const previewLesson = course.lessons.find((lesson) => lesson.isPreview)
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-outline-variant/20 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wide text-primary">Student/Parent Preview</p>
            <h3 className="font-headline-md text-headline-md text-on-surface">Course Preview</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 p-6">
          <div>
            <div className="aspect-video rounded-2xl overflow-hidden bg-primary/5 border border-outline-variant/20 flex items-center justify-center">
              {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-primary text-[60px]">play_lesson</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {course.subject && <span className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[12px] font-bold">{course.subject}</span>}
              {course.level && <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-[12px] font-bold">{course.level}</span>}
              {previewLesson && <span className="px-3 py-1 rounded-full bg-[#dcfce7] text-[#16a34a] text-[12px] font-bold">Free preview available</span>}
            </div>
            <h2 className="mt-4 font-headline-lg text-headline-lg text-on-surface">{course.title || 'Untitled course'}</h2>
            <p className="mt-2 text-on-surface-variant leading-7">{course.description || 'No description yet.'}</p>
            <p className="mt-4 text-primary font-black text-[28px]">{formatMoney(course.price)}</p>
          </div>
          <div className="space-y-4">
            <PreviewList title="What students will learn" icon="check_circle" items={course.learningOutcomes} empty="No learning outcomes yet." />
            <PreviewList title="Requirements" icon="rule" items={course.requirements} empty="No requirements yet." />
            <div className="rounded-2xl border border-outline-variant/20 p-4">
              <h4 className="font-headline-sm text-headline-sm text-on-surface mb-3">Lessons</h4>
              <div className="space-y-2">
                {course.lessons.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant italic">No lessons yet.</p>
                ) : course.lessons.map((lesson, index) => (
                  <div key={index} className="rounded-xl bg-surface-container-low p-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">{lesson.isPreview ? 'play_circle' : 'lock'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-on-surface">Lesson {index + 1}: {lesson.title}</p>
                      <p className="text-[12px] text-on-surface-variant">{lesson.durationLabel || 'No duration'} {lesson.isPreview ? '- Free preview' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewList({ title, icon, items, empty }) {
  return (
    <div className="rounded-2xl border border-outline-variant/20 p-4">
      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        {title}
      </h4>
      {items.length === 0 ? <p className="text-[13px] text-on-surface-variant italic">{empty}</p> : (
        <ul className="space-y-2">
          {items.map((item, index) => <li key={index} className="text-[13px] text-on-surface-variant flex gap-2"><span className="text-primary">•</span>{item}</li>)}
        </ul>
      )}
    </div>
  )
}

function CourseStat({ icon, label, value }) {
  return (
    <div className="bg-white/80 border border-outline-variant/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-[12px] uppercase font-bold text-outline">{label}</p>
        <p className="font-headline-sm text-headline-sm text-on-surface">{value}</p>
      </div>
    </div>
  )
}

function CourseCard({ course, onEdit, onArchive }) {
  const lessonCount = course.lessonCount || course.lessons?.length || 0
  const mockRating = course.rating || (course.status === 'published' ? 4.8 : '--')
  return (
    <article className="rounded-2xl border border-outline-variant/20 bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
      {course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt={course.title} className="w-full md:w-44 h-44 md:h-auto object-cover bg-surface-container" />
      ) : (
        <div className="w-full md:w-44 h-44 md:h-auto bg-primary/5 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[46px]">play_lesson</span>
        </div>
      )}
      <div className="p-4 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              <CourseStatusBadge status={course.status} />
              {course.subject && <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[11px] font-bold">{course.subject}</span>}
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2">{course.title}</h4>
            <p className="text-[13px] text-on-surface-variant line-clamp-2 mt-1">{course.description || 'No description yet.'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-primary">{formatMoney(course.price || 0)}</p>
            <p className="text-[11px] text-outline">{lessonCount} lessons</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-2 text-[12px]">
          <MiniMetric label="Rating" value={mockRating} />
          <MiniMetric label="Students" value={course.enrollmentCount || 0} />
          <MiniMetric label="Revenue" value={formatMoney(course.revenue || 0)} />
          <MiniMetric label="Lessons" value={lessonCount} />
          <MiniMetric label="Duration" value={getTotalDuration(course.lessons)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onEdit} className="h-9 px-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container">Edit</button>
          {course.status === 'published' && (
            <button onClick={() => { window.location.hash = `/course/${course.id}` }} className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-md">Open course</button>
          )}
          <button onClick={onArchive} className="h-9 px-3 rounded-lg text-red-600 hover:bg-red-50 font-label-md">Archive</button>
        </div>
      </div>
    </article>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-2 min-w-0">
      <strong className="block truncate text-on-surface">{value}</strong>
      <span className="text-outline">{label}</span>
    </div>
  )
}

function EmptyCourseStore({ onCreate }) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/5 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-[42px]">video_library</span>
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mt-4">No courses yet</h3>
      <p className="text-on-surface-variant mt-1">Create your first polished video course and publish it to your tutor profile.</p>
      <button onClick={onCreate} className="mt-5 h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md">Start creating</button>
    </div>
  )
}
