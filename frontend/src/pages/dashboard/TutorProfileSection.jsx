/**
 * TutorProfileSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Khu vực "Hồ sơ gia sư" trong TutorDashboard.
 * - Xem + sửa hồ sơ (bio, học phí, hình thức dạy, học vấn, ảnh...).
 * - Quản lý môn dạy (tutor_subjects): thêm/xóa môn + cấp + giá.
 */
import { useState, useEffect } from 'react'
import { api } from '../../services/eduxApi'
import { toastSuccess, toastError } from '../../services/toast'

const LEVELS = ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Đại học']
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0)

export default function TutorProfileSection() {
  const [profile, setProfile] = useState(null)
  const [subjects, setSubjects] = useState([])      // môn đang dạy
  const [allSubjects, setAllSubjects] = useState([]) // danh mục môn
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const loadAll = () => {
    setLoading(true); setError('')
    Promise.all([api.getTutorProfile(), api.getTutorSubjects(), api.getSubjects()])
      .then(([p, s, all]) => { setProfile(p); setSubjects(s); setAllSubjects(all) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(loadAll, [])

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] flex items-center justify-center py-10 gap-3 text-on-surface-variant">
        <span className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-label-md">Đang tải hồ sơ...</span>
      </div>
    )
  }
  if (error || !profile) {
    return (
      <div className="bg-white/70 backdrop-blur-md border border-error/20 rounded-[1rem] py-8 text-center text-error">
        <p className="font-label-md">{error || 'Không tải được hồ sơ.'}</p>
      </div>
    )
  }

  const methods = profile.teaching_methods || []

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
          Hồ sơ gia sư
        </h3>
        <button onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-primary text-primary font-label-md hover:bg-primary/5 transition-colors">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Sửa hồ sơ
        </button>
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-white/30 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-[1rem] p-md flex flex-col gap-4">
        {/* Top */}
        <div className="flex items-start gap-4">
          {profile.profile_photo_url || profile.picture ? (
            <img src={profile.profile_photo_url || profile.picture} alt={profile.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-surface" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary text-xl font-bold">
              {(profile.full_name || '?').charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-headline-md text-[18px] text-on-surface">{profile.full_name}</p>
            {profile.headline && <p className="font-body-md text-[14px] text-on-surface-variant">{profile.headline}</p>}
            <div className="flex items-center gap-3 mt-1 text-[13px] text-on-surface-variant flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>star</span>
                {(Number(profile.avg_rating) || 0).toFixed(1)} ({profile.review_count || 0})
              </span>
              {profile.hourly_rate != null && <span>{fmt(profile.hourly_rate)}đ/giờ</span>}
              {profile.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">location_on</span>{profile.location}</span>}
            </div>
          </div>
        </div>

        {profile.bio && <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">{profile.bio}</p>}

        <div className="flex flex-wrap gap-2">
          {methods.map(m => (
            <span key={m} className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
              {m === 'online' ? '💻 Online' : '🏠 Offline'}
            </span>
          ))}
          {profile.experience_years != null && (
            <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed-dim/20 text-primary font-label-sm text-label-sm">
              {profile.experience_years} năm kinh nghiệm
            </span>
          )}
        </div>

        {/* Môn dạy */}
        <div className="border-t border-surface-variant/50 pt-4">
          <SubjectsManager
            subjects={subjects}
            allSubjects={allSubjects}
            onChange={setSubjects}
          />
        </div>
      </div>

      {editOpen && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadAll() }}
        />
      )}
    </div>
  )
}

// ─── Quản lý môn dạy ──────────────────────────────────────────────────────────
function SubjectsManager({ subjects, allSubjects, onChange }) {
  const [subjectId, setSubjectId] = useState('')
  const [level, setLevel] = useState('Cấp 3')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const add = async () => {
    if (!subjectId) { setErr('Chọn môn học.'); return }
    setBusy(true); setErr('')
    try {
      await api.addTutorSubject({ subject_id: subjectId, level, price_per_hour: price || null })
      const fresh = await api.getTutorSubjects()
      onChange(fresh)
      setSubjectId(''); setPrice('')
      toastSuccess('Đã thêm môn dạy.')
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const remove = async (id) => {
    try { await api.removeTutorSubject(id); onChange(await api.getTutorSubjects()); toastSuccess('Đã xóa môn dạy.') }
    catch (e) { toastError(e.message) }
  }

  return (
    <div className="space-y-3">
      <p className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1">
        <span className="material-symbols-outlined text-[18px] text-primary">menu_book</span>
        Môn dạy
      </p>

      <div className="flex flex-wrap gap-2">
        {subjects.length === 0 ? (
          <span className="text-on-surface-variant font-body-md text-[13px]">Chưa khai báo môn dạy nào.</span>
        ) : subjects.map(s => (
          <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-[13px] text-on-surface">
            <strong className="text-primary">{s.subject}</strong>
            {s.level && <span className="text-on-surface-variant">· {s.level}</span>}
            {s.price_per_hour && <span className="text-on-surface-variant">· {fmt(s.price_per_hour)}đ</span>}
            <button onClick={() => remove(s.id)} title="Xóa" className="ml-0.5 text-on-surface-variant hover:text-error">
              <span className="material-symbols-outlined text-[16px] align-middle">close</span>
            </button>
          </span>
        ))}
      </div>

      {/* Form thêm */}
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="ts-input" style={{ minWidth: 130 }}>
          <option value="">— Chọn môn —</option>
          {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value)} className="ts-input" style={{ minWidth: 100 }}>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="Giá/giờ" className="ts-input" style={{ width: 110 }} />
        <button onClick={add} disabled={busy}
          className="inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]">add</span> Thêm
        </button>
      </div>
      {err && <p className="text-error font-label-sm">{err}</p>}

      <style>{`
        .ts-input { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--outline-variant, #c4c7c5); background: #fff; color: var(--on-surface, #1a1c1e); font-size: 14px; outline: none; }
        .ts-input:focus { border-color: var(--primary, #00288e); box-shadow: 0 0 0 3px rgb(0 40 142 / 12%); }
      `}</style>
    </div>
  )
}

// ─── Modal sửa hồ sơ ──────────────────────────────────────────────────────────
function ProfileEditModal({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    bio: profile.bio || '', headline: profile.headline || '',
    hourly_rate: profile.hourly_rate ?? '', location: profile.location || '',
    teaching_style: profile.teaching_style || '', education: profile.education || '',
    qualifications: profile.qualifications || '', experience_years: profile.experience_years ?? '',
    profile_photo_url: profile.profile_photo_url || '', demo_video_url: profile.demo_video_url || '',
    phone: profile.phone || '',
    teaching_methods: profile.teaching_methods || [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const toggleMethod = (m) => setForm(p => ({
    ...p,
    teaching_methods: p.teaching_methods.includes(m) ? p.teaching_methods.filter(x => x !== m) : [...p.teaching_methods, m]
  }))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try { await api.updateTutorProfile(form); toastSuccess('Đã lưu hồ sơ.'); onSaved() }
    catch (err) { setError(err.message || 'Không lưu được.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface/95 backdrop-blur-sm px-6 py-4 border-b border-surface-variant/50 flex items-center justify-between z-10">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
            Sửa hồ sơ gia sư
          </h3>
          <button onClick={onClose} className="w-9 h-9 inline-flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <F label="Tiêu đề ngắn (headline)"><input className="form-input" value={form.headline} onChange={set('headline')} placeholder="VD: Giáo viên Toán luyện thi THPT" /></F>
          <F label="Giới thiệu (bio)"><textarea className="form-input" rows={3} value={form.bio} onChange={set('bio')} /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Học phí (đ/giờ)"><input type="number" min={0} className="form-input" value={form.hourly_rate} onChange={set('hourly_rate')} /></F>
            <F label="Số năm kinh nghiệm"><input type="number" min={0} className="form-input" value={form.experience_years} onChange={set('experience_years')} /></F>
          </div>
          <F label="Khu vực"><input className="form-input" value={form.location} onChange={set('location')} placeholder="VD: Quận 1, TP.HCM" /></F>
          <F label="Hình thức dạy">
            <div className="flex gap-4 pt-1">
              {['online', 'offline'].map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-on-surface">
                  <input type="checkbox" checked={form.teaching_methods.includes(m)} onChange={() => toggleMethod(m)} />
                  {m === 'online' ? 'Online' : 'Offline'}
                </label>
              ))}
            </div>
          </F>
          <F label="Học vấn"><input className="form-input" value={form.education} onChange={set('education')} placeholder="VD: Thạc sĩ Toán - ĐH Sư Phạm" /></F>
          <F label="Phong cách giảng dạy"><textarea className="form-input" rows={2} value={form.teaching_style} onChange={set('teaching_style')} /></F>
          <F label="Bằng cấp / chứng chỉ"><input className="form-input" value={form.qualifications} onChange={set('qualifications')} /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Ảnh đại diện (URL)"><input className="form-input" value={form.profile_photo_url} onChange={set('profile_photo_url')} placeholder="https://..." /></F>
            <F label="Video demo (URL)"><input className="form-input" value={form.demo_video_url} onChange={set('demo_video_url')} placeholder="https://..." /></F>
          </div>
          <F label="Số điện thoại"><input className="form-input" value={form.phone} onChange={set('phone')} /></F>

          {error && <p className="text-error font-label-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container-high">Hủy</button>
            <button type="submit" disabled={saving} className="h-11 px-6 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 inline-flex items-center gap-2 disabled:opacity-60">
              {saving ? (<><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Đang lưu...</>) : (<><span className="material-symbols-outlined text-[18px]">save</span>Lưu hồ sơ</>)}
            </button>
          </div>
        </form>

        <style>{`
          .form-input { width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--outline-variant, #c4c7c5); background: var(--surface-container-lowest, #fff); color: var(--on-surface, #1a1c1e); font-size: 14px; outline: none; }
          .form-input:focus { border-color: var(--primary, #00288e); box-shadow: 0 0 0 3px rgb(0 40 142 / 12%); }
          textarea.form-input { resize: vertical; }
        `}</style>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <label className="block">
      <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5 font-semibold">{label}</span>
      {children}
    </label>
  )
}
