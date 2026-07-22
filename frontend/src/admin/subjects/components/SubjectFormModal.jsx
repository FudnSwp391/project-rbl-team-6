import { useState } from 'react'
import Modal from './Modal'

// Palette and icon set are fixed lists rather than free input: the backend
// validates against the same shapes, and an admin picking arbitrary Tailwind
// classes would eventually produce an unreadable card.
const PALETTE = [
  { color: 'bg-blue-100 text-blue-700',       swatch: 'bg-blue-500'    },
  { color: 'bg-rose-100 text-rose-700',       swatch: 'bg-rose-500'    },
  { color: 'bg-pink-100 text-pink-700',       swatch: 'bg-pink-500'    },
  { color: 'bg-green-100 text-green-700',     swatch: 'bg-green-500'   },
  { color: 'bg-cyan-100 text-cyan-700',       swatch: 'bg-cyan-500'    },
  { color: 'bg-purple-100 text-purple-700',   swatch: 'bg-purple-500'  },
  { color: 'bg-emerald-100 text-emerald-700', swatch: 'bg-emerald-500' },
  { color: 'bg-amber-100 text-amber-700',     swatch: 'bg-amber-500'   },
  { color: 'bg-teal-100 text-teal-700',       swatch: 'bg-teal-500'    },
  { color: 'bg-indigo-100 text-indigo-700',   swatch: 'bg-indigo-500'  },
  { color: 'bg-orange-100 text-orange-700',   swatch: 'bg-orange-500'  },
  { color: 'bg-gray-100 text-gray-600',       swatch: 'bg-gray-400'    },
]

const ICONS = [
  'calculate', 'menu_book', 'auto_stories', 'translate', 'bolt', 'biotech',
  'grass', 'history_edu', 'public', 'code', 'school', 'science', 'palette',
  'music_note', 'sports_soccer', 'psychology', 'gavel', 'architecture',
]

const LEVELS = ['Tiểu học', 'THCS', 'THPT']

export default function SubjectFormModal({ subject, onClose, onSubmit }) {
  const editing = Boolean(subject?.id)
  const [form, setForm] = useState({
    name:        subject?.name        || '',
    description: subject?.description || '',
    icon:        subject?.icon        || 'school',
    color:       subject?.color       || 'bg-gray-100 text-gray-600',
    levels:      subject?.levels      || [],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const toggleLevel = lv => set({
    levels: form.levels.includes(lv) ? form.levels.filter(x => x !== lv) : [...form.levels, lv],
  })

  const submit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Tên môn học là bắt buộc.'); return }
    setSaving(true); setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? `Chỉnh sửa ${subject.name}` : 'Tạo môn học mới'}
      subtitle={editing ? 'Thay đổi được áp dụng ngay cho toàn hệ thống.' : 'Môn học mới sẽ hiển thị cho gia sư và khóa học.'}
      icon={editing ? 'edit' : 'add'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-on-surface-variant
                       hover:bg-surface-variant transition">
            Hủy
          </button>
          <button type="submit" form="subject-form" disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary
                       hover:brightness-125 active:scale-[0.98] transition
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] subj-spin">progress_activity</span>}
            {editing ? 'Lưu thay đổi' : 'Tạo môn học'}
          </button>
        </>
      }
    >
      <form id="subject-form" onSubmit={submit} className="space-y-4">
        {/* Live preview: the admin sees the card tile before committing. */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
          <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${form.color}`}>
            <span className="material-symbols-outlined text-[22px]">{form.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-on-surface truncate">
              {form.name.trim() || 'Tên môn học'}
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              {form.levels.length ? form.levels.join(' · ') : 'Chưa gán cấp học'}
            </p>
          </div>
        </div>

        <Field label="Tên môn học" required>
          <input
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            maxLength={100}
            placeholder="Ví dụ: Giáo dục công dân"
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm
                       focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </Field>

        <Field label="Mô tả" hint="Không bắt buộc">
          <textarea
            value={form.description}
            onChange={e => set({ description: e.target.value })}
            maxLength={500}
            rows={2}
            placeholder="Mô tả ngắn về môn học…"
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm resize-none
                       focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </Field>

        <Field label="Cấp học">
          <div className="flex gap-2">
            {LEVELS.map(lv => {
              const on = form.levels.includes(lv)
              return (
                <button key={lv} type="button" onClick={() => toggleLevel(lv)} aria-pressed={on}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                    ${on ? 'bg-primary text-on-primary border-primary'
                         : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'}`}>
                  {lv}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Màu">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(p => (
              <button key={p.color} type="button" onClick={() => set({ color: p.color })}
                aria-label={`Chọn màu ${p.swatch}`} aria-pressed={form.color === p.color}
                className={`w-7 h-7 rounded-lg ${p.swatch} transition
                  ${form.color === p.color
                    ? 'ring-2 ring-offset-2 ring-primary scale-110'
                    : 'hover:scale-105'}`} />
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="grid grid-cols-9 gap-1.5">
            {ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => set({ icon: ic })}
                aria-label={`Chọn icon ${ic}`} aria-pressed={form.icon === ic}
                className={`aspect-square grid place-items-center rounded-lg border transition
                  ${form.icon === ic
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                <span className="material-symbols-outlined text-[18px]">{ic}</span>
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200
                          text-red-700 text-xs">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

const Field = ({ label, hint, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-on-surface mb-1.5">
      {label}
      {required && <span className="text-red-600 ml-0.5">*</span>}
      {hint && <span className="font-normal text-on-surface-variant ml-1.5">— {hint}</span>}
    </label>
    {children}
  </div>
)
